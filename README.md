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
