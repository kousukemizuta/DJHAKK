// ========================================
// DJHAKK Audio Player
// ========================================

// 現在再生中のオーディオを管理
let currentPlayingAudio = null;

// ========================================
// Audio Player Manager
// ========================================
const AudioPlayerManager = {
    // 再生を開始（他のプレイヤーは停止）
    play(audioElement) {
        if (currentPlayingAudio && currentPlayingAudio !== audioElement) {
            currentPlayingAudio.pause();
            this.updatePlayerUI(currentPlayingAudio, false);
        }
        currentPlayingAudio = audioElement;
        audioElement.play();
        this.updatePlayerUI(audioElement, true);
    },
    
    // 再生を停止
    pause(audioElement) {
        audioElement.pause();
        this.updatePlayerUI(audioElement, false);
    },
    
    // 再生/一時停止をトグル
    toggle(audioElement) {
        if (audioElement.paused) {
            this.play(audioElement);
        } else {
            this.pause(audioElement);
        }
    },
    
    // プレイヤーUIを更新
    updatePlayerUI(audioElement, isPlaying) {
        const playerId = audioElement.dataset.playerId;
        if (!playerId) return;
        
        const playerContainer = document.querySelector(`[data-player-container="${playerId}"]`);
        if (!playerContainer) return;
        
        const playBtn = playerContainer.querySelector('.waveform-play-btn');
        if (playBtn) {
            playBtn.innerHTML = isPlaying ? 
                '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' :
                '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        }
    },
    
    // 全てのプレイヤーを停止
    stopAll() {
        if (currentPlayingAudio) {
            currentPlayingAudio.pause();
            this.updatePlayerUI(currentPlayingAudio, false);
            currentPlayingAudio = null;
        }
    }
};

// ========================================
// Waveform Generation
// ========================================
function generateWaveformBars(count = 40) {
    const bars = [];
    for (let i = 0; i < count; i++) {
        const height = 20 + Math.random() * 60;
        bars.push(height);
    }
    return bars;
}

// ========================================
// Waveform Player Rendering
// ========================================
function renderWaveformPlayer(audioUrl, title, duration, uniqueId) {
    if (!audioUrl) return '';
    
    const playerId = `player_${uniqueId}`;
    const bars = generateWaveformBars(30);
    const durationFormatted = formatAudioDuration(duration || 0);
    
    let barsHtml = '';
    bars.forEach((height, index) => {
        barsHtml += `<div class="waveform-bar" data-index="${index}" style="height:${height}%"></div>`;
    });
    
    return `
        <div class="waveform-player" data-player-container="${playerId}" onclick="event.stopPropagation()">
            <div class="waveform-title" onclick="toggleWaveformTitle(this)">${escapeHtml(title || 'Untitled')}</div>
            <div class="waveform-controls">
                <button class="waveform-play-btn" onclick="handleWaveformPlay('${playerId}')">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <div class="waveform-bars" onclick="handleWaveformSeek(event, '${playerId}')">
                    ${barsHtml}
                    <div class="waveform-progress" data-progress="${playerId}"></div>
                </div>
                <span class="waveform-time" data-time="${playerId}">${durationFormatted}</span>
            </div>
            <audio 
                data-player-id="${playerId}" 
                src="${audioUrl}" 
                preload="metadata"
                ontimeupdate="updateWaveformProgress('${playerId}')"
                onended="handleWaveformEnded('${playerId}')"
            ></audio>
        </div>
    `;
}

// タイトルの展開/折りたたみをトグル
function toggleWaveformTitle(el) {
    el.classList.toggle('expanded');
}

// 再生/一時停止ハンドラ
function handleWaveformPlay(playerId) {
    const audio = document.querySelector(`audio[data-player-id="${playerId}"]`);
    if (audio) {
        AudioPlayerManager.toggle(audio);
    }
}

// シークハンドラ
function handleWaveformSeek(event, playerId) {
    const audio = document.querySelector(`audio[data-player-id="${playerId}"]`);
    if (!audio || !audio.duration) return;
    
    const barsContainer = event.currentTarget;
    const rect = barsContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    audio.currentTime = audio.duration * percentage;
    
    if (audio.paused) {
        AudioPlayerManager.play(audio);
    }
}

// 進捗更新
function updateWaveformProgress(playerId) {
    const audio = document.querySelector(`audio[data-player-id="${playerId}"]`);
    if (!audio || !audio.duration) return;
    
    const progress = (audio.currentTime / audio.duration) * 100;
    const progressBar = document.querySelector(`[data-progress="${playerId}"]`);
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
    
    const timeEl = document.querySelector(`[data-time="${playerId}"]`);
    if (timeEl) {
        const current = formatAudioDuration(audio.currentTime);
        timeEl.textContent = current;
    }
    
    const playerContainer = document.querySelector(`[data-player-container="${playerId}"]`);
    if (playerContainer) {
        const bars = playerContainer.querySelectorAll('.waveform-bar');
        const activeBars = Math.floor((progress / 100) * bars.length);
        bars.forEach((bar, index) => {
            bar.classList.toggle('active', index < activeBars);
        });
    }
}

// 再生終了ハンドラ
function handleWaveformEnded(playerId) {
    const audio = document.querySelector(`audio[data-player-id="${playerId}"]`);
    if (audio) {
        AudioPlayerManager.updatePlayerUI(audio, false);
        
        const playerContainer = document.querySelector(`[data-player-container="${playerId}"]`);
        if (playerContainer) {
            playerContainer.querySelectorAll('.waveform-bar').forEach(bar => {
                bar.classList.remove('active');
            });
            const progressBar = playerContainer.querySelector(`[data-progress="${playerId}"]`);
            if (progressBar) progressBar.style.width = '0%';
        }
        
        playNextAudio(playerId);
    }
}

// 次の音楽プレイヤーを探して再生
function playNextAudio(currentPlayerId) {
    const allPlayers = document.querySelectorAll('audio[data-player-id]');
    const playerArray = Array.from(allPlayers);
    
    const currentIndex = playerArray.findIndex(p => p.dataset.playerId === currentPlayerId);
    if (currentIndex === -1) return;
    
    for (let i = currentIndex + 1; i < playerArray.length; i++) {
        const nextPlayer = playerArray[i];
        if (nextPlayer && nextPlayer.src && nextPlayer.src !== '') {
            const nextContainer = document.querySelector(`[data-player-container="${nextPlayer.dataset.playerId}"]`);
            if (nextContainer) {
                const card = nextContainer.closest('.artist-card, .card, .tweet-card');
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            
            setTimeout(() => {
                AudioPlayerManager.play(nextPlayer);
            }, 500);
            
            return;
        }
    }
    
    log('No more audio players to play');
}

// ========================================
// Audio Duration Formatting
// ========================================
function formatAudioDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========================================
// Audio File Upload
// ========================================
async function uploadAudioFile(file) {
    if (!user) return null;
    
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|m4a|aac)$/i)) {
        toast('MP3 or M4A files only', 'error');
        return null;
    }
    
    const duration = await getAudioDuration(file);
    if (duration > 600) {
        toast('Max 10 minutes', 'error');
        return null;
    }
    
    try {
        const ext = file.name.split('.').pop().toLowerCase();
        const filename = `${Date.now()}.${ext}`;
        const path = `audio/${user.uid}/${filename}`;
        
        const ref = storage.ref(path);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        
        return { url, duration };
    } catch (e) {
        log('Error uploading audio: ' + e.message);
        toast('Upload failed', 'error');
        return null;
    }
}

