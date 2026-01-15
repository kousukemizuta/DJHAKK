// ========================================
// DJHAKK Create Page
// ========================================

let currentType = 'A';
let eventImageFile = null;
let prodImageFile = null;
let placeImageFile = null;
let slots = [];
let gigSlots = [];
let currentCurrency = 'jpy';
let pickerSlotIndex = 0;
let pickerField = 'start';
let pickerSlotType = 'slot';
let pickerHour = 22;
let pickerMinute = 0;

// ========================================
// Type Selection
// ========================================
function selectType(type, el) {
    currentType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    
    const isEvent = ['A','B','C'].includes(type);
    const isProduction = ['audio','goods','produce'].includes(type);
    const isPlace = ['place','agency','shop'].includes(type);
    
    document.getElementById('eventForm').classList.toggle('active', isEvent);
    document.getElementById('productionForm').classList.toggle('active', isProduction);
    document.getElementById('placeForm').classList.toggle('active', isPlace);
    
    if (isEvent) {
        document.getElementById('slotsSection').style.display = type === 'A' ? 'block' : 'none';
        document.getElementById('gigSlotsSection').style.display = type === 'B' ? 'block' : 'none';
    }
    
    if (isProduction) {
        document.getElementById('audioUploadSection').style.display = type === 'audio' ? 'block' : 'none';
    }
}

// ========================================
// Audio Preview
// ========================================
let prodAudioFile = null;
let prodAudioDuration = 0;

