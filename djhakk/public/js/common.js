// ========================================
// DJHAKK Common JavaScript
// ========================================

// ========================================
// UI Labels (Centralized for easy maintenance)
// ========================================
const LABELS = {
    // Common Actions
    back: 'Back',
    save: 'SAVE',
    edit: 'EDIT',
    create: 'Create',
    add: 'Add',
    cancel: 'Cancel',
    done: 'Done',
    buy: 'Buy',
    apply: 'Apply',
    reserve: 'Reserve',
    share: 'Share',
    confirm: 'Confirm',
    
    // Auth
    logIn: 'Log in',
    logOut: 'LOG OUT',
    newAccount: 'New',
    loginFailed: 'Login failed',
    registrationFailed: 'Registration failed',
    googleLoginFailed: 'Google login failed',
    accountCreated: 'Account created',
    
    // Form Labels
    mailAddress: 'Mail Address',
    password: 'Password',
    name: 'NAME',
    title: 'TITLE',
    
    // Navigation
    home: 'Home',
    event: 'Event',
    production: 'Production',
    profile: 'Profile',
    
    // Event Types
    eventTypes: {
        A: 'TIMETABLE',
        B: 'GUARANTEE(ｷﾞｬﾗ)',
        C: 'FLYER'
    },
    
    // Production Types
    productionTypes: {
        audio: 'DOWNLOAD SALES',
        goods: 'ITEM SALES',
        produce: 'SELF PRODUCE'
    },
    
    // Create Page Type Cards
    createTypes: {
        A: { label: 'TIMETABLE', desc: 'Timetable sales' },
        B: { label: 'GUARANTEE(ｷﾞｬﾗ)', desc: 'Pay guarantee' },
        C: { label: 'FLYER', desc: 'Information' },
        audio: { label: 'DOWNLOAD SALES', desc: 'Download sales' },
        goods: { label: 'ITEM SALES', desc: 'Item sales' },
        produce: { label: 'SELF PRODUCE', desc: 'Self Produce' }
    },
    
    // Area/Region
    area: 'AREA',
    allArea: 'ALL AREA',
    selectArea: 'Select Area',
    
    // Profile
    myProfile: 'MY PROFILE',
    myEvent: 'MY EVENT',
    profilePicture: 'PROFILE PICTURE',
    changeImage: 'Change image',
    bio: 'Bio',
    snsLink: 'SNS LINK',
    dm: 'DM',
    
    // Event/Production Pages
    date: 'DATE',
    location: '@',
    organizer: 'ORGANIZER',
    applicants: 'Applicants',
    
    // Slot
    slot: 'Slot',
    capacity: 'Capacity',
    full: 'FULL',
    free: 'FREE',
    tbd: 'TBD',
    na: 'N/A',
    
    // Days
    days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    
    // Time
    startTime: 'Start Time',
    endTime: 'End Time',
    
    // Search
    eventSearch: 'EVENT SEARCH',
    productionSearch: 'PRODUCTION SEARCH',
    
    // Filters
    all: 'All',
    type: 'Type',
    
    // Empty States
    noEvents: 'No events',
    noArtists: 'No artists',
    noProductions: 'No productions',
    noUpcomingEvents: 'No upcoming events',
    noMessages: 'No messages',
    
    // Misc
    you: 'You',
    comingSoon: 'Coming soon',
    urlCopied: 'URL copied',
    failedToStartChat: 'Failed to start chat'
};

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
    'TOKYO': 'jpy', 'OSAKA': 'jpy', 'NAGOYA': 'jpy', 'FUKUOKA': 'jpy', 'OKINAWA': 'jpy',
    'SEOUL': 'krw', 'SHANGHAI': 'cny', 'HONG KONG': 'hkd', 'BANGKOK': 'thb', 'SINGAPORE': 'sgd',
    'NEW YORK': 'usd', 'LOS ANGELES': 'usd', 'MIAMI': 'usd', 'CHICAGO': 'usd', 'LAS VEGAS': 'usd',
    'BERLIN': 'eur', 'LONDON': 'gbp', 'AMSTERDAM': 'eur', 'IBIZA': 'eur', 'PARIS': 'eur', 'BARCELONA': 'eur'
};

// 地域リスト
const REGIONS = [
    { group: 'JAPAN', cities: ['TOKYO', 'OSAKA', 'NAGOYA', 'FUKUOKA', 'OKINAWA'] },
    { group: 'ASIA', cities: ['SEOUL', 'SHANGHAI', 'HONG KONG', 'BANGKOK', 'SINGAPORE'] },
    { group: 'NORTH AMERICA', cities: ['NEW YORK', 'LOS ANGELES', 'MIAMI', 'CHICAGO', 'LAS VEGAS'] },
    { group: 'EUROPE', cities: ['BERLIN', 'LONDON', 'AMSTERDAM', 'IBIZA', 'PARIS', 'BARCELONA'] }
];

