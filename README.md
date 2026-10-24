# DyePocket
(dulu "WIP Yarn Dyeing") cek wip dyeing

## Dua link: Admin dan Viewer (tanpa login)

| | Link utama (Admin) | Link Viewer |
|---|---|---|
| Alamat | alamat aplikasi seperti biasa | `<alamat aplikasi>/viewer.html` (atau `.../index.html?mode=viewer`) |
| Dipakai oleh | pengelola data | siapa saja yang hanya perlu melihat |
| Tab Input, Ubah/Hapus data | ada | tidak ada |
| Alokasi mesin, Reset Alokasi, Ready/Stop mesin | bisa diubah | hanya terlihat |
| Tab WOD, GRM, Plan, WIP, Mesin, Celup | ada | ada |
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
- **Sisa Order kemarin**: lot yang sudah ada di Plan Harian tanggal sebelumnya dan belum celup tetap berlabel Sisa Order di Plan hari ini (tab Plan, sheet Plan Harian, dan tab Mesin), walaupun belum ada baris Plan yang bertanggal Celup. Label dihitung saat Get Plan / Save, jadi untuk tanggal yang sudah terlanjur disimpan, ulangi Create > Get Plan > Save.
- Di tab Mesin, lot Sisa Order selalu diletakkan di urutan paling atas tiap mesin (Cycle #1 dst.), disusul order aktif lain, lalu lot Finish.
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
- Perbarui `Kode.gs` dan `index.html` bersamaan; unggah juga `sw.js`.

## Plan Harian: Create > Get Plan > Save (sheet "Plan Harian")
- Tab Plan sekarang **hanya membaca sheet "Plan Harian"**. Sheet **Plan** (hasil importrange) tidak diubah dan hanya dibaca saat **Get Plan**.
- Alur membuat Plan (Admin): tab Plan > **Create** > tentukan tanggal planning > **Get Plan** (membaca sheet Plan, tampil ringkasan dan pratinjau) > **Save** (menyalin ke sheet Plan Harian).
  Get Plan tidak menulis apa pun; Save membaca ulang sheet Plan di server lalu menyimpannya.
- Sheet Plan Harian (dibuat otomatis): `TANGGAL | KIKC | NO BENANG | SUPPLIER | WARNA | MESIN | ALOKASI | KG | CONE | KETERANGAN | CELUP | DISIMPAN`.
  Tipe kolom: TANGGAL = tanggal (dd/MM/yyyy), KG = angka desimal, CONE = angka bulat, CELUP = tanggal (kecuali "Sisa Order" tetap teks), DISIMPAN = tanggal+jam (dd/MM/yyyy HH:mm).
  CELUP dihitung saat Get Plan/Save. Baris lama yang masih tersimpan sebagai teks: jalankan `rapikanPlanHarian` sekali dari editor Apps Script.
- Satu tanggal = satu salinan. Save ulang pada tanggal yang sama menggantikan salinannya (ada peringatan "Ganti & Save"); alokasi mesin yang sudah diisi pada tanggal itu dipertahankan menurut KIKC.
  Sheet Plan kosong (mis. importrange gagal) tidak disimpan, jadi salinan lama aman.
- Tanggal planning boleh hari ini atau ke depan. Plan tanggal hari ini dan ke depan: alokasi mesin dan Reset Alokasi bisa dipakai (Admin) dan disimpan di kolom ALOKASI
  Plan Harian untuk tanggal itu. Tanggal yang sudah lewat = riwayat, hanya lihat.
- Pemilih tanggal di tab Plan (panah, kalender, "Hari ini"); panah berpindah antar tanggal yang punya Plan. Resume dan Unduh CSV ikut tanggal yang dipilih.
- Tab Mesin memakai Plan tanggal yang sedang dipilih di tab Plan (awalnya hari ini). Bila tanggal itu belum dibuat, tab Mesin kosong sampai Plan dibuat lewat Create.
- Penyimpanan otomatis lama (saat tab dimuat, setelah alokasi, dan pemicu malam) dihapus. Jika dulu menjalankan `pasangPemicuPlanHarian`, jalankan `hapusPemicuPlanHarian` sekali dari editor Apps Script
  (atau biarkan: pemicu lama menghapus dirinya sendiri saat jalan berikutnya).
- Sheet **Alokasi** kini hanya menjadi isian awal kolom ALOKASI saat Get Plan (alokasi terakhir per KIKC).
- Setelah memasang `Kode.gs` baru: Deploy > Manage deployments > New version > Deploy. Unggah `index.html` dan `sw.js` (cache v43); `Kode.gs` dan `index.html` harus diperbarui bersamaan.

## Scorecard Plan dan tema PDF/PNG
- Tab Plan punya dua kartu tambahan: **Realisasi (Kg)** (Kg celup dari tab Celup menurut KIKC, dengan persen dari Plan) dan **Sisa Order (Kg)** (jumlah Kg baris berstatus Sisa Order, plus jumlah lot). Keduanya ikut pencarian dan tanggal Plan yang dipilih.
- Unduh PDF dan PNG Order Celup Harian (tab Mesin) memakai tema Green Lime Neon (palet ada di `dailyBuild`). Unggah `index.html` dan `sw.js` (cache v35).
- Judul kelompok mesin (FONG'S, LOKAL, WOO-JIN, HISAKA, THIES) tidak lagi dicetak di PDF/PNG; ringkasan jumlah mesin, lot, Kg, dan Cone per kelompok tetap ada.
- Kapasitas mesin dan "KAP. 3 CYCLE" (beserta persen beban) sementara tidak dicetak di PDF/PNG; kapasitas di tab Mesin tidak berubah.

- **Kirim WA** (tab Mesin): WhatsApp memperkecil foto hingga sisi terpanjang sekitar 1600 px dan mengompresnya, sehingga PNG 4K yang tinggi menjadi pecah. Tombol ini membuat gambar selebar 1600 px yang dipotong beberapa bagian (maks. 1600 px tinggi, dipotong di jarak antar kelompok mesin) lalu membuka menu Bagikan; pilih WhatsApp. Bila Bagikan tidak didukung, gambar diunduh. Alternatif paling tajam: kirim file PDF sebagai dokumen.
- **Kirim WA di tab Data**: sama seperti di tab Mesin, gambar selebar 1600 px dipotong tepat di batas baris (maks. 1600 px tinggi), judul kolom diulang di tiap gambar lanjutan, lalu dibagikan lewat menu Bagikan.
- **Filter tanggal di tab Mesin**: sama seperti tab Plan (panah sebelumnya / berikutnya, pilih tanggal, tombol Hari ini). Tanggal dipakai bersama tab Plan, karena alokasi mesin dihitung dari Plan tanggal itu. Judul tanggal pada PDF/PNG Order Celup Harian mengikuti tanggal yang dipilih.
- **Kirim WA langsung ke WhatsApp**: bila persiapan gambar memakan waktu hingga izin Bagikan dari browser habis, gambar tidak lagi diunduh; tombol berubah menjadi "Kirim sekarang" dan ketukan berikutnya langsung membuka menu Bagikan. Data hari sebelumnya untuk tab Data disiapkan lebih awal supaya jarang perlu langkah ini.
- **Plan terakhir tetap tampil**: bila tanggal yang dipilih (mis. besok) belum punya Plan, tab Plan dan tab Mesin menampilkan Plan terakhir yang tersimpan, lengkap dengan catatan tanggalnya, dan alokasi mesinnya masih bisa diubah. Tampilan berganti ke Plan baru setelah Create > Get Plan > Save dilakukan untuk tanggal itu (Get Plan saja hanya pratinjau).
- **Sisa Order dari Plan tanggal berapa**: kartu Sisa Order di tab Plan menampilkan "dari Plan dd/mm/yyyy" (tanggal Plan paling awal tempat lot itu belum celup); label Sisa Order di baris tabel memuat tanggal yang sama saat ditunjuk. Perlu Kode.gs v21.

## Tanggal Pack, Finish, dan tab Terlewat (v22)
- Sheet **WIP YD (Jawaban)** kini punya kolom **P = Tanggal Pack** (judul `TANGGAL PACK`; jika Anda sudah menamai sendiri, judul tidak diubah).
  Isinya diambil dari sheet **PACK** kolom **A** (Tanggal Pack), dicocokkan menurut **KIKC**. Kolom KIKC di sheet PACK dicari menurut judul `KIKC` di baris 1; jika tidak ada, dipakai kolom **B**
  (ubah `PACK_KIKC_DEFAULT` di `Kode.gs` bila KIKC ada di kolom lain). Bila satu KIKC punya beberapa tanggal Pack, yang terbaru dipakai.
  Teks tanggal di sheet PACK dibaca DD/MM/YYYY; jika berformat MM/DD/YYYY ubah `DATE_TEXT_MDY` menjadi `{ clp: true, pack: true }`.
- **Lot yang punya Tanggal Pack = Finish.** Tab **Data** menampilkan kolom **Tgl Pack** (label hijau), ringkasan jumlah lot Finish, dan filter **Belum Pack** / **Finish (Pack)**.
  Tampilan memakai data sheet PACK langsung (cache 10 menit); kolom P di sheet menjadi salinan.
- Cara kolom P terisi: otomatis saat Simpan (bila tanggal sudah ada di cache), tombol **Sinkron Tgl Pack** di tab Terlewat (Admin), atau pemicu tiap jam:
  jalankan `pasangPemicuTanggalPack` sekali dari editor Apps Script (hapus: `hapusPemicuTanggalPack`). Sinkron hanya mengisi/memperbarui, tidak pernah menghapus isi kolom P.
  **Jangan taruh rumus di kolom P**: jika ada rumus, aplikasi tidak menulis ke kolom P (rumus aman), tab Data tetap membaca sheet PACK.
- Tab baru **Terlewat**: daftar lot yang terdata pada tanggal H-1 (kemarin) tetapi tidak terdata pada tanggal terpilih (default hari ini), kecuali lot yang sudah punya Tanggal Pack.
  Ada kartu Lot kemarin / Terdata hari ini / Sudah Pack / Terlewat, pencarian, pilih tanggal, dan Unduh CSV. Diurutkan menurut posisi terakhir (CELUP, HDX, RF, WIP, KELOS, PACK).
  Lot dianggap terdata bila ada minimal satu input (posisi apa pun) pada tanggal itu.
- Uji dari editor Apps Script: `tesPack` (melihat hasil baca sheet PACK tanpa menulis).
- Pasang: ganti `Kode.gs` lalu Deploy > Manage deployments > New version; unggah `index.html` dan `sw.js` (cache v44). `Kode.gs` dan `index.html` harus diperbarui bersamaan.

## Kolom Celup tab Plan = tanggal Plan terbaru (v23)
- Lot yang ada di Plan tanggal P lalu **terinput data pada tanggal setelah P** menampilkan **CELUP = P** (mis. Plan 19/10, input 20/10 -> 19/10), bukan Sisa Order.
- Lot Sisa Order dari Plan lama (mis. 16/10) yang dibuat lagi di Plan 19/10 lalu diinput 20/10 -> CELUP = **19/10** (Plan terbaru). Aturan ini berlaku juga saat melihat Plan tanggal lama.
- "Terinput" = ada minimal satu baris di sheet Jawaban (posisi apa pun) dengan tanggal setelah tanggal Plan. Input di hari yang sama dengan Plan belum dihitung.
- Dihitung saat tab dibuka (tidak mengubah isi sheet Plan Harian); lot ini juga berstatus Finish di tab Mesin. Lot yang belum terinput tetap memakai aturan lama (tanggal tab Celup atau Sisa Order).
- Perbarui `Kode.gs` (Deploy versi baru), `index.html`, dan `sw.js` (cache v45) bersamaan.

## Aturan prioritas Celup, Plan, dan Pack (v24)
- **Tab Celup (sheet CLP) tetap master data produksi.** Kolom CELUP tab Plan dan status Finish memakai urutan: 1) tanggal di tab Celup menurut KIKC; 2) tanggal Plan terbaru yang sudah disusul input data (aturan v23);
  3) aturan lama (tanggal dari sheet Plan = kemarin, atau Sisa Order). Tanggal Plan tidak pernah menimpa tanggal tab Celup.
