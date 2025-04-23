var socket = io.connect('http://127.0.0.1:5001');

// Handle incoming messages
socket.on('message', function(data) {
    var messageContainer = document.getElementById("messages");
    var li = document.createElement("li");
    li.className = "message-bubble";
    li.innerText = data;
    messageContainer.appendChild(li);
});

// Send messages
function sendMessage() {
    var msg = document.getElementById("message").value;
    if (msg.trim() !== "") {
        socket.emit('message', msg);
        document.getElementById("message").value = "";
    }
}

// Dark Mode Toggle
document.getElementById("theme-toggle").addEventListener("click", function() {
    document.body.classList.toggle("dark-mode");
});
