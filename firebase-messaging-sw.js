// Firebase Cloud Messaging Service Worker
// このファイルはpublicフォルダのルートに配置してください

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase設定
firebase.initializeApp({
    apiKey: "AIzaSyBKj-PY2vvHC_VzxUdO2urbClDjuKuslhc",
    authDomain: "djhakk-app.firebaseapp.com",
    projectId: "djhakk-app",
    storageBucket: "djhakk-app.firebasestorage.app",
    messagingSenderId: "1084468016344",
    appId: "1:1084468016344:web:32a5bf22439912ac2b53ad"
});

const messaging = firebase.messaging();

// バックグラウンドでのメッセージ受信
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || '新しいメッセージ';
    const notificationOptions = {
        body: payload.notification?.body || 'DMが届きました',
        icon: '/logo.png',
        badge: '/favicon.png',
        tag: 'djhakk-message',
        renotify: true,
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    event.notification.close();
    
    const chatId = event.notification.data?.chatId;
    const url = chatId ? `/chat.html?id=${chatId}` : '/messages.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 既存のウィンドウがあればフォーカス
                for (const client of clientList) {
                    if (client.url.includes('djhakk') && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // なければ新しいウィンドウを開く
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
