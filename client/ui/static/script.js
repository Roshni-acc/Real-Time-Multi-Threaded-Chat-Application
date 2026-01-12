// Initialize Socket.IO only if 'io' is defined (e.g., on the chat page)
let socket;
let myPeer;
let myPeerId;
let localStream;
let currentCalls = {}; // To manage multiple group participants
let callType = null; // 'video' or 'voice'

if (typeof io !== 'undefined') {
    socket = io();
    const activeRoomId = document.querySelector('.main-chat')?.getAttribute('data-room-id');
    if (activeRoomId && activeRoomId.length > 5) {
        socket.emit("join", { room: activeRoomId });
    }

    // Initialize PeerJS
    myPeer = new Peer(undefined, {
        host: '/',
        port: '5001', // We can use a custom port or PeerJS default
        path: '/peerjs' // This will be handled by the server if we set up a peer server, but PeerJS defaults to its own servers if config is empty
    });

    // In this implementation, we'll use PeerJS's free cloud server for simplicity
    myPeer = new Peer();

    myPeer.on('open', id => {
        myPeerId = id;
        console.log('My Peer ID is: ' + id);
    });

    myPeer.on('call', call => {
        // This is handled via the incoming-call-modal instead of automatic answering
        window.incomingCall = call;
    });
}

// Member Management
async function promoteMember(roomId, memberUsername) {
    showConfirm(
        "Promote Member?",
        `Make ${memberUsername} an admin?`,
        async () => {
            try {
                const response = await fetch(`/promote_member/${roomId}/${memberUsername}`);
                const result = await response.json();
                if (result.status) {
                    showToast(result.message);
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast(result.message, "error");
                }
            } catch (err) {
                showToast("Error promoting member", "error");
            }
        }
    );
}

async function kickMember(roomId, memberUsername) {
    showConfirm(
        "Kick Member?",
        `Remove ${memberUsername} from the room?`,
        async () => {
            try {
                const response = await fetch(`/kick_member/${roomId}/${memberUsername}`);
                const result = await response.json();
                if (result.status) {
                    showToast(result.message);
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast(result.message, "error");
                }
            } catch (err) {
                showToast("Error removing member", "error");
            }
        }
    );
}

async function leaveRoom(roomId) {
    showConfirm(
        "Leave Room?",
        "Are you sure you want to leave this chat room?",
        async () => {
            try {
                const response = await fetch(`/leave_room/${roomId}`, {
                    headers: { "X-Requested-With": "XMLHttpRequest" }
                });
                const result = await response.json();
                if (result.status) {
                    showToast(result.message);
                    setTimeout(() => window.location.href = result.data.redirect, 1000);
                } else {
                    showToast("Error leaving room", "error");
                }
            } catch (err) {
                showToast("Connection error", "error");
            }
        }
    );
}

// Room Renaming
function toggleRoomRename() {
    const display = document.getElementById("room-name-display");
    const container = document.getElementById("room-rename-input-container");
    const editBtn = document.querySelector(".edit-room-name-btn");

    if (display.style.display === "none") {
        display.style.display = "block";
        container.style.display = "none";
        if (editBtn) editBtn.style.display = "block";
    } else {
        display.style.display = "none";
        container.style.display = "flex";
        if (editBtn) editBtn.style.display = "none";
    }
}

