/**
 * DJHAKK Cloud Functions
 * 
 * メッセージ送信時にプッシュ通知を送信
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * 新しいメッセージが作成された時にプッシュ通知を送信
 */
exports.sendMessageNotification = functions
    .region('asia-northeast1') // 東京リージョン
    .firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        const message = snap.data();
        const chatId = context.params.chatId;
        const senderId = message.senderId;
        
        console.log(`New message in chat ${chatId} from ${senderId}`);
        
        try {
            // チャット情報を取得
            const chatDoc = await db.collection('chats').doc(chatId).get();
            if (!chatDoc.exists) {
                console.log('Chat not found');
                return null;
            }
            
            const chat = chatDoc.data();
            const participants = chat.participants || [];
            
            // 受信者を特定（送信者以外）
            const recipientId = participants.find(p => p !== senderId);
            if (!recipientId) {
                console.log('Recipient not found');
                return null;
            }
            
            // 受信者のユーザー情報を取得
            const recipientDoc = await db.collection('users').doc(recipientId).get();
            if (!recipientDoc.exists) {
                console.log('Recipient user not found');
                return null;
            }
            
            const recipient = recipientDoc.data();
            const fcmToken = recipient.fcmToken;
            
            if (!fcmToken) {
                console.log('Recipient has no FCM token');
                return null;
            }
            
            // 送信者の名前を取得
            const senderName = chat.participantNames?.[senderId] || '誰か';
            
            // 通知を送信
            const notificationPayload = {
                token: fcmToken,
                notification: {
                    title: `${senderName}からのメッセージ`,
                    body: message.text ? message.text.substring(0, 100) : 'メッセージが届きました'
                },
                data: {
                    chatId: chatId,
                    senderId: senderId,
                    type: 'message'
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'djhakk_messages',
                        sound: 'default'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                },
                webpush: {
                    fcmOptions: {
                        link: `https://djhakk-app.web.app/chat.html?id=${chatId}`
                    }
                }
            };
            
            const response = await admin.messaging().send(notificationPayload);
            console.log('Notification sent successfully:', response);
            
            return response;
            
        } catch (error) {
            console.error('Error sending notification:', error);
            
            // トークンが無効な場合は削除
            if (error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/invalid-registration-token') {
                console.log('Invalid token, removing from user document');
                // トークンを削除する処理（オプション）
            }
            
            return null;
        }
    });

/**
 * イベントに応募があった時に主催者に通知を送信
 */
exports.sendApplicationNotification = functions
    .region('asia-northeast1')
    .firestore
    .document('events/{eventId}')
    .onUpdate(async (change, context) => {
        const eventId = context.params.eventId;
        const beforeData = change.before.data();
        const afterData = change.after.data();
        
        // スロットの応募者を比較
        const beforeSlots = beforeData.slots || [];
        const afterSlots = afterData.slots || [];
        
        for (let i = 0; i < afterSlots.length; i++) {
            const beforeApplicants = beforeSlots[i]?.applicants || [];
            const afterApplicants = afterSlots[i]?.applicants || [];
            
            // 新しい応募者を検出
            const newApplicants = afterApplicants.filter(a => !beforeApplicants.includes(a));
            
            if (newApplicants.length > 0) {
                const organizerId = afterData.organizerId;
                if (!organizerId) continue;
                
                // 主催者のFCMトークンを取得
                const organizerDoc = await db.collection('users').doc(organizerId).get();
                if (!organizerDoc.exists) continue;
                
                const organizer = organizerDoc.data();
                const fcmToken = organizer.fcmToken;
                if (!fcmToken) continue;
                
                // 新しい応募者の名前を取得
                for (const applicantId of newApplicants) {
                    const applicantDoc = await db.collection('users').doc(applicantId).get();
                    const applicantName = applicantDoc.exists ? applicantDoc.data().name : 'ユーザー';
                    
                    try {
                        await admin.messaging().send({
                            token: fcmToken,
                            notification: {
                                title: '新しい応募',
                                body: `${applicantName}さんが「${afterData.title}」に応募しました`
                            },
                            data: {
                                eventId: eventId,
                                type: 'application'
                            },
                            webpush: {
                                fcmOptions: {
                                    link: `https://djhakk-app.web.app/events.html?id=${eventId}`
                                }
                            }
                        });
                        console.log(`Application notification sent for event ${eventId}`);
                    } catch (error) {
                        console.error('Error sending application notification:', error);
                    }
                }
            }
        }
        
        return null;
    });
