// ========================================
// DJHAKK Index Page (Home / Welcome)
// ========================================

let allArtists = [];
let currentRegion = 'all';
let isRedirecting = false;

// ========================================
// Splash Screen
// ========================================
function createSplashParticles() {
    const container = document.getElementById('splashParticles');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'splash-particle';
        const angle = (i / 20) * Math.PI * 2;
        const distance = 100 + Math.random() * 100;
        particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.animationDelay = `${0.5 + Math.random() * 0.5}s`;
        particle.style.cssText += `
            position: absolute;
            width: 6px;
            height: 6px;
            background: var(--primary);
            border-radius: 50%;
            opacity: 0;
            animation: particleBurst 1.5s ease-out forwards;
            animation-delay: ${0.5 + Math.random() * 0.5}s;
        `;
        container.appendChild(particle);
    }
}

function hideSplash() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }
}

// ========================================
// In-App Browser Detection
// ========================================
function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /Barcelona|BytedanceWebview|Line\/|Snapchat|Pinterest|LinkedIn/i.test(ua);
}

function updateWelcomeGoogleButton() {
    const btn = document.getElementById('welcomeGoogleBtn');
    const divider = document.querySelector('.welcome-divider');
    if (btn && isInAppBrowser()) {
        btn.style.display = 'none';
        if (divider) divider.style.display = 'none';
    }
}

// ========================================
// Screen Management
// ========================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    const hideNav = (id === 'welcomeScreen' || id === 'loginScreen');
    document.querySelector('.nav').style.display = hideNav ? 'none' : 'flex';
    document.querySelector('.fab').style.display = hideNav ? 'none' : 'flex';
    
    if (id === 'welcomeScreen') {
        updateWelcomeGoogleButton();
    }
}

// ========================================
// Auth Handlers
// ========================================
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { toast('Please enter', 'error'); return; }
    if (await login(email, password)) {
        isRedirecting = true;
        window.location.href = 'timeline.html';
    }
}

async function handleWelcomeSignup() {
    const name = document.getElementById('welcomeName').value;
    const email = document.getElementById('welcomeEmail').value;
    const password = document.getElementById('welcomePassword').value;
    if (!name || !email || !password) { toast('Please enter', 'error'); return; }
    if (password.length < 6) { toast('Password must be 6+ characters', 'error'); return; }
    if (await signup(email, password, name)) {
        isRedirecting = true;
        window.location.href = 'timeline.html';
    }
}

async function handleSignup() {
    return handleWelcomeSignup();
}

async function handleGoogleLogin() {
    if (await loginWithGoogle()) {
        isRedirecting = true;
        window.location.href = 'timeline.html';
    }
}

// ========================================
// Tab Navigation
// ========================================
function switchMainTab(tab) {
    if (tab === 'event') {
        window.location.href = 'events.html';
        return;
    }
    if (tab === 'production') {
        window.location.href = 'productions.html';
        return;
    }
    if (tab === 'place') {
        window.location.href = 'place.html';
        return;
    }
    renderArtists();
}

// ========================================
// Region Filter
// ========================================
function handleRegionFilter() {
    const select = document.getElementById('regionFilter');
    currentRegion = select.value;
    select.classList.toggle('active', currentRegion !== 'all');
    renderArtists();
}

// ========================================
// Artist Loading
// ========================================
async function loadHomeData() {
    document.getElementById('regionFilter').innerHTML = generateRegionOptions(true);
    
    const artists = await loadUsersInitial();
    allArtists = artists;
    
    await loadLikedStatusByType(artists, 'user');
    
    renderArtists();
    updatePaginationUI('users');
    setupScrollObserver();
}

async function loadMoreArtists() {
    showLoadingSpinner(true);
    
    const moreArtists = await loadUsersMore();
    if (moreArtists.length > 0) {
        await loadLikedStatusByType(moreArtists, 'user');
        
        allArtists = [...allArtists, ...moreArtists];
        renderArtists();
        setupScrollObserver();
    }
    
    showLoadingSpinner(false);
    updatePaginationUI('users');
}

