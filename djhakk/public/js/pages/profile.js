// ========================================
// DJHAKK Profile Page
// ========================================

let isOwnProfile = true;
let targetUserId = null;
let targetUserData = null;
let myEvents = [];
let snsLinks = [];

// 音楽関連
let pendingAudioFile = null;
let pendingAudioDuration = 0;

// ウォレット関連
let currentBalance = 0;
let pendingAmount = 0;

// ========================================
// Tab Switching
// ========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const tabIndex = { edit: 1, events: 2, wallet: 3, dm: 4 }[tabId] || 1;
    document.querySelector(`.tab:nth-child(${tabIndex})`).classList.add('active');
    document.getElementById(tabId + 'Tab').classList.add('active');
    
    if (tabId === 'events') loadMyEvents();
    if (tabId === 'dm') loadDMPreview();
    if (tabId === 'wallet') loadWalletData();
}

// ========================================
// Load Profile Data
// ========================================
async function loadProfileData() {
    const params = new URLSearchParams(location.search);
    const uid = params.get('uid');
    
    if (uid && uid !== (user ? user.uid : null)) {
        isOwnProfile = false;
        targetUserId = uid;
        await loadOtherProfile(uid);
    } else {
        isOwnProfile = true;
        await loadOwnProfile();
    }
}

async function loadOwnProfile() {
    document.getElementById('myProfileTabs').style.display = 'block';
    document.getElementById('otherProfileContent').style.display = 'none';
    document.getElementById('avatarContainer').classList.remove('readonly');
    document.getElementById('avatarContainer').onclick = () => document.getElementById('avatarInput').click();
    
    document.getElementById('headerSection').innerHTML = `
        <img src="logo.png" class="header-logo" onclick="location.href='timeline.html'">
        <span class="header-title">MY PROFILE</span>
    `;
    
    const name = userData.name || user.displayName || 'User';
    const initial = name[0].toUpperCase();
    
    if (userData.photoURL) {
        document.getElementById('avatarImg').src = userData.photoURL;
        document.getElementById('avatarImg').style.display = 'block';
        document.getElementById('avatarInitial').style.display = 'none';
        document.getElementById('avatarEditImg').src = userData.photoURL;
        document.getElementById('avatarEditImg').style.display = 'block';
        document.getElementById('avatarEditInitial').style.display = 'none';
    } else {
        document.getElementById('avatarImg').style.display = 'none';
        document.getElementById('avatarInitial').style.display = 'block';
        document.getElementById('avatarInitial').textContent = initial;
        document.getElementById('avatarEditImg').style.display = 'none';
        document.getElementById('avatarEditInitial').style.display = 'block';
        document.getElementById('avatarEditInitial').textContent = initial;
    }
    
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileRegion').textContent = userData.region ? `${userData.region}` : '';
    document.getElementById('profileBio').innerHTML = linkifyText(userData.bio || '');
    document.getElementById('profileActions').innerHTML = '';
    
    if (userData.audioUrl && typeof renderWaveformPlayer === 'function') {
        document.getElementById('profileAudioPlayer').innerHTML = 
            renderWaveformPlayer(userData.audioUrl, userData.audioTitle, userData.audioDuration, `profile_${user.uid}`);
    } else {
        document.getElementById('profileAudioPlayer').innerHTML = '';
    }
    
    renderProfileSns(userData.snsLinks);
    
    document.getElementById('editName').value = name;
    document.getElementById('editBio').value = userData.bio || '';
    document.getElementById('editRegion').innerHTML = generateRegionOptions(false);
    if (userData.region) {
        document.getElementById('editRegion').value = userData.region;
    }
    
    snsLinks = userData.snsLinks || [];
    renderSnsLinks();
    loadAudioEditForm();
    
    // 通知設定を読み込み
    loadNotificationSettings();
    
    // URLハッシュで通知設定セクションに移動
    checkNotificationHash();
}

async function loadOtherProfile(uid) {
    document.getElementById('myProfileTabs').style.display = 'none';
    document.getElementById('otherProfileContent').style.display = 'block';
    document.getElementById('avatarContainer').classList.add('readonly');
    document.getElementById('avatarContainer').onclick = null;
    
    document.getElementById('headerSection').innerHTML = `
        <button class="back-btn" onclick="history.back()">← Back</button>
        <span class="header-title">PROFILE</span>
    `;
    
    targetUserData = await getUserById(uid);
    if (!targetUserData) {
        toast('User not found', 'error');
        return;
    }
    
    const name = targetUserData.name || 'User';
    const initial = name[0].toUpperCase();
    
    if (targetUserData.photoURL) {
        document.getElementById('avatarImg').src = targetUserData.photoURL;
        document.getElementById('avatarImg').style.display = 'block';
        document.getElementById('avatarInitial').style.display = 'none';
    } else {
        document.getElementById('avatarImg').style.display = 'none';
        document.getElementById('avatarInitial').style.display = 'block';
        document.getElementById('avatarInitial').textContent = initial;
    }
    
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileRegion').textContent = targetUserData.region ? `${targetUserData.region}` : '';
    document.getElementById('profileBio').innerHTML = linkifyText(targetUserData.bio || '');
    
    if (targetUserData.audioUrl && typeof renderWaveformPlayer === 'function') {
        document.getElementById('profileAudioPlayer').innerHTML = 
            renderWaveformPlayer(targetUserData.audioUrl, targetUserData.audioTitle, targetUserData.audioDuration, `profile_${uid}`);
    } else {
        document.getElementById('profileAudioPlayer').innerHTML = '';
    }
    
    renderProfileSns(targetUserData.snsLinks);
    
    document.getElementById('profileActions').innerHTML = `
        <button class="profile-btn dm" onclick="openDM('${uid}', '${name}')">DM</button>
    `;
    
    await loadOtherUserEvents(uid);
}

