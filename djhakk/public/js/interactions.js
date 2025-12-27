// ========================================
// DJHAKK Interactions (Like, Comment, Slide Up)
// ========================================

// ========================================
// Global State
// ========================================
let likedStatusMap = {};
let slideUpTimers = {};
let unreadCount = 0;
let unreadUnsub = null;

// ========================================
// Like Functions
// ========================================

// いいねを追加（削除なし、何度でも可能）
async function addLike(targetType, targetId) {
    if (!requireLogin()) return false;
    
    try {
        const targetRef = getTargetRef(targetType, targetId);
        const now = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('likes').add({
            targetType: targetType,
            targetId: targetId,
            userId: user.uid,
            createdAt: now
        });
        await targetRef.update({
            likesCount: firebase.firestore.FieldValue.increment(1),
            lastInteractionAt: now
        });
        return true;
    } catch (e) {
        log('Error adding like: ' + e.message);
        return false;
    }
}

// 後方互換性のため toggleLike を維持
async function toggleLike(targetType, targetId) {
    return addLike(targetType, targetId);
}

// 自分がいいね済みか確認
async function checkIfLiked(targetType, targetId) {
    if (!user) return false;
    try {
        const likeQuery = await db.collection('likes')
            .where('targetType', '==', targetType)
            .where('targetId', '==', targetId)
            .where('userId', '==', user.uid)
            .get();
        return !likeQuery.empty;
    } catch (e) {
        return false;
    }
}

// いいね/コメントボタンのHTML生成
function renderInteractionButtons(targetType, targetId, likesCount = 0, commentsCount = 0, isLiked = false) {
    return `
        <div class="interaction-buttons" data-type="${targetType}" data-id="${targetId}">
            <button class="interaction-btn like-btn" data-type="${targetType}" data-id="${targetId}" onclick="event.stopPropagation(); handleLikeClick('${targetType}', '${targetId}', this)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span class="like-count">${likesCount || 0}</span>
            </button>
            <button class="interaction-btn comment-btn" onclick="event.stopPropagation(); openCommentModal('${targetType}', '${targetId}')">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span class="comment-count">${commentsCount || 0}</span>
            </button>
        </div>
    `;
}

// いいねボタンクリック処理
async function handleLikeClick(targetType, targetId, btn) {
    // アニメーションを即座に実行（UX向上）
    playLikeAnimation(btn);
    
    // カウントを即座に+1（楽観的更新）
    const countSpan = btn.querySelector('.like-count');
    let count = parseInt(countSpan.textContent) || 0;
    const newCount = count + 1;
    
    // 同じターゲットの全てのボタンを更新
    document.querySelectorAll(`.like-btn[data-type="${targetType}"][data-id="${targetId}"]`).forEach(b => {
        const cs = b.querySelector('.like-count');
        cs.textContent = newCount;
    });
    
    // サーバーに保存（バックグラウンド）
    addLike(targetType, targetId);
    
    // スライドアップ処理（デバウンス：連打終了から2秒後に実行）
    if (shouldSlideUp(targetType, true)) {
        const timerKey = `${targetType}_${targetId}`;
        
        // 既存タイマーをクリア（連打中はリセット）
        if (slideUpTimers[timerKey]) {
            clearTimeout(slideUpTimers[timerKey]);
        }
        
        // 2秒後にスライドアップを実行
        slideUpTimers[timerKey] = setTimeout(() => {
            const card = findCardElement(targetType, targetId);
            if (card) {
                const containerId = findContainerId(card, targetType);
                if (containerId) {
                    animateCardToTop(card, containerId);
                }
            }
            delete slideUpTimers[timerKey];
        }, SLIDE_UP_DELAY);
    }
}

// いいねアニメーション
function playLikeAnimation(btn) {
    const svg = btn.querySelector('svg');
    svg.style.transition = 'transform 0.15s ease-out';
    svg.style.transform = 'scale(1.4)';
    svg.setAttribute('fill', '#FF4757');
    
    setTimeout(() => {
        svg.style.transform = 'scale(1)';
    }, 150);
    
    setTimeout(() => {
        svg.setAttribute('fill', 'none');
    }, 400);
    
    createFloatingHearts(btn);
}