function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
        };
        audio.onerror = () => {
            resolve(0);
        };
        audio.src = URL.createObjectURL(file);
    });
}

// ========================================
// Waveform Player Styles (Dynamic)
// ========================================
function addWaveformPlayerStyles() {
    if (document.getElementById('waveform-player-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'waveform-player-styles';
    style.textContent = `
        .waveform-player {
            background: var(--surface);
            border-radius: var(--r-md);
            padding: 12px;
            margin-top: 12px;
        }
        .waveform-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
        }
        .waveform-title.expanded {
            white-space: normal;
            word-break: break-word;
        }
        .waveform-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .waveform-play-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--gradient);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .waveform-play-btn:hover {
            transform: scale(1.05);
        }
        .waveform-bars {
            flex: 1;
            height: 40px;
            display: flex;
            align-items: center;
            gap: 2px;
            cursor: pointer;
            position: relative;
            min-width: 0;
        }
        .waveform-bar {
            flex: 1;
            background: var(--border);
            border-radius: 2px;
            min-width: 2px;
            transition: background 0.1s;
        }
        .waveform-bar.active {
            background: var(--primary);
        }
        .waveform-progress {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 0%;
            pointer-events: none;
        }
        .waveform-time {
            font-size: 10px;
            color: var(--text3);
            white-space: nowrap;
            flex-shrink: 0;
        }
        .waveform-player audio {
            display: none;
        }
        
        /* アップロードUI用 */
        .audio-upload-container {
            background: var(--card);
            border-radius: var(--r-md);
            padding: 16px;
            margin-bottom: 16px;
        }
        .audio-upload-preview {
            margin-top: 12px;
        }
        .audio-upload-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 8px;
        }
        .audio-upload-info .audio-name {
            flex: 1;
            font-size: 13px;
            color: var(--text2);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .audio-upload-info .audio-remove {
            background: #FF4757;
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

// ページ読み込み時にスタイルを追加
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addWaveformPlayerStyles);
} else {
    addWaveformPlayerStyles();
}
