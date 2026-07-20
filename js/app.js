// Main Application Initializer & Router

document.addEventListener('DOMContentLoaded', () => {
    // Initialize All Submodules
    if (typeof initImageToPdfModule === 'function') initImageToPdfModule();
    if (typeof initPdfToJpgModule === 'function') initPdfToJpgModule();
    if (typeof initCompressPdfModule === 'function') initCompressPdfModule();
    if (typeof initTiktokDownloaderModule === 'function') initTiktokDownloaderModule();
    if (typeof initCropModalModule === 'function') initCropModalModule();

    // --- SPA ROUTING & NAVIGATION ---
    const dashboardView = document.getElementById('dashboard-view');
    const imageToPdfView = document.getElementById('image-to-pdf-view');
    const pdfToImageView = document.getElementById('pdf-to-image-view');
    const compressPdfView = document.getElementById('compress-pdf-view');
    const tiktokDownloaderView = document.getElementById('tiktok-downloader-view');

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
                if (imageToPdfView) imageToPdfView.style.display = 'flex';
            } else if (tool === 'pdf-to-image') {
                if (pdfToImageView) pdfToImageView.style.display = 'flex';
            } else if (tool === 'compress-pdf') {
                if (compressPdfView) compressPdfView.style.display = 'flex';
            } else if (tool === 'tiktok-downloader') {
                if (tiktokDownloaderView) tiktokDownloaderView.style.display = 'flex';
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
            if (dashboardView) dashboardView.style.display = 'flex';

            // Clear inputs and states on return to avoid memory footprint
            if (typeof clearImageToPdfState === 'function') clearImageToPdfState();
            if (typeof clearPdfToImageState === 'function') clearPdfToImageState();
            if (typeof clearCompressPdfState === 'function') clearCompressPdfState();
            if (typeof clearTiktokState === 'function') clearTiktokState();
        });
    });
});
