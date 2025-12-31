// ========================================
// DJHAKK Stripe Payment Module
// ========================================

let stripe = null;
let elements = null;
let cardElement = null;
let currentPaymentData = null;
let savedCards = [];
let selectedCardId = null;

// ========================================
// 購入タイプ別設定（保守性のため一元管理）
// ========================================
const PURCHASE_TYPE_CONFIG = {
    // ITEM SALES（商品販売）
    production: {
        label: '商品購入',
        needsReceipt: true,           // 受取確認が必要
        releaseOnReceipt: true,       // 受取確認後に売上反映
        canCancel: false,             // キャンセル不可
        cancelDeadlineDays: null,
        note: '※ 受取確認後、販売者に売上が反映されます'
    },
    // ITEM SALES（goods - productionと同じ）
    goods: {
        label: '商品購入',
        needsReceipt: true,
        releaseOnReceipt: true,
        canCancel: false,
        cancelDeadlineDays: null,
        note: '※ 受取確認後、販売者に売上が反映されます'
    },
    // SELF PRODUCE（サービス販売）
    produce: {
        label: 'サービス購入',
        needsReceipt: true,           // 受取確認が必要
        releaseOnReceipt: true,       // 受取確認後に売上反映
        canCancel: false,             // キャンセル不可
        cancelDeadlineDays: null,
        note: '※ 受取確認後、販売者に売上が反映されます'
    },
    // TIMETABLE（イベントスロット購入）
    event_slot: {
        label: 'スロット購入',
        needsReceipt: false,          // 受取確認不要
        releaseOnReceipt: false,      // イベント翌日に売上反映
        releaseAfterEventDays: 1,     // イベント開催日の翌日
        canCancel: true,              // キャンセル可能
        cancelDeadlineDays: 3,        // 開催日の3日前まで
        cancelFeePercent: 10,         // キャンセル手数料10%
        note: '※ 売上はイベント開催日の翌日に反映されます'
    },
    // DOWNLOAD SALES
    download: {
        label: 'ダウンロード購入',
        needsReceipt: false,          // 即時ダウンロード
        releaseOnReceipt: false,
        releaseImmediately: true,     // 即時売上反映
        canCancel: false,             // ダウンロード後はキャンセル不可
        cancelDeadlineDays: null,
        note: '※ 購入後すぐにダウンロードできます'
    },
    // GUARANTEE（ギャラ支払い）
    guarantee: {
        label: 'ギャラ支払い',
        needsReceipt: false,
        releaseOnReceipt: false,
        releaseAfterEventDays: 1,
        canCancel: true,
        cancelDeadlineDays: 3,
        cancelFeePercent: 10,
        note: '※ イベント開催日の翌日に支払われます'
    }
};

/**
 * 購入タイプの設定を取得
 */
function getPurchaseConfig(type) {
    return PURCHASE_TYPE_CONFIG[type] || PURCHASE_TYPE_CONFIG.production;
}

/**
 * Stripe初期化
 */
function initStripe() {
    if (!stripe && typeof Stripe !== 'undefined') {
        stripe = Stripe(STRIPE_CONFIG.publishableKey);
    }
    return stripe;
}

/**
 * 手数料計算
 */
function calculateFees(amount) {
    const platformFee = Math.floor(amount * STRIPE_CONFIG.platformFeePercent / 100);
    const sellerAmount = amount - platformFee;
    const stripeFee = Math.floor(amount * 0.036) + 40;
    
    return {
        amount,
        platformFee,
        sellerAmount,
        stripeFee,
        platformProfit: platformFee - stripeFee
    };
}

/**
 * キャンセル時の返金額計算
 */
function calculateRefund(amount, cancelFeePercent = 10) {
    const cancelFee = Math.floor(amount * cancelFeePercent / 100);
    return {
        originalAmount: amount,
        cancelFee,
        refundAmount: amount - cancelFee
    };
}

// ========================================
// カード管理関数
// ========================================

/**
 * 保存済みカード一覧取得
 */
