// // var socket = io.connect('http://127.0.0.1:5001');
// // socket.on('message', function(data) {
// //     const chatBox = document.getElementById('chat-box');
// //     const messageBubble = document.createElement('div');
// //     messageBubble.className = 'message-bubble other'; // Adjust as needed
// //     messageBubble.innerText = `${data.sender}: ${data.message}`;
// //     chatBox.appendChild(messageBubble);
// // });


// // // Handle incoming messages
// // socket.on('message', function(data) {
// //     var messageContainer = document.getElementById("messages");
// //     var li = document.createElement("li");
// //     li.className = "message-bubble";
// //     li.innerText = data;
// //     messageContainer.appendChild(li);
// // });

// // // Send messages
// // function sendMessage() {
// //     var msg = document.getElementById("message").value;
// //     if (msg.trim() !== "") {
// //         socket.emit('message', msg);
// //         document.getElementById("message").value = "";
// //     }
// // }

// // // Dark Mode Toggle
// // // document.getElementById("theme-toggle").addEventListener("click", function() {
// // //     document.body.classList.toggle("dark-mode");
// // // });


// // // document.getElementById("theme-toggle").addEventListener("click", () => {
// // //     console.log("Dark mode toggle clicked!");
// // //     document.body.classList.toggle("dark-mode");
// // // });


// // const themeToggleButton = document.getElementById("theme-toggle");

// // // Set initial state
// // let isDarkMode = false;

// // themeToggleButton.addEventListener("click", () => {
// //     isDarkMode = !isDarkMode; // Toggle the mode
// //     document.body.classList.toggle("dark-mode", isDarkMode);

// //     // Update button text dynamically
// //     themeToggleButton.textContent = isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode";
// // });



// // Establish WebSocket connection
// const socket = io();

// // join the room 
// const room = "{{ room_id }}";
// const username = sessionStorage.getItem("username");
// const dp = sessionStorage.getItem("dp") || "ui//static/uploads/2.jpg";
// socket.emit("join", { username: username, room: room });


// // send message 
// // Send message
// function sendMessage() {
//     const messageInput = document.getElementById("message");
//     const message = messageInput.value.trim();

//     if (message) {
//         socket.emit("message", {
//             username: username,
//             dp: dp,
//             room: room,
//             message: message
//         });
//         messageInput.value = ""; // Clear input
//     }
// }

// // Receive messages
// socket.on("message", function (data) {

//     if (data && data.username && data.dp && data.message) {
//     const chatBox = document.querySelector(".chat-box");
//     const messageDiv = document.createElement("div");
//     messageDiv.classList.add("message");

//     messageDiv.innerHTML = `
//         <div class="profile">
//             <img src="${data.dp}" alt="2.jpg" class="profile-pic">
//             <strong>${data.username}</strong>
//         </div>
//         <p>${data.message}</p>
//     `;
//     chatBox.appendChild(messageDiv);
//     chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
//     }
//     else{
//         console.error("Invalid message data received:", data);  
//     }
// });

// document.getElementById("create-room").addEventListener("click", function () {
//     const roomName = prompt("Enter Room Name:");
//     if (roomName) {
//         fetch('/create_room', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ room_name: roomName })
//         }).then(response => response.json())
//           .then(data => {
//               if (data.success) {
//                   window.location.href = `/join_room/${data.room_id}`;
//               }
//           });
//     }
// });


// document.getElementById("logout").addEventListener("click", function () {
//     fetch('/logout', { method: 'POST', credentials: 'include' })
//         .then(response => {
//             if (response.ok) {
//                 window.location.href = '/'; // Redirect to the home page
//             }
//         })
//         .catch(error => console.error("Logout failed:", error));
// });


// // Logout functionality
// document.getElementById("logout").addEventListener("click", function () {
//     sessionStorage.clear();
//     window.location.href = "/";
// });


// document.getElementById("update-profile").addEventListener("click", function () {
//     const modal = document.getElementById("profile-modal");
//     modal.style.display = "block"; // Show modal
// });

// document.getElementById("profile-form").addEventListener("submit", function (e) {
//     e.preventDefault();
//     const usernameInput = document.getElementById("username");
//     const dpInput = document.getElementById("dp");

//     sessionStorage.setItem("username", usernameInput.value);
//     sessionStorage.setItem("dp", dpInput.value);
//     alert("Profile updated!");
//     document.getElementById("profile-modal").style.display = "none"; // Hide modal
// });


// // previous one startd from here 

// // Join a specific room
// function joinRoom(roomId) {
//     socket.emit('join_room', { room_id: roomId }); // Send the room ID to the server
//     console.log(`Joined room: ${roomId}`);
// }

// // Send a message
// function sendMessage() {
//     const messageInput = document.getElementById('message-input'); // Get the input box
//     const message = messageInput.value.trim(); // Get the entered message and remove whitespace

