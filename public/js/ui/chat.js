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
        
        // System messages
        if (message.isSystem) {
            msgEl.className = 'message system';
            msgEl.style.cssText = `
                text-align: center;
                background: rgba(0, 123, 255, 0.1);
                border: 1px solid rgba(0, 123, 255, 0.3);
                border-radius: 8px;
                padding: 8px 12px;
                margin: 8px 16px;
                font-style: italic;
                color: var(--primary-color);
                font-size: 14px;
            `;
            msgEl.textContent = message.content;
            return msgEl;
        }
        
        // Normal messages
        const isSent = message.sender_id === window.state.currentUser.id;
        msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
        msgEl.dataset.messageId = message.id;
        
        if (!isSent) {
            const senderEl = document.createElement('div');
            senderEl.className = 'sender';
            senderEl.textContent = message.sender_username;
            msgEl.appendChild(senderEl);
        }
        
        const contentEl = document.createElement('div');
        contentEl.className = 'content';
        contentEl.textContent = message.content;
        msgEl.appendChild(contentEl);
        
        // Add timestamp
        const timestampEl = document.createElement('div');
        timestampEl.className = 'timestamp';
        timestampEl.style.cssText = `
            font-size: 11px;
            color: var(--muted-text);
            margin-top: 4px;
            opacity: 0.7;
        `;
        
        const messageTime = message.created_at ? new Date(message.created_at) : new Date();
        timestampEl.textContent = messageTime.toLocaleString('lt-LT', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Add read status for sent messages
        if (isSent) {
            const readStatus = message.read_at ? '✓✓' : '✓';
            const readStatusEl = document.createElement('span');
            readStatusEl.className = 'read-status';
            readStatusEl.textContent = readStatus;
            readStatusEl.style.cssText = `
                margin-left: 6px;
                font-size: 12px;
                color: ${message.read_at ? 'var(--success-color)' : 'var(--muted-text)'};
            `;
            timestampEl.appendChild(readStatusEl);
        }
        
        msgEl.appendChild(timestampEl);
        
        // Admin functions - delete message
        if (window.state.currentUser.isAdmin) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'message-delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Ištrinti žinutę';
            deleteBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: rgba(220, 53, 69, 0.8);
                color: white;
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                font-size: 12px;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s;
            `;
            
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Ar tikrai norite ištrinti šią žinutę?`)) {
                    deleteMessage(message.id);
                }
            };
            
            msgEl.appendChild(deleteBtn);
            
            // Show delete button on hover
            msgEl.onmouseenter = () => deleteBtn.style.opacity = '1';
            msgEl.onmouseleave = () => deleteBtn.style.opacity = '0';
        }
        
        return msgEl;
    }

    function addMessageToUI(message) {
        const el = window.el || {};
        const msgEl = createMessageElement(message);
        el.messagesList.appendChild(msgEl);
        el.messagesList.scrollTop = el.messagesList.scrollHeight;
    }

    function addSystemMessage(text) {
        const systemMessage = {
            content: text,
            username: 'Sistema',
            timestamp: new Date().toISOString(),
            isSystem: true
        };
        addMessageToUI(systemMessage);
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
