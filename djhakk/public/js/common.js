// ========================================
// DJHAKK Common JavaScript
// ========================================

// ========================================
// Configuration
// ========================================
const APP_URL = location.origin;
const firebaseConfig = {
    apiKey: "AIzaSyBKj-PY2vvHC_VzxUdO2urbClDjuKuslhc",
    authDomain: "djhakk-app.firebaseapp.com",
    projectId: "djhakk-app",
    storageBucket: "djhakk-app.firebasestorage.app",
    messagingSenderId: "1084468016344",
    appId: "1:1084468016344:web:32a5bf22439912ac2b53ad",
    measurementId: "G-72CS9X84GN"
};

// ========================================
// Initialize Firebase
// ========================================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ========================================
// Global State
// ========================================
let user = null;
let userData = {};
let isGuest = false;
let unreadCount = 0;
let unreadUnsub = null;

// ========================================
// Currency Configuration
// ========================================
const CURRENCY_CONFIG = {
    jpy: { symbol: '¥', decimal: false, name: '日本円' },
    usd: { symbol: '$', decimal: true, name: '米ドル' },
    eur: { symbol: '€', decimal: true, name: 'ユーロ' },
    gbp: { symbol: '£', decimal: true, name: '英ポンド' },
    krw: { symbol: '₩', decimal: false, name: '韓国ウォン' },
    cny: { symbol: '¥', decimal: true, name: '中国元' },
    hkd: { symbol: 'HK$', decimal: true, name: '香港ドル' },
    thb: { symbol: '฿', decimal: true, name: 'タイバーツ' },
    sgd: { symbol: 'S$', decimal: true, name: 'シンガポールドル' },
    twd: { symbol: 'NT$', decimal: false, name: '台湾ドル' }
};

const REGION_CURRENCY_MAP = {
    '東京': 'jpy', '大阪': 'jpy', '名古屋': 'jpy', '福岡': 'jpy', '沖縄/那覇': 'jpy',
    'ソウル': 'krw', '上海': 'cny', '香港': 'hkd', 'バンコク': 'thb', 'シンガポール': 'sgd',
    'ニューヨーク': 'usd', 'ロサンゼルス': 'usd', 'マイアミ': 'usd', 'シカゴ': 'usd', 'ラスベガス': 'usd',
    'ベルリン': 'eur', 'ロンドン': 'gbp', 'アムステルダム': 'eur', 'イビサ': 'eur', 'パリ': 'eur', 'バルセロナ': 'eur'
};

// 地域リスト
const REGIONS = [
    { group: '🇯🇵 日本', cities: ['東京', '大阪', '名古屋', '福岡', '沖縄/那覇'] },
    { group: '🌏 アジア', cities: ['ソウル', '上海', '香港', 'バンコク', 'シンガポール'] },
    { group: '🌎 北米', cities: ['ニューヨーク', 'ロサンゼルス', 'マイアミ', 'シカゴ', 'ラスベガス'] },
    { group: '🌍 ヨーロッパ', cities: ['ベルリン', 'ロンドン', 'アムステルダム', 'イビサ', 'パリ', 'バルセロナ'] }
];

// SNSプラットフォーム設定
const SNS_PLATFORMS = [
    { id: 'twitter', name: 'X (Twitter)', icon: '🐦', prefix: 'https://x.com/' },
    { id: 'instagram', name: 'Instagram', icon: '📷', prefix: 'https://instagram.com/' },
    { id: 'soundcloud', name: 'SoundCloud', icon: '🎵', prefix: 'https://soundcloud.com/' },
    { id: 'tiktok', name: 'TikTok', icon: '🎬', prefix: 'https://tiktok.com/@' },
    { id: 'youtube', name: 'YouTube', icon: '📺', prefix: 'https://youtube.com/' },
    { id: 'facebook', name: 'Facebook', icon: '👤', prefix: 'https://facebook.com/' },
    { id: 'threads', name: 'Threads', icon: '🧵', prefix: 'https://threads.net/@' },
    { id: 'other', name: 'その他', icon: '🔗', prefix: '' }
];

function getCurrencyFromRegion(region) {
    return REGION_CURRENCY_MAP[region] || 'usd';
}

function formatPrice(amount, currency) {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd;
    if (amount === 0) return '無料';
    if (config.decimal) {
        return `${config.symbol}${amount.toFixed(2)}`;
    }
    return `${config.symbol}${amount.toLocaleString()}`;
}

