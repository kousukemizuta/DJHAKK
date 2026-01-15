// ========================================
// DJHAKK Productions Page
// ========================================

let allProductions = [];
let currentFilter = 'all';
let currentProduction = null;
let usersCache = {};

// ========================================
// Filter
// ========================================
function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
    renderProductions();
}

function filterProductions() {
    renderProductions();
}

// ========================================
// User Info Loading
// ========================================
async function loadUserInfo(userId) {
    if (!userId) return null;
    if (usersCache[userId]) return usersCache[userId];
    
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            usersCache[userId] = doc.data();
            return usersCache[userId];
        }
    } catch (e) {
        console.log('Error loading user:', e);
    }
    return null;
}

// ========================================
// Data Loading
// ========================================
async function loadAllProductions() {
    allProductions = await loadProductionsInitial();
    
    // ユーザー情報を取得
    const userIds = [...new Set(allProductions.map(p => p.userId).filter(id => id))];
    await Promise.all(userIds.map(id => loadUserInfo(id)));
    
    // いいね状態を取得
    await loadLikedStatusByType(allProductions, 'production');
    
    renderProductions();
    updatePaginationUI('productions');
    setupScrollObserver();
    checkUrlParam();
}

async function loadMoreProductions() {
    showLoadingSpinner(true);
    
    const moreProductions = await loadProductionsMore();
    if (moreProductions.length > 0) {
        const userIds = [...new Set(moreProductions.map(p => p.userId).filter(id => id))];
        await Promise.all(userIds.map(id => loadUserInfo(id)));
        await loadLikedStatusByType(moreProductions, 'production');
        
        allProductions = [...allProductions, ...moreProductions];
        renderProductions();
        setupScrollObserver();
    }
    
    showLoadingSpinner(false);
    updatePaginationUI('productions');
}

// ========================================
// UI Helpers
// ========================================
function showLoadingSpinner(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    document.getElementById('loadMoreBtn').style.display = show ? 'none' : (paginationState.productions?.hasMore ? 'block' : 'none');
}

function updatePaginationUI(type) {
    const state = getPaginationState(type);
    document.getElementById('loadMoreBtn').style.display = state.hasMore ? 'block' : 'none';
    document.getElementById('noMoreData').style.display = (!state.hasMore && allProductions.length > 0) ? 'block' : 'none';
}

let scrollObserver;
function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    
    const cards = document.querySelectorAll('#productionsList .card');
    const triggerIndex = cards.length - PAGINATION.triggerOffset;
    
    if (triggerIndex > 0 && cards[triggerIndex] && paginationState.productions?.hasMore) {
        scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !paginationState.productions?.loading) {
                loadMoreProductions();
            }
        }, { threshold: 0.1 });
        scrollObserver.observe(cards[triggerIndex]);
    }
}

// ========================================
// Rendering
// ========================================
function renderProductions() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    let filtered = allProductions.filter(p => {
        if (currentFilter !== 'all' && p.type !== currentFilter) return false;
        if (search && !p.title.toLowerCase().includes(search)) return false;
        return true;
    });
    
    const container = document.getElementById('productionsList');
    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align:center; color: var(--text2); padding: 40px;">${LABELS.noProductions}</p>`;
        return;
    }
    
    let html = '';
    filtered.forEach(p => {
        const liked = isItemLiked('production', p.id);
        const userInfo = usersCache[p.userId] || {};
        html += renderProductionCard(p, liked, userInfo);
    });
    container.innerHTML = html;
    if (window.lazyLoad) lazyLoad.images();
}

// ========================================
// URL Parameter Handling
// ========================================
function checkUrlParam() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const action = params.get('action');
    
    if (id) {
        if (action === 'purchase') {
            currentProduction = allProductions.find(p => p.id === id);
            if (currentProduction) {
                handlePurchase();
            }
        } else {
            showDetail(id);
        }
    }
}