async function getSavedCards() {
    if (!user) return [];
    
    try {
        const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/listPaymentMethods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid })
        });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        savedCards = data.cards || [];
        return savedCards;
    } catch (error) {
        console.error('Get saved cards error:', error);
        return [];
    }
}

/**
 * カード登録用SetupIntent作成
 */
async function createSetupIntent() {
    if (!user) throw new Error('ログインが必要です');
    
    const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/createSetupIntent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: user.uid,
            email: user.email
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'カード登録の準備に失敗しました');
    }
    
    return await response.json();
}

/**
 * カード保存
 */
async function saveCard(paymentMethodId, setAsDefault = false) {
    if (!user) throw new Error('ログインが必要です');
    
    const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/savePaymentMethod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: user.uid,
            paymentMethodId,
            setAsDefault
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'カードの保存に失敗しました');
    }
    
    return await response.json();
}

/**
 * カード削除
 */
async function deleteCard(paymentMethodId) {
    if (!user) throw new Error('ログインが必要です');
    
    const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/deletePaymentMethod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: user.uid,
            paymentMethodId
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'カードの削除に失敗しました');
    }
    
    return await response.json();
}

/**
 * デフォルトカード設定
 */
async function setDefaultCard(paymentMethodId) {
    if (!user) throw new Error('ログインが必要です');
    
    const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/setDefaultPaymentMethod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: user.uid,
            paymentMethodId
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'デフォルト設定に失敗しました');
    }
    
    return await response.json();
}

/**
 * カードブランドのアイコン取得
 */
function getCardBrandIcon(brand) {
    const icons = {
        visa: '💳 Visa',
        mastercard: '💳 Mastercard',
        amex: '💳 Amex',
        jcb: '💳 JCB',
        diners: '💳 Diners',
        discover: '💳 Discover'
    };
    return icons[brand?.toLowerCase()] || '💳 Card';
}

// ========================================
// 決済モーダル（カード選択対応）
// ========================================

/**
 * 決済モーダルを開く
 */
