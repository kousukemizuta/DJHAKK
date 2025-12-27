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

// ========================================
// Pagination System
// ========================================
const paginationState = {
    users: { lastDoc: null, hasMore: true, loading: false },
    events: { lastDoc: null, hasMore: true, loading: false },
    productions: { lastDoc: null, hasMore: true, loading: false },
    places: { lastDoc: null, hasMore: true, loading: false },
    timeline: { lastTimestamp: null, hasMore: true, loading: false }
};

function resetPagination(type) {
    if (type === 'all') {
        Object.keys(paginationState).forEach(key => {
            paginationState[key] = { lastDoc: null, lastTimestamp: null, hasMore: true, loading: false };
        });
    } else if (paginationState[type]) {
        paginationState[type] = { lastDoc: null, lastTimestamp: null, hasMore: true, loading: false };
    }
}

// ========================================
// Paginated Users (ARTIST)
// ========================================
async function loadUsersInitial() {
    resetPagination('users');
    try {
        const snapshot = await db.collection('users')
            .orderBy('lastInteractionAt', 'desc')
            .limit(PAGINATION.initialLimit)
            .get();
        
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                users.push({ id: doc.id, ...data });
            }
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.users.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.users.hasMore = snapshot.docs.length >= PAGINATION.initialLimit;
        
        return users;
    } catch (e) {
        log('Error loading users initial: ' + e.message);
        return [];
    }
}

async function loadUsersMore() {
    if (!paginationState.users.hasMore || paginationState.users.loading) return [];
    if (!paginationState.users.lastDoc) return [];
    
    paginationState.users.loading = true;
    try {
        const snapshot = await db.collection('users')
            .orderBy('lastInteractionAt', 'desc')
            .startAfter(paginationState.users.lastDoc)
            .limit(PAGINATION.loadMoreLimit)
            .get();
        
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                users.push({ id: doc.id, ...data });
            }
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.users.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.users.hasMore = snapshot.docs.length >= PAGINATION.loadMoreLimit;
        paginationState.users.loading = false;
        
        return users;
    } catch (e) {
        log('Error loading users more: ' + e.message);
        paginationState.users.loading = false;
        return [];
    }
}

// ========================================
// Paginated Events
// ========================================
async function loadEventsInitial() {
    resetPagination('events');
    try {
        const snapshot = await db.collection('events')
            .orderBy('lastInteractionAt', 'desc')
            .limit(PAGINATION.initialLimit)
            .get();
        
        const events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.events.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.events.hasMore = snapshot.docs.length >= PAGINATION.initialLimit;
        
        return events;
    } catch (e) {
        log('Error loading events initial: ' + e.message);
        return [];
    }
}

async function loadEventsMore() {
    if (!paginationState.events.hasMore || paginationState.events.loading) return [];
    if (!paginationState.events.lastDoc) return [];
    
    paginationState.events.loading = true;
    try {
        const snapshot = await db.collection('events')
            .orderBy('lastInteractionAt', 'desc')
            .startAfter(paginationState.events.lastDoc)
            .limit(PAGINATION.loadMoreLimit)
            .get();
        
        const events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.events.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.events.hasMore = snapshot.docs.length >= PAGINATION.loadMoreLimit;
        paginationState.events.loading = false;
        
        return events;
    } catch (e) {
        log('Error loading events more: ' + e.message);
        paginationState.events.loading = false;
        return [];
    }
}

