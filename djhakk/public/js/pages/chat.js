// ========================================
// DJHAKK Chat Page
// ========================================

let chatId = null;
let partnerId = null;
let partnerName = '';
let partnerPhoto = '';
let messagesUnsub = null;
let lastMessageDate = null;

// ========================================
// Navigation
// ========================================
function goBack() {
    location.replace('messages.html');
}

function viewPartnerProfile() {
    if (partnerId) {
        window.location.href = `profile.html?uid=${partnerId}`;
    }
}

// ========================================
// Initialize Chat
// ========================================
async function initChat() {
    const params = new URLSearchParams(location.search);
    chatId = params.get('id');
    const targetUserId = params.get('with');
    
    if (targetUserId) {
        const targetUser = await getUserById(targetUserId);
        if (!targetUser) {
            toast('ユーザーが見つかりません', 'error');
            setTimeout(() => goBack(), 1500);
            return;
        }
        
        chatId = await startOrGetChat(targetUserId, targetUser.name || 'ユーザー');
        if (!chatId) {
            toast('チャットを開始できませんでした', 'error');
            setTimeout(() => goBack(), 1500);
            return;
        }
        
        history.replaceState(null, '', `chat.html?id=${chatId}`);
    }
    
    if (!chatId) {
        toast('チャットが見つかりません', 'error');
        setTimeout(() => goBack(), 1500);
        return;
    }
    
    const chatDoc = await db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
        toast('チャットが見つかりません', 'error');
        setTimeout(() => goBack(), 1500);
        return;
    }
    
    const chatData = chatDoc.data();
    partnerId = chatData.participants.find(p => p !== user.uid);
    partnerName = chatData.participantNames?.[partnerId] || 'ユーザー';
    partnerPhoto = chatData.participantPhotos?.[partnerId] || '';
    
    // ヘッダーを更新
    document.getElementById('partnerName').textContent = partnerName;
    const avatarEl = document.getElementById('partnerAvatar');
    if (partnerPhoto) {
        avatarEl.innerHTML = `<img src="${partnerPhoto}" onerror="this.style.display='none';this.parentElement.textContent='${partnerName[0]}'">`;
    } else {
        avatarEl.textContent = partnerName[0].toUpperCase();
    }
    
    // 未読を解除
    if (chatData.unreadBy === user.uid) {
        await db.collection('chats').doc(chatId).update({ unreadBy: null });
    }
    
    loadMessages();
}

// ========================================
// Load Messages
// ========================================
function loadMessages() {
    const container = document.getElementById('chatMessages');
    
    if (messagesUnsub) messagesUnsub();
    
    messagesUnsub = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            lastMessageDate = null;
            
            if (snapshot.empty) {
                container.innerHTML = '<div class="loading" style="color:var(--text3);">Send a message to start</div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMine = msg.senderId === user.uid;
                const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
                
                const dateStr = formatDateForDivider(msgDate);
                if (dateStr !== lastMessageDate) {
                    container.innerHTML += `
                        <div class="date-divider">
                            <span class="date-divider-text">${dateStr}</span>
                        </div>
                    `;
                    lastMessageDate = dateStr;
                }
                
                container.innerHTML += `
                    <div class="message ${isMine ? 'mine' : 'other'}">
                        <div class="message-bubble">${linkifyText(msg.text)}</div>
                        <div class="message-time">${formatTime(msgDate)}</div>
                    </div>
                `;
            });
            
            container.scrollTop = container.scrollHeight;
        }, error => {
            log('Error loading messages: ' + error.message);
            container.innerHTML = '<div class="loading">Failed to load</div>';
        });
}

// ========================================
// Date/Time Formatting
// ========================================
function formatDateForDivider(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDay.getTime() === today.getTime()) {
        return '今日';
    } else if (msgDay.getTime() === yesterday.getTime()) {
        return '昨日';
    } else {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
}

function formatTime(date) {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ========================================
// Input Handling
// ========================================
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// ========================================
// Send Message
// ========================================
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !chatId) return;
    
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    input.value = '';
    autoResize(input);
    
    try {
        await db.collection('chats').doc(chatId).collection('messages').add({
            text,
            senderId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('chats').doc(chatId).update({
            lastMessage: text.substring(0, 50),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            unreadBy: partnerId,
            [`participantNames.${user.uid}`]: userData.name || 'User',
            [`participantPhotos.${user.uid}`]: userData.photoURL || ''
        });
    } catch (e) {
        log('Error sending message: ' + e.message);
        toast('Failed to send', 'error');
        input.value = text;
    }
    
    sendBtn.disabled = false;
    input.focus();
}

// ========================================
// Auth Ready Handler
// ========================================
function onAuthReady() {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    initChat();
}

// ページ離脱時にリスナーを解除
window.addEventListener('beforeunload', () => {
    if (messagesUnsub) messagesUnsub();
});