async function openPaymentModal(params) {
    const { type, itemId, title, price, sellerId, sellerName } = params;
    
    if (!requireLogin()) return;
    
    if (sellerId === user.uid) {
        toast('自分の商品は購入できません', 'error');
        return;
    }
    
    currentPaymentData = params;
    
    // 保存済みカードを取得
    await getSavedCards();
    
    // デフォルトカードを選択
    const defaultCard = savedCards.find(c => c.isDefault);
    selectedCardId = defaultCard ? defaultCard.id : null;
    
    const fees = calculateFees(price);
    
    // カード選択HTML
    let cardSelectionHtml = '';
    if (savedCards.length > 0) {
        cardSelectionHtml = `
            <div class="saved-cards-section">
                <label>お支払い方法</label>
                <div class="saved-cards-list">
                    ${savedCards.map(card => `
                        <div class="saved-card-item ${card.isDefault ? 'selected' : ''}" 
                             data-card-id="${card.id}" onclick="selectPaymentCard('${card.id}')">
                            <div class="saved-card-radio">
                                <input type="radio" name="paymentCard" value="${card.id}" 
                                       ${card.isDefault ? 'checked' : ''}>
                            </div>
                            <div class="saved-card-info">
                                <span class="saved-card-brand">${getCardBrandIcon(card.brand)}</span>
                                <span class="saved-card-number">**** ${card.last4}</span>
                            </div>
                            <div class="saved-card-exp">${card.expMonth}/${card.expYear}</div>
                        </div>
                    `).join('')}
                    <div class="saved-card-item new-card" data-card-id="new" onclick="selectPaymentCard('new')">
                        <div class="saved-card-radio">
                            <input type="radio" name="paymentCard" value="new">
                        </div>
                        <div class="saved-card-info">
                            <span>+ 新しいカードで支払う</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="new-card-section" id="newCardSection" style="display:none;">
                <label>カード情報</label>
                <div id="card-element"></div>
                <div id="card-errors" class="payment-error"></div>
                <label class="save-card-checkbox">
                    <input type="checkbox" id="saveCardCheckbox" checked>
                    このカードを保存する
                </label>
            </div>
        `;
    } else {
        cardSelectionHtml = `
            <div class="payment-card-section">
                <label>カード情報</label>
                <div id="card-element"></div>
                <div id="card-errors" class="payment-error"></div>
                <label class="save-card-checkbox">
                    <input type="checkbox" id="saveCardCheckbox" checked>
                    このカードを保存する
                </label>
            </div>
        `;
        selectedCardId = 'new';
    }
    
    const modalHtml = `
        <div class="payment-modal" id="paymentModal">
            <div class="payment-modal-content">
                <div class="payment-modal-header">
                    <button class="payment-modal-close" onclick="closePaymentModal()">×</button>
                    <h2>購入確認</h2>
                </div>
                <div class="payment-modal-body">
                    <div class="payment-item-info">
                        <h3>${escapeHtml(title)}</h3>
                        <p class="payment-seller">販売者: ${escapeHtml(sellerName)}</p>
                        <p class="payment-price">${formatPaymentPrice(price, params.currency || 'jpy')}</p>
                    </div>
                    
                    ${cardSelectionHtml}
                    
                    <div class="payment-summary">
                        <div class="payment-row">
                            <span>商品価格</span>
                            <span>${formatPaymentPrice(price, params.currency || 'jpy')}</span>
                        </div>
                        <div class="payment-row total">
                            <span>お支払い金額</span>
                            <span>${formatPaymentPrice(price, params.currency || 'jpy')}</span>
                        </div>
                    </div>
                    
                    <button class="payment-submit-btn" id="paymentSubmitBtn" onclick="submitPayment()">
                        ${formatPaymentPrice(price, params.currency || 'jpy')} を支払う
                    </button>
                    
                    <p class="payment-note">
                        ${getPurchaseConfig(type).note}
                    </p>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 新しいカード入力が必要な場合のみStripe Elements初期化
    if (savedCards.length === 0 || selectedCardId === 'new') {
        initStripeElements();
    }
    
    setTimeout(() => {
        document.getElementById('paymentModal').classList.add('active');
    }, 10);
}

/**
 * Stripe Elementsを初期化
 */
function initStripeElements() {
    initStripe();
    elements = stripe.elements();
    cardElement = elements.create('card', {
        style: {
            base: {
                color: '#ffffff',
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '16px',
                '::placeholder': { color: '#6B6B80' }
            },
            invalid: { color: '#FF4757' }
        }
    });
    
    const cardElementDiv = document.getElementById('card-element');
    if (cardElementDiv) {
        cardElement.mount('#card-element');
        cardElement.on('change', (event) => {
            const errorEl = document.getElementById('card-errors');
            if (errorEl) {
                errorEl.textContent = event.error ? event.error.message : '';
            }
        });
    }
}

/**
 * 支払いカード選択
 */
function selectPaymentCard(cardId) {
    selectedCardId = cardId;
    
    // 選択状態を更新
    document.querySelectorAll('.saved-card-item').forEach(item => {
        item.classList.remove('selected');
        const radio = item.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });
    
    const selectedItem = document.querySelector(`.saved-card-item[data-card-id="${cardId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        const radio = selectedItem.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
    
    // 新しいカード入力セクションの表示/非表示
    const newCardSection = document.getElementById('newCardSection');
    if (newCardSection) {
        if (cardId === 'new') {
            newCardSection.style.display = 'block';
            if (!cardElement) {
                initStripeElements();
            }
        } else {
            newCardSection.style.display = 'none';
        }
    }
}

/**
 * 決済モーダルを閉じる
 */
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (cardElement) {
                cardElement.destroy();
                cardElement = null;
            }
            elements = null;
            modal.remove();
        }, 300);
    }
    currentPaymentData = null;
    selectedCardId = null;
}

/**
 * 決済実行
 */
