// var socket = io.connect('http://127.0.0.1:5001');
// socket.on('message', function(data) {
//     const chatBox = document.getElementById('chat-box');
//     const messageBubble = document.createElement('div');
//     messageBubble.className = 'message-bubble other'; // Adjust as needed
//     messageBubble.innerText = `${data.sender}: ${data.message}`;
//     chatBox.appendChild(messageBubble);
// });


// // Handle incoming messages
// socket.on('message', function(data) {
//     var messageContainer = document.getElementById("messages");
//     var li = document.createElement("li");
//     li.className = "message-bubble";
//     li.innerText = data;
//     messageContainer.appendChild(li);
// });

// // Send messages
// function sendMessage() {
//     var msg = document.getElementById("message").value;
//     if (msg.trim() !== "") {
//         socket.emit('message', msg);
//         document.getElementById("message").value = "";
//     }
// }

// // Dark Mode Toggle
// // document.getElementById("theme-toggle").addEventListener("click", function() {
// //     document.body.classList.toggle("dark-mode");
// // });


// // document.getElementById("theme-toggle").addEventListener("click", () => {
// //     console.log("Dark mode toggle clicked!");
// //     document.body.classList.toggle("dark-mode");
// // });


// const themeToggleButton = document.getElementById("theme-toggle");

// // Set initial state
// let isDarkMode = false;

// themeToggleButton.addEventListener("click", () => {
//     isDarkMode = !isDarkMode; // Toggle the mode
//     document.body.classList.toggle("dark-mode", isDarkMode);

//     // Update button text dynamically
//     themeToggleButton.textContent = isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode";
// });



// Establish WebSocket connection
const socket = io();

// Join a specific room
function joinRoom(roomId) {
    socket.emit('join_room', { room_id: roomId }); // Send the room ID to the server
    console.log(`Joined room: ${roomId}`);
}

// Send a message
function sendMessage() {
    const messageInput = document.getElementById('message-input'); // Get the input box
    const message = messageInput.value.trim(); // Get the entered message and remove whitespace

    // Validate the input to prevent errors
    if (!message) {
        console.error("Message cannot be empty!");
        return;
    }

    // Current room ID stored in a hidden input
    const roomId = document.getElementById('current-room-id').value;

    // Ensure room ID exists
    if (!roomId) {
        console.error("Room ID is missing!");
        return;
    }

    // Emit the message to the server
    socket.emit('message', {
        room_id: roomId, // Room ID
        message: message // Message content
    });

    // Clear the input field after sending
    messageInput.value = '';
}

// Listen for incoming messages from the server
socket.on('message', function(data) {
    const chatBox = document.getElementById('chat-box'); // Chat box container
    const messageBubble = document.createElement('div'); // Create a message bubble

    // Add styling and content to the message bubble
    messageBubble.className = data.sender === username ? 'message-bubble user' : 'message-bubble other'; // Different styling for user and others
    messageBubble.innerHTML = `
        <p><strong>${data.sender}</strong></p> <!-- Sender -->
        <p>${data.message}</p> <!-- Message content -->
    `;

    // Append the message bubble to the chat box
    chatBox.appendChild(messageBubble);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
});

// Handle room joining confirmation
socket.on('joined_room', function(data) {
    console.log(`You have joined room: ${data.room_id}`);
});

// Event listener for the send button
document.getElementById('send-button').addEventListener('click', sendMessage);

// Event listener for pressing Enter to send a message
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
