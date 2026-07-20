// Module: Compress PDF

let currentCompressFile = null;
let currentCompressDoc = null;

function initCompressPdfModule() {
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

    if (!dropzoneCompress) return;

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
}

function clearCompressPdfState() {
    currentCompressFile = null;
    currentCompressDoc = null;
    const dropzoneCompress = document.getElementById('dropzone-compress');
    const previewSectionCompress = document.getElementById('preview-section-compress');
    const compressPageGrid = document.getElementById('compress-page-grid');
    const btnCompressPdf = document.getElementById('btn-compress-pdf');
    const compressOutputNameInput = document.getElementById('compress-output-name');

    if (compressPageGrid) compressPageGrid.innerHTML = '';
    if (previewSectionCompress) previewSectionCompress.style.display = 'none';
    if (dropzoneCompress) dropzoneCompress.style.display = 'block';
    if (btnCompressPdf) {
        btnCompressPdf.disabled = true;
        btnCompressPdf.innerHTML = `<i data-lucide="file-archive"></i> Kompres PDF Sekarang`;
    }
    if (compressOutputNameInput) compressOutputNameInput.value = 'dokumen-terkompres';
    if (window.lucide) lucide.createIcons();
}