// ========================================
// Paginated Productions
// ========================================
async function loadProductionsInitial() {
    resetPagination('productions');
    try {
        const snapshot = await db.collection('productions')
            .orderBy('lastInteractionAt', 'desc')
            .limit(PAGINATION.initialLimit)
            .get();
        
        const productions = [];
        snapshot.forEach(doc => {
            productions.push({ id: doc.id, ...doc.data() });
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.productions.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.productions.hasMore = snapshot.docs.length >= PAGINATION.initialLimit;
        
        return productions;
    } catch (e) {
        log('Error loading productions initial: ' + e.message);
        return [];
    }
}

async function loadProductionsMore() {
    if (!paginationState.productions.hasMore || paginationState.productions.loading) return [];
    if (!paginationState.productions.lastDoc) return [];
    
    paginationState.productions.loading = true;
    try {
        const snapshot = await db.collection('productions')
            .orderBy('lastInteractionAt', 'desc')
            .startAfter(paginationState.productions.lastDoc)
            .limit(PAGINATION.loadMoreLimit)
            .get();
        
        const productions = [];
        snapshot.forEach(doc => {
            productions.push({ id: doc.id, ...doc.data() });
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.productions.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.productions.hasMore = snapshot.docs.length >= PAGINATION.loadMoreLimit;
        paginationState.productions.loading = false;
        
        return productions;
    } catch (e) {
        log('Error loading productions more: ' + e.message);
        paginationState.productions.loading = false;
        return [];
    }
}

// ========================================
// Paginated Places
// ========================================
async function loadPlacesInitial() {
    resetPagination('places');
    try {
        const snapshot = await db.collection('places')
            .orderBy('lastInteractionAt', 'desc')
            .limit(PAGINATION.initialLimit)
            .get();
        
        const places = [];
        snapshot.forEach(doc => {
            places.push({ id: doc.id, ...doc.data() });
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.places.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.places.hasMore = snapshot.docs.length >= PAGINATION.initialLimit;
        
        return places;
    } catch (e) {
        log('Error loading places initial: ' + e.message);
        return [];
    }
}

async function loadPlacesMore() {
    if (!paginationState.places.hasMore || paginationState.places.loading) return [];
    if (!paginationState.places.lastDoc) return [];
    
    paginationState.places.loading = true;
    try {
        const snapshot = await db.collection('places')
            .orderBy('lastInteractionAt', 'desc')
            .startAfter(paginationState.places.lastDoc)
            .limit(PAGINATION.loadMoreLimit)
            .get();
        
        const places = [];
        snapshot.forEach(doc => {
            places.push({ id: doc.id, ...doc.data() });
        });
        
        if (snapshot.docs.length > 0) {
            paginationState.places.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        paginationState.places.hasMore = snapshot.docs.length >= PAGINATION.loadMoreLimit;
        paginationState.places.loading = false;
        
        return places;
    } catch (e) {
        log('Error loading places more: ' + e.message);
        paginationState.places.loading = false;
        return [];
    }
}

// ========================================
// Paginated Timeline (Mixed)
// ========================================
async function loadTimelineInitial() {
    resetPagination('timeline');
    try {
        const [tweetsSnap, eventsSnap, productionsSnap, placesSnap, usersSnap] = await Promise.all([
            db.collection('tweets').orderBy('lastInteractionAt', 'desc').limit(PAGINATION.initialLimit).get(),
            db.collection('events').orderBy('lastInteractionAt', 'desc').limit(PAGINATION.initialLimit).get(),
            db.collection('productions').orderBy('lastInteractionAt', 'desc').limit(PAGINATION.initialLimit).get(),
            db.collection('places').orderBy('lastInteractionAt', 'desc').limit(PAGINATION.initialLimit).get(),
            db.collection('users').orderBy('lastInteractionAt', 'desc').limit(PAGINATION.initialLimit).get()
        ]);
        
        const items = [];
        
        tweetsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'tweet',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        eventsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'event',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        productionsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'production',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        placesSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'place',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                items.push({ 
                    id: doc.id, ...data, _type: 'user',
                    _sortTime: data.lastInteractionAt || data.lastLoginAt || data.createdAt
                });
            }
        });
        
        // lastInteractionAtでソート
        items.sort((a, b) => {
            const timeA = a._sortTime?.toDate?.() || new Date(0);
            const timeB = b._sortTime?.toDate?.() || new Date(0);
            return timeB - timeA;
        });
        
        // 最初の30件を返す
        const result = items.slice(0, PAGINATION.initialLimit);
        
        if (result.length > 0) {
            const lastItem = result[result.length - 1];
            paginationState.timeline.lastTimestamp = lastItem._sortTime;
        }
        paginationState.timeline.hasMore = items.length >= PAGINATION.initialLimit;
        
        return result;
    } catch (e) {
        log('Error loading timeline initial: ' + e.message);
        return [];
    }
}

async function loadTimelineMore() {
    if (!paginationState.timeline.hasMore || paginationState.timeline.loading) return [];
    if (!paginationState.timeline.lastTimestamp) return [];
    
    paginationState.timeline.loading = true;
    try {
        const lastTs = paginationState.timeline.lastTimestamp;
        
        const [tweetsSnap, eventsSnap, productionsSnap, placesSnap, usersSnap] = await Promise.all([
            db.collection('tweets').orderBy('lastInteractionAt', 'desc').where('lastInteractionAt', '<', lastTs).limit(PAGINATION.loadMoreLimit).get(),
            db.collection('events').orderBy('lastInteractionAt', 'desc').where('lastInteractionAt', '<', lastTs).limit(PAGINATION.loadMoreLimit).get(),
            db.collection('productions').orderBy('lastInteractionAt', 'desc').where('lastInteractionAt', '<', lastTs).limit(PAGINATION.loadMoreLimit).get(),
            db.collection('places').orderBy('lastInteractionAt', 'desc').where('lastInteractionAt', '<', lastTs).limit(PAGINATION.loadMoreLimit).get(),
            db.collection('users').orderBy('lastInteractionAt', 'desc').where('lastInteractionAt', '<', lastTs).limit(PAGINATION.loadMoreLimit).get()
        ]);
        
        const items = [];
        
        tweetsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'tweet',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        eventsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'event',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        productionsSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'production',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        placesSnap.forEach(doc => {
            const data = doc.data();
            items.push({ 
                id: doc.id, ...data, _type: 'place',
                _sortTime: data.lastInteractionAt || data.createdAt
            });
        });
        
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                items.push({ 
                    id: doc.id, ...data, _type: 'user',
                    _sortTime: data.lastInteractionAt || data.lastLoginAt || data.createdAt
                });
            }
        });
        
        // ソート
        items.sort((a, b) => {
            const timeA = a._sortTime?.toDate?.() || new Date(0);
            const timeB = b._sortTime?.toDate?.() || new Date(0);
            return timeB - timeA;
        });
        
        // 上位20件を返す
        const result = items.slice(0, PAGINATION.loadMoreLimit);
        
        if (result.length > 0) {
            const lastItem = result[result.length - 1];
            paginationState.timeline.lastTimestamp = lastItem._sortTime;
        }
        paginationState.timeline.hasMore = result.length >= PAGINATION.loadMoreLimit;
        paginationState.timeline.loading = false;
        
        return result;
    } catch (e) {
        log('Error loading timeline more: ' + e.message);
        paginationState.timeline.loading = false;
        return [];
    }
}

// ========================================
// Pagination Helper Functions
// ========================================
function getPaginationState(type) {
    return paginationState[type] || { hasMore: false, loading: false };
}
