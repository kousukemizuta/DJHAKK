// ========================================
// DJHAKK Place Page
// ========================================

let allPlaces = [];
let currentFilter = 'all';
let currentRegion = 'all';
let currentPlaceId = null;

// ========================================
// Filters
// ========================================
function setTypeFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderPlaces();
}

function setRegionFilter() {
    const select = document.getElementById('regionFilter');
    currentRegion = select.value;
    select.classList.toggle('active', currentRegion !== 'all');
    renderPlaces();
}

function filterPlaces() {
    renderPlaces();
}

// ========================================
// Data Loading
// ========================================
async function loadPlacesData() {
    const places = await loadPlacesInitial();
    allPlaces = places;
    await loadLikedStatusByType(places, 'place');
    renderPlaces();
    updatePaginationUI('places');
    setupScrollObserver();
}

async function loadMorePlacesData() {
    showLoadingSpinner(true);
    
    const morePlaces = await loadPlacesMore();
    if (morePlaces.length > 0) {
        await loadLikedStatusByType(morePlaces, 'place');
        allPlaces = [...allPlaces, ...morePlaces];
        renderPlaces();
        setupScrollObserver();
    }
    
    showLoadingSpinner(false);
    updatePaginationUI('places');
}

// ========================================
// UI Helpers
// ========================================
function showLoadingSpinner(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    document.getElementById('loadMoreBtn').style.display = show ? 'none' : (paginationState.places?.hasMore ? 'block' : 'none');
}

function updatePaginationUI(type) {
    const state = getPaginationState(type);
    document.getElementById('loadMoreBtn').style.display = state.hasMore ? 'block' : 'none';
    document.getElementById('noMoreData').style.display = (!state.hasMore && allPlaces.length > 0) ? 'block' : 'none';
}

let scrollObserver;
function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    
    const cards = document.querySelectorAll('#placesList .card');
    const triggerIndex = cards.length - PAGINATION.triggerOffset;
    
    if (triggerIndex > 0 && cards[triggerIndex] && paginationState.places?.hasMore) {
        scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !paginationState.places?.loading) {
                loadMorePlacesData();
            }
        }, { threshold: 0.1 });
        scrollObserver.observe(cards[triggerIndex]);
    }
}

// ========================================
// Rendering
// ========================================
function renderPlaces() {
    const container = document.getElementById('placesList');
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = allPlaces.filter(place => {
        if (currentFilter !== 'all' && place.type !== currentFilter) return false;
        if (currentRegion !== 'all' && place.region !== currentRegion) return false;
        if (searchQuery) {
            const searchText = `${place.name || ''} ${place.location || ''} ${place.description || ''}`.toLowerCase();
            if (!searchText.includes(searchQuery)) return false;
        }
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">${LABELS.noPlaces}</div>`;
        return;
    }
    
    let html = '';
    filtered.forEach(place => {
        const liked = isItemLiked('place', place.id);
        html += renderPlaceCard(place, liked);
    });
    container.innerHTML = html;
    if (window.lazyLoad) lazyLoad.images();
}

// ========================================
// Detail Modal
// ========================================
function openPlaceModal(placeId) {
    const place = allPlaces.find(p => p.id === placeId);
    if (!place) return;
    
    currentPlaceId = placeId;
    
    document.getElementById('modalImg').src = place.imageUrl || 'logo.png';
    document.getElementById('modalImg').onerror = function() { this.src = 'logo.png'; };
    
    const badge = document.getElementById('modalBadge');
    badge.className = `badge ${place.type || 'place'}`;
    badge.textContent = LABELS.placeTypes[place.type] || 'PLACE';
    
    document.getElementById('modalTitle').textContent = place.name || 'Untitled';
    document.getElementById('modalLocation').innerHTML = `📍 ${place.location || 'N/A'}`;
    document.getElementById('modalRegion').innerHTML = `🌏 ${place.region || 'N/A'}`;
    
    const urlEl = document.getElementById('modalUrl');
    if (place.url) {
        urlEl.innerHTML = `🔗 <a href="${place.url}" target="_blank">${place.url}</a>`;
        urlEl.style.display = 'flex';
    } else {
        urlEl.style.display = 'none';
    }
    
    // 作成者情報
    const initial = (place.userName || '?')[0].toUpperCase();
    document.getElementById('modalCreator').innerHTML = `
        <div style="font-size: 12px; color: var(--text3); margin-bottom: 12px;">CREATED BY</div>
        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.location.href='profile.html?uid=${place.userId}'">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--gradient); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; overflow: hidden;">
                ${place.userPhoto ? `<img src="${place.userPhoto}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.textContent='${initial}'">` : initial}
            </div>
            <div style="font-weight: 600;">${place.userName || 'User'}</div>
        </div>
    `;
    
    // SNSアイコン
    const snsHtml = renderSnsIcons(place.snsLinks, 32);
    const modalSnsEl = document.getElementById('modalSns');
    if (snsHtml) {
        modalSnsEl.innerHTML = `<div style="font-size: 12px; color: var(--text3); margin-bottom: 8px;">SNS</div><div style="display:flex;gap:12px;flex-wrap:wrap;">${snsHtml}</div>`;
        modalSnsEl.style.display = 'block';
    } else {
        modalSnsEl.style.display = 'none';
    }
    
    document.getElementById('modalDesc').innerHTML = linkifyText(place.description || '');
    
    document.getElementById('placeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePlaceModal() {
    document.getElementById('placeModal').classList.remove('active');
    document.body.style.overflow = '';
    currentPlaceId = null;
}

function checkUrlParam() {
    const id = new URLSearchParams(location.search).get('id');
    if (id) openPlaceModal(id);
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
    loadPlacesData().then(() => {
        checkUrlParam();
    });
}