//     // Validate the input to prevent errors
//     if (!message) {
//         console.error("Message cannot be empty!");
//         return;
//     }

//     // Current room ID stored in a hidden input
//     const roomId = document.getElementById('current-room-id').value;

//     // Ensure room ID exists
//     if (!roomId) {
//         console.error("Room ID is missing!");
//         return;
//     }

//     // Emit the message to the server
//     socket.emit('message', {
//         room_id: roomId, // Room ID
//         message: message // Message content
//     });

//     // Clear the input field after sending
//     messageInput.value = '';
// }

// // Listen for incoming messages from the server
// socket.on('message', function(data) {
//     const chatBox = document.getElementById('chat-box'); // Chat box container
//     const messageBubble = document.createElement('div'); // Create a message bubble

//     // Add styling and content to the message bubble
//     messageBubble.className = data.sender === username ? 'message-bubble user' : 'message-bubble other'; // Different styling for user and others
//     messageBubble.innerHTML = `
//         <p><strong>${data.sender}</strong></p> <!-- Sender -->
//         <p>${data.message}</p> <!-- Message content -->
//     `;

//     // Append the message bubble to the chat box
//     chatBox.appendChild(messageBubble);
//     chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
// });

// // Handle room joining confirmation
// socket.on('joined_room', function(data) {
//     console.log(`You have joined room: ${data.room_id}`);
// });

// // Event listener for the send button
// document.getElementById('send-button').addEventListener('click', sendMessage);

// // Event listener for pressing Enter to send a message
// document.addEventListener('keypress', function(event) {
//     if (event.key === 'Enter') {
//         sendMessage();
//     }
// });




// Establish WebSocket connection
const socket = io();

// Join the room
const room = "{{ room_id }}"; // Dynamic room ID from backend
const username = sessionStorage.getItem("username");
const dp = sessionStorage.getItem("dp") || "/static/uploads/2.jpg"; // Default profile picture if not set
socket.emit("join", { username: username, room: room });

// Send a message
function sendMessage() {
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();

    if (message) {
        // Emit the message to the server
        socket.emit("message", {
            username: username,
            dp: dp,
            room: room,
            message: message
        });
        // Clear the input field after sending
        messageInput.value = "";
    } else {
        console.error("Cannot send an empty message!");
    }
}

// Receive messages
socket.on("message", function (data) {
    // Check if the data received is valid
    if (data && data.username && data.dp && data.message) {
        const chatBox = document.querySelector(".chat-box");

        // Create a new message bubble
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");

        // Populate the message bubble with user info and message content
        messageDiv.innerHTML = `
            <div class="profile">
                <img src="${data.dp}" alt="Profile Photo" class="profile-pic">
                <strong>${data.username}</strong>
            </div>
            <p>${data.message}</p>
        `;

        // Append the message bubble to the chat box
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
    } else {
        console.error("Invalid message data received:", data);
    }
});

// Create a new room
document.getElementById("create-room").addEventListener("click", function () {
    const roomName = prompt("Enter Room Name:");
    if (roomName) {
        fetch('/create_room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_name: roomName })
        }).then(response => response.json())
          .then(data => {
              if (data.success) {
                  window.location.href = `/join_room/${data.room_id}`;
              }
          });
    }
});

// Logout functionality
document.getElementById("logout").addEventListener("click", function () {
    fetch('/logout', { method: 'POST', credentials: 'include' })
        .then(response => {
            if (response.ok) {
                window.location.href = '/'; // Redirect to the login page
            }
        })
        .catch(error => console.error("Logout failed:", error));
});

// Dark Mode Toggle
// Dark Mode Toggle Functionality
const themeToggleButton = document.getElementById("theme-toggle");

// Track whether dark mode is enabled
let isDarkMode = false;

themeToggleButton.addEventListener("click", () => {
    isDarkMode = !isDarkMode; // Toggle the state

    // Add or remove the "dark-mode" class to the <body>
    document.body.classList.toggle("dark-mode", isDarkMode);

    // Dynamically update the button text based on mode
    themeToggleButton.textContent = isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode";
});

// Update profile modal functionality
document.getElementById("update-profile").addEventListener("click", function () {
    const modal = document.getElementById("profile-modal");
    modal.style.display = "block"; // Show modal
});

document.getElementById("profile-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const usernameInput = document.getElementById("username");
    const dpInput = document.getElementById("dp");

    // Save updated profile data in sessionStorage
    sessionStorage.setItem("username", usernameInput.value);
    sessionStorage.setItem("dp", dpInput.value);

    alert("Profile updated!");
    document.getElementById("profile-modal").style.display = "none"; // Hide modal
});

// Join a specific room
function joinRoom(roomId) {
    socket.emit("join_room", { room_id: roomId }); // Emit room ID to server
    console.log(`Joined room: ${roomId}`);
}

// Event listener for pressing Enter to send a message
document.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendMessage(); // Trigger sendMessage function on Enter key press
    }
});