async function submitPayment() {
    if (!currentPaymentData) return;
    
    const btn = document.getElementById('paymentSubmitBtn');
    btn.disabled = true;
    btn.textContent = '処理中...';
    
    try {
        if (selectedCardId && selectedCardId !== 'new') {
            // 保存済みカードで決済
            await payWithSavedCard();
        } else {
            // 新しいカードで決済
            await payWithNewCard();
        }
    } catch (error) {
        console.error('Payment error:', error);
        const errorEl = document.getElementById('card-errors');
        if (errorEl) {
            errorEl.textContent = error.message;
        } else {
            toast(error.message, 'error');
        }
        btn.disabled = false;
        btn.textContent = `¥${currentPaymentData.price.toLocaleString()} を支払う`;
    }
}

/**
 * 保存済みカードで決済
 */
async function payWithSavedCard() {
    let endpoint = `${STRIPE_CONFIG.functionsUrl}/chargeWithSavedCard`;
    let body = {
        type: currentPaymentData.type,
        itemId: currentPaymentData.itemId,
        amount: currentPaymentData.price,
        buyerId: user.uid,
        sellerId: currentPaymentData.sellerId,
        paymentMethodId: selectedCardId
    };
    
    // downloadタイプの場合、audioUrlを追加
    if (currentPaymentData.type === 'download' && currentPaymentData.audioUrl) {
        body.audioUrl = currentPaymentData.audioUrl;
    }
    
    // event_slotの場合は専用APIを使用
    if (currentPaymentData.type === 'event_slot') {
        endpoint = `${STRIPE_CONFIG.functionsUrl}/purchaseEventSlot`;
        body = {
            eventId: currentPaymentData.itemId,
            slotIndex: currentPaymentData.slotIndex,
            amount: currentPaymentData.price,
            buyerId: user.uid,
            sellerId: currentPaymentData.sellerId,
            paymentMethodId: selectedCardId,
            eventDate: currentPaymentData.eventDate
        };
    }
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '決済に失敗しました');
    }
    
    const result = await response.json();
    
    if (result.success) {
        const onSuccess = currentPaymentData.onSuccess;
        closePaymentModal();
        
        // コールバックがあれば実行、なければデフォルト処理
        if (typeof onSuccess === 'function') {
            onSuccess(result.purchaseId);
        } else {
            showPaymentSuccess(result.purchaseId);
        }
    } else {
        throw new Error('決済に失敗しました');
    }
}

/**
 * 新しいカードで決済
 */