// ========================================
// UI Helpers
// ========================================
function showLoadingSpinner(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    document.getElementById('loadMoreBtn').style.display = show ? 'none' : (paginationState.users?.hasMore ? 'block' : 'none');
}

function updatePaginationUI(type) {
    const state = getPaginationState(type);
    document.getElementById('loadMoreBtn').style.display = state.hasMore ? 'block' : 'none';
    document.getElementById('noMoreData').style.display = (!state.hasMore && allArtists.length > 0) ? 'block' : 'none';
}

let scrollObserver;
function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    
    const cards = document.querySelectorAll('#artistList .artist-card');
    const triggerIndex = cards.length - PAGINATION.triggerOffset;
    
    if (triggerIndex > 0 && cards[triggerIndex] && paginationState.users?.hasMore) {
        scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !paginationState.users?.loading) {
                loadMoreArtists();
            }
        }, { threshold: 0.1 });
        scrollObserver.observe(cards[triggerIndex]);
    }
}

// ========================================
// Rendering
// ========================================
function renderArtists() {
    const container = document.getElementById('artistList');
    
    let filtered = allArtists.filter(a => {
        if (currentRegion !== 'all' && a.region !== currentRegion) return false;
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No artists</div>';
        return;
    }
    
    let html = '';
    filtered.forEach(artist => {
        const initial = (artist.name || '?')[0].toUpperCase();
        const bio = artist.bio || '';
        const bioPreview = bio.length > 60 ? bio.substring(0, 60) + '...' : bio;
        const isMe = user && artist.id === user.uid;
        const liked = isItemLiked('user', artist.id);
        
        const audioPlayer = (artist.audioUrl && typeof renderWaveformPlayer === 'function') ? 
            renderWaveformPlayer(artist.audioUrl, artist.audioTitle, artist.audioDuration, `home_${artist.id}`) : '';
        
        html += `
            <div class="artist-card" onclick="window.location.href='profile.html?uid=${artist.id}'">
                <div class="artist-card-header">
                    <div class="artist-avatar">
                        ${artist.photoURL ? `<img src="${artist.photoURL}" onerror="this.style.display='none';this.parentElement.textContent='${initial}'">` : initial}
                    </div>
                    <div class="artist-info">
                        <div class="artist-name">${artist.name}${isMe ? ' <span style="font-size:11px;color:var(--text3);">(You)</span>' : ''}</div>
                        ${artist.region ? `<div class="artist-region">${artist.region}</div>` : ''}
                    </div>
                </div>
                ${bioPreview ? `<div class="artist-bio">${bioPreview}</div>` : ''}
                ${audioPlayer}
                <div class="artist-footer">
                    ${renderSnsIcons(artist.snsLinks, 28)}
                    ${!isMe ? `<button class="artist-dm-btn" onclick="event.stopPropagation(); openDM('${artist.id}', '${artist.name}')">DM</button>` : '<div></div>'}
                </div>
                <div class="card-interaction">
                    ${renderInteractionButtons('user', artist.id, artist.likesCount || 0, artist.commentsCount || 0, liked)}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    if (window.lazyLoad) lazyLoad.images();
}

// ========================================
// Auth Ready Handler
// ========================================
function onAuthReady() {
    const params = new URLSearchParams(location.search);
    
    if (isRedirecting) return;
    
    if (params.get('login')) {
        showScreen('loginScreen');
        return;
    }
    if (params.get('signup')) {
        showScreen('welcomeScreen');
        return;
    }
    
    if (user) {
        if (params.get('tab') === 'home') {
            showScreen('mainScreen');
            loadHomeData();
        } else {
            window.location.href = 'timeline.html';
        }
    } else {
        if (params.get('tab') === 'home') {
            showScreen('mainScreen');
            loadHomeData();
        } else {
            showScreen('welcomeScreen');
        }
    }
    setupLogo();
}

// ========================================
// Init
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    createSplashParticles();
    setTimeout(hideSplash, 2000);
});