// ========================================
// Detail Modal
// ========================================
function showDetail(id) {
    currentProduction = allProductions.find(p => p.id === id);
    if (!currentProduction) return;
    
    document.getElementById('modalImg').src = currentProduction.imageUrl || 'logo.png';
    document.getElementById('modalBadge').textContent = LABELS.productionTypes[currentProduction.type] || 'ITEM SALES';
    document.getElementById('modalBadge').className = 'badge ' + (currentProduction.type || 'audio');
    document.getElementById('modalTitle').textContent = currentProduction.title;
    document.getElementById('modalPrice').textContent = '¥' + (currentProduction.price||0).toLocaleString();
    
    // DOWNLOAD SALESの場合、波形プレイヤーを表示
    const waveformContainer = document.getElementById('modalWaveform');
    if (currentProduction.type === 'audio' && currentProduction.audioUrl && typeof renderWaveformPlayer === 'function') {
        const waveformHtml = renderWaveformPlayer(
            currentProduction.audioUrl,
            currentProduction.title,
            currentProduction.audioDuration || 0,
            `modal_${currentProduction.id}`
        );
        waveformContainer.innerHTML = waveformHtml;
        waveformContainer.style.display = 'block';
    } else {
        waveformContainer.innerHTML = '';
        waveformContainer.style.display = 'none';
    }
    
    // 作成者情報
    const userInfo = usersCache[currentProduction.userId] || {};
    const userName = userInfo.name || currentProduction.artistName || 'User';
    const userPhoto = userInfo.photoURL || '';
    const initial = (userName || '?')[0].toUpperCase();
    
    document.getElementById('modalCreator').innerHTML = `
        <div style="font-size: 12px; color: var(--text3); margin-bottom: 12px;">CREATED BY</div>
        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.location.href='profile.html?uid=${currentProduction.userId}'">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--gradient); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; overflow: hidden;">
                ${userPhoto ? `<img src="${userPhoto}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.textContent='${initial}'">` : initial}
            </div>
            <div style="font-weight: 600;">${userName}</div>
        </div>
    `;
    
    // SNSアイコン
    const snsHtml = renderSnsIcons(userInfo.sns, 32);
    const modalSnsEl = document.getElementById('modalSns');
    if (snsHtml) {
        modalSnsEl.innerHTML = `<div style="font-size: 12px; color: var(--text3); margin-bottom: 8px;">SNS</div><div style="display:flex;gap:12px;flex-wrap:wrap;">${snsHtml}</div>`;
        modalSnsEl.style.display = 'block';
    } else {
        modalSnsEl.style.display = 'none';
    }
    
    document.getElementById('modalDesc').innerHTML = linkifyText(currentProduction.description || '');
    
    document.getElementById('productionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('productionModal').classList.remove('active');
    history.replaceState(null, '', 'productions.html');
}

// ========================================
// Purchase
// ========================================
function handlePurchase() {
    if (!requireLogin()) return;
    if (!currentProduction) return;
    
    const sellerInfo = usersCache[currentProduction.userId] || {};
    const sellerName = sellerInfo.name || currentProduction.artistName || 'User';
    
    const paymentData = {
        type: currentProduction.type === 'audio' ? 'download' : (currentProduction.type || 'goods'),
        itemId: currentProduction.id,
        title: currentProduction.title,
        price: currentProduction.price || 0,
        sellerId: currentProduction.userId,
        sellerName: sellerName
    };
    
    if (currentProduction.type === 'audio' && currentProduction.audioUrl) {
        paymentData.audioUrl = currentProduction.audioUrl;
    }
    
    openPaymentModal(paymentData);
}

// ========================================
// Auth Ready Handler
// ========================================
function onAuthReady() {
    const params = new URLSearchParams(location.search);
    const hasDeepLink = params.get('id');
    
    if (!user && !hasDeepLink) {
        window.location.href = 'index.html';
        return;
    }
    loadAllProductions();
}
