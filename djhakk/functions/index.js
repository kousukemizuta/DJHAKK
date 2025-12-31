/**
 * DJHAKK Cloud Functions
 * 
 * - メッセージ送信時にプッシュ通知を送信
 * - Stripe決済処理
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Stripe設定
const stripe = require('stripe')(functions.config().stripe?.secret || process.env.STRIPE_SECRET_KEY);

// CORS設定
const cors = require('cors')({ origin: true });

// 手数料設定
const PLATFORM_FEE_PERCENT = 10;
const WITHDRAWAL_FEE = 200;
const MIN_WITHDRAWAL_AMOUNT = 1000;

// ========================================
// Push Notifications
// ========================================

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

// ========================================
// Stripe Payment Functions
// ========================================

/**
 * PaymentIntent作成
 * POST /createPaymentIntent
 * Body: { type, itemId, amount, buyerId, sellerId }
 */
exports.createPaymentIntent = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { type, itemId, amount, buyerId, sellerId } = req.body;
                
                // バリデーション
                if (!type || !itemId || !amount || !buyerId || !sellerId) {
                    return res.status(400).json({ error: '必須パラメータが不足しています' });
                }
                
                if (buyerId === sellerId) {
                    return res.status(400).json({ error: '自分の商品は購入できません' });
                }
                
                // 商品情報を確認
                let itemDoc;
                let itemData;
                
                if (type === 'goods' || type === 'audio' || type === 'produce') {
                    itemDoc = await db.collection('productions').doc(itemId).get();
                } else if (type === 'event_slot') {
                    itemDoc = await db.collection('events').doc(itemId).get();
                }
                
                if (!itemDoc || !itemDoc.exists) {
                    return res.status(404).json({ error: '商品が見つかりません' });
                }
                
                itemData = itemDoc.data();
                
                // 手数料計算
                const platformFee = Math.floor(amount * PLATFORM_FEE_PERCENT / 100);
                const sellerAmount = amount - platformFee;
                
                // PaymentIntent作成
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount, // 日本円はそのまま
                    currency: 'jpy',
                    metadata: {
                        type,
                        itemId,
                        buyerId,
                        sellerId,
                        platformFee: platformFee.toString(),
                        sellerAmount: sellerAmount.toString()
                    }
                });
                
                // 購入記録を作成（status: pending）
                const purchaseRef = await db.collection('purchases').add({
                    type,
                    itemId,
                    itemTitle: itemData.title || itemData.name || '',
                    buyerId,
                    sellerId,
                    amount,
                    platformFee,
                    sellerAmount,
                    stripePaymentIntentId: paymentIntent.id,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`PaymentIntent created: ${paymentIntent.id}, Purchase: ${purchaseRef.id}`);
                
                return res.status(200).json({
                    clientSecret: paymentIntent.client_secret,
                    purchaseId: purchaseRef.id
                });
                
            } catch (error) {
                console.error('createPaymentIntent error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * Stripe Webhook - 決済完了時の処理
 */
exports.stripeWebhook = functions
    .region('asia-northeast1')
    .https.onRequest(async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
        
        let event;
        
        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            
            console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
            
            try {
                // 購入記録を更新
                const purchasesSnapshot = await db.collection('purchases')
                    .where('stripePaymentIntentId', '==', paymentIntent.id)
                    .limit(1)
                    .get();
                
                if (!purchasesSnapshot.empty) {
                    const purchaseDoc = purchasesSnapshot.docs[0];
                    await purchaseDoc.ref.update({
                        status: 'paid',
                        paidAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    const purchaseData = purchaseDoc.data();
                    
                    // 販売者に通知
                    await sendPurchaseNotification(purchaseData, 'seller');
                    // 購入者に通知
                    await sendPurchaseNotification(purchaseData, 'buyer');
                    
                    console.log(`Purchase ${purchaseDoc.id} updated to paid`);
                }
            } catch (error) {
                console.error('Error updating purchase:', error);
            }
        }
        
        res.status(200).json({ received: true });
    });

/**
 * 購入通知を送信
 */
async function sendPurchaseNotification(purchaseData, target) {
    const userId = target === 'seller' ? purchaseData.sellerId : purchaseData.buyerId;
    
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return;
        
        const user = userDoc.data();
        const fcmToken = user.fcmToken;
        if (!fcmToken) return;
        
        const title = target === 'seller' 
            ? '商品が購入されました' 
            : '購入が完了しました';
        const body = target === 'seller'
            ? `「${purchaseData.itemTitle}」が購入されました`
            : `「${purchaseData.itemTitle}」の購入が完了しました`;
        
        await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data: {
                purchaseId: purchaseData.id || '',
                type: 'purchase'
            },
            webpush: {
                fcmOptions: {
                    link: 'https://djhakk-app.web.app/profile.html'
                }
            }
        });
        
        console.log(`Purchase notification sent to ${target}: ${userId}`);
    } catch (error) {
        console.error('Error sending purchase notification:', error);
    }
}

