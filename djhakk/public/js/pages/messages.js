// ========================================
// DJHAKK Messages Page
// ========================================

let chatsUnsub = null;

// ========================================
// Load Chats
// ========================================
function loadChats() {
    const container = document.getElementById('chatList');
    
    // リアルタイムリスナーを設定
    if (chatsUnsub) chatsUnsub();
    
    chatsUnsub = db.collection('chats')
        .where('participants', 'array-contains', user.uid)
        .orderBy('lastMessageAt', 'desc')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"></div>
                        <div class="empty-state-title">${LABELS.noMessages}</div>
                        <div class="empty-state-text">Start a conversation with<br>event organizers or artists</div>
                    </div>
                `;
                return;
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const chat = doc.data();
                const partnerId = chat.participants.find(p => p !== user.uid);
                const partnerName = chat.participantNames?.[partnerId] || 'User';
                const partnerPhoto = chat.participantPhotos?.[partnerId] || '';
                const isUnread = chat.unreadBy === user.uid;
                const initial = (partnerName || '?')[0].toUpperCase();
                
                html += `
                    <div class="chat-item ${isUnread ? 'unread' : ''}" onclick="openChat('${doc.id}')">
                        <div class="chat-avatar">
                            ${partnerPhoto ? `<img src="${partnerPhoto}" onerror="this.style.display='none';this.parentElement.textContent='${initial}'">` : initial}
                        </div>
                        <div class="chat-content">
                            <div class="chat-name ${isUnread ? 'unread' : ''}">${partnerName}</div>
                            <div class="chat-preview">${chat.lastMessage || LABELS.noMessages}</div>
                        </div>
                        <div class="chat-meta">
                            <span class="chat-time">${formatDateShort(chat.lastMessageAt)}</span>
                            ${isUnread ? '<span class="chat-unread-badge">!</span>' : ''}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }, error => {
            log('Error loading chats: ' + error.message);
            container.innerHTML = '<div class="empty-state">Failed to load</div>';
        });
}

function openChat(chatId) {
    window.location.href = `chat.html?id=${chatId}`;
}

// ========================================
// Auth Ready Handler
// ========================================
function onAuthReady() {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    loadChats();
}

// ページ離脱時にリスナーを解除
window.addEventListener('beforeunload', () => {
    if (chatsUnsub) chatsUnsub();
});