async function payWithNewCard() {
    if (!stripe || !cardElement) {
        throw new Error('カード情報を入力してください');
    }
    
    // event_slotの場合は、まずカードを保存してからpurchaseEventSlotを呼び出す
    if (currentPaymentData.type === 'event_slot') {
        // SetupIntent作成
        const { clientSecret } = await createSetupIntent();
        
        // カード確認
        const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: { card: cardElement }
        });
        
        if (setupError) {
            throw new Error(setupError.message);
        }
        
        if (setupIntent.status === 'succeeded') {
            // カード保存
            const isFirstCard = savedCards.length === 0;
            const saveCheckbox = document.getElementById('saveCardCheckbox');
            if (saveCheckbox?.checked) {
                try {
                    await saveCard(setupIntent.payment_method, isFirstCard);
                } catch (saveError) {
                    console.error('Card save error:', saveError);
                }
            }
            
            // purchaseEventSlotを呼び出し
            const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/purchaseEventSlot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: currentPaymentData.itemId,
                    slotIndex: currentPaymentData.slotIndex,
                    amount: currentPaymentData.price,
                    buyerId: user.uid,
                    sellerId: currentPaymentData.sellerId,
                    paymentMethodId: setupIntent.payment_method,
                    eventDate: currentPaymentData.eventDate
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '決済に失敗しました');
            }
            
            const result = await response.json();
            
            if (result.success) {
                const onSuccess = currentPaymentData.onSuccess;
                closePaymentModal();
                
                if (typeof onSuccess === 'function') {
                    onSuccess(result.purchaseId);
                } else {
                    showPaymentSuccess(result.purchaseId);
                }
            } else {
                throw new Error('決済に失敗しました');
            }
        }
        return;
    }
    
    // 通常の商品購入（production等）
    // PaymentIntent作成
    const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/createPaymentIntent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: currentPaymentData.type,
            itemId: currentPaymentData.itemId,
            amount: currentPaymentData.price,
            buyerId: user.uid,
            sellerId: currentPaymentData.sellerId
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '決済の準備に失敗しました');
    }
    
    const { clientSecret, purchaseId } = await response.json();
    
    // カード決済確認
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
        setup_future_usage: document.getElementById('saveCardCheckbox')?.checked ? 'off_session' : undefined
    });
    
    if (error) {
        throw new Error(error.message);
    }
    
    if (paymentIntent.status === 'succeeded') {
        // カード保存オプションがチェックされている場合
        const saveCheckbox = document.getElementById('saveCardCheckbox');
        if (saveCheckbox?.checked && paymentIntent.payment_method) {
            try {
                await saveCard(paymentIntent.payment_method, savedCards.length === 0);
            } catch (saveError) {
                console.error('Card save error:', saveError);
            }
        }
        
        const onSuccess = currentPaymentData.onSuccess;
        closePaymentModal();
        
        if (typeof onSuccess === 'function') {
            onSuccess(purchaseId);
        } else {
            showPaymentSuccess(purchaseId);
        }
    }
}

/**
 * 決済成功表示
 */
function showPaymentSuccess(purchaseId) {
    // ダウンロード購入の場合はダウンロードモーダルを表示
    if (currentPaymentData && currentPaymentData.type === 'download' && currentPaymentData.audioUrl) {
        showDownloadModal(currentPaymentData.title, currentPaymentData.audioUrl);
        return;
    }
    
    toast('購入が完了しました！');
    
    setTimeout(() => {
        if (typeof closeModal === 'function') {
            closeModal();
        }
    }, 1500);
}

/**
 * ダウンロードモーダル表示
 */
function showDownloadModal(title, audioUrl) {
    const modalHtml = `
        <div class="payment-modal" id="downloadModal">
            <div class="payment-modal-content">
                <div class="payment-modal-header">
                    <button class="payment-modal-close" onclick="closeDownloadModal()">×</button>
                    <h2>購入完了</h2>
                </div>
                <div class="payment-modal-body" style="text-align:center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
                    <h3 style="margin-bottom: 8px;">${escapeHtml(title)}</h3>
                    <p style="color:var(--text2); margin-bottom: 24px;">ダウンロード準備完了</p>
                    <a href="${audioUrl}" download class="download-btn" style="display:inline-block; padding: 16px 32px; background: var(--gradient); color: white; border-radius: 12px; font-weight: 700; text-decoration: none; margin-bottom: 16px;">
                        ダウンロード
                    </a>
                    <p style="font-size: 12px; color: var(--text3);">
                        ※ ダウンロードはプロフィールの購入履歴からいつでも可能です
                    </p>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => {
        document.getElementById('downloadModal').classList.add('active');
    }, 10);
}

function closeDownloadModal() {
    const modal = document.getElementById('downloadModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
    if (typeof closeModal === 'function') {
        closeModal();
    }
}

// ========================================
// カード登録モーダル（WALLET用）
// ========================================

/**
 * カード登録モーダルを開く
 */
async function openCardRegistrationModal() {
    if (!requireLogin()) return;
    
    const modalHtml = `
        <div class="payment-modal" id="cardRegistrationModal">
            <div class="payment-modal-content">
                <div class="payment-modal-header">
                    <button class="payment-modal-close" onclick="closeCardRegistrationModal()">×</button>
                    <h2>カード登録</h2>
                </div>
                <div class="payment-modal-body">
                    <p style="color:var(--text2);font-size:14px;margin-bottom:20px;">
                        クレジットカードを登録すると、次回以降ワンクリックで購入できます。
                    </p>
                    
                    <div class="payment-card-section">
                        <label>カード情報</label>
                        <div id="register-card-element"></div>
                        <div id="register-card-errors" class="payment-error"></div>
                    </div>
                    
                    <button class="payment-submit-btn" id="registerCardBtn" onclick="submitCardRegistration()">
                        カードを登録
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Stripe Elements初期化
    initStripe();
    elements = stripe.elements();
    cardElement = elements.create('card', {
        style: {
            base: {
                color: '#ffffff',
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '16px',
                '::placeholder': { color: '#6B6B80' }
            },
            invalid: { color: '#FF4757' }
        }
    });
    cardElement.mount('#register-card-element');
    
    cardElement.on('change', (event) => {
        const errorEl = document.getElementById('register-card-errors');
        errorEl.textContent = event.error ? event.error.message : '';
    });
    
    setTimeout(() => {
        document.getElementById('cardRegistrationModal').classList.add('active');
    }, 10);
}