/**
 * 受取確認
 * POST /confirmReceipt
 * Body: { purchaseId, buyerId }
 */
exports.confirmReceipt = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { purchaseId, buyerId } = req.body;
                
                if (!purchaseId || !buyerId) {
                    return res.status(400).json({ error: '必須パラメータが不足しています' });
                }
                
                const purchaseRef = db.collection('purchases').doc(purchaseId);
                const purchaseDoc = await purchaseRef.get();
                
                if (!purchaseDoc.exists) {
                    return res.status(404).json({ error: '購入記録が見つかりません' });
                }
                
                const purchase = purchaseDoc.data();
                
                // 購入者本人のみ受取確認可能
                if (purchase.buyerId !== buyerId) {
                    return res.status(403).json({ error: '権限がありません' });
                }
                
                // 支払い済みの場合のみ受取確認可能
                if (purchase.status !== 'paid') {
                    return res.status(400).json({ error: '受取確認できない状態です' });
                }
                
                // トランザクションで残高加算と購入記録更新を同時に行う
                await db.runTransaction(async (transaction) => {
                    const sellerRef = db.collection('users').doc(purchase.sellerId);
                    const sellerDoc = await transaction.get(sellerRef);
                    
                    const currentBalance = sellerDoc.exists ? (sellerDoc.data().balance || 0) : 0;
                    const newBalance = currentBalance + purchase.sellerAmount;
                    
                    // 販売者の残高を加算
                    transaction.update(sellerRef, { balance: newBalance });
                    
                    // 購入記録を更新
                    transaction.update(purchaseRef, {
                        status: 'completed',
                        receivedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                console.log(`Receipt confirmed for purchase ${purchaseId}, seller balance updated`);
                
                // 販売者に通知
                try {
                    const sellerDoc = await db.collection('users').doc(purchase.sellerId).get();
                    if (sellerDoc.exists) {
                        const seller = sellerDoc.data();
                        if (seller.fcmToken) {
                            await admin.messaging().send({
                                token: seller.fcmToken,
                                notification: {
                                    title: '売上が確定しました',
                                    body: `「${purchase.itemTitle}」の売上 ¥${purchase.sellerAmount.toLocaleString()} が残高に追加されました`
                                },
                                webpush: {
                                    fcmOptions: {
                                        link: 'https://djhakk-app.web.app/profile.html'
                                    }
                                }
                            });
                        }
                    }
                } catch (notifError) {
                    console.error('Error sending receipt notification:', notifError);
                }
                
                return res.status(200).json({ success: true });
                
            } catch (error) {
                console.error('confirmReceipt error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * 出金申請
 * POST /requestWithdrawal
 * Body: { userId, amount, fee, bankInfo }
 */
exports.requestWithdrawal = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { userId, amount, fee, bankInfo } = req.body;
                
                if (!userId || !amount || !bankInfo) {
                    return res.status(400).json({ error: '必須パラメータが不足しています' });
                }
                
                if (amount < MIN_WITHDRAWAL_AMOUNT) {
                    return res.status(400).json({ error: `最低出金額は¥${MIN_WITHDRAWAL_AMOUNT}です` });
                }
                
                // ユーザーの残高を確認
                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    return res.status(404).json({ error: 'ユーザーが見つかりません' });
                }
                
                const currentBalance = userDoc.data().balance || 0;
                
                if (currentBalance < amount) {
                    return res.status(400).json({ error: '残高が不足しています' });
                }
                
                const withdrawalFee = fee || WITHDRAWAL_FEE;
                const netAmount = amount - withdrawalFee;
                
                // トランザクションで残高減算と出金申請作成を同時に行う
                let withdrawalId;
                
                await db.runTransaction(async (transaction) => {
                    const freshUserDoc = await transaction.get(userRef);
                    const freshBalance = freshUserDoc.data().balance || 0;
                    
                    if (freshBalance < amount) {
                        throw new Error('残高が不足しています');
                    }
                    
                    // 残高を減算
                    transaction.update(userRef, { balance: freshBalance - amount });
                    
                    // 出金申請を作成
                    const withdrawalRef = db.collection('withdrawals').doc();
                    withdrawalId = withdrawalRef.id;
                    
                    transaction.set(withdrawalRef, {
                        userId,
                        amount,
                        fee: withdrawalFee,
                        netAmount,
                        bankInfo,
                        status: 'pending',
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                console.log(`Withdrawal request created: ${withdrawalId}`);
                
                return res.status(200).json({ 
                    success: true,
                    withdrawalId,
                    netAmount
                });
                
            } catch (error) {
                console.error('requestWithdrawal error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * 残高・履歴取得（認証済みユーザー用）
 * POST /getBalanceInfo
 * Body: { userId }
 */
exports.getBalanceInfo = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { userId } = req.body;
                
                if (!userId) {
                    return res.status(400).json({ error: 'userId is required' });
                }
                
                // 残高取得
                const userDoc = await db.collection('users').doc(userId).get();
                const balance = userDoc.exists ? (userDoc.data().balance || 0) : 0;
                
                // 保留中の売上（受取確認待ち）
                const pendingSalesSnapshot = await db.collection('purchases')
                    .where('sellerId', '==', userId)
                    .where('status', '==', 'paid')
                    .get();
                
                let pendingAmount = 0;
                pendingSalesSnapshot.forEach(doc => {
                    pendingAmount += doc.data().sellerAmount || 0;
                });
                
                return res.status(200).json({
                    balance,
                    pendingAmount
                });
                
            } catch (error) {
                console.error('getBalanceInfo error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

// ========================================
// Card Management Functions
// ========================================

/**
 * Stripe Customer取得または作成
 * @param {string} userId - Firebase User ID
 * @param {string} email - User email
 * @returns {string} - Stripe Customer ID
 */
async function getOrCreateStripeCustomer(userId, email) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists && userDoc.data().stripeCustomerId) {
        return userDoc.data().stripeCustomerId;
    }
    
    // Stripe Customerを作成
    const customer = await stripe.customers.create({
        email: email,
        metadata: { firebaseUserId: userId }
    });
    
    // FirestoreにCustomer IDを保存
    await userRef.update({ stripeCustomerId: customer.id });
    
    return customer.id;
}

/**
 * カード登録用SetupIntent作成
 * POST /createSetupIntent
 * Body: { userId, email }
 */
exports.createSetupIntent = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { userId, email } = req.body;
                
                if (!userId || !email) {
                    return res.status(400).json({ error: 'userId and email are required' });
                }
                
                // Customer取得/作成
                const customerId = await getOrCreateStripeCustomer(userId, email);
                
                // SetupIntent作成
                const setupIntent = await stripe.setupIntents.create({
                    customer: customerId,
                    payment_method_types: ['card'],
                    metadata: { userId }
                });
                
                return res.status(200).json({
                    clientSecret: setupIntent.client_secret,
                    customerId
                });
                
            } catch (error) {
                console.error('createSetupIntent error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * カード保存（SetupIntent完了後）
 * POST /savePaymentMethod
 * Body: { userId, paymentMethodId, setAsDefault }
 */
exports.savePaymentMethod = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { userId, paymentMethodId, setAsDefault } = req.body;
                
                if (!userId || !paymentMethodId) {
                    return res.status(400).json({ error: 'userId and paymentMethodId are required' });
                }
                
                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists || !userDoc.data().stripeCustomerId) {
                    return res.status(400).json({ error: 'Stripe customer not found' });
                }
                
                // PaymentMethod情報を取得
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
                
                // カード情報をFirestoreに保存
                const existingCards = userDoc.data().paymentMethods || [];
                const isFirstCard = existingCards.length === 0;
                
                const cardInfo = {
                    id: paymentMethodId,
                    brand: paymentMethod.card.brand,
                    last4: paymentMethod.card.last4,
                    expMonth: paymentMethod.card.exp_month,
                    expYear: paymentMethod.card.exp_year,
                    isDefault: isFirstCard || setAsDefault === true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                
                // デフォルト設定時は他のカードのデフォルトを解除
                let updatedCards = existingCards;
                if (cardInfo.isDefault) {
                    updatedCards = existingCards.map(card => ({
                        ...card,
                        isDefault: false
                    }));
                }
                
                updatedCards.push(cardInfo);
                
                await userRef.update({ paymentMethods: updatedCards });
                
                console.log(`Payment method saved for user ${userId}: ${paymentMethodId}`);
                
                return res.status(200).json({ success: true, card: cardInfo });
                
            } catch (error) {
                console.error('savePaymentMethod error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * 保存済みカード一覧取得
 * POST /listPaymentMethods
 * Body: { userId }
 */
exports.listPaymentMethods = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { userId } = req.body;
                
                if (!userId) {
                    return res.status(400).json({ error: 'userId is required' });
                }
                
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (!userDoc.exists) {
                    return res.status(200).json({ cards: [] });
                }
                
                const cards = userDoc.data().paymentMethods || [];
                
                return res.status(200).json({ cards });
                
            } catch (error) {
                console.error('listPaymentMethods error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * カード削除
 * POST /deletePaymentMethod
 * Body: { userId, paymentMethodId }
 */
exports.deletePaymentMethod = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { userId, paymentMethodId } = req.body;
                
                if (!userId || !paymentMethodId) {
                    return res.status(400).json({ error: 'userId and paymentMethodId are required' });
                }
                
                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                const existingCards = userDoc.data().paymentMethods || [];
                
                // 最低1枚は残す必要あり
                if (existingCards.length <= 1) {
                    return res.status(400).json({ error: '最低1枚のカードは残す必要があります' });
                }
                
                // Stripeからデタッチ
                try {
                    await stripe.paymentMethods.detach(paymentMethodId);
                } catch (stripeError) {
                    console.log('Stripe detach error (may already be detached):', stripeError.message);
                }
                
                // Firestoreから削除
                const cardToDelete = existingCards.find(c => c.id === paymentMethodId);
                let updatedCards = existingCards.filter(c => c.id !== paymentMethodId);
                
                // 削除したカードがデフォルトだった場合、最初のカードをデフォルトに
                if (cardToDelete?.isDefault && updatedCards.length > 0) {
                    updatedCards[0].isDefault = true;
                }
                
                await userRef.update({ paymentMethods: updatedCards });
                
                console.log(`Payment method deleted for user ${userId}: ${paymentMethodId}`);
                
                return res.status(200).json({ success: true });
                
            } catch (error) {
                console.error('deletePaymentMethod error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * デフォルトカード設定
 * POST /setDefaultPaymentMethod
 * Body: { userId, paymentMethodId }
 */
exports.setDefaultPaymentMethod = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { userId, paymentMethodId } = req.body;
                
                if (!userId || !paymentMethodId) {
                    return res.status(400).json({ error: 'userId and paymentMethodId are required' });
                }
                
                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                const existingCards = userDoc.data().paymentMethods || [];
                
                // 全カードのデフォルトを更新
                const updatedCards = existingCards.map(card => ({
                    ...card,
                    isDefault: card.id === paymentMethodId
                }));
                
                await userRef.update({ paymentMethods: updatedCards });
                
                console.log(`Default payment method set for user ${userId}: ${paymentMethodId}`);
                
                return res.status(200).json({ success: true });
                
            } catch (error) {
                console.error('setDefaultPaymentMethod error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

/**
 * 保存済みカードで決済
 * POST /chargeWithSavedCard
 * Body: { type, itemId, amount, buyerId, sellerId, paymentMethodId, audioUrl? }
 */
exports.chargeWithSavedCard = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { type, itemId, amount, buyerId, sellerId, paymentMethodId, audioUrl } = req.body;
                
                // バリデーション
                if (!type || !itemId || !amount || !buyerId || !sellerId || !paymentMethodId) {
                    return res.status(400).json({ error: '必須パラメータが不足しています' });
                }
                
                if (buyerId === sellerId) {
                    return res.status(400).json({ error: '自分の商品は購入できません' });
                }
                
                // ユーザーのStripe Customer IDを取得
                const userDoc = await db.collection('users').doc(buyerId).get();
                if (!userDoc.exists || !userDoc.data().stripeCustomerId) {
                    return res.status(400).json({ error: 'カード情報が登録されていません' });
                }
                
                const customerId = userDoc.data().stripeCustomerId;
                
                // 商品情報を確認
                let itemDoc;
                if (type === 'goods' || type === 'audio' || type === 'produce' || type === 'download') {
                    itemDoc = await db.collection('productions').doc(itemId).get();
                } else if (type === 'event_slot') {
                    itemDoc = await db.collection('events').doc(itemId).get();
                }
                
                if (!itemDoc || !itemDoc.exists) {
                    return res.status(404).json({ error: '商品が見つかりません' });
                }
                
                const itemData = itemDoc.data();
                
                // 手数料計算
                const platformFee = Math.floor(amount * PLATFORM_FEE_PERCENT / 100);
                const sellerAmount = amount - platformFee;
                
                // downloadタイプかどうか
                const isDownload = type === 'download';
                
                // PaymentIntent作成＆即時確定
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'jpy',
                    customer: customerId,
                    payment_method: paymentMethodId,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        type,
                        itemId,
                        buyerId,
                        sellerId,
                        platformFee: platformFee.toString(),
                        sellerAmount: sellerAmount.toString()
                    }
                });
                
                // 購入記録を作成
                const purchaseData = {
                    type,
                    itemId,
                    itemTitle: itemData.title || itemData.name || '',
                    buyerId,
                    sellerId,
                    amount,
                    platformFee,
                    sellerAmount,
                    stripePaymentIntentId: paymentIntent.id,
                    status: paymentIntent.status === 'succeeded' ? (isDownload ? 'completed' : 'paid') : 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    paidAt: paymentIntent.status === 'succeeded' ? admin.firestore.FieldValue.serverTimestamp() : null
                };
                
                // downloadタイプの場合、audioUrlを保存
                if (isDownload && (audioUrl || itemData.audioUrl)) {
                    purchaseData.audioUrl = audioUrl || itemData.audioUrl;
                    if (paymentIntent.status === 'succeeded') {
                        purchaseData.completedAt = admin.firestore.FieldValue.serverTimestamp();
                    }
                }
                
                const purchaseRef = await db.collection('purchases').add(purchaseData);
                
                console.log(`Charge with saved card: ${paymentIntent.id}, Purchase: ${purchaseRef.id}`);
                
                if (paymentIntent.status === 'succeeded') {
                    // downloadタイプの場合、即座に売上反映
                    if (isDownload) {
                        await db.collection('users').doc(sellerId).update({
                            balance: admin.firestore.FieldValue.increment(sellerAmount)
                        });
                        console.log(`Download sale: Immediate release to seller ${sellerId}, amount: ${sellerAmount}`);
                    }
                    
                    // 通知送信
                    const notificationData = {
                        itemTitle: itemData.title || itemData.name || '',
                        sellerId,
                        buyerId
                    };
                    await sendPurchaseNotification(notificationData, 'seller');
                    await sendPurchaseNotification(notificationData, 'buyer');
                }
                
                return res.status(200).json({
                    success: paymentIntent.status === 'succeeded',
                    purchaseId: purchaseRef.id,
                    status: paymentIntent.status
                });
                
            } catch (error) {
                console.error('chargeWithSavedCard error:', error);
                
                // カードエラーの場合
                if (error.type === 'StripeCardError') {
                    return res.status(400).json({ error: error.message });
                }
                
                return res.status(500).json({ error: error.message });
            }
        });
    });

// ========================================
// Event Slot Purchase (TIMETABLE)
// ========================================

/**
 * イベントスロット購入
 * POST /purchaseEventSlot
 * Body: { eventId, slotIndex, amount, buyerId, sellerId, paymentMethodId, eventDate }
 */
exports.purchaseEventSlot = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { eventId, slotIndex, amount, buyerId, sellerId, paymentMethodId, eventDate } = req.body;
                
                // バリデーション
                if (!eventId || slotIndex === undefined || !amount || !buyerId || !sellerId || !paymentMethodId) {
                    return res.status(400).json({ error: '必須パラメータが不足しています' });
                }
                
                if (buyerId === sellerId) {
                    return res.status(400).json({ error: '自分のイベントには応募できません' });
                }
                
                // イベント情報を取得
                const eventRef = db.collection('events').doc(eventId);
                const eventDoc = await eventRef.get();
                
                if (!eventDoc.exists) {
                    return res.status(404).json({ error: 'イベントが見つかりません' });
                }
                
                const eventData = eventDoc.data();
                const slot = eventData.slots?.[slotIndex];
                
                if (!slot) {
                    return res.status(404).json({ error: 'スロットが見つかりません' });
                }
                
                // 既に応募済みかチェック
                if (slot.applicants && slot.applicants.includes(buyerId)) {
                    return res.status(400).json({ error: '既に応募済みです' });
                }
                
                // 定員チェック
                const currentCount = slot.applicants ? slot.applicants.length : 0;
                if (currentCount >= (slot.capacity || 1)) {
                    return res.status(400).json({ error: 'このスロットは満員です' });
                }
                
                // ユーザーのStripe Customer IDを取得
                const userDoc = await db.collection('users').doc(buyerId).get();
                if (!userDoc.exists || !userDoc.data().stripeCustomerId) {
                    return res.status(400).json({ error: 'カード情報が登録されていません' });
                }
                
                const customerId = userDoc.data().stripeCustomerId;
                
                // 手数料計算
                const platformFee = Math.floor(amount * PLATFORM_FEE_PERCENT / 100);
                const sellerAmount = amount - platformFee;
                
                // イベント開催日と売上反映日を計算
                const eventDateObj = eventDate ? new Date(eventDate) : (eventData.date?.toDate ? eventData.date.toDate() : new Date());
                const releaseDate = new Date(eventDateObj);
                releaseDate.setDate(releaseDate.getDate() + 1); // 翌日に売上反映
                
                // PaymentIntent作成＆即時確定
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: eventData.currency || 'jpy',
                    customer: customerId,
                    payment_method: paymentMethodId,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        type: 'event_slot',
                        eventId,
                        slotIndex: slotIndex.toString(),
                        buyerId,
                        sellerId,
                        platformFee: platformFee.toString(),
                        sellerAmount: sellerAmount.toString()
                    }
                });
                
                if (paymentIntent.status !== 'succeeded') {
                    return res.status(400).json({ error: '決済に失敗しました' });
                }
                
                // スロットにユーザーを追加
                const updatedSlots = [...eventData.slots];
                if (!updatedSlots[slotIndex].applicants) {
                    updatedSlots[slotIndex].applicants = [];
                }
                updatedSlots[slotIndex].applicants.push(buyerId);
                
                await eventRef.update({ slots: updatedSlots });
                
                // 購入記録を作成
                const purchaseRef = await db.collection('purchases').add({
                    type: 'event_slot',
                    itemId: eventId,
                    slotIndex,
                    itemTitle: `${eventData.title} - ${slot.time || 'TBD'}`,
                    buyerId,
                    sellerId,
                    amount,
                    currency: eventData.currency || 'jpy',
                    platformFee,
                    sellerAmount,
                    stripePaymentIntentId: paymentIntent.id,
                    status: 'paid', // 受取確認不要なのでpaidのまま
                    eventDate: admin.firestore.Timestamp.fromDate(eventDateObj),
                    releaseDate: admin.firestore.Timestamp.fromDate(releaseDate),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    paidAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`Event slot purchased: ${eventId}, slot ${slotIndex}, Purchase: ${purchaseRef.id}`);
                
                // 通知送信
                const purchaseData = {
                    itemTitle: `${eventData.title} - ${slot.time || 'TBD'}`,
                    sellerId,
                    buyerId
                };
                await sendPurchaseNotification(purchaseData, 'seller');
                await sendPurchaseNotification(purchaseData, 'buyer');
                
                return res.status(200).json({
                    success: true,
                    purchaseId: purchaseRef.id
                });
                
            } catch (error) {
                console.error('purchaseEventSlot error:', error);
                
                if (error.type === 'StripeCardError') {
                    return res.status(400).json({ error: error.message });
                }
                
                return res.status(500).json({ error: error.message });
            }
        });
    });

