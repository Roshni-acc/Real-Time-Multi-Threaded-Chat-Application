# Codebase Explanation & System Architecture

## 1. Executive Summary
This project is a **Real-Time, Multi-Threaded Chat Application** built using **Flask (Python)** for the backend service, **MongoDB** for persistent storage, **Socket.IO** for bi-directional WebSocket messaging, **PeerJS / WebRTC** for audio/video calling, and a modern **React (Vite)** frontend powered by a glassmorphism design system.

---

## 2. Directory & File Hierarchy

```
Real-Time-Multi-Threaded-Chat-Application/
├── app.py                     # Main Flask Application & Socket.IO entry point
├── Procfile                   # Process file for production deployment
├── requirements.txt           # Python dependencies
├── package.json               # Root Node package config with build scripts
├── ai_feature_guide.md        # Comprehensive AI Bot technical documentation
├── CODEBASE_EXPLANATION.md    # System architecture & codebase explanation (This File)
├── server/
│   ├── database.py            # MongoDB connection & CRUD operations
│   ├── config.py              # Environment configuration & credentials loader
│   ├── ai_bot.py              # Natural language AI Assistant (@ai trigger engine)
│   └── calls.py               # Socket.IO signaling event handlers for WebRTC
├── client/
│   ├── frontend/              # Vite React Single Page Application (SPA)
│   │   ├── src/
│   │   │   ├── components/    # Modular React Components (Chat, Auth, Modals)
│   │   │   ├── index.css      # Custom CSS design system & glassmorphism theme
│   │   │   └── App.jsx        # Main React routing and authentication context
│   │   ├── dist/              # Production web build bundle (served by Flask)
│   │   └── package.json       # React dependencies and scripts
│   └── ui/                    # Legacy HTML templates fallback
├── tests/
│   └── test_backend.py        # Pytest test suite covering all REST & Socket routes
└── venv/                      # Python virtual environment
```

---

## 3. Core Subsystems & Components

### A. Backend (`app.py` & `server/`)
- **`app.py`**: Serves RESTful endpoints, handles HTTP authentication sessions, serves static assets/files, manages WebSocket connections via `Flask-SocketIO`, and falls back to serving the React `dist/index.html` build for SPA client-side routing.
- **`server/database.py`**: Interacts with MongoDB. Contains operations for:
  - User registration & hash validation (`register_user`, `login_user`)
  - Message logging with UTC and IST timestamps (`save_message`, `get_chat_history`)
  - Room management (`create_room`, `get_rooms`, `add_user_to_room`, `remove_user_from_room`, `delete_room`, `promote_to_admin`)
  - Profile updates & avatar path management (`update_user_details`, `update_profile_photo`)
- **`server/config.py`**: Loads environment variables from `.env` with fallback defaults for `SECRET_KEY`, `MONGO_URI`, and `MAIL_*` server credentials.
- **`server/ai_bot.py`**: Implements the `@ai` bot responder. When `@ai` is mentioned in a chat message, it generates context-aware responses, text summaries, acronym definitions, or technical explanations.
- **`server/calls.py`**: Registers WebRTC signaling handlers (`call-user`, `make-answer`, `ice-candidate`, `reject-call`, `end-call`) for seamless 1-on-1 audio/video sessions.

---

### B. MongoDB Database Schema
1. **`users` Collection**:
   - `username` (string, unique)
   - `password_hash` (string, Werkzeug PBKDF2 hash)
   - `full_name` (string)
   - `email` (string, unique)
   - `profile_photo` (string)
   - `created_at` (UTC timestamp)

2. **`rooms` Collection**:
   - `room_name` (string)
   - `room_code` (string, unique 8-char uppercase code)
   - `creator` (string, username)
   - `admins` (array of usernames)
   - `members` (array of usernames)
   - `created_at` (UTC timestamp)

3. **`messages` Collection**:
   - `sender` (string, username / "System" / "AI Assistant")
   - `message` (string)
   - `room_id` (string, ObjectId reference)
   - `message_type` ("text" | "system" | "file" | "ai")
   - `file_info` (object with `filename` and `url`, optional)
   - `timestamp` (UTC timestamp)

---