// SNSプラットフォーム設定（SVGアイコン使用）
const SNS_PLATFORMS = [
    { id: 'twitter', name: 'X (Twitter)', prefix: 'https://x.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { id: 'instagram', name: 'Instagram', prefix: 'https://instagram.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' },
    { id: 'soundcloud', name: 'SoundCloud', prefix: 'https://soundcloud.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 17.939h-1v-8.068c.308-.231.639-.429 1-.566v8.634zm3 0h1v-9.224c-.229.265-.443.548-.621.857l-.379-.184v8.551zm-2 0h1v-8.848c-.508-.079-.623-.05-1-.01v8.858zm-4 0h1v-7.02c-.312.458-.555.971-.692 1.535l-.308-.182v5.667zm-3-5.25c-.606.547-1 1.354-1 2.268 0 .914.394 1.721 1 2.268v-4.536zm18.879-.671c-.204-2.837-2.404-5.079-5.117-5.079-1.022 0-1.964.328-2.762.877v10.123h9.089c1.607 0 2.911-1.393 2.911-3.106 0-1.607-1.134-2.939-2.621-3.103l-1.5.288zm-13.879 5.921h1v-8.801c-.287.181-.564.378-.823.596l-.177-.164v8.369z"/></svg>' },
    { id: 'tiktok', name: 'TikTok', prefix: 'https://tiktok.com/@', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>' },
    { id: 'youtube', name: 'YouTube', prefix: 'https://youtube.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
    { id: 'facebook', name: 'Facebook', prefix: 'https://facebook.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
    { id: 'threads', name: 'Threads', prefix: 'https://threads.net/@', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.082-1.168 3.59-1.304 1.253-.114 2.403-.037 3.428.179-.074-.648-.272-1.143-.589-1.47-.387-.4-1.014-.617-1.864-.647-1.652-.06-2.665.593-2.993.893l-1.315-1.58c.716-.593 2.152-1.478 4.398-1.396 1.37.05 2.47.434 3.272 1.142.862.761 1.342 1.833 1.427 3.188 1.044.33 1.946.838 2.664 1.516 1.023.966 1.658 2.236 1.835 3.671.254 2.058-.395 4.203-1.788 5.89-1.72 2.082-4.36 3.272-7.445 3.355z"/><path d="M12.861 14.513c-1.106.1-1.778.379-2.116.632-.299.225-.413.512-.392.829.026.394.237.748.593.997.414.289 1.06.45 1.82.408 1.08-.058 1.876-.471 2.369-1.227.443-.679.66-1.56.669-2.542-.72-.143-1.462-.194-2.184-.16-.298.014-.536.035-.759.063z"/></svg>' },
    { id: 'other', name: 'その他', prefix: '', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>' }
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
    let html = includeAll ? `<option value="all">${LABELS.allArea}</option>` : `<option value="">${LABELS.selectArea}</option>`;
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
        toast('Log in');
        return true;
    } catch (e) {
        log('Login error: ' + e.message);
        toast('Login failed', 'error');
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
        toast('Account created');
        return true;
    } catch (e) {
        log('Signup error: ' + e.message);
        toast('Registration failed', 'error');
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
        toast('Log in');
        return true;
    } catch (e) {
        log('Google login error: ' + e.message);
        if (e.code !== 'auth/popup-closed-by-user') {
            toast('Google login failed', 'error');
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
                        <h3>${LABELS.logIn}</h3>
                        <button class="modal-close" onclick="closeModal('loginModal')">✕</button>
                    </div>
                    <div class="modal-body" style="text-align:center; padding: 24px;">
                        <button class="btn btn-p btn-lg" onclick="window.location.href='index.html?login=true'" style="margin-bottom: 12px;">${LABELS.logIn}</button>
                        <button class="btn btn-s btn-lg" onclick="window.location.href='index.html?signup=true'">${LABELS.newAccount}</button>
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
        toast('Failed to start chat', 'error');
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
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
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

// SNSアイコンを表示（SVGロゴ使用）
function renderSnsIcons(snsLinks, size = 28) {
    if (!snsLinks || snsLinks.length === 0) return '';
    
    const defaultSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';
    const iconSize = Math.floor(size * 0.6);
    
    let html = '<div class="sns-icons" style="display:flex;gap:6px;flex-wrap:wrap;">';
    snsLinks.forEach(link => {
        if (link && link.url) {
            const platform = SNS_PLATFORMS.find(p => p.id === link.platform);
            const svgIcon = (platform && platform.svg) ? platform.svg : defaultSvg;
            const platformName = (platform && platform.name) ? platform.name : 'Link';
            html += `<a href="${link.url}" target="_blank" rel="noopener" onclick="event.stopPropagation();" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:#1A1A2E;border-radius:50%;text-decoration:none;" title="${platformName}"><svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" style="fill:#A0A0B8;">${svgIcon.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}</svg></a>`;
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
        toast('Login required', 'error');
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await initializePushNotifications();
            toast('Notifications enabled');
            return true;
        } else {
            toast('Notifications blocked', 'error');
            return false;
        }
    } catch (error) {
        log('Error requesting notification permission: ' + error.message);
        toast('Failed to enable notifications', 'error');
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
let authReady = false;
let domReady = false;

function tryCallOnAuthReady() {
    if (authReady && domReady && typeof onAuthReady === 'function') {
        onAuthReady();
    }
}

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
    
    authReady = true;
    tryCallOnAuthReady();
});

// DOMが準備完了したらonAuthReadyを呼ぶ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        domReady = true;
        tryCallOnAuthReady();
    });
} else {
    domReady = true;
    tryCallOnAuthReady();
}