function formatPriceShort(amount, currency) {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd;
    if (amount === 0) return '無料';
    if (config.decimal) {
        return `${config.symbol}${amount.toFixed(0)}`;
    }
    return `${config.symbol}${amount.toLocaleString()}`;
}

function parsePrice(value, currency) {
    const num = parseFloat(value) || 0;
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd;
    return config.decimal ? num : Math.floor(num);
}

function getCurrencySymbol(currency) {
    return (CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd).symbol;
}

// 地域選択のHTMLを生成
function generateRegionOptions(includeAll = false) {
    let html = includeAll ? '<option value="all">🌐 すべての地域</option>' : '<option value="">地域を選択</option>';
    REGIONS.forEach(r => {
        html += `<optgroup label="${r.group}">`;
        r.cities.forEach(city => {
            html += `<option value="${city}">${city}</option>`;
        });
        html += '</optgroup>';
    });
    return html;
}

// ========================================
// Utility Functions
// ========================================
const $ = id => document.getElementById(id);

function log(msg) {
    console.log('[DJHAKK]', msg);
}

function toast(msg, type = 'success') {
    let t = $('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
}

function closeModal(id) {
    const modal = $(id);
    if (modal) modal.classList.remove('active');
}

function setupLogo() {
    document.querySelectorAll('.header-logo').forEach(el => el.src = 'logo.png');
    const welcomeLogo = $('welcomeLogo');
    if (welcomeLogo) welcomeLogo.src = 'logo.png';
}

// ========================================
// Authentication Functions
// ========================================
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        isGuest = false;
        toast('ログインしました');
        return true;
    } catch (e) {
        log('Login error: ' + e.message);
        toast('ログインに失敗しました', 'error');
        return false;
    }
}

