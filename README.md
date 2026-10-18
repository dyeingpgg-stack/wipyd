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

## Tab Mesin: unduh PDF dan PNG "Order Celup Harian" (HD)

- Tombol **Unduh PDF** dan **Unduh PNG** ada di tab Mesin (Admin dan Viewer). Hasilnya lembar **Order Celup Harian**: ringkasan di atas,
  tabel per kelompok mesin (kolom MC berisi kapasitas x 3 cycle dan persen beban), subtotal, Grand Total, Realisasi, Shift 1-3, Notes per No Benang, dan Catatan.
- **Sisa Order** diberi warna oranye (baris oranye, garis oranye di kiri, dan label SISA ORDER). Lot yang sudah celup berwarna hijau.
- STD = Kg / Cone. Shift, Group, dan Real Kg diambil dari tab Celup menurut KIKC.
- PDF: teks dan garis berupa vektor, tajam di zoom berapa pun. PNG: lebar 3840 px (4K); bila HP tidak kuat, resolusi turun otomatis (ada pemberitahuan).
- Kapasitas mesin = kapasitas per siklus x 3 siklus (mis. A18: 918 Kg x 3 = 2.754 Kg), diatur di `MESIN_KAPASITAS` dan `MESIN_SIKLUS` pada `Kode.gs`.
- Kelompok mesin diatur di `MESIN_GRUP` dan `GRUP_URUT` (dalam `index.html`).
- Pustaka PDF (jsPDF) dimuat dari internet saat tombol PDF dipakai pertama kali; PNG tidak memerlukannya.

## Tab Plan: kolom Supplier, aturan Celup, dan unduh Order Celup Harian

- Kolom **Supplier** dibaca dari sheet Plan menurut judul kolom `Supplier` (disisipkan setelah `No Benang`). Judul kolom lain tetap dicari menurut nama.
- Kolom **Celup** di tab Plan (dan status Finish di tab Mesin) memakai urutan: 1) tanggal di tab Celup (sheet CLP kolom A) menurut KIKC;
  2) jika KIKC tidak ada di tab Celup, aturan lama: kolom Celup di sheet Plan berisi tanggal (hasil input di tab Data) ditampilkan TODAY()-1; selain itu "Sisa Order"
  (hanya bila minimal satu baris sudah punya tanggal).
- Perbarui `Kode.gs` dan `index.html` bersamaan; unggah juga `sw.js` (cache v32).

## Riwayat Plan harian (sheet "Plan Harian")
- Sheet **Plan** (hasil importrange) tidak diubah. Setiap hari salinan tampilan tab Plan disimpan ke sheet baru **Plan Harian** (dibuat otomatis):
  `TANGGAL | KIKC | NO BENANG | SUPPLIER | WARNA | MESIN | ALOKASI | KG | CONE | KETERANGAN | CELUP | DISIMPAN`.
  Kolom CELUP berisi tanggal celup atau "Sisa Order", sama seperti yang terlihat di tab Plan.
- Satu tanggal = satu salinan. Salinan hari ini selalu diperbarui ke keadaan terbaru, jadi yang tersimpan adalah isi akhir hari itu.
- Penyimpanan otomatis terjadi: saat tab Plan dimuat dan isinya berubah, beberapa detik setelah alokasi diubah/direset, dan tiap malam
  (sekitar pukul 23.30) bila pemicu dipasang: **jalankan `pasangPemicuPlanHarian` sekali dari editor Apps Script** lalu setujui izin yang diminta.
- Plan yang kosong (mis. importrange sedang gagal) tidak disimpan, jadi riwayat tidak terhapus.
- Di tab Plan ada pemilih tanggal (panah, kalender, "Hari ini"). Panah memilih tanggal riwayat terdekat. Tanggal selain hari ini = riwayat, hanya lihat
  (alokasi dan Reset Alokasi dinonaktifkan). Resume dan Unduh CSV ikut tanggal yang dipilih.
- Baris dengan status **Sisa Order** diberi highlight merah di tab Plan (dan di riwayat).
- Setelah memasang `Kode.gs` baru: Deploy > Manage deployments > New version > Deploy.
