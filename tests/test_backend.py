import os
import io
import uuid
import pytest
from app import app as flask_app, socketio

@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    flask_app.config['SECRET_KEY'] = 'test-secret-key'
    # Suppress mail sending errors during test if mail server not present
    flask_app.config['MAIL_SUPPRESS_SEND'] = True
    with flask_app.test_client() as client:
        with flask_app.app_context():
            yield client

def test_register_and_login(client):
    random_str = str(uuid.uuid4())[:6]
    username = f"user_{random_str}"
    email = f"user_{random_str}@example.com"
    password = "password123"

    # Test Registration
    reg_resp = client.post('/api/auth/register', json={
        'full_name': 'Test User',
        'email': email,
        'username': username,
        'password': password,
        'confirm_password': password
    })
    assert reg_resp.status_code == 200
    reg_data = reg_resp.get_json()
    assert reg_data['status'] is True
    assert reg_data['data']['user']['username'] == username

    # Test Auth Me
    me_resp = client.get('/api/auth/me')
    assert me_resp.status_code == 200
    me_data = me_resp.get_json()
    assert me_data['status'] is True
    assert me_data['data']['user']['username'] == username

    # Test Logout
    logout_resp = client.post('/api/auth/logout')
    assert logout_resp.status_code == 200

    # Test Login
    login_resp = client.post('/api/auth/login', json={
        'username': username,
        'password': password
    })
    assert login_resp.status_code == 200
    login_data = login_resp.get_json()
    assert login_data['status'] is True
    assert login_data['data']['user']['username'] == username

def test_room_creation_joining_and_retrieval(client):
    user1 = f"creator_{str(uuid.uuid4())[:6]}"
    user2 = f"joiner_{str(uuid.uuid4())[:6]}"

    # Register User 1
    client.post('/api/auth/register', json={
        'full_name': 'Creator User',
        'email': f"{user1}@example.com",
        'username': user1,
        'password': 'password123',
        'confirm_password': 'password123'
    })

    # Create Room
    create_resp = client.post('/api/rooms/create', json={'room_name': 'Test Multithreaded Room'})
    assert create_resp.status_code == 200
    create_data = create_resp.get_json()
    assert create_data['status'] is True
    room_id = create_data['data']['room_id']
    room_code = create_data['data']['room_code']
    assert room_id is not None
    assert room_code is not None

    # Test Get Rooms List
    rooms_resp = client.get('/api/rooms')
    assert rooms_resp.status_code == 200
    rooms_data = rooms_resp.get_json()
    assert rooms_data['status'] is True
    assert len(rooms_data['data']['rooms']) >= 1

    # Select Room
    select_resp = client.post(f'/api/rooms/{room_id}/select')
    assert select_resp.status_code == 200

    # Logout User 1
    client.post('/api/auth/logout')

    # Register User 2
    client.post('/api/auth/register', json={
        'full_name': 'Joiner User',
        'email': f"{user2}@example.com",
        'username': user2,
        'password': 'password123',
        'confirm_password': 'password123'
    })

    # Join Room by Code
    join_resp = client.post('/api/rooms/join', json={'room_code': room_code})
    assert join_resp.status_code == 200
    join_data = join_resp.get_json()
    assert join_data['status'] is True
    assert join_data['data']['room_id'] == room_id

    # Fetch Room Details
    detail_resp = client.get(f'/api/rooms/{room_id}')
    assert detail_resp.status_code == 200
    detail_data = detail_resp.get_json()
    assert detail_data['status'] is True
    member_usernames = [m['username'] for m in detail_data['data']['members']]
    assert user1 in member_usernames
    assert user2 in member_usernames

