// JavaScript: PicToPDF Suite - Core Controller & Modules

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SPA ROUTING, SETTINGS & NAVIGATION ---
    const dashboardView = document.getElementById('dashboard-view');
    const imageToPdfView = document.getElementById('image-to-pdf-view');
    const pdfToImageView = document.getElementById('pdf-to-image-view');
    const officeConverterView = document.getElementById('office-converter-view');
    
    // Settings elements
    const btnToggleSettings = document.getElementById('btn-toggle-settings');
    const globalSettingsPanel = document.getElementById('global-settings-panel');
    const globalCloudConvertKeyInput = document.getElementById('global-cloudconvert-key');
    const btnToggleGlobalKeyVisibility = document.getElementById('btn-toggle-global-key-visibility');

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

    // Office Tool Configurations State
    let currentSourceExtensions = []; // allowed extensions
    let currentTargetFormat = "";      // target format ('pdf', 'docx', etc.)

    // Load initial API key
    let cachedKey = localStorage.getItem('cloudconvert_api_key') || window.CLOUDCONVERT_API_KEY || '';
    globalCloudConvertKeyInput.value = cachedKey;

    // Toggle Settings panel on dashboard
    btnToggleSettings.addEventListener('click', () => {
        const isHidden = globalSettingsPanel.style.display === 'none';
        globalSettingsPanel.style.display = isHidden ? 'block' : 'none';
        
        // Toggle settings button icon rotation / focus visually
        if (isHidden) {
            globalCloudConvertKeyInput.focus();
        }
    });

    btnToggleGlobalKeyVisibility.addEventListener('click', () => {
        globalCloudConvertKeyInput.type = globalCloudConvertKeyInput.type === 'password' ? 'text' : 'password';
        const eyeIcon = btnToggleGlobalKeyVisibility.querySelector('i');
        eyeIcon.setAttribute('data-lucide', globalCloudConvertKeyInput.type === 'text' ? 'eye-off' : 'eye');
        lucide.createIcons();
    });

    // Update state of Office Cards dynamically based on API Key presence
    function updateOfficeCardsState() {
        const apiKey = globalCloudConvertKeyInput.value.trim();
        const officeCards = document.querySelectorAll('.office-card');
        
        officeCards.forEach(card => {
            const badge = card.querySelector('.badge');
            
            if (apiKey) {
                // Active state
                card.classList.remove('card-inactive');
                card.classList.add('card-active');
                badge.classList.remove('badge-inactive');
                badge.classList.add('badge-active');
                badge.textContent = 'Aktif (API)';
            } else {
                // Inactive state
                card.classList.remove('card-active');
                card.classList.add('card-inactive');
                badge.classList.remove('badge-active');
                badge.classList.add('badge-inactive');
                badge.textContent = 'Perlu API Key';
            }
        });
    }

    // Run card update initially
    updateOfficeCardsState();

    // Event listener for global API key input changes
    globalCloudConvertKeyInput.addEventListener('input', () => {
        const val = globalCloudConvertKeyInput.value.trim();
        localStorage.setItem('cloudconvert_api_key', val);
        // Sync with the office view key field
        cloudConvertKeyInput.value = val;
        updateOfficeCardsState();
    });


    // Active tool card routing
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.getAttribute('data-tool');
            
            // Check if it is an Office card and currently inactive
            if (card.classList.contains('office-card') && card.classList.contains('card-inactive')) {
                showToast("Masukkan CloudConvert API Key di ikon gerigi atas untuk mengaktifkan fitur ini.");
                // Expand settings panel and focus
                globalSettingsPanel.style.display = 'block';
                globalCloudConvertKeyInput.focus();
                return;
            }

            // Hide all views
            document.querySelectorAll('.spa-view').forEach(view => {
                view.style.display = 'none';
            });

            // Show selected view
            if (tool === 'image-to-pdf') {
                imageToPdfView.style.display = 'flex';
            } else if (tool === 'pdf-to-image') {
                pdfToImageView.style.display = 'flex';
            } else {
                // It is one of the 6 active CloudConvert Office tools
                setupOfficeConverter(tool);
                officeConverterView.style.display = 'flex';
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
            clearOfficeConverterState();
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

    function handleFiles(files) {
        const fileList = Array.from(files);
        const imageFiles = fileList.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showToast('Silakan pilih file gambar (PNG, JPG, WebP) saja.');
            return;
        }

        let loadedCount = 0;
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                images.push({
                    id: `img-${Date.now()}-${imageIdCounter++}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    rotation: 0,
                    dataUrl: e.target.result
                });
                loadedCount++;

                if (loadedCount === imageFiles.length) {
                    renderImages();
                }
            };
            reader.readAsDataURL(file);
        });
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
                <img src="${img.dataUrl}" alt="${img.name}" class="item-thumbnail" style="transform: rotate(${img.rotation}deg) scale(${rotateScale})">
                <div class="item-details">
                    <div class="item-name" title="${img.name}">${img.name}</div>
                    <div class="item-meta">
                        <span>${formatBytes(img.size)}</span>
                        <span>&bull;</span>
                        <span>Halaman ${index + 1}</span>
                    </div>
                </div>
                <div class="item-controls">
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

    function processImage(dataUrl, rotationAngle, quality) {
        return new Promise((resolve) => {
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
                
                resolve({
                    dataUrl: canvas.toDataURL('image/jpeg', quality),
                    width: canvas.width,
                    height: canvas.height
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
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                if (!fileName.endsWith('.zip')) fileName += '.zip';
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = fileName;
                link.click();
                showToast("Berhasil membuat file ZIP konversi!");
            } else {
                if (!fileName.endsWith('.pdf')) fileName += '.pdf';
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
        reader.onload = async function(e) {
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

        for (let i = 1; i <= currentPdfDoc.numPages; i++) {
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
                if (!outName.endsWith('.jpg')) outName += '.jpg';

                const link = document.createElement('a');
                link.href = imgUrl;
                link.download = outName;
                link.click();
                showToast("Halaman PDF berhasil diekstrak ke JPG!");
            } else {
                const zip = new JSZip();

                for (let i = 1; i <= currentPdfDoc.numPages; i++) {
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

                    const imgUrl = canvas.toDataURL('image/jpeg', qualityOpt);
                    const base64Data = imgUrl.substring(imgUrl.indexOf(',') + 1);
                    zip.file(`${outName}-halaman-${i}.jpg`, base64Data, { base64: true });
                }

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


    // --- 4. MODULE: UNIFIED OFFICE CONVERTER (CloudConvert V2) ---
    let currentOfficeFile = null;

    // DOM References - Office Converter
    const dropzoneOffice = document.getElementById('dropzone-office');
    const fileInputOffice = document.getElementById('file-input-office');
    const previewSectionOffice = document.getElementById('preview-section-office');
    const btnClearOffice = document.getElementById('btn-clear-office');
    
    const officeToolIcon = document.getElementById('office-tool-icon');
    const officeToolTitle = document.getElementById('office-tool-title');
    const officeDropzoneIcon = document.getElementById('office-dropzone-icon');
    const officeDropzoneText = document.getElementById('office-dropzone-text');
    const officeFileTypes = document.getElementById('office-file-types');
    
    const officePreviewIcon = document.getElementById('office-preview-icon');
    const officeFileName = document.getElementById('office-file-name');
    const officeFileSize = document.getElementById('office-file-size');
    
    const cloudConvertKeyInput = document.getElementById('cloudconvert-key');
    const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
    
    const officeTargetFormatInput = document.getElementById('office-target-format');
    const officeOutputNameInput = document.getElementById('office-output-name');
    const officeOutputSuffix = document.getElementById('office-output-suffix');
    const btnConvertOffice = document.getElementById('btn-convert-office');

    // Sync input keys
    cloudConvertKeyInput.value = cachedKey;

    cloudConvertKeyInput.addEventListener('input', () => {
        const val = cloudConvertKeyInput.value.trim();
        localStorage.setItem('cloudconvert_api_key', val);
        globalCloudConvertKeyInput.value = val;
        updateOfficeCardsState();
    });

    btnToggleKeyVisibility.addEventListener('click', () => {
        cloudConvertKeyInput.type = cloudConvertKeyInput.type === 'password' ? 'text' : 'password';
        const eyeIcon = btnToggleKeyVisibility.querySelector('i');
        eyeIcon.setAttribute('data-lucide', cloudConvertKeyInput.type === 'text' ? 'eye-off' : 'eye');
        lucide.createIcons();
    });

    // Map tool to config setup
    function setupOfficeConverter(tool) {
        let title = "Word to PDF";
        let icon = "file-text";
        let extensionsLabel = "Mendukung format file .docx, .doc";
        let acceptValue = ".docx, .doc";
        let dropzoneMsg = "Pilih dokumen Word Anda";
        
        if (tool === 'word-to-pdf') {
            title = "Word to PDF";
            icon = "file-text";
            currentSourceExtensions = ['docx', 'doc'];
            currentTargetFormat = 'pdf';
            extensionsLabel = "Mendukung format file .docx, .doc";
            acceptValue = ".docx, .doc";
            dropzoneMsg = "Pilih dokumen Word Anda";
        } else if (tool === 'ppt-to-pdf') {
            title = "PowerPoint to PDF";
            icon = "presentation";
            currentSourceExtensions = ['pptx', 'ppt'];
            currentTargetFormat = 'pdf';
            extensionsLabel = "Mendukung file presentasi .pptx, .ppt";
            acceptValue = ".pptx, .ppt";
            dropzoneMsg = "Pilih file PowerPoint Anda";
        } else if (tool === 'excel-to-pdf') {
            title = "Excel to PDF";
            icon = "sheet";
            currentSourceExtensions = ['xlsx', 'xls'];
            currentTargetFormat = 'pdf';
            extensionsLabel = "Mendukung spreadsheet .xlsx, .xls";
            acceptValue = ".xlsx, .xls";
            dropzoneMsg = "Pilih spreadsheet Excel Anda";
        } else if (tool === 'pdf-to-word') {
            title = "PDF to Word";
            icon = "file-text";
            currentSourceExtensions = ['pdf'];
            currentTargetFormat = 'docx';
            extensionsLabel = "Mendukung dokumen PDF (.pdf)";
            acceptValue = ".pdf";
            dropzoneMsg = "Pilih file PDF Anda";
        } else if (tool === 'pdf-to-ppt') {
            title = "PDF to PowerPoint";
            icon = "presentation";
            currentSourceExtensions = ['pdf'];
            currentTargetFormat = 'pptx';
            extensionsLabel = "Mendukung dokumen PDF (.pdf)";
            acceptValue = ".pdf";
            dropzoneMsg = "Pilih file PDF Anda";
        } else if (tool === 'pdf-to-excel') {
            title = "PDF to Excel";
            icon = "sheet";
            currentSourceExtensions = ['pdf'];
            currentTargetFormat = 'xlsx';
            extensionsLabel = "Mendukung dokumen PDF (.pdf)";
            acceptValue = ".pdf";
            dropzoneMsg = "Pilih file PDF Anda";
        }

        officeToolTitle.textContent = title;
        officeToolIcon.setAttribute('data-lucide', icon);
        officeDropzoneIcon.setAttribute('data-lucide', icon === 'presentation' ? 'presentation' : (icon === 'sheet' ? 'sheet' : 'file-up'));
        officeDropzoneText.textContent = dropzoneMsg;
        officeFileTypes.textContent = extensionsLabel;
        
        fileInputOffice.accept = acceptValue;
        officeTargetFormatInput.value = currentTargetFormat.toUpperCase();
        officeOutputSuffix.textContent = `.${currentTargetFormat}`;

        lucide.createIcons();
    }

    // Drag-drop Office file
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzoneOffice.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneOffice.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzoneOffice.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneOffice.classList.remove('dragover');
        }, false);
    });

    dropzoneOffice.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) {
            handleOfficeFile(e.dataTransfer.files[0]);
        }
    });

    dropzoneOffice.addEventListener('click', () => {
        fileInputOffice.click();
    });

    fileInputOffice.addEventListener('change', () => {
        if (fileInputOffice.files.length > 0) {
            handleOfficeFile(fileInputOffice.files[0]);
        }
        fileInputOffice.value = '';
    });

    function handleOfficeFile(file) {
        if (!file) return;

        const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
        if (!currentSourceExtensions.includes(ext)) {
            showToast(`Ekstensi file .${ext} tidak didukung untuk modul ini.`);
            return;
        }

        currentOfficeFile = file;
        officeFileName.textContent = file.name;
        officeFileSize.textContent = formatBytes(file.size);
        
        const dotIdx = file.name.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
        officeOutputNameInput.value = `${baseName}-converted`;

        const isPdf = ext === 'pdf';
        const docIcon = isPdf ? 'file-text' : (['pptx','ppt'].includes(ext) ? 'presentation' : (['xlsx','xls'].includes(ext) ? 'sheet' : 'file-text'));
        officePreviewIcon.setAttribute('data-lucide', docIcon);
        
        dropzoneOffice.style.display = 'none';
        previewSectionOffice.style.display = 'flex';
        btnConvertOffice.disabled = false;

        lucide.createIcons();
    }

    function clearOfficeConverterState() {
        currentOfficeFile = null;
        previewSectionOffice.style.display = 'none';
        dropzoneOffice.style.display = 'block';
        btnConvertOffice.disabled = true;
        btnConvertOffice.innerHTML = `<i data-lucide="refresh-cw"></i> Mulai Konversi`;
        officeOutputNameInput.value = 'hasil-konversi';
        lucide.createIcons();
    }

    btnClearOffice.addEventListener('click', () => {
        clearOfficeConverterState();
    });

    async function runCloudConvertJob(file, inputExt, outputExt, apiKey) {
        const createJobUrl = 'https://api.cloudconvert.com/v2/jobs';
        const jobPayload = {
            tasks: {
                'import-1': {
                    operation: 'import/upload'
                },
                'convert-1': {
                    operation: 'convert',
                    input: 'import-1',
                    input_format: inputExt,
                    output_format: outputExt
                },
                'export-1': {
                    operation: 'export/url',
                    input: 'convert-1'
                }
            }
        };

        const jobResponse = await fetch(createJobUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jobPayload)
        });

        if (!jobResponse.ok) {
            const errData = await jobResponse.json();
            throw new Error(errData.message || 'Gagal membuat tugas konversi di server CloudConvert.');
        }

        const jobData = await jobResponse.json();
        
        const importTask = jobData.data.tasks.find(t => t.name === 'import-1');
        const uploadForm = importTask.result.form;

        const formData = new FormData();
        for (const [key, val] of Object.entries(uploadForm.parameters)) {
            formData.append(key, val);
        }
        formData.append('file', file);

        const uploadResponse = await fetch(uploadForm.url, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('Gagal mengunggah file ke server konversi S3.');
        }

        const exportTaskId = jobData.data.tasks.find(t => t.name === 'export-1').id;
        const taskStatusUrl = `https://api.cloudconvert.com/v2/tasks/${exportTaskId}`;

        let exportTaskFinished = false;
        let finalFileUrl = '';
        let loopCount = 0;

        while (!exportTaskFinished && loopCount < 60) {
            await new Promise(resolve => setTimeout(resolve, 2500));
            loopCount++;
            
            const taskResponse = await fetch(taskStatusUrl, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!taskResponse.ok) {
                throw new Error('Gagal memantau status konversi.');
            }

            const taskData = await taskResponse.json();
            const status = taskData.data.status;

            if (status === 'finished') {
                exportTaskFinished = true;
                finalFileUrl = taskData.data.result.files[0].url;
            } else if (status === 'failed') {
                throw new Error(taskData.data.message || 'Proses konversi gagal di server CloudConvert.');
            }
        }

        if (!exportTaskFinished) {
            throw new Error('Waktu konversi habis (Timeout). File Anda mungkin terlalu besar.');
        }

        return finalFileUrl;
    }

    btnConvertOffice.addEventListener('click', async () => {
        if (!currentOfficeFile) return;

        const apiKey = cloudConvertKeyInput.value.trim();
        if (!apiKey) {
            showToast("Harap masukkan API Key CloudConvert Anda terlebih dahulu.");
            return;
        }

        const originalBtnText = btnConvertOffice.innerHTML;
        btnConvertOffice.disabled = true;
        
        try {
            const inputExt = currentOfficeFile.name.substring(currentOfficeFile.name.lastIndexOf('.') + 1).toLowerCase();
            const outputExt = currentTargetFormat;
            let outputName = officeOutputNameInput.value.trim() || 'hasil-konversi';
            if (!outputName.endsWith(`.${outputExt}`)) {
                outputName += `.${outputExt}`;
            }

            btnConvertOffice.innerHTML = `<div class="loading-spinner"></div> Mengunggah file...`;
            const fileUrl = await runCloudConvertJob(currentOfficeFile, inputExt, outputExt, apiKey);

            btnConvertOffice.innerHTML = `<div class="loading-spinner"></div> Mengunduh hasil...`;
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = outputName;
            link.click();

            showToast("Konversi dokumen berhasil!");
            clearOfficeConverterState();
        } catch (error) {
            console.error(error);
            showToast(error.message || "Gagal melakukan konversi dokumen.");
        } finally {
            btnConvertOffice.disabled = false;
            btnConvertOffice.innerHTML = originalBtnText;
            lucide.createIcons();
        }
    });
});