/**
 * カード登録モーダルを閉じる
 */
function closeCardRegistrationModal() {
    const modal = document.getElementById('cardRegistrationModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (cardElement) {
                cardElement.destroy();
                cardElement = null;
            }
            elements = null;
            modal.remove();
        }, 300);
    }
}

/**
 * カード登録実行
 */
async function submitCardRegistration() {
    const btn = document.getElementById('registerCardBtn');
    btn.disabled = true;
    btn.textContent = '登録中...';
    
    try {
        // SetupIntent作成
        const { clientSecret } = await createSetupIntent();
        
        // カード確認
        const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: { card: cardElement }
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        if (setupIntent.status === 'succeeded') {
            // カード保存
            const isFirstCard = savedCards.length === 0;
            await saveCard(setupIntent.payment_method, isFirstCard);
            
            closeCardRegistrationModal();
            toast('カードを登録しました');
            
            // カード一覧を更新
            if (typeof loadSavedCards === 'function') {
                loadSavedCards();
            }
        }
    } catch (error) {
        console.error('Card registration error:', error);
        document.getElementById('register-card-errors').textContent = error.message;
        btn.disabled = false;
        btn.textContent = 'カードを登録';
    }
}

// ========================================
// その他の関数
// ========================================

/**
 * 受取確認
 */
async function confirmReceipt(purchaseId) {
    if (!requireLogin()) return;
    
    if (!confirm('商品を受け取りましたか？\n受取確認後、販売者に売上が反映されます。')) {
        return;
    }
    
    try {
        const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/confirmReceipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                purchaseId,
                buyerId: user.uid
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '受取確認に失敗しました');
        }
        
        toast('受取確認が完了しました');
        
        if (typeof loadPurchaseHistory === 'function') {
            loadPurchaseHistory();
        }
        
    } catch (error) {
        console.error('Confirm receipt error:', error);
        toast(error.message, 'error');
    }
}

/**
 * 出金申請
 */
async function requestWithdrawal(amount, bankInfo) {
    if (!requireLogin()) return;
    
    if (amount < STRIPE_CONFIG.minWithdrawalAmount) {
        toast(`最低出金額は¥${STRIPE_CONFIG.minWithdrawalAmount.toLocaleString()}です`, 'error');
        return false;
    }
    
    try {
        const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/requestWithdrawal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.uid,
                amount,
                fee: STRIPE_CONFIG.withdrawalFee,
                bankInfo
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '出金申請に失敗しました');
        }
        
        toast('出金申請を受け付けました');
        return true;
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        toast(error.message, 'error');
        return false;
    }
}

/**
 * 残高取得
 */
async function getBalance() {
    if (!user) return 0;
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        return userDoc.exists ? (userDoc.data().balance || 0) : 0;
    } catch (error) {
        console.error('Get balance error:', error);
        return 0;
    }
}

/**
 * 購入履歴取得
 */
