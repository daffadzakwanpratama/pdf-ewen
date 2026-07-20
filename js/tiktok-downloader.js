// Module: TikTok Video Downloader

let currentTiktokData = null;

function initTiktokDownloaderModule() {
    const tiktokUrlInput = document.getElementById('tiktok-url-input');
    const btnFetchTiktok = document.getElementById('btn-fetch-tiktok');
    const tiktokResultCard = document.getElementById('tiktok-result-card');
    const tiktokAuthorAvatar = document.getElementById('tiktok-author-avatar');
    const tiktokAuthorName = document.getElementById('tiktok-author-name');
    const tiktokVideoTitle = document.getElementById('tiktok-video-title');
    const tiktokCoverPreview = document.getElementById('tiktok-cover-preview');
    const btnDownloadTiktokHd = document.getElementById('btn-download-tiktok-hd');
    const btnDownloadTiktokSd = document.getElementById('btn-download-tiktok-sd');
    const btnDownloadTiktokAudio = document.getElementById('btn-download-tiktok-audio');

    if (!btnFetchTiktok) return;

    btnFetchTiktok.addEventListener('click', async () => {
        const rawUrl = tiktokUrlInput.value.trim();
        if (!rawUrl) {
            showToast('Silakan masukkan link video TikTok terlebih dahulu.');
            return;
        }

        if (!rawUrl.includes('tiktok.com')) {
            showToast('Link tidak valid. Masukkan link video TikTok yang benar.');
            return;
        }

        const originalBtnText = btnFetchTiktok.innerHTML;
        btnFetchTiktok.disabled = true;
        btnFetchTiktok.innerHTML = `<div class="loading-spinner"></div> Memproses Video...`;
        tiktokResultCard.style.display = 'none';

        try {
            let data = null;

            // Attempt 1: TikWM API
            try {
                const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(rawUrl)}`;
                const response = await fetch(apiUrl);
                const result = await response.json();
                if (result.code === 0 && result.data) {
                    data = result.data;
                }
            } catch (e) {
                console.warn('Primary TikWM API failed, trying fallback', e);
            }

            // Attempt 2: Tiklydown API (Fallback Engine)
            if (!data) {
                try {
                    const fallbackUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(rawUrl)}`;
                    const response = await fetch(fallbackUrl);
                    const result = await response.json();
                    if (result && (result.video || result.url)) {
                        data = {
                            title: result.title || 'Video TikTok',
                            cover: result.cover || result.dynamic_cover,
                            play: result.video ? (result.video.noWatermark || result.video.watermark) : result.url,
                            hdplay: result.video ? result.video.noWatermark : result.url,
                            music: result.music ? result.music.play_url : null,
                            author: {
                                nickname: result.author ? result.author.name : 'TikTok Creator',
                                unique_id: result.author ? result.author.unique_id : '',
                                avatar: result.author ? result.author.avatar : ''
                            }
                        };
                    }
                } catch (e2) {
                    console.warn('Fallback Tiklydown API failed', e2);
                }
            }

            if (data) {
                currentTiktokData = data;

                tiktokAuthorAvatar.src = formatTikwmUrl(data.author?.avatar || data.author?.avatar_thumb) || '';
                tiktokAuthorName.textContent = data.author?.nickname ? `${data.author.nickname} (@${data.author.unique_id || ''})` : 'TikTok Creator';
                tiktokVideoTitle.textContent = data.title || 'Video TikTok';
                tiktokCoverPreview.src = formatTikwmUrl(data.cover || data.origin_cover) || '';

                tiktokResultCard.style.display = 'flex';
                showToast('Video berhasil ditemukan!');
            } else {
                showToast('Gagal mengambil video TikTok. Pastikan link publik & valid.');
            }
        } catch (error) {
            console.error(error);
            showToast('Terjadi kesalahan jaringan saat mengambil video TikTok.');
        } finally {
            btnFetchTiktok.disabled = false;
            btnFetchTiktok.innerHTML = originalBtnText;
            lucide.createIcons();
        }
    });

    if (btnDownloadTiktokHd) {
        btnDownloadTiktokHd.addEventListener('click', () => {
            if (!currentTiktokData) return;
            const raw = currentTiktokData.hdplay || currentTiktokData.play;
            const hdUrl = formatTikwmUrl(raw);
            const filename = `${(currentTiktokData.title || 'tiktok-video').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}-hd.mp4`;
            downloadFileFromUrl(hdUrl, filename);
        });
    }

    if (btnDownloadTiktokSd) {
        btnDownloadTiktokSd.addEventListener('click', () => {
            if (!currentTiktokData) return;
            const sdUrl = formatTikwmUrl(currentTiktokData.play);
            const filename = `${(currentTiktokData.title || 'tiktok-video').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}.mp4`;
            downloadFileFromUrl(sdUrl, filename);
        });
    }

    if (btnDownloadTiktokAudio) {
        btnDownloadTiktokAudio.addEventListener('click', () => {
            if (!currentTiktokData) return;
            const musicUrl = formatTikwmUrl(currentTiktokData.music);
            const filename = `${(currentTiktokData.title || 'tiktok-audio').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}.mp3`;
            downloadFileFromUrl(musicUrl, filename);
        });
    }
}

function clearTiktokState() {
    const tiktokUrlInput = document.getElementById('tiktok-url-input');
    const tiktokResultCard = document.getElementById('tiktok-result-card');
    if (tiktokUrlInput) tiktokUrlInput.value = '';
    if (tiktokResultCard) tiktokResultCard.style.display = 'none';
    currentTiktokData = null;
}
