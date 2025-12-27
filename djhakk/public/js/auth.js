// ========================================
// DJHAKK Authentication
// ========================================

// ========================================
// Global Auth State
// ========================================
let user = null;
let userData = {};
let isGuest = false;

// ========================================
// Authentication Functions
// ========================================
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        toast('Log in');
        return true;
    } catch (e) {
        log('Login error: ' + e.message);
        toast(LABELS.loginFailed, 'error');
        return false;
    }
}

async function signup(email, password, name) {
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name: name,
            email: email,
            photoURL: 'https://djhakk-app.web.app/default-avatar.jpg',
            likesCount: 0,
            commentsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        toast(LABELS.accountCreated);
        return true;
    } catch (e) {
        log('Signup error: ' + e.message);
        toast(LABELS.registrationFailed, 'error');
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
                photoURL: 'https://djhakk-app.web.app/default-avatar.jpg',
                likesCount: 0,
                commentsCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // 既存ユーザーはlastLoginAtとlastInteractionAtを更新
            await db.collection('users').doc(u.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        toast('Log in');
        return true;
    } catch (e) {
        log('Google login error: ' + e.message);
        if (e.code !== 'auth/popup-closed-by-user') {
            toast(LABELS.googleLoginFailed, 'error');
        }
        return false;
    }
}

async function logout() {
    if (unreadUnsub) unreadUnsub();
    await auth.signOut();
    user = null;
    userData = {};
    window.location.href = 'index.html';
}

function isLoggedIn() {
    return user !== null;
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
        // ログイン時にlastLoginAtとlastInteractionAtを両方更新
        // → ログインしたユーザーがアーティストページ・タイムラインで上に表示される
        await db.collection('users').doc(user.uid).update({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
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

// ========================================
// Push Notifications
// ========================================
const VAPID_KEY = 'BNKShnq4CdZcJIQp84KRNTJdZ5xi-W-ErYMiDpqp_L9Y-QIxvj-wSluHwSCnMs070GiAK3Jmpi5iFr6icAgFQzg';
let messagingInitialized = false;

async function initializePushNotifications() {
    if (messagingInitialized || !user) return;
    
    // firebase.messaging が存在しない場合はスキップ
    if (typeof firebase.messaging !== 'function') {
        return;
    }
    
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            log('Push notifications not supported');
            return;
        }
        
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        log('Service Worker registered');
        
        const messaging = firebase.messaging();
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            log('Notification permission denied');
            return;
        }
        
        const token = await messaging.getToken({
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });
        
        if (token) {
            log('FCM Token obtained');
            await db.collection('users').doc(user.uid).update({
                fcmToken: token,
                fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            log('FCM Token saved to Firestore');
        }
        
        messaging.onMessage((payload) => {
            log('Foreground message received:', payload);
            const title = payload.notification?.title || '新しいメッセージ';
            const body = payload.notification?.body || 'DMが届きました';
            toast(`${title}: ${body}`);
        });
        
        messagingInitialized = true;
        log('Push notifications initialized');
        
    } catch (error) {
        log('Error initializing push notifications: ' + error.message);
    }
}

async function requestNotificationPermission() {
    if (!user) {
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
    if (u) {
        await loadUserData();
        startUnreadListener();
        
        // プッシュ通知を初期化（遅延）
        setTimeout(() => {
            initializePushNotifications();
        }, 2000);
        
        log('User logged in: ' + u.email);
    } else {
        messagingInitialized = false;
        log('User logged out');
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