async function getPurchaseHistory() {
    if (!user) return [];
    
    try {
        const snapshot = await db.collection('purchases')
            .where('buyerId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Get purchase history error:', error);
        return [];
    }
}

/**
 * 販売履歴取得
 */
async function getSalesHistory() {
    if (!user) return [];
    
    try {
        const snapshot = await db.collection('purchases')
            .where('sellerId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Get sales history error:', error);
        return [];
    }
}

/**
 * 出金履歴取得
 */
async function getWithdrawalHistory() {
    if (!user) return [];
    
    try {
        const snapshot = await db.collection('withdrawals')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Get withdrawal history error:', error);
        return [];
    }
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 決済用価格フォーマット
 */
function formatPaymentPrice(amount, currency = 'jpy') {
    const symbols = {
        jpy: '¥',
        usd: '$',
        eur: '€',
        gbp: '£'
    };
    const symbol = symbols[currency?.toLowerCase()] || '¥';
    return `${symbol}${amount.toLocaleString()}`;
}

// ========================================
// キャンセル関連関数
// ========================================

/**
 * キャンセル可否チェック
 * @param {Object} purchase - 購入データ
 * @returns {Object} { canCancel, reason }
 */
function canCancelPurchase(purchase) {
    const config = getPurchaseConfig(purchase.type);
    
    // キャンセル不可のタイプ
    if (!config.canCancel) {
        return { canCancel: false, reason: 'このタイプはキャンセルできません' };
    }
    
    // 既にキャンセル済み
    if (purchase.status === 'cancelled') {
        return { canCancel: false, reason: '既にキャンセル済みです' };
    }
    
    // 完了済み
    if (purchase.status === 'completed') {
        return { canCancel: false, reason: '既に完了しています' };
    }
    
    // イベント系の場合、開催日チェック
    if (config.cancelDeadlineDays && purchase.eventDate) {
        const eventDate = purchase.eventDate.toDate ? purchase.eventDate.toDate() : new Date(purchase.eventDate);
        const deadline = new Date(eventDate);
        deadline.setDate(deadline.getDate() - config.cancelDeadlineDays);
        
        if (new Date() > deadline) {
            return { 
                canCancel: false, 
                reason: `キャンセル期限（開催日${config.cancelDeadlineDays}日前）を過ぎています` 
            };
        }
    }
    
    return { canCancel: true, reason: null };
}

/**
 * 購入キャンセル
 * @param {string} purchaseId - 購入ID
 * @param {string} reason - キャンセル理由 ('buyer' | 'organizer')
 */
async function cancelPurchase(purchaseId, reason = 'buyer') {
    if (!requireLogin()) return false;
    
    try {
        const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/cancelPurchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                purchaseId,
                userId: user.uid,
                reason
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'キャンセルに失敗しました');
        }
        
        const result = await response.json();
        toast(`キャンセルしました（返金額: ¥${result.refundAmount.toLocaleString()}）`);
        return true;
        
    } catch (error) {
        console.error('Cancel purchase error:', error);
        toast(error.message, 'error');
        return false;
    }
}

/**
 * キャンセル確認ダイアログ
 */
async function confirmCancelPurchase(purchaseId, purchase) {
    const { canCancel, reason } = canCancelPurchase(purchase);
    
    if (!canCancel) {
        toast(reason, 'error');
        return false;
    }
    
    const config = getPurchaseConfig(purchase.type);
    const refund = calculateRefund(purchase.amount, config.cancelFeePercent);
    
    const confirmed = confirm(
        `この購入をキャンセルしますか？\n\n` +
        `購入金額: ¥${refund.originalAmount.toLocaleString()}\n` +
        `キャンセル手数料(${config.cancelFeePercent}%): ¥${refund.cancelFee.toLocaleString()}\n` +
        `返金額: ¥${refund.refundAmount.toLocaleString()}\n\n` +
        `※返金はウォレットに反映されます`
    );
    
    if (confirmed) {
        return await cancelPurchase(purchaseId, 'buyer');
    }
    return false;
}