// ========================================
// SNS Rendering
// ========================================
function renderProfileSns(snsLinksData) {
    const container = document.getElementById('profileSns');
    if (!snsLinksData || snsLinksData.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const defaultSvg = '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>';
    let html = '';
    snsLinksData.forEach(link => {
        if (link && link.url) {
            const platform = SNS_PLATFORMS.find(p => p.id === link.platform);
            const platformName = (link.platform === 'other' && link.customName) ? link.customName : ((platform && platform.name) ? platform.name : 'Link');
            let iconHtml;
            if (platform && platform.png) {
                iconHtml = `<img src="${platform.png}" width="18" height="18" style="flex-shrink:0;" alt="${platformName}">`;
            } else {
                const svgContent = (platform && platform.svg) ? platform.svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '') : defaultSvg;
                iconHtml = `<svg viewBox="0 0 24 24" width="18" height="18" style="fill:#A0A0B8;flex-shrink:0;">${svgContent}</svg>`;
            }
            html += `<a href="${normalizeUrl(link.url)}" target="_blank" rel="noopener" class="sns-link">${iconHtml}<span>${platformName}</span></a>`;
        }
    });
    container.innerHTML = html;
}

// ========================================
// SNS Link Management
// ========================================
function addSnsLink() {
    snsLinks.push({ platform: 'x', url: '' });
    renderSnsLinks();
}

function removeSnsLink(index) {
    snsLinks.splice(index, 1);
    renderSnsLinks();
}

function updateSnsLink(index, field, value) {
    snsLinks[index][field] = value;
}

function renderSnsLinks() {
    const container = document.getElementById('snsLinksContainer');
    if (!container) return;
    
    let html = '';
    snsLinks.forEach((link, i) => {
        const platformOptions = SNS_PLATFORMS.map(p => 
            `<option value="${p.id}" ${link.platform === p.id ? 'selected' : ''}>${p.name}</option>`
        ).join('');
        
        const isOther = link.platform === 'other';
        const customNameInput = isOther ? `
            <input type="text" class="input" value="${link.customName || ''}" 
                   placeholder="タイトル（例: LINE公式）" 
                   onchange="updateSnsLink(${i}, 'customName', this.value)"
                   style="margin-bottom: 8px;">
        ` : '';
        
        html += `
            <div class="sns-item">
                <div class="sns-item-header">
                    <span class="sns-item-title">SNS ${i + 1}</span>
                    <button type="button" class="sns-item-remove" onclick="removeSnsLink(${i})">×</button>
                </div>
                <div class="sns-select-row">
                    <select class="sns-select input" onchange="handleSnsplatformChange(${i}, this.value)">
                        ${platformOptions}
                    </select>
                </div>
                ${customNameInput}
                <input type="url" class="input" value="${link.url || ''}" 
                       placeholder="URLを入力" 
                       onchange="updateSnsLink(${i}, 'url', this.value)">
            </div>
        `;
    });
    container.innerHTML = html;
}

function handleSnsplatformChange(index, value) {
    snsLinks[index].platform = value;
    if (value !== 'other') {
        delete snsLinks[index].customName;
    }
    renderSnsLinks();
}

// ========================================
// Avatar Upload
// ========================================
async function uploadAvatar(input) {
    if (!input.files || !input.files[0]) return;
    try {
        const blob = await compressImage(input.files[0], 400, 0.9);
        const url = await uploadImageToStorage(blob, `avatars/${user.uid}.jpg`);
        await db.collection('users').doc(user.uid).update({ photoURL: url });
        userData.photoURL = url;
        document.getElementById('avatarImg').src = url;
        document.getElementById('avatarImg').style.display = 'block';
        document.getElementById('avatarInitial').style.display = 'none';
        document.getElementById('avatarEditImg').src = url;
        document.getElementById('avatarEditImg').style.display = 'block';
        document.getElementById('avatarEditInitial').style.display = 'none';
        toast('Icon updated');
    } catch (e) { 
        log('Avatar upload error: ' + e.message); 
        toast('Upload failed','error'); 
    }
}

