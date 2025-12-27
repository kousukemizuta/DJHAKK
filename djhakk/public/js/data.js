// ========================================
// DJHAKK Data Functions
// ========================================

// ========================================
// Events Data
// ========================================
async function loadEvents(filter = 'all') {
    try {
        let query = db.collection('events').orderBy('date', 'asc');
        const snapshot = await query.get();
        const events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });
        return events;
    } catch (e) {
        log('Error loading events: ' + e.message);
        return [];
    }
}

// イベントに応募
async function applyToSlot(eventId, slotIndex) {
    if (!user) return false;
    try {
        const eventRef = db.collection('events').doc(eventId);
        const eventDoc = await eventRef.get();
        if (!eventDoc.exists) return false;
        
        const event = eventDoc.data();
        const slot = event.slots[slotIndex];
        
        // 既に応募済みかチェック
        if (slot.applicants && slot.applicants.includes(user.uid)) {
            toast('Already applied', 'error');
            return false;
        }
        
        // 定員チェック
        const currentCount = slot.applicants ? slot.applicants.length : 0;
        if (currentCount >= (slot.capacity || 1)) {
            toast('This slot is full', 'error');
            return false;
        }
        
        // 応募を追加
        const updatedSlots = [...event.slots];
        if (!updatedSlots[slotIndex].applicants) {
            updatedSlots[slotIndex].applicants = [];
        }
        updatedSlots[slotIndex].applicants.push(user.uid);
        
        await eventRef.update({ slots: updatedSlots });
        toast('Applied');
        return true;
    } catch (e) {
        log('Error applying to slot: ' + e.message);
        toast('Failed to apply', 'error');
        return false;
    }
}

// ========================================
// Productions Data
// ========================================
async function loadProductions(filter = 'all') {
    try {
        const snapshot = await db.collection('productions')
            .orderBy('lastInteractionAt', 'desc')
            .get();
        const productions = [];
        snapshot.forEach(doc => {
            productions.push({ id: doc.id, ...doc.data() });
        });
        return productions;
    } catch (e) {
        log('Error loading productions: ' + e.message);
        return [];
    }
}

// ========================================
// Places Data
// ========================================
async function loadPlaces(filter = 'all') {
    try {
        const snapshot = await db.collection('places')
            .orderBy('lastInteractionAt', 'desc')
            .get();
        const places = [];
        snapshot.forEach(doc => {
            places.push({ id: doc.id, ...doc.data() });
        });
        return places;
    } catch (e) {
        log('Error loading places: ' + e.message);
        return [];
    }
}

// ========================================
// Users Data
// ========================================
async function getUserById(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (e) {
        log('Error getting user: ' + e.message);
        return null;
    }
}

async function getUsersByIds(uids) {
    if (!uids || uids.length === 0) return {};
    try {
        const users = {};
        // Firestoreの制限により10件ずつ取得
        for (let i = 0; i < uids.length; i += 10) {
            const batch = uids.slice(i, i + 10);
            const snapshot = await db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', batch).get();
            snapshot.forEach(doc => {
                users[doc.id] = { id: doc.id, ...doc.data() };
            });
        }
        return users;
    } catch (e) {
        log('Error getting users: ' + e.message);
        return {};
    }
}

// 全ユーザーを取得（アーティスト一覧用）
// lastInteractionAt でソート（いいね・ログインで上に上がる）
async function loadAllUsers() {
    try {
        const snapshot = await db.collection('users')
            .orderBy('lastInteractionAt', 'desc')
            .limit(200)
            .get();
        
        const users = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                users.push({ id: doc.id, ...data });
            }
        });
        
        return users;
    } catch (e) {
        log('Error loading all users: ' + e.message);
        return [];
    }
}

// ========================================
// Tweet Functions
// ========================================
async function postTweet(text) {
    if (!requireLogin()) return null;
    if (!text.trim() || text.length > 140) return null;
    
    try {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const tweetRef = await db.collection('tweets').add({
            userId: user.uid,
            userName: userData.name || 'User',
            userPhoto: userData.photoURL || '',
            text: text.trim(),
            likesCount: 0,
            commentsCount: 0,
            lastInteractionAt: now,
            createdAt: now
        });
        return tweetRef.id;
    } catch (e) {
        log('Error posting tweet: ' + e.message);
        return null;
    }
}

async function loadTweets() {
    try {
        const snapshot = await db.collection('tweets')
            .orderBy('lastInteractionAt', 'desc')
            .limit(50)
            .get();
        
        const tweets = [];
        snapshot.forEach(doc => {
            tweets.push({ id: doc.id, ...doc.data(), _type: 'tweet' });
        });
        return tweets;
    } catch (e) {
        log('Error loading tweets: ' + e.message);
        return [];
    }
}

// タイムライン用に全データを混合して取得
async function loadTimelineData() {
    try {
        // 全て lastInteractionAt でソート（統一）
        // → いいね・コメント・ログインで上に上がる
        const [tweetsSnap, eventsSnap, productionsSnap, placesSnap, usersSnap] = await Promise.all([
            db.collection('tweets').orderBy('lastInteractionAt', 'desc').limit(30).get(),
            db.collection('events').orderBy('lastInteractionAt', 'desc').limit(30).get(),
            db.collection('productions').orderBy('lastInteractionAt', 'desc').limit(30).get(),
            db.collection('places').orderBy('lastInteractionAt', 'desc').limit(30).get(),
            db.collection('users').orderBy('lastInteractionAt', 'desc').limit(30).get()
        ]);
        
        const items = [];
        
        tweetsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, 
                ...data, 
                _type: 'tweet',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        eventsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, 
                ...data, 
                _type: 'event',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        productionsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, 
                ...data, 
                _type: 'production',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        placesSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, 
                ...data, 
                _type: 'place',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                items.push({ 
                    id: doc.id, 
                    ...data, 
                    _type: 'user',
                    _sortTime: data.lastInteractionAt || data.lastLoginAt || data.createdAt
                });
            }
        });
        
        // lastInteractionAtでソート
        items.sort((a, b) => {
            const dateA = a._sortTime?.toDate?.() || new Date(0);
            const dateB = b._sortTime?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
        
        return items;
    } catch (e) {
        log('Error loading timeline: ' + e.message);
        return [];
    }
}

// ========================================
// DM Functions
// ========================================
async function startOrGetChat(targetUserId, targetUserName) {
    if (!user) return null;
    
    try {
        // 既存のチャットを検索
        const snapshot = await db.collection('chats')
            .where('participants', 'array-contains', user.uid)
            .get();
        
        let existingChatId = null;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.participants.includes(targetUserId)) {
                existingChatId = doc.id;
            }
        });
        
        if (existingChatId) {
            return existingChatId;
        }
        
        // 新規チャットを作成
        const chatRef = await db.collection('chats').add({
            participants: [user.uid, targetUserId],
            participantNames: {
                [user.uid]: userData.name || 'User',
                [targetUserId]: targetUserName
            },
            participantPhotos: {
                [user.uid]: userData.photoURL || '',
                [targetUserId]: ''
            },
            lastMessage: '',
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            unreadBy: null
        });
        
        return chatRef.id;
    } catch (e) {
        log('Error starting chat: ' + e.message);
        return null;
    }
}

async function openDM(targetUserId, targetUserName) {
    if (!requireLogin()) return;
    
    const chatId = await startOrGetChat(targetUserId, targetUserName);
    if (chatId) {
        window.location.href = `chat.html?id=${chatId}`;
    } else {
        toast(LABELS.failedToStartChat, 'error');
    }
}