### C. Frontend Architecture (`client/frontend/`)
Built using **React 18** + **Vite** + **Lucide React Icons** + **Socket.IO Client**.
- **`App.jsx`**: Main controller handling session validation against `/api/auth/me`, active room switching, modal states (Profile, Create Room, Join Room), and dynamic page rendering.
- **`Sidebar.jsx`**: Displays user info, search bar, active room list, create/join buttons, and profile modal trigger.
- **`ChatArea.jsx`**: Real-time message stream with file attachment support, image preview modal, typing indicator, system notifications, and AI bot triggers.
- **`MemberListDrawer.jsx`**: Admin controls allowing group renaming, member promotion, user kicking, leaving, and room deletion.
- **`VideoCallModal.jsx`**: WebRTC audio/video call UI with camera/mic controls.

---

## 4. REST API Reference

| Endpoint | Method | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register a new user | No |
| `/api/auth/login` | `POST` | Authenticate user & open session | No |
| `/api/auth/me` | `GET` | Get currently logged-in user profile | Yes |
| `/api/auth/logout` | `POST` | Terminate user session | Yes |
| `/api/auth/forgot_password` | `POST` | Dispatch password reset email link | No |
| `/api/auth/reset_password/<token>` | `POST` | Update user password with token | No |
| `/api/rooms` | `GET` | List all rooms joined by current user | Yes |
| `/api/rooms/<id>` | `GET` | Fetch room details, members & history | Yes |
| `/api/rooms/create` | `POST` | Create a new chat room | Yes |
| `/api/rooms/join` | `POST` | Join existing room via 8-char code | Yes |
| `/api/rooms/<id>/select` | `POST` | Set active room session ID | Yes |
| `/api/rooms/<id>/leave` | `POST` | Leave a joined room | Yes |
| `/api/rooms/<id>` | `DELETE` | Delete a room (Admin only) | Yes |
| `/api/rooms/<id>/rename` | `POST` | Rename a room (Admin only) | Yes |
| `/api/rooms/<id>/promote/<user>` | `POST` | Promote member to admin | Yes |
| `/api/rooms/<id>/kick/<user>` | `POST` | Remove member from room | Yes |
| `/api/profile` | `POST` | Update username & full name | Yes |
| `/api/upload_dp` | `POST` | Upload new user avatar photo | Yes |
| `/api/upload_chat_file` | `POST` | Upload attachment file to chat | Yes |
| `/api/ping` or `/ping` | `GET` | 10-minute keep-alive health check endpoint | No |

---

## 5. Real-Time Socket.IO Events

### Chat Events
- **`join`**: Joins socket client to a specific `room_id` channel.
- **`message`**: Emits and broadcasts text, file, system, or AI messages in real time.
- **`user_kicked`**: Broadcasts event when an admin removes a user.
- **`room_deleted`**: Notifies all connected clients when a room is removed.

### Call Events (WebRTC)
- **`call-user`**: Initiates a 1-on-1 audio/video call offer.
- **`make-answer`**: Sends answer signal back to caller.
- **`ice-candidate`**: Exchanges ICE candidates for P2P connection setup.
- **`reject-call`** / **`end-call`**: Terminates or declines an active session.

---

## 6. Automated Testing Suite (`tests/test_backend.py`)

The project includes an automated **Pytest** test suite verifying 100% of API endpoints and socket handlers:
- **`test_register_and_login`**: Tests registration, session validation, logout, and login.
- **`test_room_creation_joining_and_retrieval`**: Verifies creation, code lookup, room switching, list retrieval, and detail queries.
- **`test_admin_room_management_and_leave`**: Validates room renaming, member leave, admin promotion, user kick, and room deletion.
- **`test_user_profile_and_uploads`**: Tests profile edits, profile photo uploads, and chat file uploads.
- **`test_password_recovery`**: Tests reset token generation, validation, and password updates.
- **`test_page_routes_and_fallbacks`**: Verifies SPA routing fallbacks and legacy HTML page responses.
- **`test_socketio_multi_client_chat`**: Spawns multiple test sockets and verifies real-time message broadcasting between clients.
- **`test_ai_bot_query`**: Validates `@ai` prompt handling, summarization logic, and technical responses.

To run tests:
```bash
pytest
```
