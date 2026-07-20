// Module: Image to PDF Converter

let images = [];
let imageIdCounter = 0;

function initImageToPdfModule() {
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

    if (!dropzone) return;

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

            await new Promise(r => setTimeout(r, 0));
        }

        renderImages();
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

    btnClear.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin menghapus semua gambar?')) {
            clearImageToPdfState();
        }
    });

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

    window.renderImages = renderImages;
}

function clearImageToPdfState() {
    images = [];
    const previewSection = document.getElementById('preview-section');
    const btnConvert = document.getElementById('btn-convert');
    const fileNameInput = document.getElementById('file-name');
    if (previewSection) previewSection.style.display = 'none';
    if (btnConvert) btnConvert.disabled = true;
    if (fileNameInput) fileNameInput.value = 'dokumen-konversi';
}
