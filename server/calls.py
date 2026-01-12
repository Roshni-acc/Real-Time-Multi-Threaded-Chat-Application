from flask import session
from flask_socketio import emit, join_room, leave_room
from server.database import save_message

def register_call_events(socketio):
    """
    This function registers all the events needed for Video and Voice calls.
    It keeps the logic simple and separated from the main app.py.
    """

    @socketio.on("start-call")
    def handle_start_call(data):
        """
        When a user clicks the call button, this tells everyone in the room
        that a call is starting and provides the caller's Peer ID.
        """
        room_id = session.get('room_id')
        username = session.get('username')
        if room_id:
            # Save call start to database
            call_type = data.get("callType", 'voice')
            msg = f"Started a {call_type} call"
            if data.get("to"):
                msg = f"Started a private {call_type} call with {data.get('to')}"
            save_message(username, msg, room_id, message_type="call")

            # Broadcast to everyone in the room except the sender
            # If 'to' is provided, we still broadcast but clients will filter
            emit("call-started", {
                "caller": username,
                "peerId": data.get("peerId"),
                "callType": call_type,
                "to": data.get("to") # Targeted user
            }, room=room_id, include_self=False)

    @socketio.on("accept-call")
    def handle_accept_call(data):
        """
        When a user joins an existing call, they share their Peer ID
        with the caller so they can connect directly.
        """
        caller_username = data.get("to")
        # We need to send this specifically to the caller
        # In this simple version, we broadcast it to the room, 
        # but clients check if the 'to' matches them.
        room_id = session.get('room_id')
        if room_id:
            emit("call-accepted", {
                "joiner": session.get('username'),
                "peerId": data.get("peerId")
            }, room=room_id)

    @socketio.on("end-call")
    def handle_end_call(data):
        """
        Tells others that a user has left the call.
        """
        room_id = session.get('room_id')
        username = session.get('username')
        if room_id:
            # Optionally save end call message
            # save_message(username, "Left the call", room_id, message_type="system")
            
            emit("user-left-call", {
                "username": username
            }, room=room_id)

    @socketio.on("reject-call")
    def handle_reject_call(data):
        """
        Tells the caller that their call was declined.
        """
        room_id = session.get('room_id')
        if room_id:
            emit("call-rejected", {
                "username": session.get('username')
            }, room=room_id)

    @socketio.on("signal-check")
    def handle_signal_check(data):
        """
        Security: This event can be used by the client to verify 
        if the room still exists and if they are allowed to call.
        """
        room_id = session.get('room_id')
        username = session.get('username')
        if not room_id or not username:
             return emit("error", {"message": "Unauthorized signaling attempt."})
        # Additional DB checks can be added here