async function signup(email, password, name) {
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        isGuest = false;
        toast('アカウントを作成しました');
        return true;
    } catch (e) {
        log('Signup error: ' + e.message);
        toast('登録に失敗しました', 'error');
        return false;
    }
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const u = result.user;
        const doc = await db.collection('users').doc(u.uid).get();
        if (!doc.exists) {
            await db.collection('users').doc(u.uid).set({
                name: u.displayName || 'User',
                email: u.email,
                photoURL: u.photoURL || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // 既存ユーザーはlastLoginAtを更新
            await db.collection('users').doc(u.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        isGuest = false;
        toast('Googleでログインしました');
        return true;
    } catch (e) {
        log('Google login error: ' + e.message);
        if (e.code !== 'auth/popup-closed-by-user') {
            toast('Googleログインに失敗しました', 'error');
        }
        return false;
    }
}

async function logout() {
    if (unreadUnsub) unreadUnsub();
    await auth.signOut();
    user = null;
    userData = {};
    isGuest = false;
    window.location.href = 'index.html';
}

function continueAsGuest() {
    isGuest = true;
    user = null;
    userData = {};
    log('Continuing as guest');
    return true;
}

function isLoggedIn() {
    return user !== null && !isGuest;
}

function requireLogin(callback) {
    if (isLoggedIn()) {
        if (callback) callback();
        return true;
    } else {
        showLoginModal();
        return false;
    }
}

// ========================================
// Login Modal
// ========================================
function showLoginModal() {
    let modal = $('loginModal');
    if (!modal) {
        const modalHtml = `
            <div class="modal" id="loginModal">
                <div class="modal-content" style="max-width:400px;margin:auto;margin-top:100px;">
                    <div class="modal-header">
                        <h3>ログインが必要です</h3>
                        <button class="modal-close" onclick="closeModal('loginModal')">✕</button>
                    </div>
                    <div class="modal-body" style="text-align:center; padding: 24px;">
                        <p style="margin-bottom: 20px; color: var(--text2);">この機能を利用するにはログインが必要です</p>
                        <button class="btn btn-p btn-lg" onclick="window.location.href='index.html?login=true'" style="margin-bottom: 12px;">ログイン</button>
                        <button class="btn btn-s btn-lg" onclick="window.location.href='index.html?signup=true'">新規登録</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = $('loginModal');
    }
    modal.classList.add('active');
}

// ========================================
// User Data Functions
// ========================================
async function loadUserData() {
    if (!user) return;
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            userData = doc.data();
        }
        // lastLoginAtを更新
        await db.collection('users').doc(user.uid).update({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        log('Error loading user data: ' + e.message);
    }
}

async function updateUserData(data) {
    if (!user) return false;
    try {
        await db.collection('users').doc(user.uid).update(data);
        userData = { ...userData, ...data };
        return true;
    } catch (e) {
        log('Error updating user data: ' + e.message);
        return false;
    }
}

// 他ユーザーの情報を取得
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

// 複数ユーザーの情報を一括取得
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

// 全ユーザーを取得（アーティスト一覧用）- 最近ログイン順
// 新規登録（1分以内）のユーザーは最上位に表示
async function loadAllUsers() {
    try {
        // orderByを使わずに全件取得（lastLoginAtがないユーザーも含む）
        const snapshot = await db.collection('users')
            .limit(200)
            .get();
        
        const users = [];
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000); // 1分前
        
        snapshot.forEach(doc => {
            const data = doc.data();
            // 名前がある人のみ表示
            if (data.name) {
                const userData = { id: doc.id, ...data };
                // 新規登録かどうかを判定（createdAtが1分以内）
                const createdAt = data.createdAt?.toDate?.();
                userData._isNewUser = createdAt && createdAt > oneMinuteAgo;
                users.push(userData);
            }
        });
        
        // クライアント側でソート
        // 1. 新規登録ユーザー（1分以内）を最上位に
        // 2. その後は最近ログイン順
        users.sort((a, b) => {
            // 新規ユーザーを最優先
            if (a._isNewUser && !b._isNewUser) return -1;
            if (!a._isNewUser && b._isNewUser) return 1;
            
            // 両方新規または両方新規でない場合は、ログイン順
            const dateA = a.lastLoginAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.lastLoginAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA; // 降順（新しい順）
        });
        
        return users;
    } catch (e) {
        log('Error loading all users: ' + e.message);
        return [];
    }
}

// ========================================
// DM Functions
// ========================================
// DMを開始または既存のチャットを取得
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

// チャットページへ遷移
async function openDM(targetUserId, targetUserName) {
    if (!requireLogin()) return;
    
    const chatId = await startOrGetChat(targetUserId, targetUserName);
    if (chatId) {
        window.location.href = `chat.html?id=${chatId}`;
    } else {
        toast('チャットを開始できませんでした', 'error');
    }
}

// ========================================
// Unread Badge Functions
// ========================================
function startUnreadListener() {
    if (!user || unreadUnsub) return;
    
    unreadUnsub = db.collection('chats')
        .where('participants', 'array-contains', user.uid)
        .onSnapshot(snapshot => {
            let count = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.unreadBy === user.uid) {
                    count++;
                }
            });
            unreadCount = count;
            updateUnreadBadge();
        });
}

function updateUnreadBadge() {
    const badges = document.querySelectorAll('.nav-unread-badge');
    badges.forEach(badge => {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

// ========================================
// Image Functions
// ========================================
function compressImage(file, maxWidth = 1200, quality = 0.9) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = h * maxWidth / w; w = maxWidth; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function uploadImageToStorage(blob, path) {
    const ref = storage.ref(path);
    await ref.put(blob);
    return await ref.getDownloadURL();
}

// ========================================
// Date Formatting
// ========================================
function formatDate(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateFull(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateShort(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return '今';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '時間前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '日前';
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ========================================
// Events/Productions Data Functions
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

async function loadProductions(filter = 'all') {
    try {
        let query = db.collection('productions').orderBy('createdAt', 'desc');
        const snapshot = await query.get();
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
            toast('既に応募済みです', 'error');
            return false;
        }
        
        // 定員チェック
        const currentCount = slot.applicants ? slot.applicants.length : 0;
        if (currentCount >= (slot.capacity || 1)) {
            toast('このスロットは満員です', 'error');
            return false;
        }
        
        // 応募を追加
        const updatedSlots = [...event.slots];
        if (!updatedSlots[slotIndex].applicants) {
            updatedSlots[slotIndex].applicants = [];
        }
        updatedSlots[slotIndex].applicants.push(user.uid);
        
        await eventRef.update({ slots: updatedSlots });
        return true;
    } catch (e) {
        log('Error applying to slot: ' + e.message);
        return false;
    }
}

// ========================================
// Avatar Helper
// ========================================
function renderAvatar(photoURL, name, size = 32, clickable = false, uid = null) {
    const initial = (name || '?')[0].toUpperCase();
    const clickAttr = clickable && uid ? `onclick="event.stopPropagation(); window.location.href='profile.html?uid=${uid}'"` : '';
    const cursorStyle = clickable ? 'cursor:pointer;' : '';
    
    if (photoURL) {
        return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;${cursorStyle}" ${clickAttr}>
            <img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--gradient);color:white;font-weight:600;\\'>${initial}</span>'">
        </div>`;
    }
    return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:${size/2.5}px;${cursorStyle}" ${clickAttr}>${initial}</div>`;
}

function renderEmptyAvatar(size = 32) {
    return `<div class="avatar-empty" style="width:${size}px;height:${size}px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;"></div>`;
}

// SNSアイコンを表示
function renderSnsIcons(snsLinks, size = 28) {
    if (!snsLinks || snsLinks.length === 0) return '';
    
    let html = '<div class="sns-icons" style="display:flex;gap:6px;flex-wrap:wrap;">';
    snsLinks.forEach(link => {
        if (link.url) {
            const platform = SNS_PLATFORMS.find(p => p.id === link.platform) || SNS_PLATFORMS.find(p => p.id === 'other');
            html += `<a href="${link.url}" target="_blank" onclick="event.stopPropagation();" style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:var(--surface);border-radius:50%;text-decoration:none;font-size:${size*0.5}px;" title="${platform.name}">${platform.icon}</a>`;
        }
    });
    html += '</div>';
    return html;
}

// ========================================
// Navigation with Unread Badge
// ========================================
function handleCreateClick() {
    if (requireLogin()) {
        window.location.href = 'create.html';
    }
}

function handleProfileClick() {
    if (requireLogin()) {
        window.location.href = 'profile.html';
    }
}

// ========================================
// Firebase Cloud Messaging (Push Notifications)
// ========================================
const VAPID_KEY = 'BNKShnq4CdZcJIQp84KRNTJdZ5xi-W-ErYMiDpqp_L9Y-QIxvj-wSluHwSCnMs070GiAK3Jmpi5iFr6icAgFQzg';
let messagingInitialized = false;

async function initializePushNotifications() {
    if (messagingInitialized || !user || isGuest) return;
    
    try {
        // Service Workerが対応しているか確認
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            log('Push notifications not supported');
            return;
        }
        
        // Service Workerを登録
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        log('Service Worker registered');
        
        // Firebase Messagingを初期化
        const messaging = firebase.messaging();
        
        // 通知許可をリクエスト
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            log('Notification permission denied');
            return;
        }
        
        // FCMトークンを取得
        const token = await messaging.getToken({
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });
        
        if (token) {
            log('FCM Token obtained');
            // トークンをFirestoreに保存
            await db.collection('users').doc(user.uid).update({
                fcmToken: token,
                fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            log('FCM Token saved to Firestore');
        }
        
        // フォアグラウンドでのメッセージ受信
        messaging.onMessage((payload) => {
            log('Foreground message received:', payload);
            
            // トースト通知を表示
            const title = payload.notification?.title || '新しいメッセージ';
            const body = payload.notification?.body || 'DMが届きました';
            toast(`${title}: ${body}`);
            
            // 未読バッジを更新（リアルタイムリスナーが処理するはず）
        });
        
        messagingInitialized = true;
        log('Push notifications initialized');
        
    } catch (error) {
        log('Error initializing push notifications: ' + error.message);
    }
}

// 通知許可を手動でリクエスト（設定画面などから）
async function requestNotificationPermission() {
    if (!user || isGuest) {
        toast('ログインが必要です', 'error');
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await initializePushNotifications();
            toast('通知が有効になりました');
            return true;
        } else {
            toast('通知がブロックされています', 'error');
            return false;
        }
    } catch (error) {
        log('Error requesting notification permission: ' + error.message);
        toast('通知の設定に失敗しました', 'error');
        return false;
    }
}

// 通知が有効かどうか確認
function isNotificationEnabled() {
    return 'Notification' in window && Notification.permission === 'granted';
}

// ========================================
// Auth State Observer
// ========================================
auth.onAuthStateChanged(async (u) => {
    user = u;
    if (u && !isGuest) {
        await loadUserData();
        startUnreadListener();
        
        // プッシュ通知を初期化（ユーザーがログインしている場合）
        // 少し遅延させてUIの準備を待つ
        setTimeout(() => {
            initializePushNotifications();
        }, 2000);
        
        log('User logged in: ' + u.email);
    } else {
        messagingInitialized = false;
        log('User logged out or guest mode');
    }
    
    if (typeof onAuthReady === 'function') {
        onAuthReady();
    }
});
