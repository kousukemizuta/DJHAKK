// ========================================
// DJHAKK Events Page
// ========================================

let allEvents = [];
let currentTypeFilter = 'all';
let currentRegionFilter = 'all';
let currentEvent = null;
let selectedSlotIndex = -1;
let usersCache = {};
const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ========================================
// Filters
// ========================================
function setTypeFilter(f) {
    currentTypeFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
    renderEvents();
}

function setRegionFilter() {
    const select = document.getElementById('regionFilter');
    currentRegionFilter = select.value;
    select.classList.toggle('active', currentRegionFilter !== 'all');
    renderEvents();
}

function filterEvents() {
    renderEvents();
}

// ========================================
// Data Loading
// ========================================
async function loadAllEvents() {
    allEvents = await loadEventsInitial();
    
    // 応募者のユーザー情報を一括取得
    const allUserIds = new Set();
    allEvents.forEach(ev => {
        if (ev.organizerId) allUserIds.add(ev.organizerId);
        if (ev.slots) {
            ev.slots.forEach(slot => {
                if (slot.applicants) {
                    slot.applicants.forEach(uid => allUserIds.add(uid));
                }
            });
        }
    });
    usersCache = await getUsersByIds([...allUserIds]);
    
    // いいね状態を取得
    await loadLikedStatusByType(allEvents, 'event');
    
    renderEvents();
    updatePaginationUI('events');
    setupScrollObserver();
    checkUrlParam();
}

async function loadMoreEvents() {
    showLoadingSpinner(true);
    
    const moreEvents = await loadEventsMore();
    if (moreEvents.length > 0) {
        const newUserIds = new Set();
        moreEvents.forEach(ev => {
            if (ev.organizerId) newUserIds.add(ev.organizerId);
            if (ev.slots) {
                ev.slots.forEach(slot => {
                    if (slot.applicants) {
                        slot.applicants.forEach(uid => newUserIds.add(uid));
                    }
                });
            }
        });
        const newUsers = await getUsersByIds([...newUserIds]);
        usersCache = { ...usersCache, ...newUsers };
        
        await loadLikedStatusByType(moreEvents, 'event');
        
        allEvents = [...allEvents, ...moreEvents];
        renderEvents();
        setupScrollObserver();
    }
    
    showLoadingSpinner(false);
    updatePaginationUI('events');
}

// ========================================
// UI Helpers
// ========================================
function showLoadingSpinner(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    document.getElementById('loadMoreBtn').style.display = show ? 'none' : (paginationState.events?.hasMore ? 'block' : 'none');
}

function updatePaginationUI(type) {
    const state = getPaginationState(type);
    document.getElementById('loadMoreBtn').style.display = state.hasMore ? 'block' : 'none';
    document.getElementById('noMoreData').style.display = (!state.hasMore && allEvents.length > 0) ? 'block' : 'none';
}

let scrollObserver;
function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    
    const cards = document.querySelectorAll('#eventsList .card');
    const triggerIndex = cards.length - PAGINATION.triggerOffset;
    
    if (triggerIndex > 0 && cards[triggerIndex] && paginationState.events?.hasMore) {
        scrollObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !paginationState.events?.loading) {
                loadMoreEvents();
            }
        }, { threshold: 0.1 });
        scrollObserver.observe(cards[triggerIndex]);
    }
}