- **Lot yang sudah ada di tab Celup tidak bisa diplan lagi:** saat Get Plan / Save, lot yang tanggal Celup-nya SEBELUM tanggal planning dikeluarkan (jumlahnya ditampilkan di pratinjau).
  Lot yang celup pada atau setelah tanggal planning tetap ikut, supaya Plan hari itu tidak kehilangan lot yang baru saja dicelup. Plan yang sudah tersimpan tidak diubah.
- Perbarui `Kode.gs` (Deploy versi baru), `index.html`, dan `sw.js` (cache v46, lihat v25 di bawah) bersamaan.

## Sheet PACK hanya untuk kontrol (v25)
- Koreksi v24: lot yang ada di sheet PACK **tetap muncul dan bisa diinput** di tab Input (tidak disembunyikan, tidak ditolak). Sheet PACK hanya dipakai tab **Terlewat** dan penanda Finish di tab Data.
- Tab **Terlewat** memeriksa lot yang pernah terdata dalam **14 hari** sebelum tanggal pemeriksaan (ubah `TERLEWAT_HARI` di `Kode.gs`) tetapi **tidak terdata pada tanggal itu**, kecuali yang sudah ada di sheet PACK (Tanggal Pack pada/ sebelum tanggal itu).
  Contoh: AHN26J001 terdata di posisi CELUP kemarin, hari ini tidak diinput, dan tidak ada di sheet PACK -> muncul.
