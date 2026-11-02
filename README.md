# AURA // Pro Watermark Inpainting Studio

Studio aplikasi web profesional untuk menghapus watermark (kecil, besar, sedikit, maupun banyak/berulang) dengan teknologi rekonstruksi tekstur presisi tinggi tanpa meninggalkan bekas buram (*no blur/smear artifacts*) dan tanpa mengubah objek di sekitarnya.

Dilengkapi dengan **Interactive Before/After Slider Preview**, **Side-by-Side Comparison**, dan desain studio kreatif bergaya desktop app ala Figma/Lightroom.

---

## 🚀 Fitur Unggulan

### 1. Tiga Algoritma Rekonstruksi Khusus
- **Exemplar Pattern Synthesizer (Criminisi et al.)**:
  Menganalisis kontinuitas kontur tepi (*isophotes*) dan mencari pola tekstur serupa dari area sekitar. Sangat efektif untuk dedaunan, kain, kulit, pola berulang, serta objek bertekstur rumit tanpa efek smudge/blur.
- **Alpha Inversion Restorer (Translucent De-watermarker)**:
  Khusus untuk watermark transparan / semi-transparan (seperti stock photo preview Shutterstock/Getty, logo TikTok/Reels, dan teks copyright berulang). Algoritma ini menginversi nilai transparansi $\alpha$ watermark untuk **mengembalikan warna & piksel asli di baliknya secara langsung tanpa menyentuh objek aslinya**.
- **Curvature Fast Marching (Telea FMM)**:
  Sangat cepat dan mulus untuk gradasi langit, dinding datar, atau stempel tanggal/timestamp kamera kecil.

### 2. Interactive Comparison Slider
- Slider pembatas interaktif dengan drag 60fps dan dukungan layar sentuh (touch).
- Mode **Side-by-Side** (berdampingan) untuk inspeksi detail.
- Fitur **Peek Original** (tahan spasi atau tombol untuk langsung melihat perbandingan seketika).

### 3. Alat Masking Presisi
- **Kuas Smart (B)**: Ukuran kuas dinamis (`4px` - `180px`) dengan indikator kursor melingkar.
- **Eraser Mask (E)**: Menghapus bagian seleksi yang tidak sengaja terarsir.
- **Polygon Lasso (L)**: Mengitari bentuk logo atau tulisan yang tidak beraturan.
- **Kotak / Box (R)**: Seleksi cepat untuk watermark area persegi.
- **Auto Font / Text Keyer (W)**: Cukup tarik kotak di atas tulisan watermark, sistem otomatis mendeteksi karakter teks secara presisi sehingga latar belakang di celah huruf tidak terhapus.
- **Feather Edge Blending**: Menghaluskan tepi transisi dengan *cosine ramp* agar tidak terlihat garis sambungan.
- **Sensor Grain Harmonization**: Menyuntikkan grain alami kamera agar area perbaikan tidak terlihat seperti plastik datar.

### 4. Foto Sampel Langsung Siap Uji
Sudah terpasang 4 foto sampel beresolusi tinggi untuk menguji berbagai skenario:
1. **Watermark Kecil**: Sunset pantai dengan stempel tanggal kamera digital orange (`'24 10 15 18:32:41`).
2. **Watermark Banyak**: Foto arsitektur modern dengan grid watermark transparan diagonal berulang.
3. **Watermark Besar**: Pemandangan hutan pinus dengan emblem stempel logo bulat besar di tengah.
4. **Watermark Sosmed**: Street photography malam hari dengan watermark handle video TikTok/Reels di sudut atas & bawah.

### 5. Privasi 100% Client-Side
Semua kalkulasi grafis berjalan langsung di browser pengguna (Canvas TypedArrays 64-bit). Tidak ada gambar yang diunggah ke server pihak ketiga.

---

## ⌨️ Pintasan Keyboard (Shortcuts)

| Tombol | Fungsi |
|---|---|
| `B` | Kuas Smart (Brush) |
| `E` | Penghapus Mask (Eraser) |
| `L` | Polygon Lasso |
| `R` | Kotak / Box Selection |
| `W` | Auto Font / Color Keyer |
| `H` / `Spasi + Drag` | Geser Kanvas (Pan) |
| `[` / `]` | Perkecil / Perbesar Kuas |
| `Ctrl + Z` / `Cmd + Z` | Batalkan (Undo) |
| `Ctrl + Y` / `Cmd + Y` | Ulangi (Redo) |
| `C` | Bersihkan Semua Mask |
| `Enter` | Jalankan Penghapusan Watermark |
| `V` | Buka Tampilan Slider Preview |
| `S` | Buka Tampilan Side-by-Side |
| `Tahan Spasi` | Intip (Peek) Gambar Asli di Slider |

---

## 💻 Cara Menjalankan

### Opsi 1: Menggunakan Local Server (Direkomendasikan)
Jalankan file server bawaan:
```bash
python3 server.py
```
Lalu buka browser di `http://localhost:8080`.

### Opsi 2: Buka Langsung File HTML
Cukup klik ganda atau seret file `index.html` langsung ke Google Chrome, Safari, Firefox, atau browser modern pilihan Anda.