async function saveRoomName(roomId) {
    const newName = document.getElementById("new-room-name").value.trim();
    if (!newName) return showToast("Room name cannot be empty", "error");

    try {
        const formData = new FormData();
        formData.append("room_name", newName);

        const response = await fetch(`/update_room_name/${roomId}`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        if (result.status) {
            showToast("Room renamed!");
            document.getElementById("room-name-display").textContent = newName;
            toggleRoomRename();
        } else {
            showToast(result.message, "error");
        }
    } catch (err) {
        showToast("Error renaming room", "error");
    }
}

// Room Deletion
let roomToDelete = null;

function deleteRoom(roomId) {
    showConfirm(
        "Delete Room?",
        "This action cannot be undone. All messages in this room will be permanently lost.",
        async () => {
            try {
                const response = await fetch(`/delete_room/${roomId}`);
                const result = await response.json();
                if (result.status) {
                    window.location.href = "/chat";
                } else {
                    showToast(result.message, "error");
                }
            } catch (err) {
                showToast("Error deleting room", "error");
            }
        }
    );
}

// Send Message
function sendMessage(type = "text", fileInfo = null) {
    if (!socket) return;
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();

    if (message || type === "file") {
        socket.emit("message", {
            message: message,
            message_type: type,
            file_info: fileInfo
        });
        messageInput.value = "";
    }
}

const sendBtn = document.getElementById("send-btn");
if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}

const messageInput = document.getElementById("message");
if (messageInput) {
    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
}

// Receive Message
if (socket) {
    socket.on("message", (data) => {
        const chatBox = document.getElementById("chat-box");
        if (!chatBox) return;

        const messageWrapper = document.createElement("div");
        const isSystem = data.username === "System" || data.message_type === "system";

        messageWrapper.className = `message-wrapper ${isSystem ? 'system-wrapper' : ''}`;

        if (isSystem) {
            messageWrapper.innerHTML = `<div class="system-message">${data.message}</div>`;
        } else if (data.message_type === "call") {
            const time = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
            const icon = data.message.includes('video') ? "📹" : "📞";
            messageWrapper.innerHTML = `
                <div class="message-header">
                    <img src="/static/uploads/${data.dp || '2.jpg'}" alt="DP" class="msg-dp">
                    <strong>${data.username}</strong>
                </div>
                <div class="message-bubble call-message">
                    <span>${icon} ${data.message}</span>
                    <span class="timestamp">${time}</span>
                </div>
            `;
        } else if (data.message_type === "sticker") {
            const time = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
            messageWrapper.innerHTML = `
                <div class="message-header">
                    <img src="/static/uploads/${data.dp || '2.jpg'}" alt="DP" class="msg-dp">
                    <strong>${data.username}</strong>
                </div>
                <div class="message-bubble sticker-bubble">
                    <img src="${data.message}" class="sticker-message">
                    <span class="timestamp">${time}</span>
                </div>
            `;
        } else {
            const time = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
            let content = `<p>${data.message}</p>`;

            if (data.message_type === "file" && data.file_info) {
                content = `
                    <div class="file-message">
                        📎 <a href="${data.file_info.url}" target="_blank" class="file-link">${data.file_info.filename}</a>
                    </div>
                `;
            }

            messageWrapper.innerHTML = `
                <div class="message-header">
                    <img src="/static/uploads/${data.dp || '2.jpg'}" alt="DP" class="msg-dp">
                    <strong>${data.username}</strong>
                </div>
                <div class="message-bubble">
                    ${content}
                    <span class="timestamp">${time}</span>
                </div>
            `;
        }

        chatBox.appendChild(messageWrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    socket.on("user_kicked", (data) => {
        // If the kicked user is me, redirect
        if (typeof currentUsername !== 'undefined' && data.username === currentUsername) {
            showToast("You have been removed from the room.", "error");
            setTimeout(() => window.location.href = "/chat", 2000);
        }
    });

    socket.on("room_deleted", (data) => {
        showToast(data.message, "error");
        setTimeout(() => window.location.href = "/chat", 3000);
    });

    // --- CALLING EVENTS ---
    socket.on("call-started", (data) => {
        // Targeted call: only show if it's for me OR if it's a group call (data.to is null)
        if (data.to && data.to !== currentUsername) return;

        const modal = document.getElementById("incoming-call-modal");
        const callerName = document.getElementById("caller-name");
        const callTypeText = document.getElementById("call-type-text");

        callerName.textContent = `${data.caller} is calling...`;
        callTypeText.textContent = data.callType === 'video' ? "Incoming Video Call" : "Incoming Voice Call";
        modal.classList.add("show");

        // Set up accept button
        document.getElementById("accept-call-btn").onclick = () => {
            acceptCall(data.peerId, data.callType);
            modal.classList.remove("show");
        };

        // Set up reject button
        document.getElementById("reject-call-btn").onclick = () => {
            socket.emit("reject-call", { to: data.caller });
            modal.classList.remove("show");
        };
    });

    socket.on("call-accepted", (data) => {
        const statusText = document.getElementById("call-status-text");
        if (statusText) statusText.textContent = "Connected";
        setTimeout(() => {
            const statusOverlay = document.getElementById("call-status");
            if (statusOverlay) statusOverlay.style.display = "none";
        }, 2000);

        if (localStream) {
            connectToNewUser(data.peerId, data.joiner, localStream);
        }
    });

    socket.on("user-left-call", (data) => {
        showToast(`${data.username} left the call`, "info");
        const video = document.getElementById(`video-${data.username}`);
        if (video) video.remove();
        if (currentCalls[data.username]) {
            currentCalls[data.username].close();
            delete currentCalls[data.username];
        }
    });

    socket.on("call-rejected", (data) => {
        showToast(`${data.username} declined the call`, "error");
    });
}

// --- CORE CALLING FUNCTIONS ---
async function startCall(type, targetUser = null) {
    if (!myPeerId) return showToast("Initializing connection, please wait...", "warning");

    callType = type;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video',
            audio: true
        });

        document.getElementById("call-overlay").classList.add("show");
        const statusOverlay = document.getElementById("call-status");
        if (statusOverlay) {
            statusOverlay.style.display = "block";
            document.getElementById("call-status-text").textContent = targetUser ? `Calling ${targetUser}` : "Calling Group";
        }
        addVideoStream(null, localStream, currentUsername); // Add local video

        socket.emit("start-call", {
            peerId: myPeerId,
            callType: type,
            to: targetUser
        });

        setupControls();
    } catch (err) {
        console.error(err);
        showToast("Could not access camera/microphone", "error");
    }
}

