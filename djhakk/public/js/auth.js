// ========================================
// DJHAKK Authentication
// ========================================

// ========================================
// Global Auth State
// ========================================
let user = null;
let userData = {};
let isGuest = false;
let guestId = null;

// ゲストID（ログインしていない場合のいいね用）
function getGuestId() {
    if (guestId) return guestId;
    
    guestId = localStorage.getItem('djhakk_guest_id');
    if (!guestId) {
        guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('djhakk_guest_id', guestId);
    }
    return guestId;
}

// ユーザーIDを取得（ログイン中ならuser.uid、未ログインならguestId）
function getCurrentUserId() {
    return user ? user.uid : getGuestId();
}

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
        log('Google popup login successful: ' + u.email);
        
        const doc = await db.collection('users').doc(u.uid).get();
        if (!doc.exists) {
            // 新規ユーザー：Firestoreにドキュメント作成
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
            log('New Google user created in Firestore: ' + u.email);
        } else {
            // 既存ユーザー：lastLoginAtとlastInteractionAtを更新
            await db.collection('users').doc(u.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            log('Existing Google user updated: ' + u.email);
        }
        toast('Log in');
        return true;
    } catch (e) {
        log('Google login error: ' + e.code + ' - ' + e.message);
        if (e.code !== 'auth/popup-closed-by-user') {
            toast(LABELS.googleLoginFailed, 'error');
        }
        return false;
    }
}

// Googleリダイレクト認証後の処理（リダイレクト方式のフォールバック用）
async function handleGoogleRedirectResult() {
    try {
        const result = await auth.getRedirectResult();
        if (result.user) {
            const u = result.user;
            log('Google redirect user found: ' + u.email);
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
                log('New Google user created in Firestore: ' + u.email);
            } else {
                await db.collection('users').doc(u.uid).update({
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            toast('Log in');
        }
    } catch (e) {
        log('Google redirect check: ' + (e.message || 'no redirect'));
    }
}

// handleGoogleLogin - モーダル・ウェルカム画面から呼び出される
async function handleGoogleLogin() {
    const success = await loginWithGoogle();
    if (success) {
        closeLoginModal();
        window.location.href = 'timeline.html';
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
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showLoginModal() {
    let modal = $('loginModal');
    if (!modal) {
        const googleSvg = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;
        const modalHtml = `
            <div id="loginModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;align-items:center;justify-content:center;padding:20px;">
                <div style="background:#1A1A2E;border-radius:16px;width:100%;max-width:400px;margin:auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #2A2A3E;">
                        <h3 style="margin:0;color:#fff;font-size:18px;">Log in / Sign up</h3>
                        <button onclick="closeLoginModal()" style="background:none;border:none;color:#A0A0B8;font-size:24px;cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:24px;display:flex;flex-direction:column;gap:12px;">
                        <button onclick="handleGoogleLogin()" style="width:100%;padding:14px 24px;border-radius:12px;font-weight:600;cursor:pointer;border:none;font-size:14px;background:#fff;color:#333;display:flex;align-items:center;justify-content:center;gap:8px;">
                            ${googleSvg} Google
                        </button>
                        <button onclick="window.location.href='index.html?login=true'" style="width:100%;padding:14px 24px;border-radius:12px;font-weight:600;cursor:pointer;border:none;font-size:14px;background:linear-gradient(135deg,#FF6B00,#FF8533);color:#fff;">
                            Mail Log in
                        </button>
                        <button onclick="window.location.href='index.html?signup=true'" style="width:100%;padding:14px 24px;border-radius:12px;font-weight:600;cursor:pointer;border:1px solid #2A2A3E;font-size:14px;background:#2A2A3E;color:#fff;">
                            New Account
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = $('loginModal');
    }
    modal.style.display = 'flex';
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
            // 既存ユーザー：lastLoginAtとlastInteractionAtを更新
            await db.collection('users').doc(user.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            log('Existing user data loaded: ' + user.email);
        } else {
            // ドキュメントが存在しない場合は新規作成（Google認証後のフォールバック）
            const newUserData = {
                name: user.displayName || 'User',
                email: user.email,
                photoURL: 'https://djhakk-app.web.app/default-avatar.jpg',
                likesCount: 0,
                commentsCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(user.uid).set(newUserData);
            userData = newUserData;
            log('New user document created in loadUserData: ' + user.email);
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

// Googleリダイレクト認証の結果を処理（ページ読み込み時に実行）
handleGoogleRedirectResult();

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
    
    // ヘッダープロフィールを描画
    if (typeof renderHeaderProfile === 'function') {
        renderHeaderProfile();
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