// 浮遊するハートエフェクト
function createFloatingHearts(btn) {
    const rect = btn.getBoundingClientRect();
    const container = document.body;
    
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.innerHTML = '❤️';
        heart.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2 + (Math.random() - 0.5) * 20}px;
            top: ${rect.top}px;
            font-size: ${12 + Math.random() * 8}px;
            pointer-events: none;
            z-index: 9999;
            opacity: 1;
            transition: all 0.6s ease-out;
        `;
        container.appendChild(heart);
        
        requestAnimationFrame(() => {
            heart.style.top = (rect.top - 50 - Math.random() * 30) + 'px';
            heart.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 40) + 'px';
            heart.style.opacity = '0';
            heart.style.transform = `scale(${0.5 + Math.random() * 0.5}) rotate(${(Math.random() - 0.5) * 30}deg)`;
        });
        
        setTimeout(() => heart.remove(), 700);
    }
}

// ========================================
// Slide Up Animation
// ========================================

// カードを一番上にスライドアップアニメーション
function animateCardToTop(cardElement, containerId) {
    if (!cardElement) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const firstChild = container.firstElementChild;
    if (!firstChild || firstChild === cardElement) return;
    
    const cardRect = cardElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const placeholder = document.createElement('div');
    placeholder.style.height = cardRect.height + 'px';
    placeholder.style.marginBottom = '16px';
    placeholder.style.transition = 'height 0.3s ease, margin 0.3s ease';
    
    cardElement.style.transition = 'none';
    cardElement.style.transform = `translateY(${cardRect.top - containerRect.top}px)`;
    cardElement.style.position = 'relative';
    cardElement.style.zIndex = '10';
    
    cardElement.parentNode.insertBefore(placeholder, cardElement.nextSibling);
    container.insertBefore(cardElement, firstChild);
    
    cardElement.offsetHeight; // 強制リフロー
    
    requestAnimationFrame(() => {
        cardElement.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        cardElement.style.transform = 'translateY(0)';
        cardElement.style.boxShadow = '0 0 20px rgba(255, 107, 0, 0.5)';
        
        placeholder.style.height = '0px';
        placeholder.style.marginBottom = '0px';
    });
    
    setTimeout(() => {
        cardElement.style.transition = '';
        cardElement.style.transform = '';
        cardElement.style.position = '';
        cardElement.style.zIndex = '';
        cardElement.style.boxShadow = '';
        placeholder.remove();
        
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 450);
}

// スライドアップを実行するか判定
function shouldSlideUp(targetType, isNowLiked) {
    if (!isNowLiked) return false;
    return SLIDE_UP_CONTAINERS.hasOwnProperty(targetType);
}

// カード要素を取得
function findCardElement(targetType, targetId) {
    const interactionDiv = document.querySelector(`.interaction-buttons[data-type="${targetType}"][data-id="${targetId}"]`);
    if (!interactionDiv) return null;
    
    let card = interactionDiv.closest('.artist-card, .card, .tweet-card');
    return card;
}

// コンテナIDを取得
function findContainerId(cardElement, targetType) {
    const containers = SLIDE_UP_CONTAINERS[targetType] || [];
    
    for (const containerId of containers) {
        const container = document.getElementById(containerId);
        if (container && container.contains(cardElement)) {
            return containerId;
        }
    }
    return null;
}

// ========================================
// Comment Functions
// ========================================
let currentCommentTarget = null;

async function addComment(targetType, targetId, text) {
    if (!requireLogin()) return null;
    if (!text.trim()) return null;
    
    try {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const commentRef = await db.collection('comments').add({
            targetType: targetType,
            targetId: targetId,
            userId: user.uid,
            userName: userData.name || 'User',
            userPhoto: userData.photoURL || '',
            text: text.trim(),
            createdAt: now
        });
        
        const targetRef = getTargetRef(targetType, targetId);
        await targetRef.update({
            commentsCount: firebase.firestore.FieldValue.increment(1),
            lastInteractionAt: now
        });
        
        return commentRef.id;
    } catch (e) {
        log('Error adding comment: ' + e.message);
        return null;
    }
}

async function getComments(targetType, targetId) {
    try {
        const snapshot = await db.collection('comments')
            .where('targetType', '==', targetType)
            .where('targetId', '==', targetId)
            .orderBy('createdAt', 'asc')
            .get();
        
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        return comments;
    } catch (e) {
        log('Error loading comments: ' + e.message);
        return [];
    }
}

function getTargetRef(targetType, targetId) {
    switch (targetType) {
        case 'event': return db.collection('events').doc(targetId);
        case 'production': return db.collection('productions').doc(targetId);
        case 'place': return db.collection('places').doc(targetId);
        case 'user': return db.collection('users').doc(targetId);
        case 'tweet': return db.collection('tweets').doc(targetId);
        default: return null;
    }
}

function openCommentModal(targetType, targetId) {
    currentCommentTarget = { type: targetType, id: targetId };
    
    let modal = $('commentModal');
    if (!modal) {
        createCommentModal();
        modal = $('commentModal');
    }
    
    modal.classList.add('active');
    loadCommentsToModal(targetType, targetId);
}

function createCommentModal() {
    const modalHtml = `
        <div class="modal" id="commentModal">
            <div class="modal-content" style="max-width:500px;margin:auto;margin-top:60px;max-height:80vh;display:flex;flex-direction:column;">
                <div class="modal-header">
                    <h3>${LABELS.comments}</h3>
                    <button class="modal-close" onclick="closeModal('commentModal')">✕</button>
                </div>
                <div class="modal-body" id="commentList" style="flex:1;overflow-y:auto;padding:16px;"></div>
                <div class="comment-input-area" style="padding:16px;border-top:1px solid var(--border);display:flex;gap:8px;">
                    <input type="text" id="commentInput" class="input" placeholder="${LABELS.addComment}" maxlength="200" style="flex:1;">
                    <button class="btn btn-p" onclick="submitComment()">${LABELS.send}</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    $('commentInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitComment();
    });
}

