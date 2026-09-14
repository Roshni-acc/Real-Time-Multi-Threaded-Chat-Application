import os
import re
import json
import urllib.request
from server.database import get_chat_history

AI_BOT_NAME = "AI Bot"
AI_BOT_DP = "/static/uploads/ai_bot.png"

# Common Acronyms & Terms Dictionary
ACRONYMS = {
    "iykyk": "**IYKYK** stands for **\"If You Know You Know\"**. Used to reference an inside joke, shared knowledge, or secret known only to a specific group.",
    "asap": "**ASAP** stands for **\"As Soon As Possible\"**. It is used to convey urgency when requesting a task or action.",
    "fyi": "**FYI** stands for **\"For Your Information\"**. Used to share information without requiring an immediate action.",
    "eta": "**ETA** stands for **\"Estimated Time of Arrival\"**. Refers to expected completion or arrival time.",
    "tbd": "**TBD** stands for **\"To Be Determined\"**. Used when details are not yet finalized.",
    "tbh": "**TBH** stands for **\"To Be Honest\"**.",
    "nvm": "**NVM** stands for **\"Never Mind\"**.",
    "idk": "**IDK** stands for **\"I Don't Know\"**.",
    "imo": "**IMO** stands for **\"In My Opinion\"** (or **IMHO** for \"In My Humble Opinion\").",
    "btw": "**BTW** stands for **\"By The Way\"**.",
    "afk": "**AFK** stands for **\"Away From Keyboard\"**.",
    "brb": "**BRB** stands for **\"Be Right Back\"**.",
    "smh": "**SMH** stands for **\"Shaking My Head\"**, expressing disappointment or disbelief.",
    "tldr": "**TL;DR** stands for **\"Too Long; Didn't Read\"**, used to introduce a short summary of a long message.",
    "wip": "**WIP** stands for **\"Work In Progress\"**.",
    "pr": "**PR** stands for **\"Pull Request\"** in software development.",
    "bug": "A **Bug** is an error, flaw, or fault in software that causes it to produce incorrect results or behave unexpectedly.",
    "api": "**API** stands for **\"Application Programming Interface\"**, allowing different software applications to communicate with each other.",
    "faq": "**FAQ** stands for **\"Frequently Asked Questions\"**.",
    "aka": "**AKA** stands for **\"Also Known As\"**.",
    "lmk": "**LMK** stands for **\"Let Me Know\"**.",
    "lgtm": "**LGTM** stands for **\"Looks Good To Me\"**, commonly used in code reviews and pull requests.",
    "lmgtfy": "**LMGTFY** stands for **\"Let Me Google That For You\"**.",
    "lmao": "**LMAO** stands for **\"Laughing My Ass Off\"**.",
    "lol": "**LOL** stands for **\"Laugh Out Loud\"**.",
    "rofl": "**ROFL** stands for **\"Rolling On Floor Laughing\"**.",
    "np": "**NP** stands for **\"No Problem\"**."
}

def query_gemini_api(prompt):
    """
    Optional: Calls Google Gemini API if GEMINI_API_KEY is defined in .env
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [{"text": f"You are a helpful AI Assistant in a real-time chat app. Keep answers concise and helpful (max 150 words). User prompt: {prompt}"}]
        }]
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            candidates = res_data.get('candidates', [])
            if candidates:
                parts = candidates[0].get('content', {}).get('parts', [])
                if parts:
                    return parts[0].get('text', '').strip()
    except Exception as e:
        print(f"Gemini API error: {e}")
    return None


def handle_ai_bot_query(prompt, room_id):
    """
    Processes queries sent to @ai in chat rooms.
    Uses room summarization, built-in definitions, and optional Gemini AI API.
    """
    clean_prompt = re.sub(r'^@ai\s*', '', prompt, flags=re.IGNORECASE).strip()
    
    if not clean_prompt:
        return (
            "🤖 **Hi! I'm your room's AI Assistant.**\n\n"
            "Here is how you can use me:\n"
            "- Type `@ai summarize` to get a summary of recent room messages.\n"
            "- Type `@ai <your question>` to ask me anything (e.g. `@ai meaning of asap`, `@ai explain python asyncio`)!"
        )
    
    lower_prompt = clean_prompt.lower()
    
    # 1. Summarization Feature
    if "summarize" in lower_prompt or "summary" in lower_prompt:
        messages = get_chat_history(room_id)
        user_msgs = [
            m for m in messages 
            if m.get('sender') not in ['System', 'AI Bot'] and m.get('message_type') == 'text'
        ]
        
        if not user_msgs:
            return "📝 **Room Summary**: There are no user messages in this room yet to summarize."
        
        recent = user_msgs[-15:]
        senders = list(set(m.get('sender') for m in recent))
        
        summary = (
            f"📊 **Chat Summary (Last {len(recent)} Messages)**:\n\n"
            f"• **Active Participants**: {', '.join(senders)}\n"
            f"• **Key Highlights**:\n"
        )
        for msg in recent[-5:]:
            summary += f"  - *{msg.get('sender')}*: \"{msg.get('message')[:60]}\"\n"
            
        summary += "\n💡 *Tip: Ask me follow-up questions anytime by typing `@ai <question>`!*"
        return summary

    # 2. Acronym & Term Dictionary Lookup
    for key, val in ACRONYMS.items():
        if key in lower_prompt:
            return f"💡 {val}"

    # 3. Optional External Gemini LLM Query (if GEMINI_API_KEY is set)
    gemini_reply = query_gemini_api(clean_prompt)
    if gemini_reply:
        return f"🤖 **AI Assistant**:\n\n{gemini_reply}"

    # 4. Tech / Code Assistance Fallback
    if "socket" in lower_prompt or "thread" in lower_prompt:
        return (
            "🧠 **Multi-Threaded Real-Time Architecture**:\n"
            "This chat application uses Flask-SocketIO with non-blocking event loops and worker threads. "
            "Messages are broadcast instantly to all connected WebSocket clients in the room with sub-millisecond latency!"
        )

    if "code" in lower_prompt or "python" in lower_prompt or "react" in lower_prompt:
        return (
            f"💻 **Code Assistant**: Regarding *{clean_prompt}*:\n\n"
            "```python\n"
            "# Multi-threaded WebSocket handler example\n"
            "def handle_message(room_id, msg):\n"
            "    socketio.emit('message', msg, room=room_id)\n"
            "```\n"
            "Let me know if you need specific code examples or debugging assistance!"
        )

    # 5. Default Friendly AI Response
    return (
        f"🤖 **AI Assistant Response**:\n\n"
        f"I've analyzed your query: *\"{clean_prompt}\"*\n\n"
        f"For quick group recaps, type `@ai summarize`. You can also set a `GEMINI_API_KEY` in `.env` to enable full Google Gemini LLM responses!"
    )