function previewAudio(input) {
    if (input.files && input.files[0]) {
        prodAudioFile = input.files[0];
        const url = URL.createObjectURL(prodAudioFile);
        const audio = document.getElementById('audioPreview');
        audio.src = url;
        
        audio.onloadedmetadata = () => {
            prodAudioDuration = Math.floor(audio.duration);
            const mins = Math.floor(prodAudioDuration / 60);
            const secs = prodAudioDuration % 60;
            document.getElementById('audioDurationDisplay').textContent = `Duration: ${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        document.getElementById('audioPreviewContainer').style.display = 'block';
        document.getElementById('prodAudioText').textContent = prodAudioFile.name;
        document.querySelector('.audio-upload').classList.add('uploaded');
    }
}

// ========================================
// Price Validation
// ========================================
function validatePrice(input) {
    const price = parseInt(input.value) || 0;
    const errorEl = input.parentElement.querySelector('.price-error');
    
    if (!PRICE_CONFIG.isValidPrice(price)) {
        if (errorEl) {
            errorEl.textContent = PRICE_CONFIG.getErrorMessage();
            errorEl.style.display = 'block';
        }
        input.classList.add('invalid');
        return false;
    } else {
        if (errorEl) {
            errorEl.style.display = 'none';
        }
        input.classList.remove('invalid');
        return true;
    }
}

// ========================================
// Image Preview
// ========================================
function previewImage(input, previewId, textId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById(previewId).src = e.target.result;
            document.getElementById(previewId).style.display = 'block';
            document.getElementById(textId).style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
        if (previewId === 'eventImagePreview') eventImageFile = input.files[0];
        else if (previewId === 'prodImagePreview') prodImageFile = input.files[0];
        else if (previewId === 'placeImagePreview') placeImageFile = input.files[0];
    }
}

// ========================================
// Region & Currency Handling
// ========================================
function handleRegionChange() {
    const select = document.getElementById('eventRegion');
    const customInput = document.getElementById('customRegion');
    const currencySelectRow = document.getElementById('currencySelectRow');
    
    if (select.value === 'other') {
        customInput.classList.add('active');
        currencySelectRow.classList.add('active');
        customInput.focus();
        currentCurrency = document.getElementById('customCurrency').value;
    } else {
        customInput.classList.remove('active');
        currencySelectRow.classList.remove('active');
        customInput.value = '';
        currentCurrency = getCurrencyFromRegion(select.value);
    }
    updateCurrencyDisplay();
    renderSlots();
    renderGigSlots();
}

function handleCustomCurrencyChange() {
    currentCurrency = document.getElementById('customCurrency').value;
    updateCurrencyDisplay();
    renderSlots();
    renderGigSlots();
}

function updateCurrencyDisplay() {
    const config = CURRENCY_CONFIG[currentCurrency];
    document.getElementById('currencyDisplay').textContent = `${currentCurrency.toUpperCase()} (${config.symbol})`;
}

function getRegionValue() {
    const select = document.getElementById('eventRegion');
    if (select.value === 'other') {
        return document.getElementById('customRegion').value.trim() || 'Other';
    }
    return select.value;
}

// ========================================
// Timetable Slots
// ========================================
function addSlot() {
    slots.push({ start: '22:00', end: '22:30', price: 0, capacity: 1 });
    renderSlots();
}

function removeSlot(i) {
    slots.splice(i, 1);
    renderSlots();
}

function updateSlotPrice(index, value) {
    const price = parsePrice(value, currentCurrency);
    if (!PRICE_CONFIG.isValidPrice(price)) {
        toast(PRICE_CONFIG.getErrorMessage(), 'error');
        slots[index].price = 0;
    } else {
        slots[index].price = price;
    }
    renderSlots();
}

function updateSlotCapacity(index, value) {
    slots[index].capacity = parseInt(value) || 1;
}

function renderSlots() {
    const container = document.getElementById('slotsContainer');
    const symbol = getCurrencySymbol(currentCurrency);
    const config = CURRENCY_CONFIG[currentCurrency];
    
    container.innerHTML = slots.map((s, i) => `
        <div class="slot-item">
            <div class="slot-header">
                <span class="slot-number">Slot ${i + 1}</span>
                ${slots.length > 1 ? `<button class="slot-remove" onclick="removeSlot(${i})">×</button>` : ''}
            </div>
            <div class="slot-time-row">
                <button type="button" class="slot-time-btn" onclick="openPicker(${i}, 'start', 'slot')">${s.start}</button>
                <span style="color:var(--text2)">-</span>
                <button type="button" class="slot-time-btn" onclick="openPicker(${i}, 'end', 'slot')">${s.end}</button>
            </div>
            <div class="slot-price-row">
                <span class="slot-currency">${symbol}</span>
                <input type="number" class="slot-price-input" value="${s.price || ''}" 
                       placeholder="0" min="0" step="${config.decimal ? '0.01' : '1'}"
                       onchange="updateSlotPrice(${i}, this.value)">
            </div>
            <div class="slot-price-display">${formatPrice(s.price || 0, currentCurrency)}</div>
            <div class="slot-capacity-row">
                <span class="slot-capacity-label">Capacity:</span>
                <select class="slot-capacity-select" onchange="updateSlotCapacity(${i}, this.value)">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${s.capacity === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
            </div>
        </div>
    `).join('');
}

// ========================================
// Guarantee Slots
// ========================================
function addGigSlot() {
    gigSlots.push({ start: '22:00', end: '23:00', price: 0, capacity: 1 });
    renderGigSlots();
}

function removeGigSlot(i) {
    gigSlots.splice(i, 1);
    renderGigSlots();
}

function updateGigSlotPrice(index, value) {
    const price = parsePrice(value, currentCurrency);
    if (!PRICE_CONFIG.isValidPrice(price)) {
        toast(PRICE_CONFIG.getErrorMessage(), 'error');
        gigSlots[index].price = 0;
    } else {
        gigSlots[index].price = price;
    }
    renderGigSlots();
}

function updateGigSlotCapacity(index, value) {
    gigSlots[index].capacity = parseInt(value) || 1;
}

function renderGigSlots() {
    const container = document.getElementById('gigSlotsContainer');
    const symbol = getCurrencySymbol(currentCurrency);
    const config = CURRENCY_CONFIG[currentCurrency];
    
    container.innerHTML = gigSlots.map((s, i) => `
        <div class="slot-item">
            <div class="slot-header">
                <span class="slot-number">Slot ${i + 1}</span>
                ${gigSlots.length > 1 ? `<button class="slot-remove" onclick="removeGigSlot(${i})">×</button>` : ''}
            </div>
            <div class="slot-time-row">
                <button type="button" class="slot-time-btn" onclick="openPicker(${i}, 'start', 'gig')">${s.start}</button>
                <span style="color:var(--text2)">-</span>
                <button type="button" class="slot-time-btn" onclick="openPicker(${i}, 'end', 'gig')">${s.end}</button>
            </div>
            <div class="slot-price-row">
                <span class="slot-currency">${symbol}</span>
                <input type="number" class="slot-price-input" value="${s.price || ''}" 
                       placeholder="0" min="0" step="${config.decimal ? '0.01' : '1'}"
                       onchange="updateGigSlotPrice(${i}, this.value)">
            </div>
            <div class="slot-price-display">${formatPrice(s.price || 0, currentCurrency)}</div>
            <div class="slot-capacity-row">
                <span class="slot-capacity-label">Capacity:</span>
                <select class="slot-capacity-select" onchange="updateGigSlotCapacity(${i}, this.value)">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${s.capacity === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
            </div>
        </div>
    `).join('');
}

// ========================================
// Time Picker
// ========================================
function openPicker(index, field, slotType) {
    pickerSlotIndex = index;
    pickerField = field;
    pickerSlotType = slotType;
    
    const targetSlots = slotType === 'gig' ? gigSlots : slots;
    const timeStr = field === 'start' ? targetSlots[index].start : targetSlots[index].end;
    const [h, m] = timeStr.split(':').map(Number);
    pickerHour = h;
    pickerMinute = m;
    
    document.getElementById('pickerTitle').textContent = field === 'start' ? 'Start Time' : 'End Time';
    document.getElementById('pickerModal').classList.add('active');
    initWheels();
}

function initWheels() {
    const hourWheel = document.getElementById('hourWheel');
    const minuteWheel = document.getElementById('minuteWheel');
    
    hourWheel.innerHTML = '<div style="height:80px"></div>' + 
        Array.from({length: 24}, (_, i) => 
            `<div class="picker-item" data-value="${i}">${String(i).padStart(2, '0')}</div>`
        ).join('') + '<div style="height:80px"></div>';
    
    minuteWheel.innerHTML = '<div style="height:80px"></div>' + 
        Array.from({length: 12}, (_, i) => {
            const m = i * 5;
            return `<div class="picker-item" data-value="${m}">${String(m).padStart(2, '0')}</div>`;
        }).join('') + '<div style="height:80px"></div>';
    
    setTimeout(() => {
        hourWheel.scrollTop = pickerHour * 40;
        minuteWheel.scrollTop = (pickerMinute / 5) * 40;
        updateSelection();
    }, 50);
    
    hourWheel.onscroll = () => {
        pickerHour = Math.round(hourWheel.scrollTop / 40);
        if (pickerHour < 0) pickerHour = 0;
        if (pickerHour > 23) pickerHour = 23;
        updateSelection();
    };
    
    minuteWheel.onscroll = () => {
        const idx = Math.round(minuteWheel.scrollTop / 40);
        pickerMinute = Math.max(0, Math.min(11, idx)) * 5;
        updateSelection();
    };
}

function updateSelection() {
    document.querySelectorAll('#hourWheel .picker-item').forEach((el, i) => {
        el.classList.toggle('selected', i === pickerHour);
    });
    document.querySelectorAll('#minuteWheel .picker-item').forEach((el, i) => {
        el.classList.toggle('selected', i * 5 === pickerMinute);
    });
}

function closePicker() {
    document.getElementById('pickerModal').classList.remove('active');
}

function confirmPicker() {
    const timeStr = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    const targetSlots = pickerSlotType === 'gig' ? gigSlots : slots;
    
    if (pickerField === 'start') {
        targetSlots[pickerSlotIndex].start = timeStr;
    } else {
        targetSlots[pickerSlotIndex].end = timeStr;
    }
    
    if (pickerSlotType === 'gig') {
        renderGigSlots();
    } else {
        renderSlots();
    }
    closePicker();
}

// ========================================
// Submit Event
// ========================================
async function submitEvent() {
    if (!requireLogin()) return;
    const title = document.getElementById('eventTitle').value.trim();
    if (!title) { toast('Please enter title','error'); return; }
    
    try {
        let imageUrl = '';
        if (eventImageFile) {
            const blob = await compressImage(eventImageFile);
            imageUrl = await uploadImageToStorage(blob, `events/${Date.now()}.jpg`);
        }
        
        const data = {
            type: currentType, 
            title,
            date: new Date(document.getElementById('eventDate').value),
            location: document.getElementById('eventLocation').value,
            region: getRegionValue(),
            currency: currentCurrency,
            description: document.getElementById('eventDesc').value,
            imageUrl, 
            organizerId: user.uid, 
            organizerName: userData.name || '',
            organizerPhoto: userData.photoURL || '',
            likesCount: 0,
            commentsCount: 0,
            lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (currentType === 'A') {
            data.slots = slots.map(s => ({
                time: `${s.start}-${s.end}`,
                price: s.price,
                capacity: s.capacity || 1,
                applicants: []
            }));
        } else if (currentType === 'B') {
            data.slots = gigSlots.map(s => ({
                time: `${s.start}-${s.end}`,
                price: s.price,
                capacity: s.capacity || 1,
                applicants: [],
                status: 'open'
            }));
        }
        
        await db.collection('events').add(data);
        toast('Event created');
        setTimeout(() => location.href = 'events.html', 1000);
    } catch (e) { 
        log('Error: ' + e.message); 
        toast('Failed to create','error'); 
    }
}

// ========================================
// Submit Production
// ========================================
async function submitProduction() {
    if (!requireLogin()) return;
    const title = document.getElementById('prodTitle').value.trim();
    if (!title) { toast('Please enter title','error'); return; }
    
    const price = parseInt(document.getElementById('prodPrice').value) || 0;
    if (!PRICE_CONFIG.isValidPrice(price)) {
        toast(PRICE_CONFIG.getErrorMessage(), 'error');
        return;
    }
    
    if (currentType === 'audio' && !prodAudioFile) {
        toast('Please upload audio file', 'error');
        return;
    }
    
    try {
        let imageUrl = '';
        if (prodImageFile) {
            const blob = await compressImage(prodImageFile);
            imageUrl = await uploadImageToStorage(blob, `productions/${Date.now()}.jpg`);
        }
        
        let audioUrl = '';
        let audioDuration = 0;
        if (currentType === 'audio' && prodAudioFile) {
            toast('Uploading audio...');
            const audioPath = `audio/${user.uid}/${Date.now()}_${prodAudioFile.name}`;
            const audioRef = storage.ref(audioPath);
            await audioRef.put(prodAudioFile);
            audioUrl = await audioRef.getDownloadURL();
            audioDuration = prodAudioDuration;
        }
        
        const data = {
            type: currentType, 
            title,
            price: price,
            description: document.getElementById('prodDesc').value,
            imageUrl, 
            artistId: user.uid, 
            artistName: userData.name || '',
            userId: user.uid,
            likesCount: 0,
            commentsCount: 0,
            lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (currentType === 'audio') {
            data.audioUrl = audioUrl;
            data.audioDuration = audioDuration;
        }
        
        await db.collection('productions').add(data);
        toast('Production created');
        setTimeout(() => location.href = 'productions.html', 1000);
    } catch (e) { 
        log('Error: ' + e.message); 
        toast('Failed to create','error'); 
    }
}

// ========================================
// Submit Place
// ========================================
async function submitPlace() {
    if (!requireLogin()) return;
    const name = document.getElementById('placeName').value.trim();
    if (!name) { toast('Please enter name','error'); return; }
    
    try {
        let imageUrl = '';
        if (placeImageFile) {
            const blob = await compressImage(placeImageFile);
            imageUrl = await uploadImageToStorage(blob, `places/${Date.now()}.jpg`);
        }
        
        const data = {
            type: currentType,
            name,
            location: document.getElementById('placeLocation').value,
            region: document.getElementById('placeRegion').value,
            snsLinks: getPlaceSnsLinks(),
            url: document.getElementById('placeUrl').value,
            description: document.getElementById('placeDesc').value,
            imageUrl,
            userId: user.uid,
            userName: userData.name || '',
            userPhoto: userData.photoURL || '',
            likesCount: 0,
            commentsCount: 0,
            lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('places').add(data);
        toast('Place created');
        setTimeout(() => location.href = 'place.html', 1000);
    } catch (e) { 
        log('Error: ' + e.message); 
        toast('Failed to create','error'); 
    }
}

// ========================================
// Place SNS Link Functions
// ========================================
let placeSnsCount = 0;

function addPlaceSnsLink(platform = '', url = '', customName = '') {
    const container = document.getElementById('placeSnsContainer');
    const index = placeSnsCount++;
    
    const platformOptions = SNS_PLATFORMS.map(p => 
        `<option value="${p.id}" ${p.id === platform ? 'selected' : ''}>${p.name}</option>`
    ).join('');
    
    const isOther = platform === 'other';
    
    const html = `
        <div class="slot-item" id="placeSns_${index}" style="margin-bottom:8px;">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <select class="input" id="placeSnsPlat_${index}" style="flex:0 0 140px;" onchange="handlePlaceSnsplatformChange(${index})">
                    ${platformOptions}
                </select>
                <button type="button" class="slot-remove" onclick="removePlaceSnsLink(${index})">×</button>
            </div>
            <div id="placeSnsCustomRow_${index}" style="display:${isOther ? 'block' : 'none'};margin-bottom:8px;">
                <input type="text" class="input" id="placeSnsCustom_${index}" placeholder="タイトル（例: LINE公式）" value="${customName}">
            </div>
            <input type="url" class="input" id="placeSnsUrl_${index}" placeholder="https://..." value="${url}">
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    updatePlaceSnsPlaceholder(index);
}

function removePlaceSnsLink(index) {
    const el = document.getElementById(`placeSns_${index}`);
    if (el) el.remove();
}

function handlePlaceSnsplatformChange(index) {
    const platSelect = document.getElementById(`placeSnsPlat_${index}`);
    const customRow = document.getElementById(`placeSnsCustomRow_${index}`);
    const customInput = document.getElementById(`placeSnsCustom_${index}`);
    
    if (platSelect.value === 'other') {
        customRow.style.display = 'block';
    } else {
        customRow.style.display = 'none';
        if (customInput) customInput.value = '';
    }
    updatePlaceSnsPlaceholder(index);
}

function updatePlaceSnsPlaceholder(index) {
    const platSelect = document.getElementById(`placeSnsPlat_${index}`);
    const urlInput = document.getElementById(`placeSnsUrl_${index}`);
    if (!platSelect || !urlInput) return;
    
    const platform = SNS_PLATFORMS.find(p => p.id === platSelect.value);
    if (platform && platform.prefix) {
        urlInput.placeholder = platform.prefix + 'username';
    } else {
        urlInput.placeholder = 'https://...';
    }
}

function getPlaceSnsLinks() {
    const links = [];
    const container = document.getElementById('placeSnsContainer');
    const items = container.querySelectorAll('.slot-item');
    
    items.forEach(item => {
        const id = item.id.replace('placeSns_', '');
        const platform = document.getElementById(`placeSnsPlat_${id}`)?.value;
        const url = document.getElementById(`placeSnsUrl_${id}`)?.value?.trim();
        const customName = document.getElementById(`placeSnsCustom_${id}`)?.value?.trim();
        
        if (platform && url) {
            const linkData = { platform, url: normalizeUrl(url) };
            if (platform === 'other' && customName) {
                linkData.customName = customName;
            }
            links.push(linkData);
        }
    });
    
    return links;
}

// ========================================
// Auth Ready Handler
// ========================================
function onAuthReady() {
    if (!user) { 
        window.location.href = 'index.html';
        return; 
    }
    addSlot();
    addGigSlot();
    updateCurrencyDisplay();
}