async function acceptCall(peerId, type) {
    callType = type;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video',
            audio: true
        });

        document.getElementById("call-overlay").classList.add("show");
        addVideoStream(null, localStream, currentUsername);

        const call = myPeer.call(peerId, localStream);
        call.on('stream', userVideoStream => {
            addVideoStream(null, userVideoStream, "Caller"); // We'll fix names later
        });

        socket.emit("accept-call", {
            peerId: myPeerId,
            to: "Caller" // Simplified
        });

        setupControls();
    } catch (err) {
        showToast("Error joining call", "error");
    }
}

function connectToNewUser(peerId, username, stream) {
    // Check for 5 person limit for video
    if (callType === 'video' && Object.keys(currentCalls).length >= 4) {
        return showToast("Video call limit (5) reached", "warning");
    }

    const call = myPeer.call(peerId, stream);
    call.on('stream', userVideoStream => {
        addVideoStream(null, userVideoStream, username);
    });
    call.on('close', () => {
        const vid = document.getElementById(`video-${username}`);
        if (vid) vid.remove();
    });

    currentCalls[username] = call;
}

// PeerJS listener for incoming streams
if (myPeer) {
    myPeer.on('call', call => {
        if (!localStream) return; // Only if we accepted elsewhere or auto-accepting for simplicity here
        call.answer(localStream);
        call.on('stream', userVideoStream => {
            addVideoStream(null, userVideoStream, "Member");
        });
    });
}

function addVideoStream(video, stream, username) {
    if (!video) video = document.createElement('video');
    video.srcObject = stream;
    video.id = `video-${username}`;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    const grid = document.getElementById('video-grid');
    if (grid) grid.append(video);
}

