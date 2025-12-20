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

// ========================================
// Logo Setup
// ========================================
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
                <div class="modal-content">
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

// ========================================
// Footer Generation
// ========================================
function generateFooter(activePage) {
    // Remove existing footer
    const existingNav = document.querySelector('.nav');
    if (existingNav) existingNav.remove();
    
    const footer = document.createElement('nav');
    footer.className = 'nav';
    footer.innerHTML = `
        <div class="nav-item ${activePage === 'home' ? 'active' : ''}" onclick="window.location.href='index.html'">
            <span class="nav-icon">🏠</span>
            <span>Home</span>
        </div>
        <div class="nav-item ${activePage === 'events' ? 'active' : ''}" onclick="window.location.href='events.html'">
            <span class="nav-icon">🎵</span>
            <span>Event</span>
        </div>
        <div class="nav-item nav-create" onclick="handleCreateClick()">
            <div class="nav-plus">+</div>
        </div>
        <div class="nav-item ${activePage === 'productions' ? 'active' : ''}" onclick="window.location.href='productions.html'">
            <span class="nav-icon">💿</span>
            <span>Production</span>
        </div>
        <div class="nav-item ${activePage === 'profile' ? 'active' : ''}" onclick="handleProfileClick()">
            <span class="nav-icon">👤</span>
            <span>Profile</span>
        </div>
    `;
    document.body.appendChild(footer);
}

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

// ========================================
// Render Helpers
// ========================================
function renderEventCard(event) {
    const typeLabels = { A: 'タイムテーブル', B: 'ギャランティー', C: 'フライヤー' };
    const typeClass = { A: 'a', B: 'b', C: 'c' };
    
    return `
        <div class="card" onclick="showEventDetail('${event.id}')">
            <img src="${event.imageUrl || 'logo.png'}" class="card-img" alt="${event.title}">
            <div class="card-body">
                <span class="badge ${typeClass[event.type] || 'a'}">${typeLabels[event.type] || 'タイムテーブル'}</span>
                <h3 class="card-title">${event.title}</h3>
                <p style="color: var(--text2); font-size: 13px;">📅 ${formatDate(event.date)}</p>
                <p style="color: var(--text2); font-size: 13px;">📍 ${event.location || ''}</p>
            </div>
        </div>
    `;
}

function renderProductionCard(prod) {
    const typeLabels = { audio: '音源', goods: '商品', produce: 'プロデュース' };
    
    return `
        <div class="card" onclick="showProductionDetail('${prod.id}')">
            <img src="${prod.imageUrl || 'logo.png'}" class="card-img" alt="${prod.title}">
            <div class="card-body">
                <span class="badge a">${typeLabels[prod.type] || '商品'}</span>
                <h3 class="card-title">${prod.title}</h3>
                <p style="color: var(--text2); font-size: 13px;">¥${(prod.price || 0).toLocaleString()}</p>
            </div>
        </div>
    `;
}

// ========================================
// Auth State Observer
// ========================================
auth.onAuthStateChanged(async (u) => {
    user = u;
    if (u && !isGuest) {
        await loadUserData();
        log('User logged in: ' + u.email);
    } else {
        log('User logged out or guest mode');
    }
    
    // Call page-specific init if defined
    if (typeof onAuthReady === 'function') {
        onAuthReady();
    }
});
