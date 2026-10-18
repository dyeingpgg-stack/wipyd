# wipyd
cek wip dyeing

## Dua link: Admin dan Viewer (tanpa login)

| | Link utama (Admin) | Link Viewer |
|---|---|---|
| Alamat | alamat aplikasi seperti biasa | `<alamat aplikasi>/viewer.html` (atau `.../index.html?mode=viewer`) |
| Dipakai oleh | pengelola data | siapa saja yang hanya perlu melihat |
| Tab Input, Ubah/Hapus data | ada | tidak ada |
| Alokasi mesin, Reset Alokasi, Ready/Stop mesin | bisa diubah | hanya terlihat |
| Tab WOD, GRM, Plan, Data, Mesin, Celup | ada | ada |
| Tombol ganti mode | ada | tidak ada (terkunci) |

- Di mode Admin ada tombol Bagikan (ikon tiga titik tersambung) di kanan atas, di sebelah tombol rotasi, mode terang/gelap, dan muat ulang. Ketuk untuk membagikan link Viewer lewat WhatsApp dan sejenisnya (atau otomatis disalin jika perangkat tidak mendukung berbagi).
- Jika memakai Apps Script, tempel ulang Kode.gs (ada fungsi baru getViewerUrl) lalu Deploy versi baru.
- Bagikan HANYA link Viewer. Link utama tetap untuk Admin.
- Tidak ada tombol ganti mode: link utama selalu Admin, link Viewer selalu Viewer.
- Link Viewer yang dipasang ke layar utama HP tetap terbuka sebagai Viewer (memakai `manifest-viewer.webmanifest`).
- Jika aplikasi dibuka lewat URL web app Apps Script (`/exec`): link Viewer = URL itu ditambah `?mode=viewer`.
- `Kode.gs` menolak permintaan tulis yang tidak membawa tanda Admin, jadi halaman Viewer tidak bisa mengubah data
  walau tombolnya tertekan.

Catatan keamanan: ini pengaman salah ketuk, bukan kunci. Orang yang tahu caranya (mis. membuka link utama) tetap bisa
masuk sebagai Admin. Untuk pengamanan sungguhan, isi `APP_PIN` di `Kode.gs` (PIN diminta untuk semua pengguna).

## Memasang pembaruan

1. Ganti isi `Kode.gs` di Apps Script, lalu: Deploy > Manage deployments > ikon pensil > Version: New version > Deploy
   (URL `/exec` tidak berubah).
2. Unggah ke hosting: `index.html`, `viewer.html`, `manifest-viewer.webmanifest`, `sw.js`. Lalu muat ulang aplikasi sekali.
   `Kode.gs` dan `index.html` harus diperbarui bersamaan.

## Tab Mesin: unduh PDF dan PNG (HD)

- Tombol **Unduh PDF** dan **Unduh PNG** ada di tab Mesin (Admin dan Viewer). Hasilnya memakai tata letak "Alokasi Mesin":
  ringkasan mesin, panel tiap mesin dengan kartu lot, kapasitas dan persen beban, lalu **Resume per Nomor Benang** di bagian bawah (No Benang, Lot, Cone, Plan Order, Realisasi, Sisa Order, Total). Judul hasil unduhan: "Order Celup".
- PDF: teks dan garis berupa vektor, jadi tetap tajam di zoom berapa pun.
- PNG: lebar 3840 px (4K). Jika HP tidak kuat membuat gambar sebesar itu, resolusi turun otomatis (ada pemberitahuan). PDF tidak terpengaruh.
- Kapasitas mesin = kapasitas per siklus x 3 siklus (3 shift, 1 lot per shift per mesin), mis. A18: 918 Kg x 3 = 2.754 Kg. Kapasitas per siklus diatur di `MESIN_KAPASITAS`, jumlah siklus di `MESIN_SIKLUS`, keduanya pada `Kode.gs` (cadangan di `MESIN_KAP` dalam `index.html`).
  Mengubah kapasitas: edit `Kode.gs`, lalu Deploy versi baru.
- Pustaka PDF (jsPDF) dimuat dari internet saat tombol PDF dipakai pertama kali; PNG tidak memerlukannya.
- Perbarui `Kode.gs` dan `index.html` bersamaan, dan unggah juga `sw.js` (versi cache v31).

## Tab Plan: kolom Supplier, aturan Celup, dan unduh Order Celup Harian

- Kolom **Supplier** dibaca dari sheet Plan menurut judul kolom `Supplier` (disisipkan setelah `No Benang`). Judul kolom lain tetap dicari menurut nama.
- Kolom **Celup** di tab Plan (dan status Finish di tab Mesin) memakai urutan: 1) tanggal di tab Celup (sheet CLP kolom A) menurut KIKC;
  2) jika KIKC tidak ada di tab Celup, aturan lama: kolom Celup di sheet Plan berisi tanggal (hasil input di tab Data) ditampilkan TODAY()-1; selain itu "Sisa Order"
  (hanya bila minimal satu baris sudah punya tanggal).
- Tombol **Unduh PDF** / **Unduh PNG** di tab Plan membuat lembar **Order Celup Harian** (kelompok mesin, subtotal, grand total, realisasi, ringkasan Shift, notes per No Benang).
  STD = Kg / Cone. Shift, Group, dan Real Kg diambil dari tab Celup menurut KIKC.
- Kelompok mesin diatur di `MESIN_GRUP` dan `GRUP_URUT` (dalam `index.html`).
- Perbarui `Kode.gs` dan `index.html` bersamaan; unggah juga `sw.js` (cache v32).