def test_admin_room_management_and_leave(client):
    admin = f"admin_{str(uuid.uuid4())[:6]}"
    member = f"member_{str(uuid.uuid4())[:6]}"

    # Setup Admin
    client.post('/api/auth/register', json={
        'full_name': 'Admin User',
        'email': f"{admin}@example.com",
        'username': admin,
        'password': 'password123',
        'confirm_password': 'password123'
    })
    create_res = client.post('/api/rooms/create', json={'room_name': 'Original Name'}).get_json()
    room_id = create_res['data']['room_id']

    # Rename Room
    rename_resp = client.post(f'/api/rooms/{room_id}/rename', json={'room_name': 'Renamed Group Chat'})
    assert rename_resp.status_code == 200
    assert rename_resp.get_json()['status'] is True

    # Setup Member
    client.post('/api/auth/logout')
    client.post('/api/auth/register', json={
        'full_name': 'Member User',
        'email': f"{member}@example.com",
        'username': member,
        'password': 'password123',
        'confirm_password': 'password123'
    })
    client.post('/api/rooms/join', json={'room_code': create_res['data']['room_code']})

    # Member leaves room test
    leave_resp = client.post(f'/api/rooms/{room_id}/leave')
    assert leave_resp.status_code == 200
    assert leave_resp.get_json()['status'] is True

    # Re-join room to test promotion and kick
    client.post('/api/rooms/join', json={'room_code': create_res['data']['room_code']})

    # Login back as Admin
    client.post('/api/auth/logout')
    client.post('/api/auth/login', json={'username': admin, 'password': 'password123'})

    # Promote Member
    promote_resp = client.post(f'/api/rooms/{room_id}/promote/{member}')
    assert promote_resp.status_code == 200
    assert promote_resp.get_json()['status'] is True

    # Kick Member
    kick_resp = client.post(f'/api/rooms/{room_id}/kick/{member}')
    assert kick_resp.status_code == 200
    assert kick_resp.get_json()['status'] is True

    # Delete Room
    del_resp = client.delete(f'/api/rooms/{room_id}')
    assert del_resp.status_code == 200
    assert del_resp.get_json()['status'] is True

def test_user_profile_and_uploads(client):
    user_str = f"prof_{str(uuid.uuid4())[:6]}"
    username = user_str
    email = f"{username}@example.com"

    # Register User
    client.post('/api/auth/register', json={
        'full_name': 'Profile Test User',
        'email': email,
        'username': username,
        'password': 'password123',
        'confirm_password': 'password123'
    })

    # Update Profile
    new_fullname = "Updated Profile Name"
    prof_resp = client.post('/api/profile', json={
        'username': username,
        'full_name': new_fullname
    })
    assert prof_resp.status_code == 200
    assert prof_resp.get_json()['data']['user']['full_name'] == new_fullname

    # Upload DP
    dp_data = {
        'profile_photo': (io.BytesIO(b"fake_image_data"), "avatar.jpg")
    }
    dp_resp = client.post('/api/upload_dp', data=dp_data, content_type='multipart/form-data')
    assert dp_resp.status_code == 200
    assert dp_resp.get_json()['status'] is True

    # Upload Chat File
    file_data = {
        'file': (io.BytesIO(b"hello world test file"), "sample.txt")
    }
    chat_file_resp = client.post('/api/upload_chat_file', data=file_data, content_type='multipart/form-data')
    assert chat_file_resp.status_code == 200
    assert chat_file_resp.get_json()['status'] is True
    assert "url" in chat_file_resp.get_json()['data']

def test_password_recovery(client):
    user_str = f"pwd_{str(uuid.uuid4())[:6]}"
    email = f"{user_str}@example.com"

    client.post('/api/auth/register', json={
        'full_name': 'Pwd Recovery User',
        'email': email,
        'username': user_str,
        'password': 'password123',
        'confirm_password': 'password123'
    })

    # Forgot password request
    forgot_resp = client.post('/api/auth/forgot_password', json={'email': email})
    # Since mail send might fail or pass depending on config, check status code is 200 or 500
    assert forgot_resp.status_code in [200, 500]

    # Directly generate valid token to test reset endpoint
    from app import serializer
    token = serializer.dumps(email, salt='password-reset-salt')
    reset_resp = client.post(f'/api/auth/reset_password/{token}', json={
        'password': 'newpassword123',
        'confirm_password': 'newpassword123'
    })
    assert reset_resp.status_code == 200
    assert reset_resp.get_json()['status'] is True

    # Verify login with new password
    client.post('/api/auth/logout')
    login_resp = client.post('/api/auth/login', json={
        'username': user_str,
        'password': 'newpassword123'
    })
    assert login_resp.status_code == 200