// ========================================
// Date Separator
// ========================================
function getDateKey(date) {
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function createDateSeparator(dateKey) {
    const d = new Date(dateKey);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayName = dayNames[d.getDay()];
    return `
        <div class="date-separator">
            <div class="date-separator-inner">
                <span class="date-separator-date">${month}.${day}</span>
                <span class="date-separator-day">${dayName}</span>
            </div>
        </div>
    `;
}

// ========================================
// Rendering
// ========================================
function renderEvents() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let filtered = allEvents.filter(ev => {
        const evDate = ev.date?.toDate ? ev.date.toDate() : new Date(ev.date);
        if (evDate < now) return false;
        if (currentTypeFilter !== 'all' && ev.type !== currentTypeFilter) return false;
        if (currentRegionFilter !== 'all' && ev.region !== currentRegionFilter) return false;
        if (search && !ev.title.toLowerCase().includes(search)) return false;
        return true;
    });
    
    filtered.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
    });
    
    const container = document.getElementById('eventsList');
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text2); padding: 40px;">No events</p>';
        return;
    }
    
    const byDate = {};
    filtered.forEach(ev => {
        const key = getDateKey(ev.date);
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(ev);
    });
    
    let html = '';
    
    for (const dateKey in byDate) {
        html += createDateSeparator(dateKey);
        
        byDate[dateKey].forEach(ev => {
            const liked = isItemLiked('event', ev.id);
            html += renderEventCard(ev, liked, usersCache);
        });
    }
    container.innerHTML = html;
    if (window.lazyLoad) lazyLoad.images();
}

// ========================================
// Event Slot Click Handler (for card)
// ========================================
function handleEventSlotClick(eventId, slotIndex) {
    openPurchaseFromCard(eventId, slotIndex);
}

// ========================================
// URL Parameter
// ========================================
function checkUrlParam() {
    const id = new URLSearchParams(location.search).get('id');
    if (id) showDetail(id);
}