function setupControls() {
    document.getElementById("end-call-btn").onclick = endCall;

    document.getElementById("toggle-mic").onclick = () => {
        const audioTrack = localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        document.getElementById("toggle-mic").textContent = audioTrack.enabled ? "🎙️" : "🔇";
    };

    document.getElementById("toggle-video").onclick = () => {
        if (callType === 'voice') return;
        const videoTrack = localStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        document.getElementById("toggle-video").textContent = videoTrack.enabled ? "📹" : "📷";
    };
}

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    socket.emit("end-call");
    document.getElementById("call-overlay").classList.remove("show");
    document.getElementById("video-grid").innerHTML = "";
    Object.values(currentCalls).forEach(call => call.close());
    currentCalls = {};
    localStream = null;
    showToast("Call ended");
}

// Sticker Implementation
const stickers = [
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1ZjR4N3I4N3R4N3R4N3R4N3R4N3R4N3R4N3R4N3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVun7XYUC6p7u8/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1ZjR4N3I4N3R4N3R4N3R4N3R4N3R4N3R4N3R4N3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKUR9H5y4P4mP9m/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1ZjR4N3I4N3R4N3R4N3R4N3R4N3R4N3R4N3R4N3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVUn7XYUC6p7u8/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1ZjR4N3I4N3R4N3R4N3R4N3R4N3R4N3R4N3R4N3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVxn7XYUC6p7u8/giphy.gif"
];

function switchPickerTab(tab) {
    const emojiList = document.getElementById("emoji-list");
    const stickerList = document.getElementById("sticker-list");
    const tabs = document.querySelectorAll(".picker-tab");

    tabs.forEach(t => t.classList.remove("active"));
    if (tab === 'emojis') {
        emojiList.style.display = "grid";
        stickerList.style.display = "none";
        tabs[0].classList.add("active");
    } else {
        emojiList.style.display = "none";
        stickerList.style.display = "grid";
        tabs[1].classList.add("active");
        loadStickers();
    }
}

function loadStickers() {
    const list = document.getElementById("sticker-list");
    if (list.children.length > 0) return;

    stickers.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.className = "sticker-item";
        img.onclick = () => sendSticker(url);
        list.appendChild(img);
    });
}

function sendSticker(url) {
    if (!socket) return;
    socket.emit("message", {
        message: url,
        message_type: "sticker"
    });
    toggleEmojiPicker();
}

// Ensure emoji picker click handling works with the new structure
document.addEventListener("DOMContentLoaded", () => {
    const emojiList = document.querySelector("#emoji-list");
    if (emojiList) {
        emojiList.addEventListener("click", (e) => {
            if (e.target.tagName === "SPAN") {
                const messageInput = document.getElementById("message");
                messageInput.value += e.target.textContent;
                messageInput.focus();
            }
        });
    }
});
function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-modal-title");
    const messageEl = document.getElementById("confirm-modal-message");
    const confirmBtn = document.getElementById("confirm-modal-btn");

    if (!modal) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add("show");

    // Replace click listener
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener("click", () => {
        onConfirm();
        closeConfirmModal();
    });
}

function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (modal) modal.classList.remove("show");
}

// Toast Notifications
function showToast(message, type = "success") {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    // Fallback if message is empty or null
    toast.textContent = message || (type === "error" ? "Something went wrong. Please try again." : "Action successful!");
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3000);
}

