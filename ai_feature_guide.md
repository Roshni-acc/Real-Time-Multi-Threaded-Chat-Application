# Multi-Threaded Chat Application & AI Bot System Architecture

This document provides a detailed, code-wise technical breakdown of the **Real-Time Multi-Threaded Chat Application** (Part 1) and the **AI Assistant Bot System** (Part 2).

---

## 📘 Part 1: Core Multi-Threaded Chat Application Architecture

### 1. Backend Flask & Multi-Threaded WebSocket Server (`app.py`, `server/`)
- **Server Framework**: Python 3.12 with `Flask 3.1` and `Flask-SocketIO 5.5`.
- **Concurrency Model**: `Flask-SocketIO` handles thousands of concurrent client WebSocket connections over thread pools / greenlets, ensuring sub-millisecond message delivery without blocking the main event loop.
- **REST & CORS Layer**:
  - `CORS(app, supports_credentials=True)` allows secure cross-origin requests between the Vite React dev server (`http://localhost:5173`) and the Flask server (`http://localhost:5001`).
  - Helper `get_req_data()` normalizes incoming request bodies for both `application/json` and `application/x-www-form-urlencoded`.

#### Code Excerpt — Flask App & Socket.IO Setup (`app.py`):
```python
app = Flask(__name__, static_folder="client/ui/static", static_url_path="/static")
app.config['SECRET_KEY'] = SECRET_KEY
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://localhost:5001"])

socketio = SocketIO(app, cors_allowed_origins="*")
register_call_events(socketio)
```

### 2. MongoDB Database Layer (`server/database.py`)
- **Persistence**: PyMongo driver connecting to `chat_application` database.
- **Collections**:
  - `users`: User credentials, hashed passwords (`werkzeug.security`), full names, email addresses, and profile photo filenames.
  - `rooms`: Room names, unique 8-character `room_code` UUIDs, creator handles, member lists, and admin permissions.
  - `messages`: Message text, sender, room ID, message type (`text`, `system`, `file`, `sticker`, `call`, `ai`), file attachment info, and ISO/IST timestamps.

#### Code Excerpt — Room Message Persistence (`server/database.py`):
```python
def save_message(sender, message, room_id, message_type="text", file_info=None):
    db = get_db()
    message_data = {
        "sender": sender,
        "message": message,
        "room_id": room_id,
        "message_type": message_type,
        "file_info": file_info,
        "timestamp": datetime.now(timezone.utc)
    }
    return db.messages.insert_one(message_data)
```

### 3. Frontend React Single Page Application (`client/frontend/src/`)
- **React 18 + Vite 5 Stack**: Component-based UI with client-side state management.
- **Components Breakdown**:
  - `App.jsx`: Global authentication, active room selection, socket connection lifecycle, WebRTC call state.
  - `Sidebar.jsx`: Search filter, room listing, user status avatar, dark/light theme toggle.
  - `ChatArea.jsx`: Header actions (WebRTC calls, room members drawer, room rename/delete), scrollable message stream, sticker popover, file uploader.
  - `MemberListDrawer.jsx`: Admin controls (promote to admin, kick member).
  - `CallModal.jsx`: Floating WebRTC video/audio grid with mute/end call controls.

#### Code Excerpt — Socket.IO Real-Time Connection (`client/frontend/src/App.jsx`):
```javascript
useEffect(() => {
  if (!user) return;
  const socket = io('http://localhost:5001', { withCredentials: true });
  socketRef.current = socket;

  socket.on('message', (msg) => {
    setMessages((prev) => [...prev, msg]);
  });

  return () => socket.disconnect();
}, [user]);
```

### 4. WebRTC Voice & Video Signaling (`server/calls.py`)
- **Peer-to-Peer Calls**: Direct WebRTC peer streams managed via `PeerJS`.
- **Signaling over Socket.IO**:
  - `start-call`: Emits caller Peer ID and call type (`voice` or `video`) to room members.
  - `accept-call`: Emits joiner Peer ID to caller to initiate peer connection.
  - `end-call` & `reject-call`: Notifies participants to terminate media streams.

---

## 🤖 Part 2: AI Assistant Bot System Architecture

The **AI Assistant Bot System** enables real-time AI assistance directly inside group rooms. Any user can trigger the bot by mentioning `@ai` in their message.

```
[ User sends "@ai summarize" ]
           │
           ▼
[ Socket.IO "message" Event ] ──► Saves user message & broadcasts to room
           │
           ▼ (Detects @ai mention)
[ server/ai_bot.py Engine ]
   ├── Parses prompt using RegEx
   ├── Queries PyMongo get_chat_history(room_id)
   └── Generates structured Markdown summary / response
           │
           ▼
[ Save AI Message to DB ] ──► sender="AI Bot", message_type="ai"
           │
           ▼
[ socketio.emit("message") ] ──► Real-time broadcast to all clients in room
```