// ========================================
// Profile Save
// ========================================
async function saveProfile() {
    const data = {
        name: document.getElementById('editName').value.trim(),
        region: document.getElementById('editRegion').value,
        bio: document.getElementById('editBio').value.trim(),
        snsLinks: snsLinks.filter(link => link.url).map(link => ({
            ...link,
            url: normalizeUrl(link.url)
        }))
    };
    
    if (pendingAudioFile) {
        toast('Uploading audio...');
        const result = await uploadAudioFile(pendingAudioFile);
        if (result) {
            data.audioUrl = result.url;
            data.audioDuration = result.duration;
            data.audioTitle = document.getElementById('audioTitleInput').value.trim() || 'Untitled';
            pendingAudioFile = null;
            pendingAudioDuration = 0;
        } else {
            return;
        }
    } else if (document.getElementById('audioTitleInput')) {
        const titleInput = document.getElementById('audioTitleInput');
        if (titleInput.value.trim() && userData.audioUrl) {
            data.audioTitle = titleInput.value.trim();
        }
    }
    
    if (await updateUserData(data)) {
        document.getElementById('profileName').textContent = data.name || '-';
        document.getElementById('profileRegion').textContent = data.region ? `${data.region}` : '';
        document.getElementById('profileBio').innerHTML = linkifyText(data.bio || '');
        renderProfileSns(data.snsLinks);
        
        if ((data.audioUrl || userData.audioUrl) && typeof renderWaveformPlayer === 'function') {
            const audioUrl = data.audioUrl || userData.audioUrl;
            const audioTitle = data.audioTitle || userData.audioTitle;
            const audioDuration = data.audioDuration || userData.audioDuration;
            document.getElementById('profileAudioPlayer').innerHTML = 
                renderWaveformPlayer(audioUrl, audioTitle, audioDuration, `profile_${user.uid}`);
        }
        
        toast('Profile saved');
    } else { 
        toast('Save failed','error'); 
    }
}

async function handleLogout() {
    if (confirm('Log out?')) await logout();
}

// ========================================
// My Events
// ========================================
let guaranteeUsersCache = {};

async function loadMyEvents() {
    const container = document.getElementById('myEventsList');
    try {
        const snapshot = await db.collection('events').where('organizerId', '==', user.uid).orderBy('createdAt', 'desc').get();
        myEvents = [];
        snapshot.forEach(doc => myEvents.push({ id: doc.id, ...doc.data() }));
        
        if (myEvents.length === 0) {
            container.innerHTML = '<div class="empty-state">作成したイベントはありません</div>';
            return;
        }
        
        const allUserIds = new Set();
        myEvents.forEach(ev => {
            if (ev.slots) {
                ev.slots.forEach(slot => {
                    if (slot.applicants) slot.applicants.forEach(uid => allUserIds.add(uid));
                    if (slot.approvedUid) allUserIds.add(slot.approvedUid);
                });
            }
        });
        if (allUserIds.size > 0) {
            guaranteeUsersCache = await getUsersByIds([...allUserIds]);
        }
        
        container.innerHTML = myEvents.map(ev => renderMyEventCard(ev)).join('');
    } catch (e) { 
        log('Error loading events: ' + e.message); 
        container.innerHTML = '<div class="empty-state">読み込みに失敗しました</div>'; 
    }
}

function renderMyEventCard(ev) {
    const currency = ev.currency || 'jpy';
    
    if (ev.type !== 'B' || !ev.slots || ev.slots.length === 0) {
        return `
            <div class="card" onclick="location.href='events.html?id=${ev.id}'">
                <img src="${ev.imageUrl||'logo.png'}" class="card-img" onerror="this.src='logo.png'">
                <div class="card-body">
                    <div class="card-title">${ev.title}</div>
                    <div class="card-meta">${formatDate(ev.date)}</div>
                </div>
            </div>
        `;
    }
    
    const slotsHtml = ev.slots.map((slot, i) => renderGuaranteeSlot(ev, slot, i, currency)).join('');
    
    return `
        <div class="guarantee-event">
            <div class="guarantee-event-header" onclick="location.href='events.html?id=${ev.id}'">
                <img src="${ev.imageUrl||'logo.png'}" class="guarantee-event-img" onerror="this.src='logo.png'">
                <div class="guarantee-event-info">
                    <div class="guarantee-event-title">${ev.title}</div>
                    <div class="guarantee-event-meta">${formatDate(ev.date)}</div>
                </div>
            </div>
            <div class="guarantee-slots">
                ${slotsHtml}
            </div>
        </div>
    `;
}