- Kolom **Lewat** menunjukkan sudah berapa hari sejak input terakhir (urut paling lama dulu); kolom Posisi terakhir menunjukkan posisi saat terakhir diinput.
- **Notifikasi:** angka merah di tab Terlewat (jumlah lot terlewat hari ini) dan pemberitahuan sekali saat aplikasi dibuka. Angka diperbarui setelah input terkirim atau tombol muat ulang.
- Perbarui `Kode.gs` (Deploy versi baru), `index.html`, dan `sw.js` (cache v47) bersamaan.

## Filter Pack disembunyikan (v26)
- Filter **Belum Pack** / **Finish (Pack)** di tab Data disembunyikan sementara. Untuk menampilkan lagi, ubah `SHOW_PACK_FILTER` menjadi `true` di `index.html`. Kolom Tgl Pack dan tab Terlewat tidak berubah. Cache `sw.js` v48.

## Terlewat hanya untuk Admin (v27)
- Tab **Terlewat** (termasuk angka notifikasinya) disembunyikan di mode Viewer, dan server menolak `getTerlewat` tanpa tanda Admin. Perbarui `Kode.gs` (Deploy versi baru), `index.html`, dan `sw.js` (cache v49) bersamaan.
- **PDF/PNG Order Celup Harian lebih ringkas**: judul, kartu ringkasan, dan ringkasan bawah (Grand Total, Realisasi, Shift) dikecilkan. Pada judul, tanggal besar = hari order celup dan tepat di bawahnya tertulis "ORDER TANGGAL dd/mm/yyyy" (tanggal Plan yang dipakai alokasi mesin, bisa lebih lama bila Plan baru belum dibuat). Baris lot memakai huruf lebih besar (hingga 9 pt) dengan lebar kolom dihitung otomatis dari isi data, sehingga kolom rapat dan teks tidak terpotong.
- **PDF/PNG Order Celup Harian, ukuran huruf dimaksimalkan**: kolom Keterangan disamakan lebarnya dengan kolom Konsumsi, lalu huruf baris lot dibuat sebesar mungkin (hingga 11 pt) selama semua kolom masih muat selebar halaman; sisa lebar dibagi rata ke semua kolom. Resume No. Benang (Notes) memakai ukuran huruf dan tinggi baris yang mengikuti huruf lot.
- **PDF/PNG Order Celup Harian, huruf judul dan kartu mengisi bentuknya**: judul (hingga 30 pt), kartu ringkasan atas (angka hingga 24 pt), serta kartu Grand Total, Realisasi, dan Shift Group di bawah dibuat dengan huruf yang lebih besar sehingga tidak ada ruang kosong. Angka besar otomatis mengecil bila terlalu lebar untuk kartunya.