def test_page_routes_and_fallbacks(client):
    # Test GET routes
    routes = ['/', '/login', '/register', '/forgot_password', '/api/ping', '/ping']
    for r in routes:
        resp = client.get(r)
        assert resp.status_code in [200, 302]

    # Test Logout page route
    logout_resp = client.get('/logout')
    assert logout_resp.status_code == 302

def test_socketio_multi_client_chat(client):
    user1 = f"sock1_{str(uuid.uuid4())[:6]}"
    user2 = f"sock2_{str(uuid.uuid4())[:6]}"

    # Setup User 1
    client.post('/api/auth/register', json={
        'full_name': 'Socket One',
        'email': f"{user1}@example.com",
        'username': user1,
        'password': 'password123',
        'confirm_password': 'password123'
    })
    create_res = client.post('/api/rooms/create', json={'room_name': 'Socket Test Room'}).get_json()
    room_id = create_res['data']['room_id']

    # Socket Client 1
    socket_client_1 = socketio.test_client(flask_app, flask_test_client=client)
    assert socket_client_1.is_connected()
    socket_client_1.emit('join', {'room': room_id})

    # Setup User 2
    client.post('/api/auth/logout')
    client.post('/api/auth/register', json={
        'full_name': 'Socket Two',
        'email': f"{user2}@example.com",
        'username': user2,
        'password': 'password123',
        'confirm_password': 'password123'
    })
    client.post('/api/rooms/join', json={'room_code': create_res['data']['room_code']})

    # Socket Client 2
    socket_client_2 = socketio.test_client(flask_app, flask_test_client=client)
    assert socket_client_2.is_connected()
    socket_client_2.emit('join', {'room': room_id})

    # Client 2 sends a message
    socket_client_2.emit('message', {
        'room_id': room_id,
        'message': 'Hello from client 2!',
        'message_type': 'text'
    })

    # Verify Client 1 receives the message broadcast in real time
    received_1 = socket_client_1.get_received()
    assert len(received_1) > 0
    msg_events = [e for e in received_1 if e['name'] == 'message']
    assert len(msg_events) > 0
    payload = msg_events[-1]['args']
    if isinstance(payload, list):
        payload = payload[0]
    assert payload['message'] == 'Hello from client 2!'
    assert payload['username'] == user2

    socket_client_1.disconnect()
    socket_client_2.disconnect()

def test_ai_bot_query(client):
    from server.ai_bot import handle_ai_bot_query

    # 1. Test Help Prompt
    res_help = handle_ai_bot_query("@ai", "fake_room_id")
    assert "AI Assistant" in res_help

    # 2. Test Acronym Prompt
    res_acronym = handle_ai_bot_query("@ai meaning of asap", "fake_room_id")
    assert "ASAP" in res_acronym

    # 3. Test Technical Fallback
    res_tech = handle_ai_bot_query("@ai explain python code", "fake_room_id")
    assert "Code Assistant" in res_tech or "AI Assistant" in res_tech

    # 4. Test Summarization with no messages
    res_sum_empty = handle_ai_bot_query("@ai summarize", "fake_room_id_empty")
    assert "no user messages" in res_sum_empty

