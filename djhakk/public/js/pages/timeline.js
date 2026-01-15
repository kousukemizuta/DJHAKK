// ========================================
// DJHAKK Timeline Page
// ========================================

let timelineData = [];
let likedMap = {};
let usersCache = {};

// ========================================
// Tweet Input
// ========================================
function updateCharCount() {
    const input = $('tweetInput');
    const count = $('charCount');
    const btn = $('tweetSubmitBtn');
    const len = input.value.length;
    
    count.textContent = `${len}/140`;
    count.classList.toggle('warning', len > 120);
    btn.disabled = len === 0 || len > 140;
}

async function submitTweet() {
    if (!requireLogin()) return;
    
    const input = $('tweetInput');
    const text = input.value.trim();
    if (!text || text.length > 140) return;
    
    const btn = $('tweetSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Posting...';
    
    const result = await postTweet(text);
    
    if (result) {
        input.value = '';
        updateCharCount();
        toast('Posted!');
        loadTimeline();
    } else {
        toast('Failed to post', 'error');
    }
    
    btn.disabled = false;
    btn.textContent = 'Post';
}

// ========================================
// Timeline Loading
// ========================================
async function loadTimeline() {
    const container = $('timelineFeed');
    
    try {
        timelineData = await loadTimelineInitial();
        
        if (timelineData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-title">No posts yet</div>
                    <p>Be the first to post something!</p>
                </div>
            `;
            return;
        }
        
        // ユーザー情報を取得（event, production用）
        const userIds = new Set();
        timelineData.forEach(item => {
            if (item._type === 'event' && item.organizerId) userIds.add(item.organizerId);
            if (item._type === 'production' && item.userId) userIds.add(item.userId);
            if (item.slots) {
                item.slots.forEach(slot => {
                    (slot.applicants || []).forEach(uid => userIds.add(uid));
                });
            }
        });
        if (userIds.size > 0) {
            usersCache = await getUsersByIds([...userIds]);
        }
        
        // いいね状態を取得
        likedMap = await getLikedStatus(timelineData);
        
        renderTimeline();
        updatePaginationUI('timeline');
        setupScrollObserver();
    } catch (e) {
        log('Error loading timeline: ' + e.message);
        container.innerHTML = '<div class="empty-state">Failed to load</div>';
    }
}

async function loadMoreTimeline() {
    showLoadingSpinner(true);
    
    try {
        const moreData = await loadTimelineMore();
        if (moreData.length > 0) {
            // ユーザー情報を取得
            const userIds = new Set();
            moreData.forEach(item => {
                if (item._type === 'event' && item.organizerId) userIds.add(item.organizerId);
                if (item._type === 'production' && item.userId) userIds.add(item.userId);
                if (item.slots) {
                    item.slots.forEach(slot => {
                        (slot.applicants || []).forEach(uid => userIds.add(uid));
                    });
                }
            });
            if (userIds.size > 0) {
                const moreUsers = await getUsersByIds([...userIds]);
                usersCache = { ...usersCache, ...moreUsers };
            }
            
            // いいね状態を取得
            const moreLikedMap = await getLikedStatus(moreData);
            likedMap = { ...likedMap, ...moreLikedMap };
            
            timelineData = [...timelineData, ...moreData];
            renderTimeline();
            setupScrollObserver();
        }
    } catch (e) {
        log('Error loading more timeline: ' + e.message);
    }
    
    showLoadingSpinner(false);
    updatePaginationUI('timeline');
}

// ========================================
// UI Helpers
// ========================================
function showLoadingSpinner(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    document.getElementById('loadMoreBtn').style.display = show ? 'none' : (paginationState.timeline?.hasMore ? 'block' : 'none');
}

function updatePaginationUI(type) {
    const state = getPaginationState(type);
    document.getElementById('loadMoreBtn').style.display = state.hasMore ? 'block' : 'none';
    document.getElementById('noMoreData').style.display = (!state.hasMore && timelineData.length > 0) ? 'block' : 'none';
}

let scrollObserver;
function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    
    const cards = document.querySelectorAll('#timelineFeed .tweet-card, #timelineFeed .card, #timelineFeed .artist-card');
    const triggerIndex = cards.length - PAGINATION.triggerOffset;
    
    if (triggerIndex > 0 && cards[triggerIndex] && paginationState.timeline?.hasMore) {
        scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !paginationState.timeline?.loading) {
                loadMoreTimeline();
            }
        }, { threshold: 0.1 });
        scrollObserver.observe(cards[triggerIndex]);
    }
}

// ========================================
// Rendering
// ========================================
function renderTimeline() {
    const container = $('timelineFeed');
    let html = '';
    
    timelineData.forEach(item => {
        const isLiked = likedMap[`${item._type}_${item.id}`] || false;
        
        switch (item._type) {
            case 'tweet':
                html += renderTweetCard(item, isLiked);
                break;
            case 'event':
                html += renderEventCard(item, isLiked, usersCache);
                break;
            case 'production':
                html += renderProductionCard(item, isLiked, usersCache[item.userId]);
                break;
            case 'place':
                html += renderPlaceCard(item, isLiked);
                break;
            case 'user':
                html += renderArtistCard(item, isLiked);
                break;
        }
    });
    
    container.innerHTML = html;
    if (window.lazyLoad) lazyLoad.images();
}

function setupTweetInput() {
    $('tweetInputArea').style.display = 'block';
    const avatar = $('tweetAvatar');
    
    if (user) {
        const initial = (userData.name || '?')[0].toUpperCase();
        if (userData.photoURL) {
            avatar.innerHTML = `<img src="${userData.photoURL}" onerror="this.style.display='none';this.parentElement.innerHTML='${initial}'">`;
        } else {
            avatar.textContent = initial;
        }
    } else {
        avatar.innerHTML = `<img src="guest-avatar.jpg" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
}

// ========================================
// Auth Ready Handler
// ========================================
function onAuthReady() {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    setupTweetInput();
    loadTimeline();
}
