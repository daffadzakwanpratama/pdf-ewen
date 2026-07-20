// Module: Document Perspective Transform & Crop Scanner Modal

let activeEditorImageId = null;
let editorImgElement = null;
let editorFilter = 'original';
let editorCorners = {
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    br: { x: 0, y: 0 },
    bl: { x: 0, y: 0 }
};
let activeHandle = null;
let editorStep = 1;
let warpedImgDataFull = null;
let warpedImgDataDisplay = null;

function initCropModalModule() {
    const cropModal = document.getElementById('crop-modal');
    if (!cropModal) return;

    const btnCropModalClose = document.getElementById('btn-crop-modal-close');
    const btnEditorCancel = document.getElementById('btn-editor-cancel');
    const btnEditorSave = document.getElementById('btn-editor-save');
    const btnEditorRotate = document.getElementById('btn-editor-rotate');
    const btnEditorReset = document.getElementById('btn-editor-reset');
    const filterButtons = document.querySelectorAll('.btn-filter');

    const cropCanvas = document.getElementById('crop-source-canvas');
    const cropCtx = cropCanvas.getContext('2d');
    const cropCanvasContainer = document.getElementById('crop-canvas-container');
    const magnifierLens = document.getElementById('magnifier-lens');
    const magnifierCanvas = document.getElementById('magnifier-canvas');

    const handleElElements = {
        tl: document.getElementById('handle-tl'),
        tr: document.getElementById('handle-tr'),
        br: document.getElementById('handle-br'),
        bl: document.getElementById('handle-bl')
    };

    function solveLinearSystem(A, B) {
        const n = B.length;
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
                    maxRow = k;
                }
            }
            const tempRow = A[i];
            A[i] = A[maxRow];
            A[maxRow] = tempRow;

            const tempVal = B[i];
            B[i] = B[maxRow];
            B[maxRow] = tempVal;

            const pivot = A[i][i];
            if (Math.abs(pivot) < 1e-10) return null;

            for (let k = i + 1; k < n; k++) {
                const factor = A[k][i] / pivot;
                for (let j = i; j < n; j++) {
                    A[k][j] -= factor * A[i][j];
                }
                B[k] -= factor * B[i];
            }
        }

        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += A[i][j] * x[j];
            }
            x[i] = (B[i] - sum) / A[i][i];
        }
        return x;
    }

    function getPerspectiveCoefficients(srcPoints, dstPoints) {
        const A = [];
        const B = [];
        for (let i = 0; i < 4; i++) {
            const u = dstPoints[i].x;
            const v = dstPoints[i].y;
            const x = srcPoints[i].x;
            const y = srcPoints[i].y;
            A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
            B.push(x);
            A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
            B.push(y);
        }
        return solveLinearSystem(A, B);
    }

    function warpPerspectiveBilinear(srcImageData, dstWidth, dstHeight, h) {
        const srcWidth = srcImageData.width;
        const srcHeight = srcImageData.height;
        const srcData = srcImageData.data;

        const dstImageData = new ImageData(dstWidth, dstHeight);
        const dstData = dstImageData.data;

        for (let v = 0; v < dstHeight; v++) {
            for (let u = 0; u < dstWidth; u++) {
                const denom = h[6] * u + h[7] * v + 1;
                const x = (h[0] * u + h[1] * v + h[2]) / denom;
                const y = (h[3] * u + h[4] * v + h[5]) / denom;

                const x0 = Math.floor(x);
                const x1 = x0 + 1;
                const y0 = Math.floor(y);
                const y1 = y0 + 1;

                const dstIdx = (v * dstWidth + u) * 4;

                if (x0 >= 0 && x1 < srcWidth && y0 >= 0 && y1 < srcHeight) {
                    const wx1 = x - x0;
                    const wx0 = 1 - wx1;
                    const wy1 = y - y0;
                    const wy0 = 1 - wy1;

                    const idx00 = (y0 * srcWidth + x0) * 4;
                    const idx01 = (y0 * srcWidth + x1) * 4;
                    const idx10 = (y1 * srcWidth + x0) * 4;
                    const idx11 = (y1 * srcWidth + x1) * 4;

                    for (let c = 0; c < 4; c++) {
                        dstData[dstIdx + c] =
                            wy0 * (wx0 * srcData[idx00 + c] + wx1 * srcData[idx01 + c]) +
                            wy1 * (wx0 * srcData[idx10 + c] + wx1 * srcData[idx11 + c]);
                    }
                } else {
                    dstData[dstIdx] = 255;
                    dstData[dstIdx + 1] = 255;
                    dstData[dstIdx + 2] = 255;
                    dstData[dstIdx + 3] = 255;
                }
            }
        }
        return dstImageData;
    }

    function applyFilterToImageData(imageData, filterType) {
        const data = imageData.data;
        const len = data.length;

        if (filterType === 'original') return;

        if (filterType === 'grayscale') {
            for (let i = 0; i < len; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                data[i] = data[i + 1] = data[i + 2] = gray;
            }
        } else if (filterType === 'magic') {
            const contrast = 35;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            const brightness = 15;

            for (let i = 0; i < len; i += 4) {
                for (let c = 0; c < 3; c++) {
                    let val = data[i + c];
                    val = factor * (val - 128) + 128 + brightness;
                    data[i + c] = Math.max(0, Math.min(255, val));
                }
            }
        } else if (filterType === 'bw') {
            const contrast = 100;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

            for (let i = 0; i < len; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                let val = factor * (gray - 125) + 128;
                val = val > 128 ? 255 : (val < 70 ? 0 : val);
                data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, val));
            }
        }
    }

    function rotateImageDataUrl(dataUrl, rotationAngle) {
        return new Promise((resolve) => {
            if (rotationAngle === 0) {
                resolve(dataUrl);
                return;
            }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (rotationAngle === 90 || rotationAngle === 270) {
                    canvas.width = img.naturalHeight;
                    canvas.height = img.naturalWidth;
                } else {
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                }
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotationAngle * Math.PI) / 180);
                ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.src = dataUrl;
        });
    }

    function getEditorDimensions(imgW, imgH) {
        const parent = cropCanvasContainer.parentElement;
        const workWidth = parent ? parent.clientWidth : 300;
        const workHeight = parent ? parent.clientHeight : 300;

        const padding = 16;
        const maxW = Math.max(100, workWidth - padding * 2);
        const maxH = Math.max(100, workHeight - padding * 2);

        let w = maxW;
        let h = maxW * (imgH / imgW);
        if (h > maxH) {
            h = maxH;
            w = maxH * (imgW / imgH);
        }
        return { width: w, height: h };
    }

    function updateHandlePositions() {
        for (const [corner, p] of Object.entries(editorCorners)) {
            const el = handleElElements[corner];
            if (el) {
                el.style.left = `${p.x}px`;
                el.style.top = `${p.y}px`;
            }
        }
        drawEditorOverlay();
    }

    function drawEditorOverlay() {
        if (!editorImgElement) return;
        cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.drawImage(editorImgElement, 0, 0, cropCanvas.width, cropCanvas.height);

        cropCtx.fillStyle = 'rgba(99, 102, 241, 0.2)';
        cropCtx.strokeStyle = '#6366f1';
        cropCtx.lineWidth = 3;

        cropCtx.beginPath();
        cropCtx.moveTo(editorCorners.tl.x, editorCorners.tl.y);
        cropCtx.lineTo(editorCorners.tr.x, editorCorners.tr.y);
        cropCtx.lineTo(editorCorners.br.x, editorCorners.br.y);
        cropCtx.lineTo(editorCorners.bl.x, editorCorners.bl.y);
        cropCtx.closePath();
        cropCtx.fill();
        cropCtx.stroke();
    }

    function updateMagnifier(e) {
        if (!activeHandle || !editorImgElement) return;

        const handleX = editorCorners[activeHandle].x;
        const handleY = editorCorners[activeHandle].y;

        magnifierLens.style.display = 'block';
        magnifierLens.style.left = `${handleX}px`;
        magnifierLens.style.top = `${handleY - 80}px`;

        const magCtx = magnifierCanvas.getContext('2d');
        magCtx.imageSmoothingEnabled = false;
        magCtx.clearRect(0, 0, 120, 120);

        const scaleX = editorImgElement.naturalWidth / cropCanvas.width;
        const scaleY = editorImgElement.naturalHeight / cropCanvas.height;
        const imgX = handleX * scaleX;
        const imgY = handleY * scaleY;

        const zoom = 4;
        const sW = 120 / zoom;
        const sH = 120 / zoom;
        const sX = imgX - sW / 2;
        const sY = imgY - sH / 2;

        magCtx.drawImage(editorImgElement, sX, sY, sW, sH, 0, 0, 120, 120);

        magCtx.strokeStyle = '#ef4444';
        magCtx.lineWidth = 1.5;
        magCtx.beginPath();
        magCtx.moveTo(0, 60);
        magCtx.lineTo(120, 60);
        magCtx.moveTo(60, 0);
        magCtx.lineTo(60, 120);
        magCtx.stroke();
    }

    function dragHandle(e) {
        if (!activeHandle) return;

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = cropCanvasContainer.getBoundingClientRect();
        let x = clientX - rect.left;
        let y = clientY - rect.top;

        x = Math.max(0, Math.min(cropCanvas.width, x));
        y = Math.max(0, Math.min(cropCanvas.height, y));

        editorCorners[activeHandle].x = x;
        editorCorners[activeHandle].y = y;

        handleElElements[activeHandle].style.left = `${x}px`;
        handleElElements[activeHandle].style.top = `${y}px`;

        drawEditorOverlay();
        updateMagnifier(e);
    }

    Object.keys(handleElElements).forEach(corner => {
        const handle = handleElElements[corner];
        if (!handle) return;

        const startDrag = (e) => {
            e.preventDefault();
            activeHandle = corner;
            handle.classList.add('active');
            updateMagnifier(e);
        };

        handle.addEventListener('mousedown', startDrag);
        handle.addEventListener('touchstart', startDrag, { passive: false });
    });

    window.addEventListener('mousemove', (e) => {
        if (activeHandle) dragHandle(e);
    });

    window.addEventListener('touchmove', (e) => {
        if (activeHandle) {
            e.preventDefault();
            dragHandle(e);
        }
    }, { passive: false });

    const stopDrag = () => {
        if (activeHandle) {
            handleElElements[activeHandle].classList.remove('active');
            activeHandle = null;
            magnifierLens.style.display = 'none';
        }
    };

    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);

    const closeCropModal = () => {
        cropModal.style.display = 'none';
        activeEditorImageId = null;
        editorImgElement = null;
        editorStep = 1;
        warpedImgDataFull = null;
        warpedImgDataDisplay = null;
    };

    btnCropModalClose.addEventListener('click', closeCropModal);
    btnEditorCancel.addEventListener('click', () => {
        if (editorStep === 2) {
            setEditorStep(1);
        } else {
            closeCropModal();
        }
    });

    btnEditorReset.addEventListener('click', () => {
        if (!editorImgElement) return;
        const canvasW = cropCanvas.width;
        const canvasH = cropCanvas.height;
        const padW = canvasW * 0.05;
        const padH = canvasH * 0.05;

        editorCorners = {
            tl: { x: padW, y: padH },
            tr: { x: canvasW - padW, y: padH },
            br: { x: canvasW - padW, y: canvasH - padH },
            bl: { x: padW, y: canvasH - padH }
        };
        updateHandlePositions();
    });

    btnEditorRotate.addEventListener('click', async () => {
        if (!editorImgElement || !activeEditorImageId) return;

        btnEditorRotate.disabled = true;
        const originalHtml = btnEditorRotate.innerHTML;
        btnEditorRotate.innerHTML = `<div class="loading-spinner" style="width:1rem;height:1rem;margin:0;"></div>`;

        try {
            const rotatedUrl = await rotateImageDataUrl(editorImgElement.src, 90);

            const imgData = images.find(img => img.id === activeEditorImageId);
            if (imgData) {
                imgData.originalDataUrl = rotatedUrl;
                imgData.cropPoints = null;
            }

            editorImgElement = new Image();
            editorImgElement.onload = () => {
                const imgW = editorImgElement.naturalWidth;
                const imgH = editorImgElement.naturalHeight;

                const dimensions = getEditorDimensions(imgW, imgH);
                const newW = dimensions.width;
                const newH = dimensions.height;

                cropCanvas.width = newW;
                cropCanvas.height = newH;
                cropCanvasContainer.style.width = `${newW}px`;
                cropCanvasContainer.style.height = `${newH}px`;

                const padW = newW * 0.05;
                const padH = newH * 0.05;
                editorCorners = {
                    tl: { x: padW, y: padH },
                    tr: { x: newW - padW, y: padH },
                    br: { x: newW - padW, y: newH - padH },
                    bl: { x: padW, y: newH - padH }
                };

                updateHandlePositions();
                btnEditorRotate.disabled = false;
                btnEditorRotate.innerHTML = originalHtml;
                lucide.createIcons();
            };
            editorImgElement.src = rotatedUrl;
        } catch (err) {
            console.error(err);
            btnEditorRotate.disabled = false;
            btnEditorRotate.innerHTML = originalHtml;
            showToast("Gagal memutar gambar.");
        }
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editorFilter = btn.getAttribute('data-filter');
            if (editorStep === 2) {
                renderStep2Filter();
            }
        });
    });

    function setEditorStep(step) {
        editorStep = step;
        const container = cropModal.querySelector('.modal-container');
        const titleEl = document.getElementById('crop-modal-title');

        if (step === 1) {
            container.classList.add('step-1');
            container.classList.remove('step-2');
            titleEl.textContent = "Sesuaikan Sudut & Potong Dokumen";

            btnEditorCancel.innerHTML = 'Batal';
            btnEditorSave.innerHTML = `Lanjut <i data-lucide="arrow-right" style="width: 1.25rem; height: 1.25rem; vertical-align: middle;"></i>`;
            lucide.createIcons();

            if (editorImgElement) {
                const imgW = editorImgElement.naturalWidth;
                const imgH = editorImgElement.naturalHeight;
                const dimensions = getEditorDimensions(imgW, imgH);

                cropCanvas.width = dimensions.width;
                cropCanvas.height = dimensions.height;
                cropCanvasContainer.style.width = `${dimensions.width}px`;
                cropCanvasContainer.style.height = `${dimensions.height}px`;

                updateHandlePositions();
            }
        } else if (step === 2) {
            container.classList.remove('step-1');
            container.classList.add('step-2');
            titleEl.textContent = "Pilih Filter Warna Dokumen";

            btnEditorCancel.innerHTML = `<i data-lucide="arrow-left" style="width: 1.1rem; height: 1.1rem; margin-right: 0.25rem; vertical-align: middle;"></i> Kembali`;
            btnEditorSave.innerHTML = `<i data-lucide="check" style="width: 1.25rem; height: 1.25rem; vertical-align: middle; margin-right: 0.25rem;"></i> Simpan Perubahan`;
            lucide.createIcons();

            calculateWarpedImages();
        }
    }

    function calculateWarpedImages() {
        if (!editorImgElement) return;

        const canvasW = cropCanvas.width;
        const canvasH = cropCanvas.height;
        const natW = editorImgElement.naturalWidth;
        const natH = editorImgElement.naturalHeight;

        const scaleX = natW / canvasW;
        const scaleY = natH / canvasH;

        const tl_orig = { x: editorCorners.tl.x * scaleX, y: editorCorners.tl.y * scaleY };
        const tr_orig = { x: editorCorners.tr.x * scaleX, y: editorCorners.tr.y * scaleY };
        const br_orig = { x: editorCorners.br.x * scaleX, y: editorCorners.br.y * scaleY };
        const bl_orig = { x: editorCorners.bl.x * scaleX, y: editorCorners.bl.y * scaleY };

        const imgData = images.find(img => img.id === activeEditorImageId);
        if (imgData) {
            imgData.cropPoints = {
                tl: { x: editorCorners.tl.x / canvasW, y: editorCorners.tl.y / canvasH },
                tr: { x: editorCorners.tr.x / canvasW, y: editorCorners.tr.y / canvasH },
                br: { x: editorCorners.br.x / canvasW, y: editorCorners.br.y / canvasH },
                bl: { x: editorCorners.bl.x / canvasW, y: editorCorners.bl.y / canvasH }
            };
        }

        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        const destW = Math.round(Math.max(dist(tl_orig, tr_orig), dist(bl_orig, br_orig)));
        const destH = Math.round(Math.max(dist(tl_orig, bl_orig), dist(tr_orig, br_orig)));

        const limit = 3000;
        let finalW = destW;
        let finalH = destH;
        if (finalW > limit || finalH > limit) {
            const aspect = finalW / finalH;
            if (finalW > finalH) {
                finalW = limit;
                finalH = Math.round(limit / aspect);
            } else {
                finalH = limit;
                finalW = Math.round(limit * aspect);
            }
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = natW;
        tempCanvas.height = natH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(editorImgElement, 0, 0);
        const srcImgData = tempCtx.getImageData(0, 0, natW, natH);

        const destPoints = [
            { x: 0, y: 0 },
            { x: finalW, y: 0 },
            { x: finalW, y: finalH },
            { x: 0, y: finalH }
        ];
        const srcPoints = [tl_orig, tr_orig, br_orig, bl_orig];

        const h = getPerspectiveCoefficients(srcPoints, destPoints);
        if (!h) {
            showToast("Persamaan matriks singular. Pastikan 4 titik tidak sejajar.");
            setEditorStep(1);
            return;
        }

        warpedImgDataFull = warpPerspectiveBilinear(srcImgData, finalW, finalH, h);

        const dimensions = getEditorDimensions(finalW, finalH);
        const displayW = dimensions.width;
        const displayH = dimensions.height;

        cropCanvas.width = displayW;
        cropCanvas.height = displayH;
        cropCanvasContainer.style.width = `${displayW}px`;
        cropCanvasContainer.style.height = `${displayH}px`;

        const highResCanvas = document.createElement('canvas');
        highResCanvas.width = finalW;
        highResCanvas.height = finalH;
        highResCanvas.getContext('2d').putImageData(warpedImgDataFull, 0, 0);

        const displayCanvas = document.createElement('canvas');
        displayCanvas.width = displayW;
        displayCanvas.height = displayH;
        const displayCtx = displayCanvas.getContext('2d');
        displayCtx.drawImage(highResCanvas, 0, 0, displayW, displayH);

        warpedImgDataDisplay = displayCtx.getImageData(0, 0, displayW, displayH);

        renderStep2Filter();
    }

    function renderStep2Filter() {
        if (!warpedImgDataDisplay) return;

        const displayCopy = new ImageData(
            new Uint8ClampedArray(warpedImgDataDisplay.data),
            warpedImgDataDisplay.width,
            warpedImgDataDisplay.height
        );

        applyFilterToImageData(displayCopy, editorFilter);
        cropCtx.putImageData(displayCopy, 0, 0);
    }

    btnEditorSave.addEventListener('click', () => {
        if (editorStep === 1) {
            btnEditorSave.disabled = true;
            btnEditorSave.innerHTML = `<div class="loading-spinner" style="width: 1.25rem; height: 1.25rem; margin: 0 0.5rem 0 0;"></div> Memotong...`;

            setTimeout(() => {
                setEditorStep(2);
                btnEditorSave.disabled = false;
            }, 50);
        } else if (editorStep === 2) {
            if (!warpedImgDataFull || !activeEditorImageId) return;

            const imgData = images.find(img => img.id === activeEditorImageId);
            if (!imgData) return;

            const originalBtnContent = btnEditorSave.innerHTML;
            btnEditorSave.disabled = true;
            btnEditorSave.innerHTML = `<div class="loading-spinner" style="width: 1.25rem; height: 1.25rem; margin: 0 0.5rem 0 0;"></div> Menyimpan...`;

            setTimeout(() => {
                try {
                    const finalW = warpedImgDataFull.width;
                    const finalH = warpedImgDataFull.height;

                    const finalWarpedCopy = new ImageData(
                        new Uint8ClampedArray(warpedImgDataFull.data),
                        finalW,
                        finalH
                    );

                    applyFilterToImageData(finalWarpedCopy, editorFilter);

                    const outCanvas = document.createElement('canvas');
                    outCanvas.width = finalW;
                    outCanvas.height = finalH;
                    const outCtx = outCanvas.getContext('2d');
                    outCtx.putImageData(finalWarpedCopy, 0, 0);

                    const croppedUrl = outCanvas.toDataURL('image/jpeg', 0.95);
                    imgData.dataUrl = croppedUrl;
                    imgData.size = Math.round(croppedUrl.length * 0.75);
                    imgData.activeFilter = editorFilter;

                    if (window.renderImages) window.renderImages();
                    closeCropModal();
                    showToast("Dokumen berhasil diselaraskan & disimpan!");
                } catch (err) {
                    console.error(err);
                    showToast("Gagal menyimpan dokumen.");
                } finally {
                    btnEditorSave.disabled = false;
                    btnEditorSave.innerHTML = originalBtnContent;
                }
            }, 50);
        }
    });

    window.openCropEditor = function(imageId) {
        const imgData = images.find(img => img.id === imageId);
        if (!imgData) return;

        if (imgData.rotation !== 0) {
            rotateImageDataUrl(imgData.originalDataUrl, imgData.rotation).then(rotatedUrl => {
                imgData.originalDataUrl = rotatedUrl;
                imgData.dataUrl = rotatedUrl;
                imgData.rotation = 0;
                if (window.renderImages) window.renderImages();
                window.openCropEditor(imageId);
            });
            return;
        }

        activeEditorImageId = imageId;
        editorFilter = imgData.activeFilter || 'original';

        btnEditorSave.disabled = true;

        filterButtons.forEach(btn => {
            if (btn.getAttribute('data-filter') === editorFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        editorImgElement = new Image();
        editorImgElement.onload = () => {
            const imgW = editorImgElement.naturalWidth;
            const imgH = editorImgElement.naturalHeight;

            cropModal.style.display = 'flex';

            const dimensions = getEditorDimensions(imgW, imgH);
            const canvasW = dimensions.width;
            const canvasH = dimensions.height;

            cropCanvas.width = canvasW;
            cropCanvas.height = canvasH;
            cropCanvasContainer.style.width = `${canvasW}px`;
            cropCanvasContainer.style.height = `${canvasH}px`;

            if (imgData.cropPoints) {
                editorCorners = {
                    tl: { x: imgData.cropPoints.tl.x * canvasW, y: imgData.cropPoints.tl.y * canvasH },
                    tr: { x: imgData.cropPoints.tr.x * canvasW, y: imgData.cropPoints.tr.y * canvasH },
                    br: { x: imgData.cropPoints.br.x * canvasW, y: imgData.cropPoints.br.y * canvasH },
                    bl: { x: imgData.cropPoints.bl.x * canvasW, y: imgData.cropPoints.bl.y * canvasH }
                };
            } else {
                const padW = canvasW * 0.05;
                const padH = canvasH * 0.05;
                editorCorners = {
                    tl: { x: padW, y: padH },
                    tr: { x: canvasW - padW, y: padH },
                    br: { x: canvasW - padW, y: canvasH - padH },
                    bl: { x: padW, y: canvasH - padH }
                };
            }

            setEditorStep(1);
            btnEditorSave.disabled = false;
        };

        editorImgElement.src = imgData.originalDataUrl;
    };
}
