// JavaScript: PicToPDF - Core Logic and PDF Generation

document.addEventListener('DOMContentLoaded', () => {
    // State
    let images = [];
    let imageIdCounter = 0;

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const previewSection = document.getElementById('preview-section');
    const imageList = document.getElementById('image-list');
    const imageCountText = document.getElementById('image-count');
    const btnClear = document.getElementById('btn-clear');
    const btnConvert = document.getElementById('btn-convert');
    
    // Configurations
    const pageSizeSelect = document.getElementById('page-size');
    const orientationGroup = document.getElementById('orientation-group');
    const fitGroup = document.getElementById('fit-group');
    const pageMarginSelect = document.getElementById('page-margin');
    const imageFitSelect = document.getElementById('image-fit');
    const fileNameInput = document.getElementById('file-name');

    // Drag and Drop Event Listeners
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
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // File Input Click & Change
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = ''; // Reset input to allow selecting same files
    });

    // Handle incoming files
    function handleFiles(files) {
        const fileList = Array.from(files);
        const imageFiles = fileList.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('Silakan pilih file gambar (PNG, JPG, atau WebP) saja.');
            return;
        }

        let loadedCount = 0;
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgObj = {
                    id: `img-${Date.now()}-${imageIdCounter++}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl: e.target.result
                };
                images.push(imgObj);
                loadedCount++;

                if (loadedCount === imageFiles.length) {
                    renderImages();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Format file size
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Render list of image previews
    function renderImages() {
        if (images.length === 0) {
            previewSection.style.display = 'none';
            btnConvert.disabled = true;
            return;
        }

        previewSection.style.display = 'flex';
        btnConvert.disabled = false;
        imageCountText.textContent = images.length;
        
        // Save scroll position
        const scrollPos = imageList.scrollTop;
        imageList.innerHTML = '';

        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.setAttribute('data-id', img.id);

            item.innerHTML = `
                <img src="${img.dataUrl}" alt="${img.name}" class="item-thumbnail">
                <div class="item-details">
                    <div class="item-name" title="${img.name}">${img.name}</div>
                    <div class="item-meta">
                        <span>${formatBytes(img.size)}</span>
                        <span>&bull;</span>
                        <span>Halaman ${index + 1}</span>
                    </div>
                </div>
                <div class="item-controls">
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

            // Button Event Listeners
            item.querySelector('.btn-move-up').addEventListener('click', (e) => {
                e.stopPropagation();
                moveImage(index, index - 1);
            });

            item.querySelector('.btn-move-down').addEventListener('click', (e) => {
                e.stopPropagation();
                moveImage(index, index + 1);
            });

            item.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteImage(img.id);
            });

            imageList.appendChild(item);
        });

        // Restore scroll position
        imageList.scrollTop = scrollPos;
        
        // Re-initialize icons inside image list
        lucide.createIcons();
    }

    // Move image position
    function moveImage(fromIndex, toIndex) {
        if (toIndex < 0 || toIndex >= images.length) return;
        const temp = images[fromIndex];
        images[fromIndex] = images[toIndex];
        images[toIndex] = temp;
        renderImages();
    }

    // Delete image
    function deleteImage(id) {
        images = images.filter(img => img.id !== id);
        renderImages();
    }

    // Clear all images
    btnClear.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin menghapus semua gambar?')) {
            images = [];
            renderImages();
        }
    });

    // Control visibility of configuration based on page size selection
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

    // Get image dimensions asynchronously
    function getImageDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = dataUrl;
        });
    }

    // PDF Generation
    btnConvert.addEventListener('click', async () => {
        if (images.length === 0) return;

        // Set Loading State
        const originalBtnContent = btnConvert.innerHTML;
        btnConvert.disabled = true;
        btnConvert.innerHTML = `<div class="loading-spinner"></div> Memproses PDF...`;

        try {
            const { jsPDF } = window.jspdf;
            
            const sizeOpt = pageSizeSelect.value;
            const margin = parseInt(pageMarginSelect.value, 10);
            const fitOpt = imageFitSelect.value;
            const orientationOpt = document.querySelector('input[name="orientation"]:checked').value;
            let fileName = fileNameInput.value.trim() || 'dokumen-konversi';
            if (!fileName.endsWith('.pdf')) {
                fileName += '.pdf';
            }

            // We will initialize jsPDF dynamically per image or reuse settings.
            // Let's load the dimensions of the first image to define initial PDF format if original size is chosen
            const firstImgDim = await getImageDimensions(images[0].dataUrl);
            
            let docOptions = {
                unit: 'mm'
            };

            // Pixel to mm conversion factor (96 dpi)
            const pxToMm = 0.264583;

            if (sizeOpt === 'original') {
                const wMm = firstImgDim.width * pxToMm + (margin * 2);
                const hMm = firstImgDim.height * pxToMm + (margin * 2);
                docOptions.orientation = wMm > hMm ? 'l' : 'p';
                docOptions.format = [wMm, hMm];
            } else {
                docOptions.orientation = orientationOpt;
                docOptions.format = sizeOpt; // 'a4' or 'letter'
            }

            const doc = new jsPDF(docOptions);

            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const dim = await getImageDimensions(img.dataUrl);
                
                // Determine format and dimensions for this specific page
                let pWidth, pHeight;
                let scaleW, scaleH;
                let x = margin;
                let y = margin;

                if (sizeOpt === 'original') {
                    // Page dimensions unique to this image size
                    pWidth = dim.width * pxToMm + (margin * 2);
                    pHeight = dim.height * pxToMm + (margin * 2);
                    scaleW = dim.width * pxToMm;
                    scaleH = dim.height * pxToMm;
                } else {
                    // Standard sizes A4/Letter
                    // A4 is 210x297, Letter is 215.9x279.4
                    const isLandscape = orientationOpt === 'l';
                    
                    if (sizeOpt === 'a4') {
                        pWidth = isLandscape ? 297 : 210;
                        pHeight = isLandscape ? 210 : 297;
                    } else { // Letter
                        pWidth = isLandscape ? 279.4 : 215.9;
                        pHeight = isLandscape ? 215.9 : 279.4;
                    }

                    const contentW = pWidth - (margin * 2);
                    const contentH = pHeight - (margin * 2);

                    if (fitOpt === 'contain') {
                        const imgRatio = dim.width / dim.height;
                        const contentRatio = contentW / contentH;

                        if (imgRatio > contentRatio) {
                            scaleW = contentW;
                            scaleH = contentW / imgRatio;
                        } else {
                            scaleH = contentH;
                            scaleW = contentH * imgRatio;
                        }
                        
                        // Centered inside margin box
                        x = margin + (contentW - scaleW) / 2;
                        y = margin + (contentH - scaleH) / 2;
                    } else { // cover - stretch/fill margin box
                        scaleW = contentW;
                        scaleH = contentH;
                    }
                }

                // If not the first page, add a new page with appropriate dimensions
                if (i > 0) {
                    if (sizeOpt === 'original') {
                        const pOrientation = pWidth > pHeight ? 'l' : 'p';
                        doc.addPage([pWidth, pHeight], pOrientation);
                    } else {
                        doc.addPage(sizeOpt, orientationOpt);
                    }
                }

                // Determine image format for compression
                let imgFormat = 'JPEG';
                if (img.type === 'image/png') {
                    imgFormat = 'PNG';
                } else if (img.type === 'image/webp') {
                    imgFormat = 'WEBP';
                }

                // Add image
                doc.addImage(img.dataUrl, imgFormat, x, y, scaleW, scaleH);
            }

            // Save the generated PDF file
            doc.save(fileName);

        } catch (error) {
            console.error('Terjadi kesalahan saat membuat PDF:', error);
            alert('Maaf, terjadi kesalahan saat membuat PDF. Silakan coba lagi.');
        } finally {
            // Restore Button State
            btnConvert.disabled = false;
            btnConvert.innerHTML = originalBtnContent;
        }
    });
});
