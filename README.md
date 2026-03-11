# KOMANDO BALISTIK (Ballistic Command)

Simulator rudal balistik 3D yang realistis, dikembangkan menggunakan **Three.js** dan **Web Audio API**. Proyek ini mensimulasikan dinamika penerbangan multi-tahap, atmosfer eksponensial, dan sistem peluncuran mobile dalam lingkungan taktis yang imersif.

## 🚀 Fitur Utama

-   **Fisika Balistik Lanjutan**: Simulasi lintasan rudal yang dipengaruhi oleh gravitasi, hambatan udara (drag) berdasarkan ketinggian, dan angin Jet Stream.
-   **Sistem Pemisahan Multi-Tahap**: Rudal secara fisik terpisah antara *Booster* dan *Warhead (RV)* setelah pembakaran mesin selesai.
-   **Dinamika Atmosfer**: 
    *   Kepadatan udara berkurang secara eksponensial terhadap ketinggian.
    *   Efek pemanasan termal (*Re-entry Glow*) saat hulu ledak memasuki atmosfer padat pada kecepatan tinggi.
-   **Audio Prosedural**: Efek suara ledakan, peluncuran, dan atmosfer yang disintesis secara langsung menggunakan Web Audio API untuk responsivitas 3D yang sempurna.
-   **Peta Taktis Real-Time**: Navigasi dan penargetan menggunakan radar sweep dengan sistem koordinat yang akurat.
-   **Mode Performa**: Optimasi instan untuk perangkat spek rendah (Tekan `P`).

## 🎮 Kontrol

-   **Gerakan Kamera**: `W`, `A`, `S`, `D`
-   **Ketinggian Kamera**: `Q` (Turun), `E` (Naik)
-   **Arah Pandang**: `Mouse` (Klik untuk mengunci kursor)
-   **Zoom**: `Scroll Mouse`
-   **Waktu**: `T` (Mempercepat waktu/siklus siang-malam)
-   **Mode Performa**: `P` (Toggle bayangan & partikel)
-   **Penargetan**: `Klik Kiri` pada Peta Taktis
-   **Menembak**: Tombol `TEMBAK` di panel peta (Pastikan sistem sudah selaras)

## 🛠️ Instalasi & Pengembangan

Proyek ini dibangun menggunakan **Vite**.

1.  Clone repositori ini.
2.  Instal dependensi:
    ```bash
    npm install
    ```
3.  Jalankan server pengembangan:
    ```bash
    npm run dev
    ```
4.  Buka browser di `http://localhost:5173`.

## 📦 Struktur Folder

-   `src/engine/`: Inti mesin grafis (langit, medan, pencahayaan, audio).
-   `src/game/`: Logika permainan (sistem rudal, kontrol peluncur, konfigurasi).
-   `src/ui/`: Antarmuka pengguna dan peta taktis.
-   `public/`: Aset suara statis.

## ⚠️ Catatan Teknis

-   **WebGL2**: Pastikan *Hardware Acceleration* diaktifkan di pengaturan browser Anda.
-   **Audio**: Suara akan aktif secara otomatis setelah Anda menekan tombol **MULAI** pada layar awal.

---
Dikembangkan sebagai simulasi teknis untuk demonstrasi dinamika penerbangan balistik.
