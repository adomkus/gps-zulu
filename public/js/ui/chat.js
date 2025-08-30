// Chat functionality - consolidated from messages.js and chat parts from index.html
(function(){
    const perf = window.perf;

    // === CHAT MANAGEMENT ===
    function showChat(roomId, roomName) {
        const chatView = document.getElementById('chat-view');
        const chatTitle = document.getElementById('chat-header-title');
        
        // Nustatome pokalbio pavadinimą
        chatTitle.textContent = roomName || 'Pokalbis';
        
        // Saugome dabartinio pokalbio ID
        chatView.dataset.currentRoomId = roomId;

        // Krauname žinutes
        loadMessages(roomId);
        
        // Parodome pokalbio langą
        chatView.classList.add('active');
    }

    function hideChat() {
        const chatView = document.getElementById('chat-view');
        chatView.classList.remove('active');
    }

    function loadMessages(roomId) {
        const messagesList = document.getElementById('messages-list');
        messagesList.innerHTML = '<div class="system-message">Kraunamos žinutės...</div>';

        window.Api.fetch(`/api/rooms/${roomId}/messages`)
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
        const messagesList = document.getElementById('messages-list');
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
        deleteMessage: deleteMessage
    };
    
    // Global aliases for backward compatibility
    window.showChat = showChat;
    window.hideChat = hideChat;
})();