// Handle Forms
document.addEventListener("DOMContentLoaded", () => {
    // Restore Theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }

    const forms = {
        register: document.getElementById("register-form"),
        login: document.getElementById("login-form"),
        joinCode: document.getElementById("join-code-form"),
        createRoom: document.getElementById("create-room-form"),
        upload: document.getElementById("upload-form"),
        profileDetails: document.getElementById("profile-details-form"),
        forgotPassword: document.getElementById("forgot-password-form"),
        resetPassword: document.getElementById("reset-password-form")
    };



    const clearErrors = (form) => {
        form.querySelectorAll('.error-text').forEach(el => el.textContent = '');
        form.querySelectorAll('input').forEach(el => el.classList.remove('input-error'));
    };

    const showError = (form, fieldName, message) => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('input-error');
            const errorSpan = field.parentElement.querySelector('.error-text');
            if (errorSpan) errorSpan.textContent = message;
        }
    };

    const handleForm = async (form, redirectUrl = null) => {
        if (!form) return;
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearErrors(form);

            const formData = new FormData(form);
            const action = form.getAttribute("action");

            // Basic Field Validation
            let hasError = false;
            form.querySelectorAll('input[required]').forEach(input => {
                if (!input.value.trim()) {
                    showError(form, input.name, "This field is required.");
                    hasError = true;
                }
            });

            if (action === "/register") {
                const email = formData.get("email");
                if (email && (!email.includes("@") || !email.includes("."))) {
                    showError(form, "email", "Please enter a valid email address.");
                    hasError = true;
                }
                const pass = formData.get("password");
                const confirm = formData.get("confirm_password");
                if (pass !== confirm) {
                    showError(form, "confirm_password", "Passwords do not match.");
                    hasError = true;
                }
            }

            if (hasError) return;

            try {
                const response = await fetch(action, {
                    method: "POST",
                    body: formData,
                    headers: { "X-Requested-With": "XMLHttpRequest" }
                });

                const result = await response.json().catch(() => ({ status: false, message: "The server sent an invalid response." }));

                if (result.status) {
                    if (result.data.redirect) window.location.href = result.data.redirect;
                    else if (redirectUrl) window.location.href = redirectUrl;
                    else window.location.reload();
                } else {
                    // Try to map error to specific fields if possible, otherwise use Toast
                    if (result.message.toLowerCase().includes("username")) showError(form, "username", result.message);
                    else if (result.message.toLowerCase().includes("email")) showError(form, "email", result.message);
                    else if (result.message.toLowerCase().includes("password")) showError(form, "password", result.message);
                    else showToast(result.message || "An unexpected error occurred.", "error");
                }
            } catch (err) {
                showToast("Connection lost. Are you online?", "error");
            }
        });
    };

    handleForm(forms.register);
    handleForm(forms.login);
    handleForm(forms.joinCode, "/chat");
    handleForm(forms.createRoom, "/chat");
    handleForm(forms.upload);
    handleForm(forms.profileDetails);
    handleForm(forms.forgotPassword);
    handleForm(forms.resetPassword);

    // Emoji Picker
    const emojiBtn = document.getElementById("emoji-btn");
    const emojiPicker = document.getElementById("emoji-picker");
    const messageInput = document.getElementById("message");

    if (emojiBtn && emojiPicker) {
        emojiBtn.addEventListener("click", () => {
            emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
        });

        document.querySelectorAll(".emoji-list span").forEach(span => {
            span.addEventListener("click", () => {
                messageInput.value += span.textContent;
                emojiPicker.style.display = "none";
                messageInput.focus();
            });
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
                emojiPicker.style.display = "none";
            }
        });
    }

    // File Upload
    const attachBtn = document.getElementById("attach-btn");
    const fileInput = document.getElementById("file-input");

    if (attachBtn && fileInput) {
        attachBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async () => {
            if (fileInput.files.length === 0) return;

            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("file", file);

            try {
                showToast("Uploading file...", "info");
                const response = await fetch("/upload_chat_file", {
                    method: "POST",
                    body: formData
                });
                const result = await response.json();

                if (result.status) {
                    sendMessage("file", {
                        filename: result.data.filename,
                        url: result.data.url
                    });
                    showToast("File sent!");
                } else {
                    showToast(result.message, "error");
                }
            } catch (err) {
                showToast("Error uploading file", "error");
            }
            fileInput.value = ""; // Reset
        });
    }

    // Theme Toggle
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            const isDark = document.body.classList.contains("dark-mode");
            localStorage.setItem("theme", isDark ? "dark" : "light");
        });
    }
});