## Pembaruan v28 (Plan terbaca ulang, pencarian semua tanggal, Mesin, halaman 2)
- **Plan membaca ulang isian yang kosong.** Isian kosong di salinan "Plan Harian" (No Benang, Supplier, Warna, Mesin, Kg, Cone, Keterangan) dilengkapi otomatis saat tab Plan dibuka dari sheet "Plan" yang terbaru, lalu dari tab WOD. Isian yang sudah terisi tidak diganti, dan sheet "Plan Harian" tidak ditulis ulang. Tombol muat ulang membaca sheet "Plan" langsung (tanpa cache 90 detik).
- **Pencarian menelusuri semua tanggal**: tab Data (seluruh sheet Jawaban, 500 hasil terbaru), tab Plan (seluruh Plan Harian, kolom TANGGAL ikut tampil), tab Mesin (hasil berupa kartu lot lintas tanggal Plan). Tab WOD, GRM, dan Celup memang sudah mencari di seluruh daftar. Tab Terlewat tetap per tanggal pemeriksaan.
- **Ubah Mesin di tab Data** kini dicatat sebagai alokasi mesin lot itu (sheet "Alokasi" dan kolom ALOKASI pada Plan Harian terbaru yang memuat lot): tab Mesin dan Plan ikut berubah, dan tidak ada dua sumber yang bentrok. Kolom Mesin di tab Data menampilkan alokasi lebih dulu, lalu tab Celup, Plan, dan isian sheet.
- **Tampilan HP potret:** tombol Create, Resume, Reset Alokasi, dan Unduh CSV tidak lagi tertutup keterangan "Plan ...".
- **Tema default = mode malam** (tidak lagi mengikuti pengaturan perangkat). Pilihan lewat tombol tema tetap tersimpan.
- **Halaman 2** (tombol lapisan di kanan atas): tab **Pack** (sheet PACK) dan **RPH** (sheet RPH), isi ditampilkan sesuai judul kolom baris 1, tanggal DD/MM/YYYY, terbaru di atas, cari di semua baris. PWA: `page2.html`; Apps Script: file HTML bernama `Page2` (isi sama dengan `page2.html`), dibuka lewat `?page=2`.
- Pasang: `Kode.gs` (Deploy versi baru), `index.html`, `page2.html`, `sw.js` (cache v56). Di Apps Script tambahkan file HTML `Page2` selain `Index`.