// ========================================
// Cancel Purchase
// ========================================

// キャンセル設定
const CANCEL_CONFIG = {
    event_slot: {
        canCancel: true,
        cancelDeadlineDays: 3,
        cancelFeePercent: 10
    },
    production: {
        canCancel: false
    },
    download: {
        canCancel: false
    }
};

/**
 * 購入キャンセル
 * POST /cancelPurchase
 * Body: { purchaseId, userId, reason }
 */
exports.cancelPurchase = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const { purchaseId, userId, reason } = req.body;
                
                if (!purchaseId || !userId) {
                    return res.status(400).json({ error: '必須パラメータが不足しています' });
                }
                
                // 購入情報を取得
                const purchaseRef = db.collection('purchases').doc(purchaseId);
                const purchaseDoc = await purchaseRef.get();
                
                if (!purchaseDoc.exists) {
                    return res.status(404).json({ error: '購入情報が見つかりません' });
                }
                
                const purchase = purchaseDoc.data();
                
                // 権限チェック（購入者または主催者のみ）
                if (purchase.buyerId !== userId && purchase.sellerId !== userId) {
                    return res.status(403).json({ error: 'キャンセル権限がありません' });
                }
                
                // キャンセル可否チェック
                const cancelConfig = CANCEL_CONFIG[purchase.type] || { canCancel: false };
                
                if (!cancelConfig.canCancel) {
                    return res.status(400).json({ error: 'このタイプはキャンセルできません' });
                }
                
                if (purchase.status === 'cancelled') {
                    return res.status(400).json({ error: '既にキャンセル済みです' });
                }
                
                if (purchase.status === 'completed') {
                    return res.status(400).json({ error: '既に完了した購入はキャンセルできません' });
                }
                
                // イベント系の場合、キャンセル期限チェック
                if (cancelConfig.cancelDeadlineDays && purchase.eventDate) {
                    const eventDate = purchase.eventDate.toDate();
                    const deadline = new Date(eventDate);
                    deadline.setDate(deadline.getDate() - cancelConfig.cancelDeadlineDays);
                    
                    if (new Date() > deadline) {
                        return res.status(400).json({ 
                            error: `キャンセル期限（開催日${cancelConfig.cancelDeadlineDays}日前）を過ぎています` 
                        });
                    }
                }
                
                // 返金額計算
                const cancelFeePercent = cancelConfig.cancelFeePercent || 10;
                const cancelFee = Math.floor(purchase.amount * cancelFeePercent / 100);
                const refundAmount = purchase.amount - cancelFee;
                
                // イベントスロットの場合、applicantsから削除
                if (purchase.type === 'event_slot' && purchase.itemId && purchase.slotIndex !== undefined) {
                    const eventRef = db.collection('events').doc(purchase.itemId);
                    const eventDoc = await eventRef.get();
                    
                    if (eventDoc.exists) {
                        const eventData = eventDoc.data();
                        const updatedSlots = [...eventData.slots];
                        
                        if (updatedSlots[purchase.slotIndex]?.applicants) {
                            updatedSlots[purchase.slotIndex].applicants = 
                                updatedSlots[purchase.slotIndex].applicants.filter(uid => uid !== purchase.buyerId);
                            
                            await eventRef.update({ slots: updatedSlots });
                        }
                    }
                }
                
                // 購入者のウォレットに返金
                const buyerRef = db.collection('users').doc(purchase.buyerId);
                await buyerRef.update({
                    balance: admin.firestore.FieldValue.increment(refundAmount)
                });
                
                // 購入情報を更新
                await purchaseRef.update({
                    status: 'cancelled',
                    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                    cancelReason: reason || 'buyer',
                    cancelFee,
                    refundAmount
                });
                
                console.log(`Purchase cancelled: ${purchaseId}, Refund: ${refundAmount}`);
                
                return res.status(200).json({
                    success: true,
                    cancelFee,
                    refundAmount
                });
                
            } catch (error) {
                console.error('cancelPurchase error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

// ========================================
// Release Pending Sales (Scheduled)
// ========================================

/**
 * 保留中の売上を反映（毎日実行）
 * イベント開催日の翌日に売上を販売者に反映
 */
exports.releasePendingSales = functions
    .region('asia-northeast1')
    .pubsub.schedule('0 3 * * *') // 毎日午前3時に実行
    .timeZone('Asia/Tokyo')
    .onRun(async (context) => {
        const now = new Date();
        console.log(`Running releasePendingSales at ${now.toISOString()}`);
        
        try {
            // releaseDate が今日以前で、status が 'paid' の購入を取得
            const snapshot = await db.collection('purchases')
                .where('status', '==', 'paid')
                .where('releaseDate', '<=', admin.firestore.Timestamp.fromDate(now))
                .get();
            
            console.log(`Found ${snapshot.size} purchases to release`);
            
            let releasedCount = 0;
            let totalAmount = 0;
            
            for (const doc of snapshot.docs) {
                const purchase = doc.data();
                
                // 販売者の残高に加算
                const sellerRef = db.collection('users').doc(purchase.sellerId);
                await sellerRef.update({
                    balance: admin.firestore.FieldValue.increment(purchase.sellerAmount)
                });
                
                // 購入ステータスを更新
                await doc.ref.update({
                    status: 'completed',
                    completedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                releasedCount++;
                totalAmount += purchase.sellerAmount;
                
                console.log(`Released: ${doc.id}, seller: ${purchase.sellerId}, amount: ${purchase.sellerAmount}`);
            }
            
            console.log(`releasePendingSales completed: ${releasedCount} purchases, total: ${totalAmount}`);
            
            return null;
            
        } catch (error) {
            console.error('releasePendingSales error:', error);
            return null;
        }
    });

/**
 * 手動で売上反映を実行（管理用）
 * POST /manualReleaseSales
 */
exports.manualReleaseSales = functions
    .region('asia-northeast1')
    .https.onRequest((req, res) => {
        cors(req, res, async () => {
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            
            try {
                const now = new Date();
                
                const snapshot = await db.collection('purchases')
                    .where('status', '==', 'paid')
                    .where('releaseDate', '<=', admin.firestore.Timestamp.fromDate(now))
                    .get();
                
                let releasedCount = 0;
                let totalAmount = 0;
                
                for (const doc of snapshot.docs) {
                    const purchase = doc.data();
                    
                    const sellerRef = db.collection('users').doc(purchase.sellerId);
                    await sellerRef.update({
                        balance: admin.firestore.FieldValue.increment(purchase.sellerAmount)
                    });
                    
                    await doc.ref.update({
                        status: 'completed',
                        completedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    releasedCount++;
                    totalAmount += purchase.sellerAmount;
                }
                
                return res.status(200).json({
                    success: true,
                    releasedCount,
                    totalAmount
                });
                
            } catch (error) {
                console.error('manualReleaseSales error:', error);
                return res.status(500).json({ error: error.message });
            }
        });
    });

// ========================================
// GUARANTEE (ギャラ) 承認・完了
// ========================================

/**
 * GUARANTEE承認 - 主催者が応募者を承認し、課金を実行
 */
exports.approveGuarantee = functions.region('asia-northeast1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        try {
            const { eventId, slotIndex, applicantUid, organizerId } = req.body;
            
            if (!eventId || slotIndex === undefined || !applicantUid || !organizerId) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            // イベント取得
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (!eventDoc.exists) {
                return res.status(404).json({ error: 'Event not found' });
            }
            
            const event = eventDoc.data();
            
            // 主催者確認
            if (event.organizerId !== organizerId) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            // Type B確認
            if (event.type !== 'B') {
                return res.status(400).json({ error: 'Not a GUARANTEE event' });
            }
            
            const slots = event.slots || [];
            if (slotIndex < 0 || slotIndex >= slots.length) {
                return res.status(400).json({ error: 'Invalid slot index' });
            }
            
            const slot = slots[slotIndex];
            
            // 既に承認済みか確認
            if (slot.status === 'approved' || slot.status === 'completed') {
                return res.status(400).json({ error: 'Slot already approved' });
            }
            
            // 応募者確認
            if (!slot.applicants || !slot.applicants.includes(applicantUid)) {
                return res.status(400).json({ error: 'Applicant not found in this slot' });
            }
            
            const price = slot.price || 0;
            const currency = event.currency || 'jpy';
            
            let purchaseId = null;
            
            // 有料の場合、主催者に課金
            if (price > 0) {
                // 主催者のStripe customer取得
                const organizerDoc = await db.collection('users').doc(organizerId).get();
                if (!organizerDoc.exists) {
                    return res.status(404).json({ error: 'Organizer not found' });
                }
                
                const organizer = organizerDoc.data();
                if (!organizer.stripeCustomerId) {
                    return res.status(400).json({ error: 'Organizer has no payment method registered' });
                }
                
                // 手数料計算
                const platformFee = Math.floor(price * PLATFORM_FEE_PERCENT / 100);
                const sellerAmount = price - platformFee;
                
                // Stripe課金
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: price,
                    currency: currency,
                    customer: organizer.stripeCustomerId,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        type: 'guarantee',
                        eventId,
                        slotIndex: slotIndex.toString(),
                        organizerId,
                        applicantUid
                    }
                });
                
                if (paymentIntent.status !== 'succeeded') {
                    return res.status(400).json({ error: 'Payment failed' });
                }
                
                // 購入レコード作成
                const purchaseRef = await db.collection('purchases').add({
                    type: 'guarantee',
                    itemId: eventId,
                    slotIndex,
                    buyerId: organizerId, // 支払うのは主催者
                    sellerId: applicantUid, // 受け取るのは出演者
                    amount: price,
                    currency,
                    platformFee,
                    sellerAmount,
                    stripePaymentIntentId: paymentIntent.id,
                    status: 'paid', // 完了報告まで保留
                    eventDate: event.date,
                    eventTitle: event.title,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                purchaseId = purchaseRef.id;
            }
            
            // スロット更新
            slots[slotIndex] = {
                ...slot,
                status: 'approved',
                approvedUid: applicantUid,
                purchaseId: purchaseId,
                approvedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await eventRef.update({ slots });
            
            // 出演者に通知
            const applicantDoc = await db.collection('users').doc(applicantUid).get();
            if (applicantDoc.exists) {
                const fcmToken = applicantDoc.data().fcmToken;
                if (fcmToken) {
                    try {
                        await admin.messaging().send({
                            token: fcmToken,
                            notification: {
                                title: 'GUARANTEE承認',
                                body: `「${event.title}」への出演が承認されました！`
                            },
                            data: {
                                type: 'guarantee_approved',
                                eventId
                            }
                        });
                    } catch (e) {
                        console.error('Failed to send notification:', e);
                    }
                }
            }
            
            return res.status(200).json({
                success: true,
                purchaseId,
                message: 'Approved successfully'
            });
            
        } catch (error) {
            console.error('approveGuarantee error:', error);
            return res.status(500).json({ error: error.message });
        }
    });
});

/**
 * GUARANTEE完了報告 - 主催者が出演完了を報告し、出演者への支払いを実行
 */
exports.completeGuarantee = functions.region('asia-northeast1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        try {
            const { eventId, slotIndex, organizerId } = req.body;
            
            if (!eventId || slotIndex === undefined || !organizerId) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            // イベント取得
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await eventRef.get();
            if (!eventDoc.exists) {
                return res.status(404).json({ error: 'Event not found' });
            }
            
            const event = eventDoc.data();
            
            // 主催者確認
            if (event.organizerId !== organizerId) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            const slots = event.slots || [];
            if (slotIndex < 0 || slotIndex >= slots.length) {
                return res.status(400).json({ error: 'Invalid slot index' });
            }
            
            const slot = slots[slotIndex];
            
            // 承認済みか確認
            if (slot.status !== 'approved') {
                return res.status(400).json({ error: 'Slot is not approved yet' });
            }
            
            const applicantUid = slot.approvedUid;
            const price = slot.price || 0;
            
            // 有料の場合、出演者のウォレットに反映
            if (price > 0 && slot.purchaseId) {
                const purchaseRef = db.collection('purchases').doc(slot.purchaseId);
                const purchaseDoc = await purchaseRef.get();
                
                if (purchaseDoc.exists) {
                    const purchase = purchaseDoc.data();
                    
                    // 出演者のbalanceに追加
                    const sellerRef = db.collection('users').doc(applicantUid);
                    await sellerRef.update({
                        balance: admin.firestore.FieldValue.increment(purchase.sellerAmount)
                    });
                    
                    // 購入レコード更新
                    await purchaseRef.update({
                        status: 'completed',
                        completedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            // スロット更新
            slots[slotIndex] = {
                ...slot,
                status: 'completed',
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await eventRef.update({ slots });
            
            // 出演者に通知
            const applicantDoc = await db.collection('users').doc(applicantUid).get();
            if (applicantDoc.exists) {
                const fcmToken = applicantDoc.data().fcmToken;
                if (fcmToken) {
                    try {
                        await admin.messaging().send({
                            token: fcmToken,
                            notification: {
                                title: '出演完了',
                                body: `「${event.title}」の出演完了が報告されました。ギャラがウォレットに反映されました！`
                            },
                            data: {
                                type: 'guarantee_completed',
                                eventId
                            }
                        });
                    } catch (e) {
                        console.error('Failed to send notification:', e);
                    }
                }
            }
            
            return res.status(200).json({
                success: true,
                message: 'Completed successfully'
            });
            
        } catch (error) {
            console.error('completeGuarantee error:', error);
            return res.status(500).json({ error: error.message });
        }
    });
});