async function loadCommentsToModal(targetType, targetId) {
    const container = $('commentList');
    container.innerHTML = '<div style="text-align:center;color:var(--text2);padding:20px;">Loading...</div>';
    
    const comments = await getComments(targetType, targetId);
    
    if (comments.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text2);padding:20px;">No comments yet</div>';
        return;
    }
    
    let html = '';
    comments.forEach(c => {
        const initial = (c.userName || '?')[0].toUpperCase();
        html += `
            <div class="comment-item" style="display:flex;gap:12px;margin-bottom:16px;">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                    ${c.userPhoto ? `<img src="${c.userPhoto}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${initial}'">` : initial}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${c.userName || 'User'}</div>
                    <div style="color:var(--text2);font-size:14px;line-height:1.4;">${linkifyText(c.text)}</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

async function submitComment() {
    if (!currentCommentTarget) return;
    
    const input = $('commentInput');
    const text = input.value.trim();
    if (!text) return;
    
    input.disabled = true;
    const result = await addComment(currentCommentTarget.type, currentCommentTarget.id, text);
    input.disabled = false;
    
    if (result) {
        input.value = '';
        loadCommentsToModal(currentCommentTarget.type, currentCommentTarget.id);
        
        const btns = document.querySelectorAll(`.interaction-buttons[data-type="${currentCommentTarget.type}"][data-id="${currentCommentTarget.id}"] .comment-count`);
        btns.forEach(btn => {
            btn.textContent = parseInt(btn.textContent || 0) + 1;
        });
    }
}

// ========================================
// Liked Status Batch Loading
// ========================================
async function getLikedStatus(items) {
    if (!user || !items || items.length === 0) return likedStatusMap;
    
    const checkPromises = items.map(item => {
        const type = item._type || 'event';
        const key = `${type}_${item.id}`;
        
        if (likedStatusMap.hasOwnProperty(key)) {
            return Promise.resolve({ key, liked: likedStatusMap[key] });
        }
        
        return checkIfLiked(type, item.id).then(liked => ({ key, liked }));
    });
    
    const results = await Promise.all(checkPromises);
    results.forEach(r => {
        likedStatusMap[r.key] = r.liked;
    });
    
    return likedStatusMap;
}

async function loadLikedStatusByType(items, type) {
    if (!user || !items || items.length === 0) return;
    
    const itemsWithType = items.map(item => ({ ...item, _type: type }));
    await getLikedStatus(itemsWithType);
}

function isItemLiked(type, id) {
    return likedStatusMap[`${type}_${id}`] === true;
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
