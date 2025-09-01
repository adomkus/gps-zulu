// Chat functionality - consolidated from messages.js and chat parts from index.html
(function(){
    const perf = window.perf;

    // === CHAT MANAGEMENT ===
    function showChat(roomId, roomName) {
    const chatView = window.el && window.el.chatView ? window.el.chatView : document.getElementById('chat-view');
    const chatTitle = window.el && window.el.chatHeaderTitle ? window.el.chatHeaderTitle : document.getElementById('chat-header-title');
        
        // Nustatome pokalbio pavadinimą
        chatTitle.textContent = roomName || 'Pokalbis';
        
        // Saugome dabartinio pokalbio ID
        chatView.dataset.currentRoomId = roomId;

        // Nustatome aktyvų pokalbį globalioje būsenoje
        try {
            window.state.activeChat = { roomId: roomId, roomName: roomName };
        } catch(_) {}

        // Pažymime žinutes kaip perskaitytas serveryje
        try {
            if (window.socket && window.socket.connected) {
                window.socket.emit('mark messages read', { roomId: roomId });
            }
        } catch(_) {}

        // Krauname žinutes
        loadMessages(roomId);
        
        // Parodome pokalbio langą
        chatView.classList.add('active');
    }

    function hideChat() {
        const chatView = window.el && window.el.chatView ? window.el.chatView : document.getElementById('chat-view');
        chatView.classList.remove('active');
    }

    function loadMessages(roomId) {
        const messagesList = window.el && window.el.messagesList ? window.el.messagesList : document.getElementById('messages-list');
        messagesList.innerHTML = '<div class="system-message">Kraunamos žinutės...</div>';

        window.Api.fetch(`/rooms/${roomId}/messages`)
            .then(messages => {
                messagesList.innerHTML = '';
                messages.forEach(addMessageToUI);
                messagesList.scrollTop = messagesList.scrollHeight;
            })
            .catch(err => {
                messagesList.innerHTML = `<div class="system-message error">Klaida kraunant žinutes: ${err.message}</div>`;
            });
    }

    // === MESSAGE CREATION ===
    function createMessageElement(message) {
        const msgEl = document.createElement('div');
        const isSent = message.sender_id === window.state.currentUser.id;
        msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
        msgEl.dataset.messageId = message.id;

        // Pridedame siuntėjo vardą, jei tai gauta žinutė
        if (!isSent) {
            const senderNameEl = document.createElement('div');
            senderNameEl.className = 'sender-name';
            senderNameEl.textContent = message.sender_username;
            msgEl.appendChild(senderNameEl);
        }

        const contentEl = document.createElement('div');
        contentEl.className = 'content';
        contentEl.textContent = message.content;
        msgEl.appendChild(contentEl);

        // Pridedame laiką ir perskaitymo statusą
        const timestampEl = document.createElement('div');
        timestampEl.className = 'timestamp';
        
        const messageTime = message.created_at ? new Date(message.created_at) : new Date();
        const timeString = messageTime.toLocaleString('lt-LT', {
            hour: '2-digit',
            minute: '2-digit'
        });

        timestampEl.textContent = timeString;

        if (isSent) {
            const readStatus = message.read_at ? '✓✓' : '✓';
            const readStatusEl = document.createElement('span');
            readStatusEl.className = 'read-status';
            readStatusEl.textContent = readStatus;
            if (message.read_at) {
                readStatusEl.style.color = 'var(--info-color)';
            }
            timestampEl.appendChild(readStatusEl);
        }

        msgEl.appendChild(timestampEl);

        return msgEl;
    }

    function addMessageToUI(message) {
        const messagesList = window.el && window.el.messagesList ? window.el.messagesList : document.getElementById('messages-list');
        const msgElement = createMessageElement(message);
        messagesList.appendChild(msgElement);
        // Automatiškai slinkti į apačią, jei esame arti apačios
        if (messagesList.scrollHeight - messagesList.scrollTop < messagesList.clientHeight + 100) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }

    function addSystemMessage(text) {
        const msgElement = document.createElement('div');
        msgElement.className = 'system-message';
        msgElement.textContent = text;
        window.el.messagesList.appendChild(msgElement);
        window.el.messagesList.scrollTop = window.el.messagesList.scrollHeight;
    }

    // === GENERAL CHAT FUNCTIONALITY ===
    function setupGeneralChat() {
        const generalChatForm = window.el && window.el.generalChatForm ? window.el.generalChatForm : document.getElementById('general-chat-form');
        const generalChatInput = window.el && window.el.generalChatInput ? window.el.generalChatInput : document.getElementById('general-chat-input');
        const generalChatMessages = window.el && window.el.generalChatMessages ? window.el.generalChatMessages : document.getElementById('general-chat-messages');

        if (generalChatForm) {
            generalChatForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const message = generalChatInput.value.trim();
                if (message) {
                    sendGeneralChatMessage(message);
                    generalChatInput.value = '';
                }
            });
        }

        // Load general chat messages
        loadGeneralChatMessages();
    }

    function loadGeneralChatMessages() {
        const generalChatMessages = document.getElementById('general-chat-messages');
        if (!generalChatMessages) return;

        generalChatMessages.innerHTML = '<div class="system-message">Kraunamos žinutės...</div>';

        window.Api.fetch('/rooms/1/messages')
            .then(messages => {
                generalChatMessages.innerHTML = '';
                messages.forEach(addGeneralChatMessageToUI);
                generalChatMessages.scrollTop = generalChatMessages.scrollHeight;
            })
            .catch(err => {
                generalChatMessages.innerHTML = `<div class="system-message error">Klaida kraunant žinutes: ${err.message}</div>`;
            });
    }

    function sendGeneralChatMessage(content) {
        if (window.socket && window.socket.connected) {
            window.socket.emit('send message', {
                roomId: 1,
                content: content
            });
        } else {
            alert('Nėra ryšio su serveriu. Bandykite perkrauti puslapį.');
        }
    }

    function addGeneralChatMessageToUI(message) {
        const generalChatMessages = document.getElementById('general-chat-messages');
        if (!generalChatMessages) return;

        const msgElement = createMessageElement(message);
        generalChatMessages.appendChild(msgElement);
        
        // Automatiškai slinkti į apačią, jei esame arti apačios
        if (generalChatMessages.scrollHeight - generalChatMessages.scrollTop < generalChatMessages.clientHeight + 100) {
            generalChatMessages.scrollTop = generalChatMessages.scrollHeight;
        }
    }

    // === MESSAGE ACTIONS ===
    async function deleteMessage(messageId) {
        try {
            perf.log(`🗑️ Admin ištrina žinutę: ${messageId}`);
            
            await window.Api.fetch(`/messages/${messageId}`, { method: 'DELETE' });
            
            perf.log(`✅ Žinutė ${messageId} sėkmingai ištrinta`);
            addSystemMessage(`🗑️ Žinutė ištrinta administratoriaus`);
            
            // Remove message from UI
            const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageEl) {
                messageEl.remove();
            }
        } catch (error) {
            perf.log(`❌ Klaida ištrinant žinutę:`, error);
            alert('Klaida ištrinant žinutę. Bandykite dar kartą.');
        }
    }

    // === EXPORT ===
    window.MessagesModule = {
        showChat: showChat,
        hideChat: hideChat,
        createMessageElement: createMessageElement,
        addMessageToUI: addMessageToUI,
        addSystemMessage: addSystemMessage,
        deleteMessage: deleteMessage,
        setupGeneralChat: setupGeneralChat,
        loadGeneralChatMessages: loadGeneralChatMessages,
        sendGeneralChatMessage: sendGeneralChatMessage,
        addGeneralChatMessageToUI: addGeneralChatMessageToUI
    };
    
    // Global aliases for backward compatibility
    window.Chat = window.MessagesModule;
    window.showChat = showChat;
    window.hideChat = hideChat;
})();
