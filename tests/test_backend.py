import os
import pytest
from app import app as flask_app, socketio

@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    flask_app.config['SECRET_KEY'] = 'test-secret-key'
    with flask_app.test_client() as client:
        with flask_app.app_context():
            yield client

def test_register_and_login(client):
    import uuid
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

def test_room_creation_and_joining(client):
    import uuid
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

def test_admin_room_management(client):
    import uuid
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

def test_socketio_multi_client_chat(client):
    import uuid
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