// ========================================
// Detail Modal
// ========================================
function showDetail(id) {
    currentEvent = allEvents.find(e => e.id === id);
    if (!currentEvent) return;
    
    const labels = {A:'TIMETABLE', B:'GUARANTEE(ｷﾞｬﾗ)', C:'FLYER'};
    const cls = {A:'a', B:'b', C:'c'};
    const currency = currentEvent.currency || 'jpy';
    
    document.getElementById('modalImg').src = currentEvent.imageUrl || 'logo.png';
    document.getElementById('modalBadge').textContent = labels[currentEvent.type] || 'TIMETABLE';
    document.getElementById('modalBadge').className = 'badge ' + (cls[currentEvent.type] || 'a');
    document.getElementById('modalTitle').textContent = currentEvent.title;
    document.getElementById('modalDate').textContent = 'DATE ' + formatDateFull(currentEvent.date);
    document.getElementById('modalLocation').textContent = '@ ' + (currentEvent.location || 'N/A');
    document.getElementById('modalRegion').textContent = 'AREA ' + (currentEvent.region || 'N/A');
    document.getElementById('modalDesc').innerHTML = linkifyText(currentEvent.description || '');
    
    // 主催者セクション
    const organizer = usersCache[currentEvent.organizerId] || {};
    const organizerName = organizer.name || currentEvent.organizerName || '主催者';
    const organizerPhoto = organizer.photoURL || currentEvent.organizerPhoto || '';
    
    document.getElementById('modalOrganizer').innerHTML = `
        <div class="organizer-header">ORGANIZER</div>
        <div class="organizer-row">
            ${renderAvatar(organizerPhoto, organizerName, 48, true, currentEvent.organizerId)}
            <div class="organizer-info">
                <div class="organizer-name">${organizerName}</div>
            </div>
            <div class="organizer-actions">
                <button class="organizer-btn profile" onclick="window.location.href='profile.html?uid=${currentEvent.organizerId}'">PROFILE</button>
                <button class="organizer-btn dm" onclick="openDM('${currentEvent.organizerId}', '${organizerName}')">DM</button>
            </div>
        </div>
    `;
    
    // スロット
    let slotsHtml = '';
    if ((currentEvent.type === 'A' || currentEvent.type === 'B') && currentEvent.slots && currentEvent.slots.length > 0) {
        const title = currentEvent.type === 'A' ? 'TIMETABLE' : 'GUARANTEE(ｷﾞｬﾗ)';
        slotsHtml = `<div class="section-title">${title}</div>`;
        
        currentEvent.slots.forEach((slot, i) => {
            const price = slot.price || 0;
            const capacity = slot.capacity || 1;
            const applicants = slot.applicants || [];
            const count = applicants.length;
            const isFree = price === 0;
            const status = slot.status || 'open';
            
            const isApproved = currentEvent.type === 'B' && status === 'approved';
            const isCompleted = currentEvent.type === 'B' && status === 'completed';
            const alreadyApplied = user && applicants.includes(user.uid);
            const isApprovedUser = user && slot.approvedUid === user.uid;
            
            let isFull = currentEvent.type === 'B' ? (isApproved || isCompleted) : (count >= capacity);
            
            let btnClass = 'primary';
            let btnText = currentEvent.type === 'A' ? 'Buy' : 'Apply';
            let btnDisabled = false;
            
            if (isFree) {
                btnClass = 'free';
                btnText = currentEvent.type === 'A' ? 'Reserve Free' : 'Apply Free';
            }
            
            if (currentEvent.type === 'A' && isFull) {
                btnClass = 'full';
                btnText = 'FULL';
                btnDisabled = true;
            }
            
            if (currentEvent.type === 'B') {
                if (isCompleted) {
                    btnClass = 'completed';
                    btnText = isApprovedUser ? '✓ 出演完了' : 'COMPLETED';
                    btnDisabled = true;
                } else if (isApproved) {
                    if (isApprovedUser) {
                        btnClass = 'approved';
                        btnText = '✓ 承認済み';
                    } else {
                        btnClass = 'full';
                        btnText = 'CLOSED';
                    }
                    btnDisabled = true;
                } else if (alreadyApplied) {
                    btnClass = 'applied';
                    btnText = '応募済み';
                    btnDisabled = true;
                }
            }
            
            let statusBadge = '';
            if (currentEvent.type === 'B') {
                if (isCompleted) {
                    statusBadge = '<span style="background:rgba(46,204,113,0.2);color:#2ECC71;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">完了</span>';
                } else if (isApproved) {
                    statusBadge = '<span style="background:rgba(255,193,7,0.2);color:#FFC107;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">確定</span>';
                }
            }
            
            let countDisplay = currentEvent.type === 'B' 
                ? (isFull ? '確定' : `${count}人応募`)
                : `${count}/${capacity}${isFull ? ' FULL' : ''}`;
            
            let avatarsHtml = (currentEvent.type === 'B' && isFull && slot.approvedUid)
                ? renderSlotAvatars([slot.approvedUid], 1)
                : renderSlotAvatars(applicants, capacity);
            
            slotsHtml += `
                <div class="slot-card">
                    <div class="slot-header">
                        <span class="slot-time">${slot.time || 'TBD'}</span>
                        <span class="slot-price ${isFree ? 'free' : ''}">${formatPrice(price, currency)} ${statusBadge}</span>
                    </div>
                    <div class="slot-applicants">
                        <div class="slot-applicants-label">${currentEvent.type === 'B' ? (isFull ? '出演者' : '応募者') : 'Buyers'}</div>
                        <div class="slot-applicants-row">
                            ${avatarsHtml}
                            <span class="slot-count ${isFull ? 'full' : ''}">${countDisplay}</span>
                        </div>
                    </div>
                    <button class="slot-buy-btn ${btnClass}" onclick="openPurchaseModal(${i})" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
                </div>
            `;
        });
    }
    document.getElementById('modalSlots').innerHTML = slotsHtml;
    
    // アクションボタン
    let actionHtml = '';
    if (currentEvent.type === 'C') {
        actionHtml = `<button class="btn btn-s btn-lg" onclick="shareEvent()">📤 Share</button>`;
    }
    document.getElementById('modalAction').innerHTML = actionHtml;
    
    document.getElementById('eventModal').classList.add('active');
    history.replaceState(null, '', `events.html?id=${id}`);
}

function closeEventModal() {
    document.getElementById('eventModal').classList.remove('active');
    history.replaceState(null, '', 'events.html');
}

// ========================================
// Purchase Modal
// ========================================
function openPurchaseFromCard(eventId, slotIndex) {
    currentEvent = allEvents.find(e => e.id === eventId);
    if (!currentEvent) return;
    openPurchaseModal(slotIndex);
}

