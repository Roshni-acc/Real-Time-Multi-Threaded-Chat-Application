// Initialize Socket.IO only if 'io' is defined (e.g., on the chat page)
let socket;
if (typeof io !== 'undefined') {
    socket = io();
    const activeRoomId = document.querySelector('.main-chat')?.getAttribute('data-room-id');
    if (activeRoomId && activeRoomId.length > 5) {
        socket.emit("join", { room: activeRoomId });
    }
}

// Member Management
async function promoteMember(roomId, memberUsername) {
    if (!confirm(`Make ${memberUsername} an admin?`)) return;
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

async function kickMember(roomId, memberUsername) {
    if (!confirm(`Remove ${memberUsername} from the room?`)) return;
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
    roomToDelete = roomId;
    const modal = document.getElementById("delete-modal");
    if (modal) modal.classList.add("show");
}

function closeDeleteModal() {
    const modal = document.getElementById("delete-modal");
    if (modal) modal.classList.remove("show");
    roomToDelete = null;
}

// Send Message
function sendMessage() {
    if (!socket) return;
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();

    if (message) {
        socket.emit("message", {
            message: message
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
        messageWrapper.className = "message-wrapper";

        const isSystem = data.username === "System";

        if (isSystem) {
            messageWrapper.innerHTML = `<div class="system-message">${data.message}</div>`;
        } else {
            const time = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
            messageWrapper.innerHTML = `
                <div class="message-header">
                    <img src="/static/uploads/${data.dp}" alt="DP" class="msg-dp">
                    <strong>${data.username}</strong>
                </div>
                <div class="message-bubble">
                    <p>${data.message}</p>
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
        profileDetails: document.getElementById("profile-details-form")
    };

    const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async () => {
            if (!roomToDelete) return;
            try {
                const response = await fetch(`/delete_room/${roomToDelete}`);
                const result = await response.json();
                if (result.status) {
                    window.location.href = "/chat";
                } else {
                    showToast(result.message, "error");
                    closeDeleteModal();
                }
            } catch (err) {
                showToast("Error deleting room", "error");
                closeDeleteModal();
            }
        });
    }

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
