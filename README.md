# Pudan's Coffee POS - Point of Sale & Cafe Management System

> Aplikasi Sistem Kasir (Point of Sale) modern, responsif, dan lengkap yang dirancang khusus untuk operasional coffee shop, kafe, dan kuliner harian.  
> **Dikembangkan oleh: Rio Project X**

---

## ☕ Tentang Aplikasi

**Pudan's Coffee POS** adalah sistem kasir terpadu yang memadukan antarmuka visual estetis bertema *artisan coffee shop* dengan keandalan operasional kasir real-time. Aplikasi ini memudahkan kasir dan pemilik usaha dalam mencatat transaksi, mengelola pesanan berjalan (*pending orders*), memantau stok produk, menganalisis performa omzet harian, serta mencetak struk fisik langsung ke printer termal via Bluetooth.

Instagram Resmi: [@pudanscoffee](https://instagram.com/pudanscoffee)

---

## ✨ Fitur Utama

### 1. 🛒 Kasir POS Interaktif & Cepat
- **Katalog Menu Cepat**: Navigasi kategori intuitif (Kopi, Non-Kopi, Makanan, Cemilan) dengan pencarian menu instan.
- **Kalkulasi Otomatis**: Subtotal, Pajak Daerah (PB1 10%), diskon promo, dan hitungan nominal kembalian yang akurat.
- **Multi-Metode Pembayaran**:
  - **Tunai (Cash)**: Dilengkapi tombol nominal cepat (uang pas, Rp 50.000, Rp 100.000, dll.).
  - **QRIS Dinamis**: Tampilan kode QR pembayaran serta pratinjau verifikasi bukti bayar.
- **Status Pembayaran Fleksibel**: Mendukung pelunasan langsung (*Lunas*) maupun simpan pesanan terlebih dahulu (*Bayar Nanti / Pending*).

### 2. 🖨️ Integrasi Printer Termal Bluetooth (Web Bluetooth ESC/POS)
- **Koneksi Langsung Tanpa Aplikasi Tambahan**: Terhubung langsung ke printer termal Bluetooth (seperti **Iware RPP02N**, ZJ-58, Panda, MPT-II, POS-58) melalui browser via **Web Bluetooth API**.
- **Filter Layanan ESC/POS Cerdas**: Mendukung UUID layanan ESC/POS standar (`0x18F0`, `0xFFE0`, ISSC) dan mode pencarian luas.
- **Format Struk 58mm / 32 Kolom Presisi**: Struk terformat rapi dengan header toko, kontak Instagram (`IG: @pudanscoffee`), rincian pesanan, total, hingga pesan penutup.
- **Proteksi Buffer Transmisi**: Pengiriman data berbasis paket (*chunked writing*) untuk mencegah buffer overflow pada printer mini BLE.
- **Lembar Uji & Pengirim Teks Kustom**: Fasilitas cetak lembar tes diagnostik dan pengiriman teks format bebas ke printer.
- **Cadangan Cetak Browser**: Opsi cetak via dialog browser / PDF tetap tersedia kapan saja.

### 3. 📋 Manajemen Pesanan Berjalan (Pending Orders)
- Mengelola antrean pesanan meja atau pelanggan yang belum melakukan pembayaran langsung.
- Edit dan sesuaikan kuantiti atau menu pesanan yang sedang diproses.
- Konfirmasi pelunasan dengan verifikasi kasir dan otomatis membuka dialog struk siap cetak.

### 4. 📊 Dashboard Analitik & Monitor Penjualan
- **Metrik Utama**: Total omzet harian, jumlah transaksi, rata-rata nilai transaksi, dan produk terlaris.
- **Grafik Tren Penjualan Interaktif**: Visualisasi grafik garis dengan filter periode 7 Hari Terakhir, 30 Hari Terakhir, dan Semua Waktu dengan dukungan horizontal scroll.
- **Ranking Menu Favorit**: Pemantauan menu kopi dan makanan paling laris.

### 5. 📦 Katalog Menu & Manajemen Stok
- Pengelolaan daftar menu lengkap dengan harga, foto, deskripsi, dan ketersediaan.
- Pemotongan stok otomatis saat transaksi dinyatakan lunas.
- Indikator peringatan stok menipis dan habis.

### 6. 🧾 Riwayat Transaksi & Fitur Backfill
- Pencarian dan filter riwayat transaksi berdasarkan tanggal dan metode pembayaran.
- Cetak ulang struk fisik kapan saja.
- Fitur **Backfill Transaksi**: Input pencatatan manual penjualan lampau dengan sinkronisasi tanggal buku kas dan opsi penyesuaian stok.
- Pembatalan atau pengembalian status transaksi dengan perlindungan kode verifikasi kasir.

### 7. 🔐 Kontrol Peran Pengguna (Role-Based Access)
- Switch peran cepat antara **KASIR**, **ADMIN**, dan **OWNER** untuk membatasi fitur-fitur administratif sensitif seperti reset data dan pembatalan transaksi.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend Framework**: React 19 & TypeScript
- **Styling**: Tailwind CSS (Desain kustom bertema warm coffee)
- **Build Tool**: Vite
- **Database Realtime**: Firebase Firestore
- **Hardware Communication**: Web Bluetooth API (ESC/POS Thermal Protocol)
- **Icons & UI Assets**: Lucide React & Motion

---

## 🚀 Panduan Menjalankan Aplikasi Secara Lokal

### Prasyarat
- **Node.js** (versi 18 ke atas disarankan)
- **NPM** atau **Yarn**
- Browser berbasis Chromium (Google Chrome / Microsoft Edge / Chrome Android) untuk memanfaatkan fitur Web Bluetooth.

### Langkah Instalasi

1. **Clone atau buka direktori proyek**:
   ```bash
   cd pudans-coffee-pos
   ```

2. **Pasang seluruh dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Development Server)**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara lokal di `http://localhost:3000`.

4. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

---

## 👨‍💻 Profil Pengembang

- **Pengembang**: **Rio Project X** (*RioProjectX*)
- **Proyek**: Pudan's Coffee POS Cashier System
- **Versi**: 1.0.0
- **Hak Cipta**: © 2026 Rio Project X. Seluruh hak cipta dilindungi undang-undang.