function openPurchaseModal(index) {
    if (!requireLogin()) return;
    
    selectedSlotIndex = index;
    const slot = currentEvent.slots[index];
    const currency = currentEvent.currency || 'jpy';
    const price = slot.price || 0;
    const isFree = price === 0;
    const capacity = slot.capacity || 1;
    const count = (slot.applicants || []).length;
    
    if (count >= capacity) {
        toast('This slot is full', 'error');
        return;
    }
    
    if (user && slot.applicants && slot.applicants.includes(user.uid)) {
        toast('Already applied', 'error');
        return;
    }
    
    if (currentEvent.type === 'A') {
        document.getElementById('purchaseIcon').textContent = '';
        document.getElementById('purchaseTitle').textContent = 'Buy Timetable';
        document.getElementById('purchaseNote').textContent = isFree 
            ? 'Reserve this slot for free?' 
            : 'Buy this slot to perform at the event?';
    } else {
        document.getElementById('purchaseIcon').textContent = '';
        document.getElementById('purchaseTitle').textContent = 'Apply for GUARANTEE';
        document.getElementById('purchaseNote').textContent = isFree 
            ? 'Apply for this slot for free?' 
            : 'Apply for this slot? (You will be paid)';
    }
    
    document.getElementById('purchaseTime').textContent = '' + (slot.time || 'TBD');
    document.getElementById('purchasePrice').textContent = formatPrice(price, currency);
    document.getElementById('purchasePrice').className = 'purchase-price' + (isFree ? ' free' : '');
    
    const confirmBtn = document.getElementById('purchaseConfirmBtn');
    if (isFree) {
        confirmBtn.textContent = currentEvent.type === 'A' ? 'Reserve Free' : 'Apply Free';
        confirmBtn.className = 'purchase-btn free';
    } else {
        confirmBtn.textContent = currentEvent.type === 'A' ? 'Confirm Purchase' : 'Apply';
        confirmBtn.className = 'purchase-btn primary';
    }
    
    document.getElementById('purchaseModal').classList.add('active');
}

function closePurchaseModal() {
    document.getElementById('purchaseModal').classList.remove('active');
    selectedSlotIndex = -1;
}

async function confirmPurchase() {
    if (!currentEvent || selectedSlotIndex < 0) return;
    
    const slot = currentEvent.slots[selectedSlotIndex];
    const isFree = (slot.price || 0) === 0;
    
    const eventToProcess = currentEvent;
    const slotIndexToProcess = selectedSlotIndex;
    
    closePurchaseModal();
    
    // Type B（GUARANTEE）は常に応募のみ
    if (eventToProcess.type === 'B') {
        const success = await applyToSlot(eventToProcess.id, slotIndexToProcess);
        if (success) {
            toast(isFree ? 'Applied (Free)' : 'Applied! Waiting for approval');
            await reloadEventData();
        }
        return;
    }
    
    // Type A（TIMETABLE）
    if (isFree) {
        const success = await applyToSlot(eventToProcess.id, slotIndexToProcess);
        if (success) {
            toast('Reserved (Free)');
            await reloadEventData();
        }
    } else {
        openEventSlotPaymentModal(eventToProcess, slotIndexToProcess);
    }
}

function openEventSlotPaymentModal(event, slotIndex) {
    const slot = event.slots[slotIndex];
    const organizerName = usersCache[event.organizerId]?.displayName || 'Unknown';
    
    openPaymentModal({
        type: 'event_slot',
        itemId: event.id,
        slotIndex: slotIndex,
        title: `${event.title} - ${slot.time || 'TBD'}`,
        price: slot.price,
        currency: event.currency || 'jpy',
        sellerId: event.organizerId,
        sellerName: organizerName,
        eventDate: event.date,
        onSuccess: async (purchaseId) => {
            toast('スロット購入が完了しました！');
            await reloadEventData();
        }
    });
}

async function reloadEventData() {
    await loadAllEvents();
    if (currentEvent && document.getElementById('eventModal').classList.contains('active')) {
        showDetail(currentEvent.id);
    }
}

function shareEvent() {
    if (navigator.share) {
        navigator.share({
            title: currentEvent.title,
            text: `${currentEvent.title} - ${currentEvent.location}`,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        toast('URL copied');
    }
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
    loadAllEvents();
}