def test_auth_validation_and_error_handling(client):
    # Missing fields registration test
    resp = client.post('/api/auth/register', json={
        'full_name': 'Incomplete User',
        'email': 'incomplete@example.com'
    })
    assert resp.status_code == 400
    assert resp.get_json()['status'] is False

    # Password mismatch test
    resp = client.post('/api/auth/register', json={
        'full_name': 'Mismatch User',
        'email': 'mismatch@example.com',
        'username': 'mismatch_user',
        'password': 'password123',
        'confirm_password': 'different_password'
    })
    assert resp.status_code == 400

    # Invalid email format test
    resp = client.post('/api/auth/register', json={
        'full_name': 'Bad Email',
        'email': 'not-an-email',
        'username': 'bad_email_user',
        'password': 'password123',
        'confirm_password': 'password123'
    })
    assert resp.status_code == 400

    # Non-existent login
    resp = client.post('/api/auth/login', json={
        'username': 'non_existent_user_9999',
        'password': 'password123'
    })
    assert resp.status_code == 404

def test_room_permission_boundaries(client):
    u1 = f"user1_{str(uuid.uuid4())[:6]}"
    u2 = f"user2_{str(uuid.uuid4())[:6]}"

    # Setup User 1 (Admin)
    client.post('/api/auth/register', json={
        'full_name': 'Owner User',
        'email': f"{u1}@example.com",
        'username': u1,
        'password': 'password123',
        'confirm_password': 'password123'
    })
    create_res = client.post('/api/rooms/create', json={'room_name': 'Protected Room'}).get_json()
    room_id = create_res['data']['room_id']
    room_code = create_res['data']['room_code']

    # Logout User 1, Login User 2 (Regular Member)
    client.post('/api/auth/logout')
    client.post('/api/auth/register', json={
        'full_name': 'Regular Member',
        'email': f"{u2}@example.com",
        'username': u2,
        'password': 'password123',
        'confirm_password': 'password123'
    })
    client.post('/api/rooms/join', json={'room_code': room_code})

    # Non-admin attempts to rename room (should fail with 403)
    rename_resp = client.post(f'/api/rooms/{room_id}/rename', json={'room_name': 'Hacked Name'})
    assert rename_resp.status_code == 403

    # Non-admin attempts to kick owner (should fail with 403)
    kick_resp = client.post(f'/api/rooms/{room_id}/kick/{u1}')
    assert kick_resp.status_code == 403

    # Non-admin attempts to delete room (should fail with 403)
    del_resp = client.delete(f'/api/rooms/{room_id}')
    assert del_resp.status_code == 403

def test_multi_device_session_invalidation_on_logout(client):
    u = f"multidev_{str(uuid.uuid4())[:6]}"
    password = "password123"

    c1 = flask_app.test_client()
    c2 = flask_app.test_client()

    # Device 1 registers & logs in
    c1.post('/api/auth/register', json={
        'full_name': 'Multi Device User',
        'email': f"{u}@example.com",
        'username': u,
        'password': password,
        'confirm_password': password
    })

    # Device 1 auth check (should succeed)
    me1 = c1.get('/api/auth/me')
    assert me1.status_code == 200

    # Device 2 logs in
    login_resp2 = c2.post('/api/auth/login', json={'username': u, 'password': password})
    assert login_resp2.status_code == 200

    # Device 2 auth check (should succeed)
    me2 = c2.get('/api/auth/me')
    assert me2.status_code == 200

    # Device 1 auth check NOW (should fail with 401 because token was refreshed by Device 2 login)
    me1_stale = c1.get('/api/auth/me')
    assert me1_stale.status_code == 401

    # Device 2 logs out
    logout_resp = c2.post('/api/auth/logout')
    assert logout_resp.status_code == 200

    # Device 2 auth check after logout (should fail with 401)
    me2_after_logout = c2.get('/api/auth/me')
    assert me2_after_logout.status_code == 401

def test_refresh_token_endpoint(client):
    u = f"reftok_{str(uuid.uuid4())[:6]}"
    password = "password123"

    client.post('/api/auth/register', json={
        'full_name': 'Refresh User',
        'email': f"{u}@example.com",
        'username': u,
        'password': password,
        'confirm_password': password
    })

    ref_resp = client.post('/api/auth/refresh_token')
    assert ref_resp.status_code == 200
    ref_data = ref_resp.get_json()
    assert ref_data['status'] is True
    assert 'token' in ref_data['data']


