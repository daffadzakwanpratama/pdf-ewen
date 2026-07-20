// JavaScript: PicToPDF Suite - Core Controller & Modules

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SPA ROUTING & NAVIGATION ---
    const dashboardView = document.getElementById('dashboard-view');
    const imageToPdfView = document.getElementById('image-to-pdf-view');
    const pdfToImageView = document.getElementById('pdf-to-image-view');
    const compressPdfView = document.getElementById('compress-pdf-view');
    const tiktokDownloaderView = document.getElementById('tiktok-downloader-view');

    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');

    // Show Notification Toast
    function showToast(message) {
        toastMessage.textContent = message;
        toast.style.display = 'flex';
        // Auto hide after 3.5 seconds
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3500);
    }

    // Active tool card routing
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.getAttribute('data-tool');

            // Hide all views
            document.querySelectorAll('.spa-view').forEach(view => {
                view.style.display = 'none';
            });

            // Show selected view
            if (tool === 'image-to-pdf') {
                imageToPdfView.style.display = 'flex';
            } else if (tool === 'pdf-to-image') {
                pdfToImageView.style.display = 'flex';
            } else if (tool === 'compress-pdf') {
                compressPdfView.style.display = 'flex';
            } else if (tool === 'tiktok-downloader') {
                tiktokDownloaderView.style.display = 'flex';
            }
        });
    });

    // Back to dashboard buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            // Hide tool views
            document.querySelectorAll('.spa-view').forEach(view => {
                view.style.display = 'none';
            });
            // Show dashboard
            dashboardView.style.display = 'flex';

            // Clear inputs and states on return to avoid memory footprint
            clearImageToPdfState();
            clearPdfToImageState();
            clearCompressPdfState();
            clearTiktokState();
        });
    });



    // --- 2. MODULE: IMAGE TO PDF ---
    let images = [];
    let imageIdCounter = 0;

    // DOM References - Image to PDF
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const previewSection = document.getElementById('preview-section');
    const imageList = document.getElementById('image-list');
    const imageCountText = document.getElementById('image-count');
    const btnClear = document.getElementById('btn-clear');
    const btnConvert = document.getElementById('btn-convert');

    const conversionModeSelect = document.getElementById('conversion-mode');
    const pageSizeSelect = document.getElementById('page-size');
    const orientationGroup = document.getElementById('orientation-group');
    const fitGroup = document.getElementById('fit-group');
    const pageMarginSelect = document.getElementById('page-margin');
    const imageFitSelect = document.getElementById('image-fit');
    const imageQualitySelect = document.getElementById('image-quality');
    const fileNameInput = document.getElementById('file-name');
    const fileNameSuffix = document.getElementById('file-name-suffix');

    // Drag-drop Image
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = '';
    });

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

    async function handleFiles(files) {
        const fileList = Array.from(files);
        const imageFiles = fileList.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showToast('Silakan pilih file gambar (PNG, JPG, WebP) saja.');
            return;
        }

        btnConvert.disabled = true;

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            const thumbUrl = await generateThumbnail(dataUrl, 240);

            images.push({
                id: `img-${Date.now()}-${imageIdCounter++}`,
                name: file.name,
                size: file.size,
                type: file.type,
                rotation: 0,
                originalDataUrl: dataUrl,
                dataUrl: dataUrl,
                thumbUrl: thumbUrl,
                cropPoints: null,
                activeFilter: 'original'
            });

            // Yield control back to browser event loop to prevent UI lockup
            await new Promise(r => setTimeout(r, 0));
        }

        renderImages();
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function renderImages() {
        if (images.length === 0) {
            previewSection.style.display = 'none';
            btnConvert.disabled = true;
            return;
        }

        previewSection.style.display = 'flex';
        btnConvert.disabled = false;
        imageCountText.textContent = images.length;

        const scrollPos = imageList.scrollTop;
        imageList.innerHTML = '';

        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.setAttribute('data-id', img.id);
            const rotateScale = img.rotation % 180 === 0 ? 1 : 0.8;

            item.innerHTML = `
                <img src="${img.thumbUrl || img.dataUrl}" alt="${img.name}" class="item-thumbnail" style="transform: rotate(${img.rotation}deg) scale(${rotateScale})">
                <div class="item-details">
                    <div class="item-name" title="${img.name}">${img.name}</div>
                    <div class="item-meta">
                        <span>${formatBytes(img.size)}</span>
                        <span>&bull;</span>
                        <span>Halaman ${index + 1}</span>
                    </div>
                </div>
                <div class="item-controls">
                    <button class="btn-icon btn-edit" title="Perbaiki Sudut & Crop Dokumen">
                        <i data-lucide="crop"></i>
                    </button>
                    <button class="btn-icon btn-rotate" title="Putar 90°">
                        <i data-lucide="rotate-cw"></i>
                    </button>
                    <button class="btn-icon btn-move-up" title="Pindahkan Ke Atas" ${index === 0 ? 'disabled' : ''}>
                        <i data-lucide="arrow-up"></i>
                    </button>
                    <button class="btn-icon btn-move-down" title="Pindahkan Ke Bawah" ${index === images.length - 1 ? 'disabled' : ''}>
                        <i data-lucide="arrow-down"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger btn-delete" title="Hapus Gambar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;

            item.querySelector('.btn-edit').addEventListener('click', () => openCropEditor(img.id));
            item.querySelector('.btn-rotate').addEventListener('click', () => rotateImage(img.id));
            item.querySelector('.btn-move-up').addEventListener('click', () => moveImage(index, index - 1));
            item.querySelector('.btn-move-down').addEventListener('click', () => moveImage(index, index + 1));
            item.querySelector('.btn-delete').addEventListener('click', () => deleteImage(img.id));

            imageList.appendChild(item);
        });

        imageList.scrollTop = scrollPos;
        lucide.createIcons();
    }

    function rotateImage(id) {
        images = images.map(img => img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img);
        renderImages();
    }

    function moveImage(fromIndex, toIndex) {
        if (toIndex < 0 || toIndex >= images.length) return;
        const temp = images[fromIndex];
        images[fromIndex] = images[toIndex];
        images[toIndex] = temp;
        renderImages();
    }

    function deleteImage(id) {
        images = images.filter(img => img.id !== id);
        renderImages();
    }

    function clearImageToPdfState() {
        images = [];
        renderImages();
        fileNameInput.value = 'dokumen-konversi';
    }

    btnClear.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin menghapus semua gambar?')) {
            clearImageToPdfState();
        }
    });

    pageSizeSelect.addEventListener('change', () => {
        const val = pageSizeSelect.value;
        if (val === 'original') {
            orientationGroup.style.display = 'none';
            fitGroup.style.display = 'none';
        } else {
            orientationGroup.style.display = 'flex';
            fitGroup.style.display = 'flex';
        }
    });

    conversionModeSelect.addEventListener('change', () => {
        fileNameSuffix.textContent = conversionModeSelect.value === 'separate' ? '.zip' : '.pdf';
    });

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

                // Smart downscaling safety cap (max 4096px - 4K resolution)
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

                // Clear canvas memory
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

    btnConvert.addEventListener('click', async () => {
        if (images.length === 0) return;
        const originalBtnContent = btnConvert.innerHTML;
        btnConvert.disabled = true;
        btnConvert.innerHTML = `<div class="loading-spinner"></div> Memproses PDF...`;

        try {
            const { jsPDF } = window.jspdf;
            const sizeOpt = pageSizeSelect.value;
            const margin = parseInt(pageMarginSelect.value, 10);
            const fitOpt = imageFitSelect.value;
            const qualityOpt = parseFloat(imageQualitySelect.value);
            const orientationOpt = document.querySelector('input[name="orientation"]:checked').value;
            const modeOpt = conversionModeSelect.value;
            let fileName = fileNameInput.value.trim() || 'dokumen-konversi';
            const pxToMm = 0.264583;

            if (modeOpt === 'separate') {
                const zip = new JSZip();

                for (let i = 0; i < images.length; i++) {
                    btnConvert.innerHTML = `<div class="loading-spinner"></div> Memproses Gambar ${i + 1} dari ${images.length}...`;
                    const img = images[i];
                    const processed = await processImage(img.dataUrl, img.rotation, qualityOpt);

                    let pWidth, pHeight, scaleW, scaleH;
                    let x = margin, y = margin;
                    let pageOrientation = orientationOpt;
                    let pageFormat = sizeOpt;

                    if (sizeOpt === 'original') {
                        pWidth = processed.width * pxToMm + (margin * 2);
                        pHeight = processed.height * pxToMm + (margin * 2);
                        scaleW = processed.width * pxToMm;
                        scaleH = processed.height * pxToMm;
                        pageOrientation = pWidth > pHeight ? 'l' : 'p';
                        pageFormat = [pWidth, pHeight];
                    } else {
                        const isLandscape = orientationOpt === 'l';
                        pWidth = sizeOpt === 'a4' ? (isLandscape ? 297 : 210) : (isLandscape ? 279.4 : 215.9);
                        pHeight = sizeOpt === 'a4' ? (isLandscape ? 210 : 297) : (isLandscape ? 215.9 : 279.4);

                        const contentW = pWidth - (margin * 2);
                        const contentH = pHeight - (margin * 2);

                        if (fitOpt === 'contain') {
                            const imgRatio = processed.width / processed.height;
                            const contentRatio = contentW / contentH;
                            if (imgRatio > contentRatio) {
                                scaleW = contentW;
                                scaleH = contentW / imgRatio;
                            } else {
                                scaleH = contentH;
                                scaleW = contentH * imgRatio;
                            }
                            x = margin + (contentW - scaleW) / 2;
                            y = margin + (contentH - scaleH) / 2;
                        } else {
                            scaleW = contentW;
                            scaleH = contentH;
                        }
                    }

                    const singleDoc = new jsPDF({
                        orientation: pageOrientation,
                        unit: 'mm',
                        format: pageFormat
                    });
                    singleDoc.addImage(processed.dataUrl, 'JPEG', x, y, scaleW, scaleH);
                    zip.file(`${(img.name.substring(0, img.name.lastIndexOf('.')) || img.name)}.pdf`, singleDoc.output('blob'));

                    // Yield execution to Garbage Collector
                    await new Promise(r => setTimeout(r, 10));
                }

                btnConvert.innerHTML = `<div class="loading-spinner"></div> Membuat file ZIP...`;
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                if (!fileName.endsWith('.zip')) fileName += '.zip';
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = fileName;
                link.click();
                showToast("Berhasil membuat file ZIP konversi!");
            } else {
                if (!fileName.endsWith('.pdf')) fileName += '.pdf';
                btnConvert.innerHTML = `<div class="loading-spinner"></div> Menyiapkan dokumen PDF...`;
                const processedFirst = await processImage(images[0].dataUrl, images[0].rotation, qualityOpt);
                let docOptions = { unit: 'mm' };

                if (sizeOpt === 'original') {
                    const wMm = processedFirst.width * pxToMm + (margin * 2);
                    const hMm = processedFirst.height * pxToMm + (margin * 2);
                    docOptions.orientation = wMm > hMm ? 'l' : 'p';
                    docOptions.format = [wMm, hMm];
                } else {
                    docOptions.orientation = orientationOpt;
                    docOptions.format = sizeOpt;
                }

                const doc = new jsPDF(docOptions);

                for (let i = 0; i < images.length; i++) {
                    btnConvert.innerHTML = `<div class="loading-spinner"></div> Memproses Gambar ${i + 1} dari ${images.length}...`;
                    const img = images[i];
                    const processed = await processImage(img.dataUrl, img.rotation, qualityOpt);

                    let pWidth, pHeight, scaleW, scaleH;
                    let x = margin, y = margin;

                    if (sizeOpt === 'original') {
                        pWidth = processed.width * pxToMm + (margin * 2);
                        pHeight = processed.height * pxToMm + (margin * 2);
                        scaleW = processed.width * pxToMm;
                        scaleH = processed.height * pxToMm;
                    } else {
                        const isLandscape = orientationOpt === 'l';
                        pWidth = sizeOpt === 'a4' ? (isLandscape ? 297 : 210) : (isLandscape ? 279.4 : 215.9);
                        pHeight = sizeOpt === 'a4' ? (isLandscape ? 210 : 297) : (isLandscape ? 215.9 : 279.4);

                        const contentW = pWidth - (margin * 2);
                        const contentH = pHeight - (margin * 2);

                        if (fitOpt === 'contain') {
                            const imgRatio = processed.width / processed.height;
                            const contentRatio = contentW / contentH;
                            if (imgRatio > contentRatio) {
                                scaleW = contentW;
                                scaleH = contentW / imgRatio;
                            } else {
                                scaleH = contentH;
                                scaleW = contentH * imgRatio;
                            }
                            x = margin + (contentW - scaleW) / 2;
                            y = margin + (contentH - scaleH) / 2;
                        } else {
                            scaleW = contentW;
                            scaleH = contentH;
                        }
                    }

                    if (i > 0) {
                        if (sizeOpt === 'original') {
                            doc.addPage([pWidth, pHeight], pWidth > pHeight ? 'l' : 'p');
                        } else {
                            doc.addPage(sizeOpt, orientationOpt);
                        }
                    }
                    doc.addImage(processed.dataUrl, 'JPEG', x, y, scaleW, scaleH);

                    // Yield execution to Garbage Collector
                    await new Promise(r => setTimeout(r, 10));
                }

                doc.save(fileName);
                showToast("Berhasil membuat file PDF!");
            }
        } catch (error) {
            console.error(error);
            showToast("Gagal memproses konversi gambar ke PDF.");
        } finally {
            btnConvert.disabled = false;
            btnConvert.innerHTML = originalBtnContent;
        }
    });


    // --- 3. MODULE: PDF TO JPG ---
    const { pdfjsLib } = window;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let currentPdfFile = null;
    let currentPdfDoc = null;

    // DOM References - PDF to JPG
    const dropzonePdf = document.getElementById('dropzone-pdf');
    const fileInputPdf = document.getElementById('file-input-pdf');
    const previewSectionPdf = document.getElementById('preview-section-pdf');
    const pdfPageCount = document.getElementById('pdf-page-count');
    const btnClearPdf = document.getElementById('btn-clear-pdf');
    const pdfPageGrid = document.getElementById('pdf-page-grid');

    const jpgQualitySelect = document.getElementById('jpg-quality');
    const pdfRenderScaleSelect = document.getElementById('pdf-render-scale');
    const pdfOutputNameInput = document.getElementById('pdf-output-name');
    const pdfOutputSuffix = document.getElementById('pdf-output-suffix');
    const btnConvertPdf = document.getElementById('btn-convert-pdf');

    // Drag-drop PDF
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzonePdf.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzonePdf.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzonePdf.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzonePdf.classList.remove('dragover');
        }, false);
    });

    dropzonePdf.addEventListener('drop', (e) => {
        handlePdfFile(e.dataTransfer.files[0]);
    });

    dropzonePdf.addEventListener('click', () => {
        fileInputPdf.click();
    });

    fileInputPdf.addEventListener('change', () => {
        if (fileInputPdf.files.length > 0) {
            handlePdfFile(fileInputPdf.files[0]);
        }
        fileInputPdf.value = '';
    });

    function handlePdfFile(file) {
        if (!file || file.type !== 'application/pdf') {
            showToast('Silakan pilih file dokumen PDF (.pdf) saja.');
            return;
        }

        currentPdfFile = file;
        const dotIdx = file.name.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
        pdfOutputNameInput.value = `${baseName}-images`;

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                btnConvertPdf.disabled = true;
                btnConvertPdf.innerHTML = `<div class="loading-spinner"></div> Membuka PDF...`;

                const typedarray = new Uint8Array(e.target.result);
                currentPdfDoc = await pdfjsLib.getDocument(typedarray).promise;

                renderPdfThumbnails();
            } catch (err) {
                console.error(err);
                showToast("Gagal membaca dokumen PDF. File mungkin rusak.");
                clearPdfToImageState();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function renderPdfThumbnails() {
        if (!currentPdfDoc) return;

        pdfPageCount.textContent = currentPdfDoc.numPages;
        dropzonePdf.style.display = 'none';
        previewSectionPdf.style.display = 'flex';
        btnConvertPdf.disabled = false;
        btnConvertPdf.innerHTML = `<i data-lucide="file-image"></i> Ekstrak ke JPG`;
        lucide.createIcons();

        pdfOutputSuffix.textContent = currentPdfDoc.numPages === 1 ? '.jpg' : '.zip';
        pdfPageGrid.innerHTML = '';

        // Safely render up to 36 thumbnails to prevent DOM bloat on huge PDFs
        const maxThumbnails = Math.min(currentPdfDoc.numPages, 36);

        for (let i = 1; i <= maxThumbnails; i++) {
            const card = document.createElement('div');
            card.className = 'pdf-page-card';
            card.innerHTML = `
                <canvas class="pdf-page-canvas"></canvas>
                <div class="pdf-page-label">Halaman ${i}</div>
            `;
            pdfPageGrid.appendChild(card);

            try {
                const page = await currentPdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.35 });
                const canvas = card.querySelector('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;
            } catch (err) {
                console.error(`Gagal merender pratinjau halaman ${i}:`, err);
            }

            if (i % 5 === 0) {
                await new Promise(r => setTimeout(r, 10));
            }
        }

        if (currentPdfDoc.numPages > 36) {
            const moreBadge = document.createElement('div');
            moreBadge.className = 'pdf-page-card';
            moreBadge.style.justifyContent = 'center';
            moreBadge.style.color = 'var(--text-secondary)';
            moreBadge.style.fontSize = '0.85rem';
            moreBadge.style.textAlign = 'center';
            moreBadge.style.padding = '1.5rem 0.5rem';
            moreBadge.innerHTML = `+${currentPdfDoc.numPages - 36} halaman lagi<br><span style="font-size:0.75rem; opacity:0.8;">Semua akan tetap diekstrak</span>`;
            pdfPageGrid.appendChild(moreBadge);
        }
    }

    function clearPdfToImageState() {
        currentPdfFile = null;
        currentPdfDoc = null;
        pdfPageGrid.innerHTML = '';
        previewSectionPdf.style.display = 'none';
        dropzonePdf.style.display = 'block';
        btnConvertPdf.disabled = true;
        btnConvertPdf.innerHTML = `<i data-lucide="file-image"></i> Ekstrak ke JPG`;
        pdfOutputNameInput.value = 'halaman-pdf';
        lucide.createIcons();
    }

    btnClearPdf.addEventListener('click', () => {
        clearPdfToImageState();
    });

    btnConvertPdf.addEventListener('click', async () => {
        if (!currentPdfDoc) return;
        const originalBtnText = btnConvertPdf.innerHTML;
        btnConvertPdf.disabled = true;
        btnConvertPdf.innerHTML = `<div class="loading-spinner"></div> Mengekstrak...`;

        try {
            const qualityOpt = parseFloat(jpgQualitySelect.value);
            const scaleOpt = parseFloat(pdfRenderScaleSelect.value);
            let outName = pdfOutputNameInput.value.trim() || 'halaman-pdf';

            if (currentPdfDoc.numPages === 1) {
                btnConvertPdf.innerHTML = `<div class="loading-spinner"></div> Mengekstrak Halaman 1...`;
                const page = await currentPdfDoc.getPage(1);
                const viewport = page.getViewport({ scale: scaleOpt });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;

                const imgUrl = canvas.toDataURL('image/jpeg', qualityOpt);
                canvas.width = 0;
                canvas.height = 0;

                if (!outName.endsWith('.jpg')) outName += '.jpg';

                const link = document.createElement('a');
                link.href = imgUrl;
                link.download = outName;
                link.click();
                showToast("Halaman PDF berhasil diekstrak ke JPG!");
            } else {
                const zip = new JSZip();

                for (let i = 1; i <= currentPdfDoc.numPages; i++) {
                    btnConvertPdf.innerHTML = `<div class="loading-spinner"></div> Mengekstrak Halaman ${i} dari ${currentPdfDoc.numPages}...`;

                    const page = await currentPdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: scaleOpt });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');

                    await page.render({
                        canvasContext: ctx,
                        viewport: viewport
                    }).promise;

                    // Convert canvas directly to Blob to reduce memory footprint by ~50%
                    const pageBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', qualityOpt));
                    canvas.width = 0;
                    canvas.height = 0;

                    zip.file(`${outName}-halaman-${i}.jpg`, pageBlob);

                    // Yield execution every page so Garbage Collector reclaims memory
                    await new Promise(r => setTimeout(r, 10));
                }

                btnConvertPdf.innerHTML = `<div class="loading-spinner"></div> Membuat file ZIP...`;
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                if (!outName.endsWith('.zip')) outName += '.zip';

                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = outName;
                link.click();
                showToast("Semua halaman berhasil diekstrak ke ZIP!");
            }
        } catch (error) {
            console.error(error);
            showToast("Terjadi kesalahan saat mengekstrak halaman PDF.");
        } finally {
            btnConvertPdf.disabled = false;
            btnConvertPdf.innerHTML = originalBtnText;
        }
    });

    // --- 4. MODULE: COMPRESS PDF ---
    let currentCompressFile = null;
    let currentCompressDoc = null;

    // DOM References - Compress PDF
    const dropzoneCompress = document.getElementById('dropzone-compress');
    const fileInputCompress = document.getElementById('file-input-compress');
    const previewSectionCompress = document.getElementById('preview-section-compress');
    const compressPageCount = document.getElementById('compress-page-count');
    const compressFileName = document.getElementById('compress-file-name');
    const compressFileSize = document.getElementById('compress-file-size');
    const btnClearCompress = document.getElementById('btn-clear-compress');
    const compressPageGrid = document.getElementById('compress-page-grid');

    const compressLevelSelect = document.getElementById('compress-level');
    const compressDpiSelect = document.getElementById('compress-dpi');
    const compressOutputNameInput = document.getElementById('compress-output-name');
    const btnCompressPdf = document.getElementById('btn-compress-pdf');

    // Drag-drop Compress PDF
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzoneCompress.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneCompress.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzoneCompress.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneCompress.classList.remove('dragover');
        }, false);
    });

    dropzoneCompress.addEventListener('drop', (e) => {
        handleCompressPdfFile(e.dataTransfer.files[0]);
    });

    dropzoneCompress.addEventListener('click', () => {
        fileInputCompress.click();
    });

    fileInputCompress.addEventListener('change', () => {
        if (fileInputCompress.files.length > 0) {
            handleCompressPdfFile(fileInputCompress.files[0]);
        }
        fileInputCompress.value = '';
    });

    function handleCompressPdfFile(file) {
        if (!file || file.type !== 'application/pdf') {
            showToast('Silakan pilih file dokumen PDF (.pdf) saja.');
            return;
        }

        currentCompressFile = file;
        const dotIdx = file.name.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
        compressOutputNameInput.value = `${baseName}-terkompres`;
        compressFileName.textContent = file.name;
        compressFileSize.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                btnCompressPdf.disabled = true;
                btnCompressPdf.innerHTML = `<div class="loading-spinner"></div> Membaca PDF...`;

                const typedarray = new Uint8Array(e.target.result);
                currentCompressDoc = await pdfjsLib.getDocument(typedarray).promise;

                renderCompressPdfThumbnails();
            } catch (err) {
                console.error(err);
                showToast("Gagal membaca dokumen PDF. File mungkin rusak.");
                clearCompressPdfState();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function renderCompressPdfThumbnails() {
        if (!currentCompressDoc) return;

        compressPageCount.textContent = currentCompressDoc.numPages;
        dropzoneCompress.style.display = 'none';
        previewSectionCompress.style.display = 'flex';
        btnCompressPdf.disabled = false;
        btnCompressPdf.innerHTML = `<i data-lucide="file-archive"></i> Kompres PDF Sekarang`;
        lucide.createIcons();

        compressPageGrid.innerHTML = '';

        const maxThumbnails = Math.min(currentCompressDoc.numPages, 36);

        for (let i = 1; i <= maxThumbnails; i++) {
            const card = document.createElement('div');
            card.className = 'pdf-page-card';
            card.innerHTML = `
                <canvas class="pdf-page-canvas"></canvas>
                <div class="pdf-page-label">Halaman ${i}</div>
            `;
            compressPageGrid.appendChild(card);

            try {
                const page = await currentCompressDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.35 });
                const canvas = card.querySelector('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;
            } catch (err) {
                console.error(`Gagal merender pratinjau halaman ${i}:`, err);
            }

            if (i % 5 === 0) {
                await new Promise(r => setTimeout(r, 10));
            }
        }

        if (currentCompressDoc.numPages > 36) {
            const moreBadge = document.createElement('div');
            moreBadge.className = 'pdf-page-card';
            moreBadge.style.justifyContent = 'center';
            moreBadge.style.color = 'var(--text-secondary)';
            moreBadge.style.fontSize = '0.85rem';
            moreBadge.style.textAlign = 'center';
            moreBadge.style.padding = '1.5rem 0.5rem';
            moreBadge.innerHTML = `+${currentCompressDoc.numPages - 36} halaman lagi<br><span style="font-size:0.75rem; opacity:0.8;">Semua akan tetap dikompres</span>`;
            compressPageGrid.appendChild(moreBadge);
        }
    }

    function clearCompressPdfState() {
        currentCompressFile = null;
        currentCompressDoc = null;
        compressPageGrid.innerHTML = '';
        previewSectionCompress.style.display = 'none';
        dropzoneCompress.style.display = 'block';
        btnCompressPdf.disabled = true;
        btnCompressPdf.innerHTML = `<i data-lucide="file-archive"></i> Kompres PDF Sekarang`;
        compressOutputNameInput.value = 'dokumen-terkompres';
        lucide.createIcons();
    }

    btnClearCompress.addEventListener('click', () => {
        clearCompressPdfState();
    });

    btnCompressPdf.addEventListener('click', async () => {
        if (!currentCompressDoc || !currentCompressFile) return;
        const originalBtnText = btnCompressPdf.innerHTML;
        btnCompressPdf.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const levelOpt = compressLevelSelect.value;
            const renderScale = parseFloat(compressDpiSelect.value);

            let qualityOpt = 0.6;
            if (levelOpt === 'high') qualityOpt = 0.35;
            if (levelOpt === 'low') qualityOpt = 0.8;

            let outName = compressOutputNameInput.value.trim() || 'dokumen-terkompres';
            if (!outName.endsWith('.pdf')) outName += '.pdf';

            const pxToMm = 0.264583;
            let doc = null;

            for (let i = 1; i <= currentCompressDoc.numPages; i++) {
                btnCompressPdf.innerHTML = `<div class="loading-spinner"></div> Mengompres Halaman ${i} dari ${currentCompressDoc.numPages}...`;

                const page = await currentCompressDoc.getPage(i);
                const viewport = page.getViewport({ scale: renderScale });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;

                const pageImgData = canvas.toDataURL('image/jpeg', qualityOpt);
                canvas.width = 0;
                canvas.height = 0;

                const pageWMm = viewport.width * pxToMm;
                const pageHMm = viewport.height * pxToMm;
                const orientation = pageWMm > pageHMm ? 'l' : 'p';

                if (i === 1) {
                    doc = new jsPDF({
                        orientation: orientation,
                        unit: 'mm',
                        format: [pageWMm, pageHMm]
                    });
                } else {
                    doc.addPage([pageWMm, pageHMm], orientation);
                }

                doc.addImage(pageImgData, 'JPEG', 0, 0, pageWMm, pageHMm);

                // Yield control to Garbage Collector
                await new Promise(r => setTimeout(r, 10));
            }

            btnCompressPdf.innerHTML = `<div class="loading-spinner"></div> Menyiapkan file kompresi...`;
            const compressedBlob = doc.output('blob');
            const originalSize = currentCompressFile.size;
            const newSize = compressedBlob.size;
            const diffBytes = originalSize - newSize;
            const percentSaved = Math.round((diffBytes / originalSize) * 100);

            const link = document.createElement('a');
            link.href = URL.createObjectURL(compressedBlob);
            link.download = outName;
            link.click();

            if (percentSaved > 0) {
                showToast(`PDF Berhasil Dikompres! Ukuran: ${formatBytes(originalSize)} → ${formatBytes(newSize)} (Hemat ${percentSaved}%)`);
            } else {
                showToast(`PDF Berhasil Dikompres! Ukuran hasil: ${formatBytes(newSize)}`);
            }
        } catch (error) {
            console.error(error);
            showToast("Terjadi kesalahan saat mengompresi PDF.");
        } finally {
            btnCompressPdf.disabled = false;
            btnCompressPdf.innerHTML = originalBtnText;
            lucide.createIcons();
        }
    });

    // --- 5. MODULE: TIKTOK DOWNLOADER ---
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

    let currentTiktokData = null;

    function clearTiktokState() {
        if (tiktokUrlInput) tiktokUrlInput.value = '';
        if (tiktokResultCard) tiktokResultCard.style.display = 'none';
        currentTiktokData = null;
    }

    function formatTikwmUrl(url) {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        if (url.startsWith('//')) {
            return `https:${url}`;
        }
        if (url.startsWith('/')) {
            return `https://www.tikwm.com${url}`;
        }
        return `https://www.tikwm.com/${url}`;
    }

    async function downloadFileFromUrl(url, filename) {
        if (!url || url === '#') {
            showToast('Link download tidak tersedia.');
            return;
        }
        showToast('Memulai pengunduhan file...');
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        } catch (err) {
            // Fallback: Open URL directly in new tab if CORS prevents blob fetch
            window.open(url, '_blank');
        }
    }

    if (btnFetchTiktok) {
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
                const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(rawUrl)}`;
                const response = await fetch(apiUrl);
                const result = await response.json();

                if (result.code === 0 && result.data) {
                    const data = result.data;
                    currentTiktokData = data;

                    tiktokAuthorAvatar.src = formatTikwmUrl(data.author.avatar || data.author.avatar_thumb) || '';
                    tiktokAuthorName.textContent = data.author.nickname ? `${data.author.nickname} (@${data.author.unique_id})` : 'TikTok Creator';
                    tiktokVideoTitle.textContent = data.title || 'Video TikTok';
                    tiktokCoverPreview.src = formatTikwmUrl(data.cover || data.origin_cover) || '';

                    tiktokResultCard.style.display = 'flex';
                    showToast('Video berhasil ditemukan!');
                } else {
                    showToast(result.msg || 'Gagal mengambil video TikTok. Pastikan link publik & valid.');
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
    }

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

    // --- 6. MODULE: CROP & PERSPECTIVE TRANSFORM (DOCUMENT SCANNER) ---
    // State Variables for Crop Modal
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

    // Helper to calculate workspace-scaled dimensions for mobile & desktop dynamically
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

    // DOM Elements
    const cropModal = document.getElementById('crop-modal');
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

    // Matrix Solver & Homography Algorithms
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
                    // Out of bounds: fill with clean white for scanned documents
                    dstData[dstIdx] = 255;
                    dstData[dstIdx + 1] = 255;
                    dstData[dstIdx + 2] = 255;
                    dstData[dstIdx + 3] = 255; // Opaque white
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
            // Magic color: boost contrast (C=35) and brightness (B=15)
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
            // High contrast B&W Scan photocopy look
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

    // Draggable Pins Overlay & Rendering
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

        // Quad highlight outline
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

        // Red crosshair in lens center
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

    // Bind interaction events for handles
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

    // Open Crop Modal
    function openCropEditor(imageId) {
        const imgData = images.find(img => img.id === imageId);
        if (!imgData) return;

        // Auto rotate the image if it has accumulated rotation steps in the list
        if (imgData.rotation !== 0) {
            rotateImageDataUrl(imgData.originalDataUrl, imgData.rotation).then(rotatedUrl => {
                imgData.originalDataUrl = rotatedUrl;
                imgData.dataUrl = rotatedUrl;
                imgData.rotation = 0;
                renderImages();
                openCropEditor(imageId);
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
            
            // Show modal first to ensure workspace has clientWidth/clientHeight
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
    }

    // Sidebar and Actions Handlers
    const closeCropModal = () => {
        cropModal.style.display = 'none';
        activeEditorImageId = null;
        editorImgElement = null;
        editorStep = 1;
        warpedImgDataFull = null;
        warpedImgDataDisplay = null;
    };

    btnCropModalClose.addEventListener('click', closeCropModal);
    btnEditorCancel.addEventListener('click', closeCropModal);

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
                imgData.cropPoints = null; // reset corners to default
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

    // Wizard Step Controller
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
            
            // Re-render display canvas with original image and handles
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
        
        // Save normalized coordinates for non-destructive re-edit
        const imgData = images.find(img => img.id === activeEditorImageId);
        if (imgData) {
            imgData.cropPoints = {
                tl: { x: editorCorners.tl.x / canvasW, y: editorCorners.tl.y / canvasH },
                tr: { x: editorCorners.tr.x / canvasW, y: editorCorners.tr.y / canvasH },
                br: { x: editorCorners.br.x / canvasW, y: editorCorners.br.y / canvasH },
                bl: { x: editorCorners.bl.x / canvasW, y: editorCorners.bl.y / canvasH }
            };
        }
        
        // Estimate size of output image
        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        const widthTop = dist(tl_orig, tr_orig);
        const widthBottom = dist(bl_orig, br_orig);
        const destW = Math.round(Math.max(widthTop, widthBottom));
        
        const heightLeft = dist(tl_orig, bl_orig);
        const heightRight = dist(tr_orig, br_orig);
        const destH = Math.round(Math.max(heightLeft, heightRight));
        
        // Limit dimensions to 3000px to avoid memory overflow
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
        
        // Warp high-res
        warpedImgDataFull = warpPerspectiveBilinear(srcImgData, finalW, finalH, h);
        
        // Size display canvas
        const dimensions = getEditorDimensions(finalW, finalH);
        const displayW = dimensions.width;
        const displayH = dimensions.height;
        
        cropCanvas.width = displayW;
        cropCanvas.height = displayH;
        cropCanvasContainer.style.width = `${displayW}px`;
        cropCanvasContainer.style.height = `${displayH}px`;
        
        // Render display warped image
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

    // Cancel / Back Button Click Handler
    btnEditorCancel.addEventListener('click', () => {
        if (editorStep === 2) {
            setEditorStep(1);
        } else {
            closeCropModal();
        }
    });

    // Save / Next Button Click Handler
    btnEditorSave.addEventListener('click', () => {
        if (editorStep === 1) {
            // Lanjut ke Step 2
            btnEditorSave.disabled = true;
            btnEditorSave.innerHTML = `<div class="loading-spinner" style="width: 1.25rem; height: 1.25rem; margin: 0 0.5rem 0 0;"></div> Memotong...`;
            
            setTimeout(() => {
                setEditorStep(2);
                btnEditorSave.disabled = false;
            }, 50);
        } else if (editorStep === 2) {
            // Simpan Perubahan
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
                    
                    renderImages();
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
});
