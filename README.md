# PicToPDF - Client-Side Image to PDF Converter

PicToPDF adalah aplikasi web modern, premium, dan sangat interaktif yang memungkinkan pengguna untuk mengonversi gambar (PNG, JPG, JPEG, WebP) ke dalam satu file PDF secara instan dan 100% aman.

Aplikasi ini berjalan sepenuhnya di **sisi klien (client-side)** menggunakan browser Anda, yang berarti data gambar Anda tidak akan pernah dikirim atau diunggah ke server mana pun di internet. Keamanan privasi dokumen Anda terjamin sepenuhnya.

🌐 **Demo Live**: [daffadzakwanpratama.github.io/pdf-ewen](https://daffadzakwanpratama.github.io/pdf-ewen/)

## Fitur Utama

- **Unggah Cepat**: Mendukung fitur *drag-and-drop* (tarik-lepas) gambar atau klik untuk memilih file.
- **Urutkan Halaman**: Sesuaikan urutan halaman dengan memindahkan kartu gambar ke atas atau ke bawah.
- **Konfigurasi Fleksibel**:
  - Ukuran Halaman: **A4**, **Letter**, atau **Original** (mengikuti ukuran asli gambar).
  - Orientasi: **Potret (Portrait)** atau **Lanskap (Landscape)**.
  - Margin: Tanpa margin (0mm), margin tipis (10mm), atau margin sedang (20mm).
  - Penskalaan: **Fit** (mempertahankan rasio aspek gambar) atau **Cover** (meregangkan gambar memenuhi margin).
- **Desain Premium**: Tampilan gelap (*dark mode*) yang elegan berbasis *glassmorphism* dengan transisi halus dan responsif di semua perangkat.
- **Keamanan Maksimal**: Proses konversi instan terjadi langsung di browser menggunakan pustaka [jsPDF](https://github.com/parallax/jsPDF).

## Teknologi Yang Digunakan

- **HTML5** & **CSS3 Modern** (Custom CSS Variables, CSS Grid, Flexbox)
- **Vanilla JavaScript** (ES6+)
- **jsPDF** (Pustaka eksternal melalui CDN)
- **Lucide Icons** (Ikon bergaya minimalis)
- **Google Fonts** (Plus Jakarta Sans)

## Cara Menjalankan Secara Lokal

1. Unduh atau klon repositori ini:
   ```bash
   git clone https://github.com/username/nama-repositori.git
   ```
2. Masuk ke direktori proyek:
   ```bash
   cd nama-repositori
   ```
3. Buka file `index.html` dengan mengekliknya dua kali atau gunakan ekstensi Live Server di VS Code untuk membukanya secara lokal di browser.

## Cara Mengunggah ke GitHub Pages (Hosting Gratis)

1. Buat repositori baru di GitHub dengan nama bebas (misalnya: `pic-to-pdf`).
2. Jalankan perintah berikut di terminal/PowerShell pada folder proyek Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: PicToPDF release"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPOSITORI.git
   git push -u origin main
   ```
3. Di halaman repositori GitHub Anda, buka tab **Settings** -> **Pages**.
4. Pada bagian **Build and deployment**, ubah Source menjadi **Deploy from a branch**.
5. Pilih branch **main** dan folder **/(root)**, lalu klik **Save**.
6. Tunggu sekitar 1-2 menit, GitHub akan memberikan link website aktif Anda (misalnya: `https://USERNAME_ANDA.github.io/NAMA_REPOSITORI/`).

## Lisensi

Proyek ini dilisensikan di bawah lisensi MIT. Bebas digunakan untuk keperluan pribadi maupun komersial.