## Perbaikan menu tab terpotong di HP (v29)
- Pada layar HP, bingkai aplikasi dikunci ke tepi layar (`position:fixed`) menggantikan tinggi 100dvh, sehingga menu tab di bawah tidak lagi terpotong. Hanya `index.html`, `page2.html`, dan `sw.js` (cache v57) yang berubah.

## Pembaruan v30
- **Tab Data:** pencarian menelusuri semua tanggal. Selama mencari, tabel tidak lagi menampilkan data satu hari sebagai hasil; tekan Enter untuk mencari segera. Bila `Kode.gs` di server belum versi terbaru, pencarian memakai 300 data terakhir dan muncul pesan agar `Kode.gs` di-deploy ulang.
- **Halaman 2:** urutan tab RPH lalu Pack (tab Halaman 1 dihapus; kembali lewat ikon rumah). Kolom KIKC dipindah ke posisi pertama (kolom beku). Tiap tab punya **Periode** (tanggal awal s/d akhir menurut kolom tanggal sheet, default tanggal 1 bulan berjalan s/d hari ini, tombol "Bulan ini"). Kata kunci pencarian menelusuri semua tanggal dan mengabaikan periode (maks. 2.000 hasil).
- Perbarui `Kode.gs` (Deploy versi baru), `index.html`, `page2.html`, `sw.js` (cache v58).


## Perubahan terbaru: DyePocket, tab WIP, resume RPH, tab Delivery

- Nama aplikasi sekarang **DyePocket**. Tab **Data** diganti nama menjadi **WIP** (isi tab tidak berubah).
- **Halaman 2 > RPH**: tombol **Resume per No Benang** (di bawah kolom pencarian). Isinya JNS & NO BENANG, jumlah lot (KIKC), Qty (Kg), Cones, dan % Kg,
  diurutkan dari Kg terbesar, dengan baris TOTAL. Resume mengikuti periode tanggal atau kata kunci pencarian yang sedang dipakai. Tombol **Daftar** kembali ke tabel biasa.
- **Halaman 2 > Delivery** (baru, Admin dan Viewer): lama proses = **tanggal pack (sheet PACK) - tanggal celup (tab Celup / sheet CLP)**.
  - lama <= 5 hari: **Tepat waktu**; 6-7 hari: **Toleransi**; lebih dari 7 hari: **Terlambat**.
  - Persentase Ketepatan Delivery = lot tepat waktu / semua lot yang bisa dihitung (jumlah lot), ditambah persen dalam batas 7 hari, rata-rata lama, dan persen Kg tepat waktu.
  - Periode menurut **tanggal pack** (default bulan ini). Ada pencarian dan saringan status. Kolom LEWAT BATAS = berapa hari melewati batas 5 hari.
  - Jika satu KIKC celup lebih dari sekali, tanggal celup PERTAMA dipakai; jika dipack beberapa kali, tanggal pack TERAKHIR dipakai.
  - Lot tanpa tanggal celup di tab Celup, atau pack lebih awal dari celup, berstatus **Cek data** dan tidak ikut persentase.
  - Batas hari diatur di `Kode.gs`: `DELIVERY_BATAS_HARI` (5) dan `DELIVERY_TELAT_HARI` (7).
- Pemasangan: ganti isi `Kode.gs` di Apps Script lalu Deploy versi baru (ada fungsi baru `getDelivery`); unggah `index.html`, `page2.html`, `viewer.html`, `manifest*.webmanifest`, `sw.js`.
  Nama sheet data "WIP YD (Jawaban)" sengaja TIDAK diganti agar data lama tetap terbaca.
