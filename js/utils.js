// JavaScript Utility Functions

// Show Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.style.display = 'flex';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

// Format Byte Size
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate Lightweight Thumbnail for DOM Preview
function generateThumbnail(dataUrl, maxDim = 240) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const thumbData = canvas.toDataURL('image/jpeg', 0.65);
            canvas.width = 0;
            canvas.height = 0;
            resolve(thumbData);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// Process Image with 4K Safety Dimension Cap and Rotation
function processImage(dataUrl, rotationAngle, quality, maxDim = 4096) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let naturalW = img.naturalWidth;
            let naturalH = img.naturalHeight;

            if (rotationAngle === 90 || rotationAngle === 270) {
                const temp = naturalW;
                naturalW = naturalH;
                naturalH = temp;
            }

            let renderW = naturalW;
            let renderH = naturalH;
            if (renderW > maxDim || renderH > maxDim) {
                if (renderW > renderH) {
                    renderH = Math.round((renderH * maxDim) / renderW);
                    renderW = maxDim;
                } else {
                    renderW = Math.round((renderW * maxDim) / renderH);
                    renderH = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = renderW;
            canvas.height = renderH;
            const ctx = canvas.getContext('2d');

            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotationAngle * Math.PI) / 180);

            const drawW = (rotationAngle === 90 || rotationAngle === 270) ? renderH : renderW;
            const drawH = (rotationAngle === 90 || rotationAngle === 270) ? renderW : renderH;

            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

            const resDataUrl = canvas.toDataURL('image/jpeg', quality);
            canvas.width = 0;
            canvas.height = 0;

            resolve({
                dataUrl: resDataUrl,
                width: renderW,
                height: renderH
            });
        };
        img.src = dataUrl;
    });
}

// Format & Sanitize TikWM / TikTok Media URLs
function formatTikwmUrl(url) {
    if (!url) return null;
    let str = String(url).trim();

    str = str.replace(/^https?:\/\//i, 'https://');
    str = str.replace(/^https?\/\//i, 'https://');
    str = str.replace(/^https?:\//i, 'https://');

    if (str.startsWith('https://') || str.startsWith('http://')) {
        return str;
    }
    if (str.startsWith('//')) {
        return 'https:' + str;
    }
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/.test(str)) {
        return 'https://' + str;
    }
    if (str.startsWith('/')) {
        return 'https://www.tikwm.com' + str;
    }
    return 'https://www.tikwm.com/' + str;
}

// Download File from Target URL via Blob or Direct Link Fallback
async function downloadFileFromUrl(url, filename) {
    const targetUrl = formatTikwmUrl(url);
    if (!targetUrl) {
        showToast('Link download tidak tersedia.');
        return;
    }

    showToast('Memulai pengunduhan video...');

    try {
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error('Fetch failed');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        return;
    } catch (err) {
        console.log('Blob fetch bypassed, opening direct link', err);
    }

    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
