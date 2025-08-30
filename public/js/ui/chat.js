// Chat functionality - consolidated from messages.js and chat parts from index.html
(function(){
    const perf = window.perf;

    // === CHAT MANAGEMENT ===
    function showChat(roomId, roomName) {
        perf.log(`📱 Atidaromas chat: ${roomName} (room ID: ${roomId})`);
        
        const el = window.el || {};
        
        // Check if elements exist
        if (!el.chatView) {
            perf.log(`❌ Chat view elementas nerastas!`);
            alert('Klaida: chat view nerastas!');
            return;
        }
        
        // Set chat data
        window.state.activeChat = { roomId, roomName };
        el.chatHeaderTitle.textContent = roomName;
        el.messagesList.innerHTML = '<div class="placeholder">Kraunama...</div>';
        
        // Open chat
        el.chatView.classList.add('active');
        perf.log(`📱 Chat view atidarytas`);
        
        // Add system message
        addSystemMessage(`💬 Pokalbis "${roomName}" atidarytas!`);
        
        // Load messages
        perf.log(`💬 Kraunamos žinutės kambariui ${roomId}`);
        window.Api.fetch(`/rooms/${roomId}/messages`)
            .then(messages => {
                perf.log(`📨 Gauta ${messages.length} žinučių`);
                el.messagesList.innerHTML = '';
                const fragment = document.createDocumentFragment();
                messages.forEach(msg => {
                    const msgElement = createMessageElement(msg);
                    fragment.appendChild(msgElement);
                });
                el.messagesList.appendChild(fragment);
                el.messagesList.scrollTop = el.messagesList.scrollHeight;
                
                // Mark messages as read
                if (window.socket) {
                    window.socket.emit('mark messages read', { roomId });
                }
                
                // If no messages, show helpful message
                if (messages.length === 0) {
                    addSystemMessage('👋 Čia prasideda jūsų pokalbis!');
                }
            })
            .catch(err => {
                perf.log(`❌ Klaida užkraunant žinutes:`, err);
                addSystemMessage(`⚠️ Nepavyko užkrauti žinučių. Bandykite dar kartą.`);
            });
    }

    function hideChat() {
        const el = window.el || {};
        el.chatView.classList.remove('active');
        window.state.activeChat = { roomId: null, roomName: null };
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
        const el = window.el || {};
        const msgEl = createMessageElement(message);
        el.messagesList.appendChild(msgEl);
        el.messagesList.scrollTop = el.messagesList.scrollHeight;
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
