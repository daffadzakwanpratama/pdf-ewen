// Module: PDF to JPG Extractor

const { pdfjsLib } = window;
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let currentPdfFile = null;
let currentPdfDoc = null;

function initPdfToJpgModule() {
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

    if (!dropzonePdf) return;

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

                    const pageBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', qualityOpt));
                    canvas.width = 0;
                    canvas.height = 0;

                    zip.file(`${outName}-halaman-${i}.jpg`, pageBlob);

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
}

function clearPdfToImageState() {
    currentPdfFile = null;
    currentPdfDoc = null;
    const dropzonePdf = document.getElementById('dropzone-pdf');
    const previewSectionPdf = document.getElementById('preview-section-pdf');
    const pdfPageGrid = document.getElementById('pdf-page-grid');
    const btnConvertPdf = document.getElementById('btn-convert-pdf');
    const pdfOutputNameInput = document.getElementById('pdf-output-name');

    if (pdfPageGrid) pdfPageGrid.innerHTML = '';
    if (previewSectionPdf) previewSectionPdf.style.display = 'none';
    if (dropzonePdf) dropzonePdf.style.display = 'block';
    if (btnConvertPdf) {
        btnConvertPdf.disabled = true;
        btnConvertPdf.innerHTML = `<i data-lucide="file-image"></i> Ekstrak ke JPG`;
    }
    if (pdfOutputNameInput) pdfOutputNameInput.value = 'halaman-pdf';
    if (window.lucide) lucide.createIcons();
}
