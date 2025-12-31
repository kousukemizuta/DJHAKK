// ========================================
// DJHAKK UI Utilities
// ========================================

// ========================================
// DOM Helpers
// ========================================
const $ = id => document.getElementById(id);

function log(msg) {
    console.log('[DJHAKK]', msg);
}

// ========================================
// Toast Notifications
// ========================================
function toast(msg, type = 'success') {
    let t = $('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ========================================
// Modal Functions
// ========================================
function closeModal(id) {
    const modal = $(id);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// ========================================
// Logo Setup
// ========================================
function setupLogo() {
    document.querySelectorAll('.header-logo').forEach(el => el.src = 'logo.png');
    const welcomeLogo = $('welcomeLogo');
    if (welcomeLogo) welcomeLogo.src = 'logo.png';
}

// ========================================
// Currency Functions
// ========================================
function getCurrencyFromRegion(region) {
    return REGION_CURRENCY_MAP[region] || 'usd';
}

function formatPrice(amount, currency) {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd;
    if (amount === 0) return '無料';
    if (config.decimal) {
        return `${config.symbol}${amount.toFixed(2)}`;
    }
    return `${config.symbol}${amount.toLocaleString()}`;
}

function formatPriceShort(amount, currency) {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd;
    if (amount === 0) return '無料';
    if (config.decimal) {
        return `${config.symbol}${amount.toFixed(0)}`;
    }
    return `${config.symbol}${amount.toLocaleString()}`;
}

function parsePrice(value, currency) {
    const num = parseFloat(value) || 0;
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd;
    return config.decimal ? num : Math.floor(num);
}

function getCurrencySymbol(currency) {
    return (CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.usd).symbol;
}

// ========================================
// Region Functions
// ========================================
function generateRegionOptions(includeAll = false) {
    let html = includeAll ? `<option value="all">${LABELS.allArea}</option>` : `<option value="">${LABELS.selectArea}</option>`;
    REGIONS.forEach(r => {
        html += `<optgroup label="${r.group}">`;
        r.cities.forEach(city => {
            html += `<option value="${city}">${city}</option>`;
        });
        html += '</optgroup>';
    });
    return html;
}

// ========================================
// Date Formatting
// ========================================
function formatDate(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateFull(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateShort(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ========================================
// Avatar Rendering
// ========================================
function renderAvatar(photoURL, name, size = 32, clickable = false, uid = null) {
    const initial = (name || '?')[0].toUpperCase();
    const clickAttr = clickable && uid ? `onclick="event.stopPropagation(); window.location.href='profile.html?uid=${uid}'"` : '';
    const cursorStyle = clickable ? 'cursor:pointer;' : '';
    
    if (photoURL) {
        return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;${cursorStyle}" ${clickAttr}>
            <img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--gradient);color:white;font-weight:600;\\'>${initial}</span>'">
        </div>`;
    }
    return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:${size/2.5}px;${cursorStyle}" ${clickAttr}>${initial}</div>`;
}

function renderEmptyAvatar(size = 32) {
    return `<div class="avatar-empty" style="width:${size}px;height:${size}px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;"></div>`;
}

// ========================================
// SNS Icons Rendering
// ========================================
function renderSnsIcons(snsLinks, size = 28) {
    if (!snsLinks || snsLinks.length === 0) return '';
    
    const defaultSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';
    const iconSize = Math.floor(size * 0.6);
    
    let html = '<div class="sns-icons" style="display:flex;gap:6px;flex-wrap:wrap;">';
    snsLinks.forEach(link => {
        if (link && link.url) {
            const platform = SNS_PLATFORMS.find(p => p.id === link.platform);
            // customNameがあればそれを使用、なければplatform名
            const platformName = (link.platform === 'other' && link.customName) ? link.customName : ((platform && platform.name) ? platform.name : 'Link');
            
            // PNGアイコンがある場合はimg、なければSVG
            let iconHtml;
            if (platform && platform.png) {
                iconHtml = `<img src="${platform.png}" width="${iconSize}" height="${iconSize}" style="flex-shrink:0;min-width:${iconSize}px;min-height:${iconSize}px;" alt="${platformName}">`;
            } else {
                const svgIcon = (platform && platform.svg) ? platform.svg : defaultSvg;
                iconHtml = `<svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" style="fill:#A0A0B8;flex-shrink:0;min-width:${iconSize}px;min-height:${iconSize}px;">${svgIcon.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}</svg>`;
            }
            
            html += `<a href="${link.url}" target="_blank" rel="noopener" onclick="event.stopPropagation();" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:#1A1A2E;border-radius:50%;text-decoration:none;flex-shrink:0;" title="${platformName}">${iconHtml}</a>`;
        }
    });
    html += '</div>';
    return html;
}

// ========================================
// Text Utilities
// ========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// URLを検出してクリック可能なリンクに変換
function linkifyText(text) {
    if (!text) return '';
    
    // まずHTMLエスケープ
    const escaped = escapeHtml(text);
    
    // URL検出の正規表現（http, https, www）
    const urlPattern = /(\b(https?:\/\/|www\.)[^\s<>\"\']+)/gi;
    
    // URLをリンクに変換
    const linked = escaped.replace(urlPattern, (match) => {
        let url = match;
        // www.で始まる場合はhttps://を付加
        if (url.toLowerCase().startsWith('www.')) {
            url = 'https://' + url;
        }
        // 表示用テキスト（長すぎる場合は省略）
        let displayText = match;
        if (displayText.length > 40) {
            displayText = displayText.substring(0, 37) + '...';
        }
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="color:var(--primary);text-decoration:underline;word-break:break-all;">${displayText}</a>`;
    });
    
    // 改行を<br>に変換
    return linked.replace(/\n/g, '<br>');
}

// ========================================
// Image Functions
// ========================================
function compressImage(file, maxWidth = 1200, quality = 0.9) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = h * maxWidth / w; w = maxWidth; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function uploadImageToStorage(blob, path) {
    const ref = storage.ref(path);
    await ref.put(blob);
    return await ref.getDownloadURL();
}

// ========================================
// Navigation Helpers
// ========================================
function handleCreateClick() {
    if (requireLogin()) {
        window.location.href = 'create.html';
    }
}

function handleProfileClick() {
    if (requireLogin()) {
        window.location.href = 'profile.html';
    }
}

// ========================================
// Common Card Components
// ========================================

// 時間のみフォーマット
function formatTimeOnly(date) {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// スロット応募者アバター
function renderSlotAvatars(applicants, capacity, usersCache = {}) {
    let html = '';
    applicants.slice(0, 3).forEach(uid => {
        const u = usersCache[uid];
        if (u) {
            html += renderAvatar(u.photoURL, u.name || '?', 24, true, uid);
        } else {
            html += `<div class="avatar-empty"></div>`;
        }
    });
    for (let i = applicants.length; i < Math.min(capacity, 3); i++) {
        html += `<div class="avatar-empty"></div>`;
    }
    return html;
}

/**
 * EVENT カード
 */
function renderEventCard(event, isLiked = false, usersCache = {}) {
    const labels = { A: 'TIMETABLE', B: 'GUARANTEE(ｷﾞｬﾗ)', C: 'FLYER' };
    const cls = { A: 'a', B: 'b', C: 'c' };
    const currency = event.currency || 'jpy';
    const organizer = usersCache[event.organizerId] || {};
    const organizerName = organizer.name || event.organizerName || 'Organizer';
    const organizerPhoto = organizer.photoURL || event.organizerPhoto || '';
    
    let html = `
        <div class="card" data-type="event" data-id="${event.id}">
            <div class="card-main" onclick="window.location.href='events.html?id=${event.id}'">
                <img src="${event.imageUrl || 'logo.png'}" class="card-img" onerror="this.src='logo.png'">
                <div class="card-body">
                    <span class="card-region">@ ${event.region || 'N/A'}</span>
                    <span class="badge ${cls[event.type] || 'a'}">${labels[event.type] || 'TIMETABLE'}</span>
                    <h3 class="card-title">${event.title}</h3>
                    <p style="color:var(--text2);font-size:13px;">${formatTimeOnly(event.date)} ${event.location || ''}</p>
                    ${event.description ? `<p class="card-desc">${escapeHtml(event.description)}</p>` : ''}
                    <div class="card-organizer" onclick="event.stopPropagation(); window.location.href='profile.html?uid=${event.organizerId}'">
                        ${renderAvatar(organizerPhoto, organizerName, 28, false)}
                        <span class="card-organizer-name">${organizerName}</span>
                    </div>
                </div>
            </div>
    `;
    
    // スロット表示（Type A, B のみ）
    if ((event.type === 'A' || event.type === 'B') && event.slots && event.slots.length > 0) {
        html += `<div class="card-slots">`;
        event.slots.forEach((slot, i) => {
            const price = slot.price || 0;
            const capacity = slot.capacity || 1;
            const applicants = slot.applicants || [];
            const count = applicants.length;
            const isFree = price === 0;
            const status = slot.status || 'open';
            
            // FULL判定: Type A は応募数、Type B は承認済みかどうか
            let isFull, countDisplay, btnText;
            if (event.type === 'B') {
                // GUARANTEE: 承認済み or 完了で確定
                isFull = status === 'approved' || status === 'completed';
                countDisplay = isFull ? '確定' : `${count}人応募`;
                btnText = isFull ? 'CLOSED' : (isFree ? 'FREE' : formatPriceShort(price, currency));
            } else {
                // TIMETABLE: 応募数で判定
                isFull = count >= capacity;
                countDisplay = `${count}/${capacity}${isFull ? ' FULL' : ''}`;
                btnText = isFull ? 'FULL' : (isFree ? 'FREE' : formatPriceShort(price, currency));
            }
            
            html += `
                <div class="card-slot">
                    <div class="card-slot-info">
                        <span class="card-slot-time">${slot.time || 'TBD'}</span>
                        <span class="card-slot-price ${isFree ? 'free' : ''}">${formatPrice(price, currency)}</span>
                        <span class="card-slot-count ${isFull ? 'full' : ''}">${countDisplay}</span>
                    </div>
                    <div class="card-slot-avatars">${event.type === 'B' && isFull && slot.approvedUid ? renderSlotAvatars([slot.approvedUid], 1, usersCache) : renderSlotAvatars(applicants, capacity, usersCache)}</div>
                    <button class="card-slot-buy ${isFree ? 'free' : ''} ${isFull ? 'full' : ''}" 
                            onclick="event.stopPropagation(); handleEventSlotClick('${event.id}', ${i})"
                            ${isFull ? 'disabled' : ''}>
                        ${btnText}
                    </button>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    // いいね・コメントボタン
    html += `
            <div class="card-interaction">
                ${renderInteractionButtons('event', event.id, event.likesCount || 0, event.commentsCount || 0, isLiked)}
            </div>
        </div>
    `;
    
    return html;
}

// Eventスロットクリックハンドラ
function handleEventSlotClick(eventId, slotIndex) {
    window.location.href = `events.html?id=${eventId}&slot=${slotIndex}`;
}

/**
 * PRODUCTION カード
 */
function renderProductionCard(production, isLiked = false, userInfo = null) {
    const typeLabels = { audio: 'DOWNLOAD', goods: 'ITEM', produce: 'PRODUCE' };
    const user = userInfo || {};
    const userName = user.name || production.artistName || 'User';
    const userPhoto = user.photoURL || '';
    const initial = (userName || '?')[0].toUpperCase();
    
    let html = `
        <div class="card" data-type="production" data-id="${production.id}">
            <div class="card-main" onclick="window.location.href='productions.html?id=${production.id}'">
                <img src="${production.imageUrl || 'logo.png'}" class="card-img" onerror="this.src='logo.png'">
                <div class="card-body">
                    <span class="badge ${production.type || 'audio'}">${typeLabels[production.type] || 'PRODUCTION'}</span>
                    <h3 class="card-title">${production.title}</h3>
                    <p style="color:var(--text2);font-size:13px;">¥${(production.price || 0).toLocaleString()}</p>
                    ${production.description ? `<p class="card-desc">${escapeHtml(production.description)}</p>` : ''}
    `;
    
    // SNSアイコン（作成者より先に表示）
    if (user.sns) {
        const snsHtml = renderSnsIcons(user.sns, 24);
        if (snsHtml) {
            html += `<div class="card-sns" onclick="event.stopPropagation()">${snsHtml}</div>`;
        }
    }
    
    // 作成者情報
    html += `
                    <div class="card-creator" onclick="event.stopPropagation(); window.location.href='profile.html?uid=${production.userId}'">
                        <div class="card-creator-avatar">
                            ${userPhoto ? `<img src="${userPhoto}" onerror="this.style.display='none';this.parentElement.textContent='${initial}'">` : initial}
                        </div>
                        <span class="card-creator-name">${userName}</span>
                    </div>
                </div>
            </div>
    `;
    
    // DOWNLOAD SALES（type='audio'）の場合、波形プレイヤーを追加
    // audio-player.jsのrenderWaveformPlayerを使用（アーティストカードと同じ形式）
    if (production.type === 'audio' && production.audioUrl && typeof renderWaveformPlayer === 'function') {
        const waveformHtml = renderWaveformPlayer(
            production.audioUrl, 
            production.title, 
            production.audioDuration || 0, 
            `prod_${production.id}`
        );
        if (waveformHtml) {
            html += `<div class="card-waveform-section" onclick="event.stopPropagation()">${waveformHtml}</div>`;
        }
    }
    
    html += `
            <div class="card-buy-section">
                <button class="card-buy-btn" onclick="event.stopPropagation(); window.location.href='productions.html?id=${production.id}&action=purchase'">
                    Buy ¥${(production.price || 0).toLocaleString()}
                </button>
            </div>
            <div class="card-interaction">
                ${renderInteractionButtons('production', production.id, production.likesCount || 0, production.commentsCount || 0, isLiked)}
            </div>
        </div>
    `;
    
    return html;
}

/**
 * PLACE カード
 */
function renderPlaceCard(place, isLiked = false) {
    const typeLabels = { place: 'PLACE', agency: 'AGENCY', shop: 'SHOP' };
    const initial = (place.userName || '?')[0].toUpperCase();
    
    let html = `
        <div class="card" data-type="place" data-id="${place.id}">
            <div class="card-main" onclick="window.location.href='place.html?id=${place.id}'">
                <img src="${place.imageUrl || 'logo.png'}" class="card-img" onerror="this.src='logo.png'">
                <div class="card-body">
                    <span class="badge ${place.type || 'place'}">${typeLabels[place.type] || 'PLACE'}</span>
                    ${place.region ? `<span class="card-region">${place.region}</span>` : ''}
                    <h3 class="card-title">${place.name || 'Untitled'}</h3>
                    ${place.location ? `<div class="card-location">📍 ${place.location}</div>` : ''}
                    ${place.url ? `<div class="card-url">🔗 <a href="${place.url}" target="_blank" onclick="event.stopPropagation()">${place.url}</a></div>` : ''}
                    ${place.description ? `<p class="card-desc">${escapeHtml(place.description)}</p>` : ''}
    `;
    
    // SNSアイコン（作成者より先に表示）
    if (place.snsLinks) {
        const snsHtml = renderSnsIcons(place.snsLinks, 24);
        if (snsHtml) {
            html += `<div class="card-sns" onclick="event.stopPropagation()">${snsHtml}</div>`;
        }
    }
    
    // 作成者情報
    html += `
                    <div class="card-creator" onclick="event.stopPropagation(); window.location.href='profile.html?uid=${place.userId}'">
                        <div class="card-creator-avatar">
                            ${place.userPhoto ? `<img src="${place.userPhoto}" onerror="this.style.display='none';this.parentElement.textContent='${initial}'">` : initial}
                        </div>
                        <span class="card-creator-name">${place.userName || 'User'}</span>
                    </div>
                </div>
            </div>
            <div class="card-interaction">
                ${renderInteractionButtons('place', place.id, place.likesCount || 0, place.commentsCount || 0, isLiked)}
            </div>
        </div>
    `;
    
    return html;
}

/**
 * ARTIST カード
 */
function renderArtistCard(artist, isLiked = false) {
    const initial = (artist.name || '?')[0].toUpperCase();
    const avatarHtml = artist.photoURL 
        ? `<img src="${artist.photoURL}" onerror="this.style.display='none';this.parentElement.innerHTML='${initial}'">`
        : initial;
    
    // 波形プレイヤー
    const audioPlayer = (artist.audioUrl && typeof renderWaveformPlayer === 'function') 
        ? renderWaveformPlayer(artist.audioUrl, artist.audioTitle, artist.audioDuration, `card_${artist.id}`) 
        : '';
    
    let html = `
        <div class="artist-card" data-type="user" data-id="${artist.id}" onclick="window.location.href='profile.html?uid=${artist.id}'">
            <div class="artist-card-header">
                <div class="artist-avatar">${avatarHtml}</div>
                <div class="artist-info">
                    <div class="artist-name">${artist.name || 'Artist'}</div>
                    <div class="artist-region">${artist.region || ''}</div>
                </div>
            </div>
            ${artist.bio ? `<div class="artist-bio">${escapeHtml(artist.bio)}</div>` : ''}
            ${audioPlayer}
            <div class="artist-footer" style="flex-wrap:wrap;gap:12px;">
                ${renderSnsIcons(artist.sns || artist.snsLinks, 28)}
                <button class="artist-dm-btn" onclick="event.stopPropagation(); openDM('${artist.id}', '${(artist.name || 'User').replace(/'/g, "\\'")}')">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    DM
                </button>
            </div>
            <div style="margin-top:12px;">
                ${renderInteractionButtons('user', artist.id, artist.likesCount || 0, artist.commentsCount || 0, isLiked)}
            </div>
        </div>
    `;
    
    return html;
}

/**
 * TWEET カード
 */
function renderTweetCard(tweet, isLiked = false) {
    const initial = (tweet.userName || '?')[0].toUpperCase();
    const avatarHtml = tweet.userPhoto 
        ? `<img src="${tweet.userPhoto}" onerror="this.style.display='none';this.parentElement.innerHTML='${initial}'">`
        : initial;
    
    return `
        <div class="tweet-card" data-type="tweet" data-id="${tweet.id}">
            <div class="tweet-card-header">
                <div class="tweet-card-avatar" onclick="window.location.href='profile.html?uid=${tweet.userId}'">${avatarHtml}</div>
                <div class="tweet-card-info">
                    <div class="tweet-card-name" onclick="window.location.href='profile.html?uid=${tweet.userId}'">${tweet.userName || 'User'}</div>
                    <div class="tweet-card-badge"><span class="badge tweet">POST</span></div>
                </div>
            </div>
            <div class="tweet-card-text">${linkifyText(tweet.text)}</div>
            ${renderInteractionButtons('tweet', tweet.id, tweet.likesCount || 0, tweet.commentsCount || 0, isLiked)}
        </div>
    `;
}
