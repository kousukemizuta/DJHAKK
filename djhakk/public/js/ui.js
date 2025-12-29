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