function renderGuaranteeSlot(ev, slot, slotIndex, currency) {
    const status = slot.status || 'open';
    const applicants = slot.applicants || [];
    const price = slot.price || 0;
    
    let statusLabel = '';
    let statusClass = status;
    if (status === 'open') statusLabel = '募集中';
    else if (status === 'approved') statusLabel = '承認済';
    else if (status === 'completed') statusLabel = '完了';
    
    let content = '';
    
    if (status === 'completed') {
        const approvedUser = guaranteeUsersCache[slot.approvedUid] || {};
        content = `
            <div class="guarantee-approved-user">
                <div class="guarantee-applicant-avatar">
                    ${approvedUser.photoURL ? `<img src="${approvedUser.photoURL}">` : (approvedUser.displayName || '?').charAt(0)}
                </div>
                <div style="flex:1;">
                    <div class="guarantee-approved-label">✓ 出演完了</div>
                    <div style="font-size:13px;font-weight:500;">${approvedUser.displayName || 'ユーザー'}</div>
                </div>
            </div>
        `;
    } else if (status === 'approved') {
        const approvedUser = guaranteeUsersCache[slot.approvedUid] || {};
        content = `
            <div class="guarantee-approved-user">
                <div class="guarantee-applicant-avatar">
                    ${approvedUser.photoURL ? `<img src="${approvedUser.photoURL}">` : (approvedUser.displayName || '?').charAt(0)}
                </div>
                <div style="flex:1;">
                    <div class="guarantee-approved-label">✓ 承認済み</div>
                    <div style="font-size:13px;font-weight:500;">${approvedUser.displayName || 'ユーザー'}</div>
                </div>
            </div>
            <button class="guarantee-complete-btn" onclick="event.stopPropagation(); completeGuarantee('${ev.id}', ${slotIndex})">
                出演完了を報告
            </button>
        `;
    } else {
        if (applicants.length === 0) {
            content = '<div class="guarantee-no-applicants">応募者はまだいません</div>';
        } else {
            content = `
                <div class="guarantee-applicants">
                    <div class="guarantee-applicants-label">応募者 (${applicants.length}人)</div>
                    ${applicants.map(uid => {
                        const u = guaranteeUsersCache[uid] || {};
                        return `
                            <div class="guarantee-applicant">
                                <div class="guarantee-applicant-avatar" onclick="event.stopPropagation(); location.href='profile.html?uid=${uid}'">
                                    ${u.photoURL ? `<img src="${u.photoURL}">` : (u.displayName || '?').charAt(0)}
                                </div>
                                <div class="guarantee-applicant-name" onclick="event.stopPropagation(); location.href='profile.html?uid=${uid}'">${u.displayName || 'ユーザー'}</div>
                                <button class="guarantee-applicant-btn approve" onclick="event.stopPropagation(); approveGuarantee('${ev.id}', ${slotIndex}, '${uid}')">承認</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
    
    return `
        <div class="guarantee-slot">
            <div class="guarantee-slot-header">
                <span class="guarantee-slot-time">${slot.time || 'TBD'}</span>
                <span class="guarantee-slot-status ${statusClass}">${statusLabel}</span>
            </div>
            <div style="font-size:13px;color:var(--text2);margin-bottom:8px;">
                ギャラ: <span class="guarantee-slot-price">${formatPrice(price, currency)}</span>
            </div>
            ${content}
        </div>
    `;
}

// ========================================
// Guarantee Management
// ========================================
async function approveGuarantee(eventId, slotIndex, applicantUid) {
    if (!confirm('この応募者を承認しますか？承認すると支払いが確定します。')) return;
    
    try {
        const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/approveGuarantee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId,
                slotIndex,
                applicantUid,
                organizerId: user.uid
            })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to approve');
        
        toast('承認しました！');
        await loadMyEvents();
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function completeGuarantee(eventId, slotIndex) {
    if (!confirm('出演完了を報告しますか？報告すると出演者への支払いが実行されます。')) return;
    
    try {
        const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/completeGuarantee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId,
                slotIndex,
                organizerId: user.uid
            })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to complete');
        
        toast('完了報告しました！出演者への支払いが処理されます。');
        await loadMyEvents();
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ========================================
// Other User Events
// ========================================
async function loadOtherUserEvents(uid) {
    const container = document.getElementById('otherUserEvents');
    try {
        const snapshot = await db.collection('events').where('organizerId', '==', uid).orderBy('date', 'desc').limit(10).get();
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">イベントはありません</div>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const ev = doc.data();
            html += `
                <div class="card" onclick="location.href='events.html?id=${doc.id}'">
                    <img src="${ev.imageUrl||'logo.png'}" class="card-img" onerror="this.src='logo.png'">
                    <div class="card-body">
                        <div class="card-title">${ev.title}</div>
                        <div class="card-meta">${formatDate(ev.date)}</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) { 
        log('Error loading other user events: ' + e.message); 
        container.innerHTML = '<div class="empty-state">読み込みに失敗しました</div>'; 
    }
}

// ========================================
// DM Preview
// ========================================
async function loadDMPreview() {
    const container = document.getElementById('dmPreviewList');
    try {
        const snapshot = await db.collection('chats')
            .where('participants', 'array-contains', user.uid)
            .orderBy('lastMessageAt', 'desc')
            .limit(10)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">DMはありません</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const chat = doc.data();
            const partnerId = chat.participants.find(p => p !== user.uid);
            const partnerName = chat.participantNames?.[partnerId] || 'ユーザー';
            const partnerPhoto = chat.participantPhotos?.[partnerId] || '';
            const isUnread = chat.unreadBy === user.uid;
            
            html += `
                <div class="card" onclick="location.href='chat.html?id=${doc.id}'" style="display:flex;align-items:center;padding:12px;gap:12px;">
                    <div style="flex-shrink:0;">${renderAvatar(partnerPhoto, partnerName, 48, false)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;${isUnread ? 'color:#FF6B00;' : ''}">${partnerName}</div>
                        <div style="color:#A0A0B8;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${chat.lastMessage || ''}</div>
                    </div>
                    <div style="flex-shrink:0;color:#6B6B80;font-size:11px;">${formatDateShort(chat.lastMessageAt)}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) { 
        log('Error loading DMs: ' + e.message); 
        container.innerHTML = '<div class="empty-state">読み込みに失敗しました</div>'; 
    }
}

// ========================================
// Audio Management
// ========================================
async function handleAudioSelect(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|m4a|aac)$/i)) {
        toast('MP3 or M4A files only', 'error');
        input.value = '';
        return;
    }
    
    let duration = 0;
    try {
        if (typeof getAudioDuration === 'function') {
            duration = await getAudioDuration(file);
        } else {
            duration = await new Promise((resolve) => {
                const audio = new Audio();
                audio.onloadedmetadata = () => resolve(audio.duration);
                audio.onerror = () => resolve(0);
                audio.src = URL.createObjectURL(file);
            });
        }
    } catch (e) {
        console.error('Error getting audio duration:', e);
    }
    
    if (duration > 600) {
        toast('Max 10 minutes', 'error');
        input.value = '';
        return;
    }
    
    pendingAudioFile = file;
    pendingAudioDuration = duration;
    
    document.getElementById('audioUploadPlaceholder').style.display = 'none';
    document.getElementById('audioUploadPreview').style.display = 'block';
    document.getElementById('audioFileName').textContent = file.name;
    
    const formatDuration = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = Math.floor(sec % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    document.getElementById('audioDurationDisplay').textContent = formatDuration(duration);
    
    const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    document.getElementById('audioTitleInput').value = titleWithoutExt;
    
    const tempUrl = URL.createObjectURL(file);
    if (typeof renderWaveformPlayer === 'function') {
        document.getElementById('audioPreviewPlayer').innerHTML = 
            renderWaveformPlayer(tempUrl, titleWithoutExt, duration, 'preview_temp');
    }
}

function removeAudioFile() {
    pendingAudioFile = null;
    pendingAudioDuration = 0;
    
    document.getElementById('audioInput').value = '';
    document.getElementById('audioUploadPlaceholder').style.display = 'block';
    document.getElementById('audioUploadPreview').style.display = 'none';
    document.getElementById('audioTitleInput').value = '';
    document.getElementById('audioFileName').textContent = '';
    document.getElementById('audioDurationDisplay').textContent = '';
    document.getElementById('audioPreviewPlayer').innerHTML = '';
    
    if (userData.audioUrl) {
        updateUserData({
            audioUrl: firebase.firestore.FieldValue.delete(),
            audioTitle: firebase.firestore.FieldValue.delete(),
            audioDuration: firebase.firestore.FieldValue.delete()
        }).then(() => {
            document.getElementById('profileAudioPlayer').innerHTML = '';
            toast('Audio removed');
        });
    }
}

function loadAudioEditForm() {
    const formatDuration = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = Math.floor(sec % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    if (userData.audioUrl) {
        document.getElementById('audioUploadPlaceholder').style.display = 'none';
        document.getElementById('audioUploadPreview').style.display = 'block';
        document.getElementById('audioFileName').textContent = 'Current track';
        document.getElementById('audioDurationDisplay').textContent = formatDuration(userData.audioDuration || 0);
        document.getElementById('audioTitleInput').value = userData.audioTitle || '';
        if (typeof renderWaveformPlayer === 'function') {
            document.getElementById('audioPreviewPlayer').innerHTML = 
                renderWaveformPlayer(userData.audioUrl, userData.audioTitle, userData.audioDuration, 'edit_current');
        }
    } else {
        document.getElementById('audioUploadPlaceholder').style.display = 'block';
        document.getElementById('audioUploadPreview').style.display = 'none';
    }
}

// ========================================
// Wallet Functions
// ========================================
async function loadWalletData() {
    if (!user) return;
    
    try {
        const response = await fetch(`${STRIPE_CONFIG.functionsUrl}/getBalanceInfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentBalance = data.balance || 0;
            pendingAmount = data.pendingAmount || 0;
            
            document.getElementById('walletBalance').textContent = `¥${currentBalance.toLocaleString()}`;
            
            if (pendingAmount > 0) {
                document.getElementById('walletPending').textContent = `保留中: ¥${pendingAmount.toLocaleString()}`;
            } else {
                document.getElementById('walletPending').textContent = '';
            }
            
            const withdrawBtn = document.getElementById('withdrawBtn');
            if (currentBalance < STRIPE_CONFIG.minWithdrawalAmount) {
                withdrawBtn.disabled = true;
            } else {
                withdrawBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Load wallet data error:', error);
    }
    
    loadSavedCards();
    loadPurchaseHistory();
    loadSalesHistory();
    loadWithdrawalHistory();
}

async function loadSavedCards() {
    if (!user) return;
    
    const container = document.getElementById('savedCardsList');
    container.innerHTML = '<div class="empty-state">読み込み中...</div>';
    
    try {
        const cards = await getSavedCards();
        
        if (cards.length === 0) {
            container.innerHTML = '<div class="empty-state">登録カードはありません<br><small style="color:var(--text3)">カードを登録するとワンクリックで購入できます</small></div>';
            return;
        }
        
        let html = '';
        for (const card of cards) {
            const brandIcon = getCardBrandIcon(card.brand);
            const defaultBadge = card.isDefault ? '<span class="saved-card-default-badge">メイン</span>' : '';
            const canDelete = cards.length > 1;
            
            html += `
                <div class="saved-card-manage-item">
                    <div class="saved-card-manage-info">
                        <div class="saved-card-manage-brand">${brandIcon} ${defaultBadge}</div>
                        <div class="saved-card-manage-number">**** **** **** ${card.last4}</div>
                        <div class="saved-card-manage-exp">有効期限: ${card.expMonth}/${card.expYear}</div>
                    </div>
                    <div class="saved-card-manage-actions">
                        ${!card.isDefault ? `<button class="saved-card-action-btn" onclick="handleSetDefaultCard('${card.id}')">メインに設定</button>` : ''}
                        ${canDelete ? `<button class="saved-card-action-btn delete" onclick="handleDeleteCard('${card.id}')">削除</button>` : ''}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Load saved cards error:', error);
        container.innerHTML = '<div class="empty-state">読み込みエラー</div>';
    }
}

async function handleSetDefaultCard(cardId) {
    try {
        await setDefaultCard(cardId);
        toast('メインカードを設定しました');
        loadSavedCards();
    } catch (error) {
        toast(error.message, 'error');
    }
}

async function handleDeleteCard(cardId) {
    if (!confirm('このカードを削除しますか？')) return;
    
    try {
        await deleteCard(cardId);
        toast('カードを削除しました');
        loadSavedCards();
    } catch (error) {
        toast(error.message, 'error');
    }
}

function switchWalletTab(tab) {
    document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.wallet-history').forEach(h => h.style.display = 'none');
    
    event.target.classList.add('active');
    document.getElementById(tab + 'History').style.display = 'block';
}

async function loadPurchaseHistory() {
    if (!user) return;
    
    const container = document.getElementById('purchasesHistory');
    container.innerHTML = '<div class="empty-state">読み込み中...</div>';
    
    try {
        const purchases = await getPurchaseHistory();
        
        if (purchases.length === 0) {
            container.innerHTML = '<div class="empty-state">購入履歴はありません</div>';
            return;
        }
        
        let html = '';
        for (const p of purchases) {
            const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('ja-JP') : '';
            let statusLabel = { pending: '処理中', paid: '受取待ち', completed: '完了', cancelled: 'キャンセル済' }[p.status] || p.status;
            let statusClass = p.status;
            
            if (p.type === 'event_slot') {
                if (p.status === 'paid') {
                    statusLabel = '予約済み';
                }
            }
            
            if (p.type === 'download' && p.status === 'completed') {
                statusLabel = 'ダウンロード可';
            }
            
            const canCancelResult = canCancelPurchase(p);
            const showCancelBtn = canCancelResult.canCancel;
            const showReceiptBtn = p.status === 'paid' && p.type !== 'event_slot' && p.type !== 'download' && getPurchaseConfig(p.type).needsReceipt;
            const showDownloadBtn = p.type === 'download' && p.audioUrl && p.status === 'completed';
            
            html += `
                <div class="transaction-item">
                    <div class="transaction-header">
                        <div class="transaction-title">${escapeHtml(p.itemTitle || '商品')}</div>
                        <div class="transaction-amount minus">-¥${(p.amount || 0).toLocaleString()}</div>
                    </div>
                    <div class="transaction-meta">
                        <span>${date}</span>
                        <span class="transaction-status ${statusClass}">${statusLabel}</span>
                    </div>
                    ${showReceiptBtn ? `
                        <button class="confirm-receipt-btn" onclick="handleConfirmReceipt('${p.id}')">受取確認</button>
                    ` : ''}
                    ${showDownloadBtn ? `
                        <a href="${p.audioUrl}" download class="download-btn-history">ダウンロード</a>
                    ` : ''}
                    ${showCancelBtn ? `
                        <button class="cancel-purchase-btn" onclick="handleCancelPurchase('${p.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})">キャンセル</button>
                    ` : ''}
                    ${p.status === 'cancelled' ? `
                        <div class="refund-info">返金額: ¥${(p.refundAmount || 0).toLocaleString()}</div>
                    ` : ''}
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Load purchase history error:', error);
        container.innerHTML = '<div class="empty-state">読み込みエラー</div>';
    }
}

async function handleCancelPurchase(purchaseId, purchase) {
    const success = await confirmCancelPurchase(purchaseId, purchase);
    if (success) {
        loadPurchaseHistory();
        loadWalletData();
    }
}

async function loadSalesHistory() {
    if (!user) return;
    
    const container = document.getElementById('salesHistory');
    container.innerHTML = '<div class="empty-state">読み込み中...</div>';
    
    try {
        const sales = await getSalesHistory();
        
        if (sales.length === 0) {
            container.innerHTML = '<div class="empty-state">販売履歴はありません</div>';
            return;
        }
        
        let html = '';
        for (const s of sales) {
            const date = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('ja-JP') : '';
            const statusLabel = { pending: '処理中', paid: '受取確認待ち', completed: '確定' }[s.status] || s.status;
            const statusClass = s.status;
            
            html += `
                <div class="transaction-item">
                    <div class="transaction-header">
                        <div class="transaction-title">${escapeHtml(s.itemTitle || '商品')}</div>
                        <div class="transaction-amount plus">+¥${(s.sellerAmount || 0).toLocaleString()}</div>
                    </div>
                    <div class="transaction-meta">
                        <span>${date}</span>
                        <span class="transaction-status ${statusClass}">${statusLabel}</span>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Load sales history error:', error);
        container.innerHTML = '<div class="empty-state">読み込みエラー</div>';
    }
}

async function loadWithdrawalHistory() {
    if (!user) return;
    
    const container = document.getElementById('withdrawalsHistory');
    container.innerHTML = '<div class="empty-state">読み込み中...</div>';
    
    try {
        const withdrawals = await getWithdrawalHistory();
        
        if (withdrawals.length === 0) {
            container.innerHTML = '<div class="empty-state">出金履歴はありません</div>';
            return;
        }
        
        let html = '';
        for (const w of withdrawals) {
            const date = w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString('ja-JP') : '';
            const statusLabel = { pending: '処理中', completed: '完了', rejected: '却下' }[w.status] || w.status;
            const statusClass = w.status;
            
            html += `
                <div class="transaction-item">
                    <div class="transaction-header">
                        <div class="transaction-title">出金申請</div>
                        <div class="transaction-amount minus">-¥${(w.amount || 0).toLocaleString()}</div>
                    </div>
                    <div class="transaction-meta">
                        <span>${date}</span>
                        <span class="transaction-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div style="font-size:12px;color:var(--text3);margin-top:8px;">
                        振込額: ¥${(w.netAmount || 0).toLocaleString()}（手数料 ¥${w.fee || 200}）
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Load withdrawal history error:', error);
        container.innerHTML = '<div class="empty-state">読み込みエラー</div>';
    }
}

async function handleConfirmReceipt(purchaseId) {
    await confirmReceipt(purchaseId);
    loadWalletData();
}

function openWithdrawModal() {
    if (currentBalance < STRIPE_CONFIG.minWithdrawalAmount) {
        toast(`最低出金額は¥${STRIPE_CONFIG.minWithdrawalAmount.toLocaleString()}です`, 'error');
        return;
    }
    
    document.getElementById('withdrawCurrentBalance').textContent = `¥${currentBalance.toLocaleString()}`;
    document.getElementById('withdrawAmountInput').value = currentBalance;
    document.getElementById('withdrawAmountInput').max = currentBalance;
    updateWithdrawCalculation();
    
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().bankInfo) {
                const bank = doc.data().bankInfo;
                document.getElementById('bankName').value = bank.bankName || '';
                document.getElementById('branchName').value = bank.branchName || '';
                document.getElementById('accountType').value = bank.accountType || '普通';
                document.getElementById('accountNumber').value = bank.accountNumber || '';
                document.getElementById('accountName').value = bank.accountName || '';
            }
        });
    }
    
    document.getElementById('withdrawModal').classList.add('active');
}

function closeWithdrawModal() {
    document.getElementById('withdrawModal').classList.remove('active');
}

function updateWithdrawCalculation() {
    const amount = parseInt(document.getElementById('withdrawAmountInput').value) || 0;
    const fee = STRIPE_CONFIG.withdrawalFee;
    const net = Math.max(0, amount - fee);
    
    document.getElementById('withdrawAmountDisplay').textContent = `¥${amount.toLocaleString()}`;
    document.getElementById('withdrawNetAmount').textContent = `¥${net.toLocaleString()}`;
}

async function submitWithdrawal() {
    const amount = parseInt(document.getElementById('withdrawAmountInput').value) || 0;
    
    if (amount < STRIPE_CONFIG.minWithdrawalAmount) {
        toast(`最低出金額は¥${STRIPE_CONFIG.minWithdrawalAmount.toLocaleString()}です`, 'error');
        return;
    }
    
    if (amount > currentBalance) {
        toast('残高が不足しています', 'error');
        return;
    }
    
    const bankInfo = {
        bankName: document.getElementById('bankName').value.trim(),
        branchName: document.getElementById('branchName').value.trim(),
        accountType: document.getElementById('accountType').value,
        accountNumber: document.getElementById('accountNumber').value.trim(),
        accountName: document.getElementById('accountName').value.trim()
    };
    
    if (!bankInfo.bankName || !bankInfo.branchName || !bankInfo.accountNumber || !bankInfo.accountName) {
        toast('銀行口座情報を入力してください', 'error');
        return;
    }
    
    await db.collection('users').doc(user.uid).update({ bankInfo });
    
    const success = await requestWithdrawal(amount, bankInfo);
    
    if (success) {
        closeWithdrawModal();
        loadWalletData();
    }
}

// ========================================
// Notification Settings
// ========================================

/**
 * 通知設定を読み込む
 */
async function loadNotificationSettings() {
    if (!user) return;
    
    try {
        const settings = userData?.notificationSettings || {};
        
        // チェックボックスに値を設定（デフォルトはtrue）
        document.getElementById('emailEnabled').checked = settings.emailEnabled !== false;
        document.getElementById('dmEmail').checked = settings.dmEmail !== false;
        document.getElementById('purchaseEmail').checked = settings.purchaseEmail !== false;
        document.getElementById('applicationEmail').checked = settings.applicationEmail !== false;
        document.getElementById('guaranteeEmail').checked = settings.guaranteeEmail !== false;
        
        // サブ設定の表示/非表示を更新
        toggleEmailSubSettings(settings.emailEnabled !== false);
        
        // イベントリスナーを設定
        setupNotificationEventListeners();
    } catch (error) {
        console.error('Failed to load notification settings:', error);
    }
}

/**
 * 通知設定を保存
 */
async function saveNotificationSettings() {
    if (!user) return;
    
    const settings = {
        emailEnabled: document.getElementById('emailEnabled').checked,
        dmEmail: document.getElementById('dmEmail').checked,
        purchaseEmail: document.getElementById('purchaseEmail').checked,
        applicationEmail: document.getElementById('applicationEmail').checked,
        guaranteeEmail: document.getElementById('guaranteeEmail').checked
    };
    
    try {
        await db.collection('users').doc(user.uid).update({
            notificationSettings: settings
        });
        toast('通知設定を保存しました');
    } catch (error) {
        console.error('Failed to save notification settings:', error);
        toast('通知設定の保存に失敗しました', 'error');
    }
}

/**
 * メイン通知ON/OFFでサブ設定の表示/非表示を切り替え
 */
function toggleEmailSubSettings(enabled) {
    const subSettings = document.getElementById('emailSubSettings');
    if (subSettings) {
        subSettings.style.opacity = enabled ? '1' : '0.5';
        subSettings.style.pointerEvents = enabled ? 'auto' : 'none';
    }
}

/**
 * 通知設定のイベントリスナーを設定
 */
function setupNotificationEventListeners() {
    // メイン通知スイッチ
    const emailEnabledCheckbox = document.getElementById('emailEnabled');
    if (emailEnabledCheckbox) {
        emailEnabledCheckbox.addEventListener('change', (e) => {
            toggleEmailSubSettings(e.target.checked);
            saveNotificationSettings();
        });
    }
    
    // サブ設定のチェックボックス
    ['dmEmail', 'purchaseEmail', 'applicationEmail', 'guaranteeEmail'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', saveNotificationSettings);
        }
    });
}

/**
 * URLハッシュで通知設定セクションに移動
 */
function checkNotificationHash() {
    if (window.location.hash === '#notifications') {
        // editタブを表示
        switchTab('edit');
        // 通知設定セクションにスクロール
        setTimeout(() => {
            const section = document.getElementById('notificationSettingsSection');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }
}

// ========================================
// Auth Ready Handler
// ========================================
function onAuthReady() {
    const params = new URLSearchParams(location.search);
    const uid = params.get('uid');
    
    if (uid && uid !== (user ? user.uid : null)) {
        loadProfileData();
        return;
    }
    
    if (!user) { 
        window.location.href = 'index.html';
        return; 
    }
    loadProfileData();
}
