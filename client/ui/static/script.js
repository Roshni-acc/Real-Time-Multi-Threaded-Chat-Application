const socket = io();

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const roomId = '123'; // Replace with the correct dynamic room ID
    const message = messageInput.value;

    if (!message) {
        console.error("Message is empty. Cannot send.");
        return;
    }

    // Send the message as a JSON object
    socket.emit('message', {
        room_id: roomId,    // Room ID
        message: message    // The message content
    });

    messageInput.value = ''; // Clear the input box after sending
}

// var socket = io.connect('http://127.0.0.1:5001');

// // Handle incoming messages
// socket.on('message', function(data) {
//     var messageContainer = document.getElementById("messages");
//     var li = document.createElement("li");
//     li.className = "message-bubble";
//     li.innerText = data;
//     messageContainer.appendChild(li);
// });

// Send messages
function sendMessage() {
    var msg = document.getElementById("message").value;
    if (msg.trim() !== "") {
        socket.emit('message', msg);
        document.getElementById("message").value = "";
    }
}

// Dark Mode Toggle
// document.getElementById("theme-toggle").addEventListener("click", function() {
//     document.body.classList.toggle("dark-mode");
// });


// Dark mode toggle logic
const themeToggleButton = document.getElementById("theme-toggle");

// Set initial state
let isDarkMode = false;

themeToggleButton.addEventListener("click", () => {
    isDarkMode = !isDarkMode; // Toggle the mode
    document.body.classList.toggle("dark-mode", isDarkMode);

    // Update button text dynamically
    themeToggleButton.textContent = isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode";
});