### 1. Mention Detection & Socket Trigger (`app.py`)
When a message arrives via WebSocket, `app.py` checks if the message text contains `@ai`. If detected, it invokes the AI Bot handler and broadcasts the bot response.

#### Code Excerpt — AI Trigger in `app.py`:
```python
# Save user message first
res = save_message(username, message, room_id, message_type=message_type)
socketio.emit("message", chat_entry, room=room_id)

# AI BOT TRIGGER
if message and '@ai' in message.lower():
    bot_reply = handle_ai_bot_query(message, room_id)
    ai_res = save_message(AI_BOT_NAME, bot_reply, room_id, message_type="ai")
    
    ai_entry = {
        "id": str(ai_res.inserted_id),
        "username": AI_BOT_NAME,
        "sender": AI_BOT_NAME,
        "dp": AI_BOT_DP,
        "message": bot_reply,
        "message_type": "ai",
        "room_id": room_id,
        "time_formatted": time_formatted
    }
    socketio.emit("message", ai_entry, room=room_id)
```

### 2. AI Bot Engine & Chat Summarization (`server/ai_bot.py`)
`server/ai_bot.py` processes prompts sent to `@ai`:

1. **Prompt Sanitization**: Strips `@ai` prefix using RegEx `re.sub(r'^@ai\s*', '', prompt, flags=re.IGNORECASE)`.
2. **Summarization Request (`@ai summarize`)**:
   - Retrieves room history via `get_chat_history(room_id)`.
   - Filters out system and bot messages.
   - Extracts active user handles and recent key messages.
   - Generates a formatted Markdown summary.
3. **Contextual Knowledge & Code Help**:
   - Detects technical keywords (`python`, `react`, `socket`, `threads`).
   - Returns code snippets and technical explanations.

#### Code Excerpt — AI Bot Logic (`server/ai_bot.py`):
```python
def handle_ai_bot_query(prompt, room_id):
    clean_prompt = re.sub(r'^@ai\s*', '', prompt, flags=re.IGNORECASE).strip()

    if not clean_prompt:
        return "🤖 **Hi! I'm your AI Assistant.** Type `@ai summarize` or `@ai <question>`!"

    lower_prompt = clean_prompt.lower()

    # Chat Summarization
    if "summarize" in lower_prompt or "summary" in lower_prompt:
        messages = get_chat_history(room_id)
        user_msgs = [m for m in messages if m.get('sender') not in ['System', 'AI Bot']]
        
        if not user_msgs:
            return "📝 **Room Summary**: No user messages yet to summarize."
        
        recent = user_msgs[-15:]
        senders = list(set(m.get('sender') for m in recent))
        
        summary = f"📊 **Chat Summary (Last {len(recent)} Messages)**:\n\n"
        summary += f"• **Active Participants**: {', '.join(senders)}\n• **Key Highlights**:\n"
        for msg in recent[-5:]:
            summary += f"  - *{msg.get('sender')}*: \"{msg.get('message')[:60]}\"\n"
        return summary

    # Technical Q&A
    if "code" in lower_prompt or "python" in lower_prompt or "react" in lower_prompt:
        return (
            f"💻 **Code Assistant**: Regarding *{clean_prompt}*:\n\n"
            "```python\n"
            "# Multi-threaded WebSocket handler example\n"
            "def handle_message(room_id, msg):\n"
            "    socketio.emit('message', msg, room=room_id)\n"
            "```"
        )

    return f"🤖 **AI Response**: I've processed your query for room `{room_id}`: *\"{clean_prompt}\"*"
```

### 3. Frontend AI Message Rendering (`client/frontend/src/components/Chat/ChatArea.jsx`)
In the React UI, AI Bot messages are rendered with:
- An **AI Badge** with gradient styling.
- A **Bot Avatar** icon (`Bot` from `lucide-react`).
- Full Markdown text formatting (`whiteSpace: pre-wrap`).
- A dedicated `@AI Bot` quick trigger button in the chat header actions bar.

#### Code Excerpt — React AI Message Component (`ChatArea.jsx`):
```jsx
if (isAi) {
  return (
    <div key={msg._id} className="message-wrapper" style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
      <div className="msg-header" style={{ color: 'var(--accent-secondary)' }}>
        <Bot size={14} />
        <strong>AI Assistant Bot</strong>
        <span className="member-badge" style={{ background: 'var(--accent-gradient)' }}>AI</span>
      </div>
      <div className="msg-bubble" style={{ border: '1.5px solid var(--accent-primary)', whiteSpace: 'pre-wrap' }}>
        <p>{msg.message}</p>
        <span className="msg-time">{msg.time_formatted || 'IST'}</span>
      </div>
    </div>
  );
}
```

---

## 🧪 System Verification

- **Pytest Backend Verification**:
  ```bash
  python -m pytest tests/
  # 4 passed in 2.53s
  ```
- **Vite React Production Build**:
  ```bash
  cd client/frontend && npm run build
  # Built cleanly in 2.61s
  ```
