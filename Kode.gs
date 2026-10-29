/**
 * DyePocket (dulu WIP Yarn Dyeing) - Kode.gs  (v44: tab WIP: Tgl Celup lot tanpa Plan dibaca langsung dari tab Celup (CLP) bila peta daftar tidak memuatnya; tab GRM bersumber dari sheet WOD, hanya JCONE = HANK, tanpa filter status; v40: tab GRM: kolom virtual TGL CELUP dan TGL PACK + scorecard Belum Celup / Celup / Terpacking; v39: tab Plan/Mesin: Plan terakhir hanya dibawa ke hari ini sampai jam 10.00 lalu kosong sampai Create Plan baru, info "Belum ada Plan tanggal..." dihapus; v38: tab "Terlewat" diganti nama menjadi "Outstanding"; v37: tab SOFT Page 2 = Edit/Hapus baris (updateSoft, deleteSoft) + pintasan ke Input SOFT; Outstanding: lot yang disebut "EX.<KIKC>" di keterangan PACK dianggap sudah Pack; getPageUrl/doGet: tab awal Home (inputsoft, miss); v36: tab WIP: Tgl Celup = kolom CELUP Plan dulu, baru tab Celup; tab Plan: kolom virtual SISA ORDER / PENDING (sheet "Status Lot"); tombol SOFT di Input membuka tab SOFT Page 2; v35: tab SOFT di Page 2 = tabel data dari sheet SOFT (getSheetList 'soft'), daftar SUP selalu dibaca segar saat form SOFT dibuka; v34: sheet SUP = dua daftar terpisah (kolom A Benang, kolom B Supplier), form SOFT bisa menambah benang/supplier baru ke SUP; v33: laporan STOCK WIP SOFT WINDING HARIAN di Page 2 (getSoftHari); v32: form Input SOFT (sheet SUP -> sheet SOFT); v31: referensi KIKC tab Input = WOD + RPH + GRM; v30: ganti nama jadi DyePocket, tab Data jadi WIP, tab Delivery (getDelivery) di Page 2; v29: Page 2: filter periode tanggal (default bulan berjalan) dan pencarian semua tanggal untuk Pack/RPH; v28: isian kosong di Plan Harian dilengkapi otomatis dari sheet Plan/WOD saat dibaca; pencarian Data/Plan/Mesin di semua tanggal (cariData, cariPlan); ubah Mesin di tab Data ikut alokasi mesin (tab Mesin/Plan); Page 2 (Pack, RPH): getSheetList, getPageUrl; v27: batas Sisa Order: CELUP kosong sampai pukul 09:00 hari sesudah tanggal Plan = "Sisa Order" (SISA_JAM); v26: tab Outstanding hanya untuk mode Admin (getTerlewat menolak permintaan tanpa tanda Admin); v25: sheet PACK hanya untuk kontrol tab Outstanding (lot Pack tetap bisa diinput); Outstanding memeriksa lot yang terdata dalam TERLEWAT_HARI hari sebelumnya; v24: tanggal tab Celup (CLP) tetap prioritas utama kolom CELUP; lot yang sudah celup sebelum tanggal planning tidak masuk Plan; v23: kolom CELUP tab Plan = tanggal Plan Harian terbaru yang sudah disusul input data (bukan "Sisa Order"); v22: kolom P "Tanggal Pack" di sheet Jawaban (diisi dari sheet PACK kolom A menurut KIKC) = tanda lot Finish; tab baru Outstanding = lot yang terdata kemarin tapi tidak terdata hari ini, kecuali sudah ada Tanggal Pack; v21: tab Plan menampilkan Plan terakhir bila tanggal itu belum dibuat, dan tanggal Plan asal lot Sisa Order; v20: label "Sisa Order" tetap tampil untuk lot sisa Plan hari sebelumnya yang masih ada di Plan hari ini (tab Plan, Plan Harian, Mesin); v19: tab Plan membaca sheet "Plan Harian"; Create > Get Plan (baca sheet Plan) > Save (simpan ke Plan Harian per tanggal); alokasi mesin per tanggal. v18: riwayat Plan harian di sheet baru "Plan Harian" (tab Plan bisa dilihat per tanggal); sheet "Plan" (importrange) tidak diubah. v17: kolom Supplier di tab Plan (setelah No Benang). v16: kapasitas mesin per siklus (MESIN_KAPASITAS) x 3 siklus (MESIN_SIKLUS) dikirim ke tab Mesin untuk unduh PDF/PNG HD. v15: mode Admin / Viewer tanpa login. v14: semua tanggal DD/MM/YYYY, tab baru Plan; kolom TANGGAL di tab WOD/GRM/CLP setelah KIKC; tab WOD, GRM, Plan, Celup hanya baca + terbaru di atas + cache cepat, WOD tanpa mesin BAK-, tanpa input Cone; antrean simpan, cache KIKC, KIKC baru manual, Posisi/QC tanpa nomor urut)
 *
 * Sumber referensi KIKC (dua sheet, WOD diutamakan):
 *   Sheet "WOD": C = KIKC | D = No Benang | E = Warna | F = Kg | G = Cone | I = Mesin | L = Keterangan KIKC
 *   Sheet "GRM": A = Tanggal Celup | B = KIKC | C = No Benang | D = Warna | E = Mesin | F = Kg | G = Cone | H = Keterangan KIKC
 *   Server selalu mengambil ulang data KIKC dari sheet (tidak percaya kiriman browser).
 *   Jika satu KIKC ada di WOD dan GRM, data WOD yang dipakai.
 *   v31: tab Input juga mencari KIKC di sheet RPH (kolom menurut judul baris 1). Urutan prioritas: WOD, RPH, GRM.
 *
 * Tab daftar (hanya baca, ditampilkan di tab bawah aplikasi):
 *   Urutan kolom tampil (TANGGAL selalu setelah KIKC, format DD/MM/YYYY):
 *   WOD : C KIKC | A TANGGAL | D NO BENANG | E WARNA | F KG | G CONE | I MESIN | K SUPPLIER | L KETERANGAN
 *         hanya baris berstatus "B" di kolom O, dan MESIN tidak berisi "BAK-" (BAK-1, BAK-2, BAK-3, ...)
 *   GRM : B KIKC | A TANGGAL | C NO BENANG | D WARNA | E MESIN | F KG | G CONE | H KETERANGAN
 *   CLP : B KIKC | A TANGGAL | C NO BENANG | D WARNA | E MESIN | F KG | G CONE | H SHIFT | I GRUP | J KET
 *   Plan: kolom dicari menurut judul baris 1 (ALOKASI memakai sheet "Alokasi" per KIKC, bukan kolom Plan): A KIKC | B NO BENANG | C WARNA | D MESIN | E KG | F CONE | G KETERANGAN | H CELUP  (urutan kolom sheet "Plan" = urutan tampil)
 *
 * Tab Data (identitas lot): No Benang, Warna, Mesin, Kg, Cone, Keterangan KIKC, Shift, Grup diambil per kolom dengan prioritas
 *   1. tab Celup (CLP)  2. tab Plan (Mesin: Alokasi dulu, jika kosong kolom Mesin)  3. nilai tersimpan di sheet Jawaban (asal WOD/GRM).  Sheet Jawaban tidak diubah.
 *
 * Format tanggal: semua tanggal yang tampil di aplikasi (kolom TANGGAL/CELUP dan Waktu di tab Data) selalu DD/MM/YYYY.
 *   - Sel tanggal asli di Sheet (Date) diformat langsung, tidak bergantung format tampilan sheet.
 *   - Sel berisi TEKS: sheet CLP dibaca sebagai MM/DD/YYYY (sesuai isi sheet CLP), sheet lain sebagai DD/MM/YYYY.
 *     Pengaturannya ada di DATE_TEXT_MDY di bawah.
 * WOD, GRM, CLP diurutkan dari TANGGAL (kolom A) terbaru; tanggal sama: baris paling bawah di sheet lebih dulu.
 * Plan tidak punya kolom tanggal urut: baris paling bawah di sheet tampil paling atas.
 *
 * Sheet "WIP YD (Jawaban)":
 *   A Timestamp | B ID UNIK | C KIKC | D No Benang | E Warna | F Mesin | G Kg | H Cone
 *   I Shift | J Grup | K Posisi | L QC | M Note QC | N Keterangan | O Ket KIKC (otomatis)
 *
 * Posisi dan QC disimpan TANPA nomor urut: CELUP, HDX, RF, WIP, KELOS, PACK / LAYAK, UJI QC, TIDAK LAYAK.
 * Data lama yang masih "1. CELUP" dll: jalankan fungsi hapusNomorUrutLama() sekali dari editor Apps Script.
 *
 * Mode Admin / Viewer (tanpa login):
 *   Aplikasi punya dua mode. Admin (link utama) boleh Input, Ubah, Hapus, Alokasi mesin, dan Ready/Stop mesin; Viewer hanya melihat data.
 *   Link Viewer terpisah: <alamat aplikasi>/viewer.html atau <alamat aplikasi>/index.html?mode=viewer (URL web app Apps Script: tambahkan ?mode=viewer).
 *   Fungsi yang mengubah data (saveData, updateRowData, deleteData, setAlokasi, resetAlokasi, setMesinStop) menolak permintaan
 *   yang tidak membawa tanda mode "admin", jadi halaman Viewer (atau halaman lama yang belum dimuat ulang) tidak bisa mengubah data walau tombolnya tertekan.
 *   Ini pengaman agar tidak salah ketuk, BUKAN pengamanan terhadap orang yang sengaja: siapa pun yang tahu cara kerjanya bisa memilih mode Admin.
 *   Untuk pengamanan sungguhan, isi APP_PIN di bawah (PIN diminta untuk semua pengguna aplikasi).
 *
 * Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 * Setiap mengubah kode ini: Deploy > Manage deployments > ikon pensil > Version: New version > Deploy.
 * Dengan cara itu URL /exec TIDAK berubah. Jangan pilih "New deployment" karena URL-nya ikut baru.
 */
const SPREADSHEET_ID = '13M-SaO4YYpnSke--WFHYSrA5X7NlKjj0IFDxHKHOpIY';
const SHEET_WOD = 'WOD';
const SHEET_GRM = 'GRM';
const SHEET_CLP = 'CLP';
const SHEET_PLAN = 'Plan';
const SHEET_PLAN_HARIAN = 'Plan Harian';   // riwayat Plan per hari (salinan tampilan tab Plan, termasuk alokasi dan Celup / Sisa Order)
const SHEET_STATUS_LOT = 'Status Lot';   // kolom virtual tab WIP: SISA ORDER / PENDING per KIKC (A KIKC | B STATUS | C TANGGAL | D DIUBAH); sheet Jawaban tidak berubah
const SHEET_ALOKASI = 'Alokasi';   // penyimpanan alokasi mesin per KIKC (tidak terpengaruh perubahan sheet Plan)
const SHEET_JAWABAN = 'WIP YD (Jawaban)';
const SHEET_RPH = 'RPH';           // Page 2: tab RPH (isi sheet ditampilkan apa adanya menurut judul kolom baris 1)
const SHEET_PACK = 'PACK';         // sumber Tanggal Pack: kolom A = Tanggal Pack, kolom KIKC dicari menurut judul baris 1 (jika tidak ada: kolom B)
const PACK_DATE_COL = 1;           // kolom A = Tanggal Pack
const PACK_KIKC_DEFAULT = 2;       // kolom B = KIKC bila judul "KIKC" tidak ditemukan di baris 1 sheet PACK
const PACK_TTL = 600;              // cache peta KIKC -> Tanggal Pack (detik)
const WOD_FIRST_COL = 3;         // kolom C = KIKC
const WOD_WIDTH = 10;            // C..L
const GRM_FIRST_COL = 2;         // kolom B = KIKC
const GRM_WIDTH = 7;             // B..H
const WOD_LIST_FIRST_COL = 1;    // tab WOD dibaca dari kolom A (TANGGAL)
const WOD_LIST_WIDTH = 15;       // A..O (O = status)
const WOD_STATUS_IDX = 14;       // kolom O di dalam A..O
const WOD_KIKC_IDX = 2;          // kolom C di dalam A..O
const WOD_JCONE_IDX = 19;        // kolom T "JCONE" (indeks dari kolom A)
const GRM_JCONE_HANK = 'HANK';   // tab GRM: hanya baris WOD yang JCONE-nya berisi teks ini
const GRM_LIST_FIRST_COL = 1;    // tab GRM dibaca dari kolom A (TANGGAL)
const GRM_LIST_WIDTH = 8;        // A..H
const WOD_STATUS_SHOW = 'B';     // hanya baris berstatus ini yang tampil di tab WOD
const WOD_MESIN_IDX = 8;         // kolom I di dalam A..O
const WOD_HIDE_MESIN = 'BAK-';   // baris WOD dengan mesin berisi teks ini disembunyikan dari tab WOD
const CLP_FIRST_COL = 1;         // kolom A = TANGGAL
const CLP_WIDTH = 10;            // A..J (J = KET)
const PLAN_FIRST_COL = 1;        // kolom A = KIKC
const PLAN_WIDTH = 8;            // A..H (H = CELUP)
const DATE_TEXT_MDY = { clp: true, pack: false };   // sheet yang menyimpan tanggal sebagai TEKS MM/DD/YYYY (selain itu dibaca DD/MM/YYYY)
const MAX_ROWS = 300;
const TOKEN_SALT = 'wipyd-v1';
const APP_PIN = '';              // OPSIONAL: isi mis. '2468'. Kosong = tanpa PIN.
const MODE_PC = 'pc';             // mode PC: hanya boleh Input SOFT (saveSoft, updateSoft, deleteSoft); lihat needSoft_
const MODE_ADMIN = 'admin';       // tanda yang dikirim aplikasi saat berada di mode Admin
const HEADERS = ['Timestamp', 'ID UNIK', 'KIKC', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'SHIFT', 'GRUP', 'POSISI', 'QC', 'NOTE QC', 'KETERANGAN', 'KET KIKC', 'TANGGAL PACK'];
const TOTAL_COLS = 16;
const COL_KET = 14;
const COL_KET_KIKC = 15;
const COL_PACK = 16;             // kolom P = Tanggal Pack (diisi dari sheet PACK)

// ================= 1. Render HTML + API =================
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.fn === 'ping') return json_({ ok: true, result: 'pong' });
  let page = HtmlService.createHtmlOutputFromFile(str_(p.page) === '2' ? 'Page2' : 'Index');   // ?page=2 = Page 2 (Pack, RPH)
  // Link Viewer: <URL web app>?mode=viewer. Halaman Apps Script berada di dalam iframe sehingga ?mode= tidak terbaca oleh halaman,
  // jadi server menyisipkan tandanya. Tanpa ?mode= (link utama) aplikasi terbuka sebagai Admin.
  const want = str_(p.mode).toLowerCase();
  if (want === 'viewer' || want === 'admin' || want === 'pc') {
    page = HtmlService.createHtmlOutput(page.getContent().replace('<head>', '<head><script>window.WIPYD_FORCE_MODE="' + want + '";</script>'));
  }
  const tab = str_(p.tab).toLowerCase();
  if (str_(p.page) === '2' && /^(rph|pack|delivery|soft)$/.test(tab)) {   // tab awal Page 2 (mis. tombol SOFT di Input)
    page = HtmlService.createHtmlOutput(page.getContent().replace('<head>', '<head><script>window.WIPYD_TAB="' + tab + '";</script>'));
  }
  if (str_(p.page) !== '2' && /^(inputsoft|miss)$/.test(tab)) {   // tab awal Home (tombol di Page 2: Input SOFT, Outstanding)
    page = HtmlService.createHtmlOutput(page.getContent().replace('<head>', '<head><script>window.WIPYD_HOMETAB="' + tab + '";</script>'));
  }
  return page
    .setTitle('DyePocket')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const API_FUNCS = {
  getKikcData: function () { return getKikcData(); },
  getViewerUrl: function () { return getViewerUrl(); },
  getData: function (a) { return getData(a[0]); },
  saveData: function (a) { return saveData(a[0]); },
  updateRowData: function (a) { return updateRowData(a[0]); },
  deleteData: function (a) { return deleteData(a[0], a[1], a[2]); },
  getList: function (a) { return getList(a[0], a[1]); },
  getLists: function (a) { return getLists(a[0]); },
  setAlokasi: function (a) { return setAlokasi(a[0], a[1], a[2], a[3], a[4]); },
  resetAlokasi: function (a) { return resetAlokasi(a[0], a[1]); },
  getPlanSource: function (a) { return getPlanSource(a[0], a[1]); },
  savePlanTanggal: function (a) { return savePlanTanggal(a[0], a[1]); },
  getPlanHari: function (a) { return getPlanHari(a[0], a[1], a[2]); },
  cariData: function (a) { return cariData(a[0], a[1]); },
  cariPlan: function (a) { return cariPlan(a[0]); },
  getSheetList: function (a) { return getSheetList(a[0], a[1], a[2], a[3], a[4]); },
  getDelivery: function (a) { return getDelivery(a[0], a[1], a[2]); },
  getSoftRef: function (a) { return getSoftRef(a[0]); },
  saveSoft: function (a) { return saveSoft(a[0]); },
  updateSoft: function (a) { return updateSoft(a[0]); },
  deleteSoft: function (a) { return deleteSoft(a[0]); },
  getSoftHari: function (a) { return getSoftHari(a[0]); },
  getPageUrl: function (a) { return getPageUrl(a[0], a[1], a[2]); },
  setStatusLot: function (a) { return setStatusLot(a[0], a[1], a[2]); },
  getPlanTanggal: function () { return getPlanTanggal(); },
  getTerlewat: function (a) { return getTerlewat(a[0], a[1], a[2]); },
  syncTanggalPack: function (a) { return syncTanggalPack(a[0]); },
  getMesinStop: function () { return { success: true, stop: readMesinStop_(), kap: MESIN_KAPASITAS, siklus: MESIN_SIKLUS }; },
  setMesinStop: function (a) { return setMesinStop(a[0], a[1], a[2]); }
};

// Alamat link Viewer (URL web app + ?mode=viewer). Dipakai tombol Bagikan di aplikasi Admin.
function getViewerUrl() {
  const u = ScriptApp.getService().getUrl();
  return u ? u + '?mode=viewer' : '';
}

// Alamat halaman aplikasi (URL web app + ?page=2 dan/atau ?mode=viewer). Dipakai tombol pindah halaman.
function getPageUrl(page, mode, tab) {
  const u = ScriptApp.getService().getUrl();
  if (!u) return '';
  const q = [];
  if (String(page) === '2') q.push('page=2');
  if (str_(mode) === 'viewer' || str_(mode) === 'pc') q.push('mode=' + str_(mode));
  if (String(page) === '2' && /^(rph|pack|delivery|soft)$/.test(str_(tab).toLowerCase())) q.push('tab=' + str_(tab).toLowerCase());
  if (String(page) !== '2' && /^(inputsoft|miss)$/.test(str_(tab).toLowerCase())) q.push('tab=' + str_(tab).toLowerCase());   // Home: tab awal Input SOFT / Outstanding
  return u + (q.length ? '?' + q.join('&') : '');
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (APP_PIN && String(req.pin || '') !== String(APP_PIN)) {
      return json_({ ok: false, code: 'PIN', error: 'PIN salah atau belum diisi.' });
    }
    const f = Object.prototype.hasOwnProperty.call(API_FUNCS, req.fn) ? API_FUNCS[req.fn] : null;
    if (!f) return json_({ ok: false, error: 'Fungsi tidak dikenal: ' + req.fn });
    return json_({ ok: true, result: f(req.args || []) });
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ================= Helper =================
// Spreadsheet dibuka SEKALI per permintaan (sebelumnya dibuka 3x saat simpan, tiap pembukaan memakan waktu).
let SS_ = null;
function ss_() { return SS_ || (SS_ = SpreadsheetApp.openById(SPREADSHEET_ID)); }

function normName_(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function findSheet_(ss, name) {
  const direct = ss.getSheetByName(name);   // cepat; pemindaian semua tab hanya jika nama tidak persis sama
  if (direct) return direct;
  const want = normName_(name);
  const all = ss.getSheets();
  for (let i = 0; i < all.length; i++) {
    if (normName_(all[i].getName()) === want) return all[i];
  }
  return null;
}

function getWodSheet_() {
  const ss = ss_();
  const sh = findSheet_(ss, SHEET_WOD);
  if (!sh) {
    const names = ss.getSheets().map(function (s) { return s.getName(); }).join(', ');
    throw new Error('Tab "' + SHEET_WOD + '" tidak ditemukan di spreadsheet "' + ss.getName() +
      '". Tab yang ada: ' + names + '. Cek nama tab atau SPREADSHEET_ID di Kode.gs.');
  }
  if (sh.getMaxColumns() < WOD_FIRST_COL) throw new Error('Kolom C (KIKC) tidak ada di sheet WOD.');
  return sh;
}

function getJawabanSheet_(createIfMissing) {
  const ss = ss_();
  let sheet = findSheet_(ss, SHEET_JAWABAN);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(SHEET_JAWABAN);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, TOTAL_COLS).setFontWeight('bold').setBackground('#d9ead3');
  }
  return sheet;
}

// Kolom sampai O + header "KET KIKC". Pengecekan berat hanya jalan jika sheet belum siap
// (ditandai di Script Properties), jadi simpan data tidak perlu membaca header setiap kali.
function ensureColumns_(sheet) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('colsOk5') === '1' && sheet.getMaxColumns() >= TOTAL_COLS) return;
  if (sheet.getMaxColumns() < TOTAL_COLS) sheet.insertColumnsAfter(sheet.getMaxColumns(), TOTAL_COLS - sheet.getMaxColumns());
  [COL_KET_KIKC, COL_PACK].forEach(function (c) {
    const h = sheet.getRange(1, c).getDisplayValue();
    if (!String(h).trim()) sheet.getRange(1, c).setValue(HEADERS[c - 1]).setFontWeight('bold').setBackground('#d9ead3');
  });
  // Format kolom diatur SEKALI untuk seluruh kolom, jadi setiap simpan tidak perlu mengatur format sel lagi.
  try {
    sheet.getRangeList(['C:F', 'I:O']).setNumberFormat('@');
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange(2, COL_PACK, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('dd/MM/yyyy');
  } catch (e) { /* abaikan jika dikunci */ }
  // Jika kolom P sudah berisi RUMUS (mis. ARRAYFORMULA), aplikasi tidak menulis ke kolom P agar rumusnya tidak rusak.
  try {
    const n = Math.max(1, Math.min(5, sheet.getMaxRows() - 1));
    const fm = sheet.getRange(2, COL_PACK, n, 1).getFormulas();
    props.setProperty('packFormula', fm.some(function (r) { return r[0]; }) ? '1' : '0');
  } catch (e) { /* abaikan */ }
  props.setProperty('colsOk5', '1');
}

function str_(v) { return (v === undefined || v === null) ? '' : String(v); }

// Fungsi yang mengubah data hanya jalan jika aplikasi berada di mode Admin (lihat catatan "Mode Admin / Viewer" di atas).
function needAdmin_(mode) {
  if (str_(mode) !== MODE_ADMIN) {
    throw new Error('Mode Viewer: data hanya bisa dilihat. Ganti ke mode Admin untuk menyimpan, mengubah, atau menghapus data.');
  }
}

// Input / ubah / hapus SOFT boleh dari mode Admin dan mode PC.
function needSoft_(mode) {
  const m = str_(mode);
  if (m !== MODE_ADMIN && m !== MODE_PC) {
    throw new Error('Mode Viewer: data hanya bisa dilihat. Gunakan link Admin atau PC untuk menyimpan, mengubah, atau menghapus data SOFT.');
  }
}

function need_(v, label) {
  if (!str_(v).trim()) throw new Error(label + ' wajib diisi.');
}

// Buang nomor urut di depan: "1. CELUP" -> "CELUP", "3. TIDAK LAYAK" -> "TIDAK LAYAK"
function stripNum_(v) { return str_(v).replace(/^\s*\d+\s*[.)]\s*/, '').trim(); }

function mapWod_(r) {
  return {
    kikc: str_(r[0]).trim(), noBenang: str_(r[1]).trim(), warna: str_(r[2]).trim(),
    kg: str_(r[3]).trim(), cone: str_(r[4]).trim(), mesin: str_(r[6]).trim(), ketKikc: str_(r[9]).trim()
  };
}

function mapGrm_(r) {
  return {
    kikc: str_(r[0]).trim(), noBenang: str_(r[1]).trim(), warna: str_(r[2]).trim(),
    mesin: str_(r[3]).trim(), kg: str_(r[4]).trim(), cone: str_(r[5]).trim(), ketKikc: str_(r[6]).trim()
  };
}

function getGrmSheet_() {
  const sh = findSheet_(ss_(), SHEET_GRM);
  if (!sh || sh.getMaxColumns() < GRM_FIRST_COL) return null;
  return sh;
}

// Cari satu KIKC. Jalur cepat: TextFinder (pencarian di sisi Google, tanpa mengunduh seluruh kolom).
// Jika tidak ketemu (mis. sel berspasi di ujung), jatuh ke pemindaian penuh seperti sebelumnya.
function findInSheet_(sheet, firstCol, width, mapFn, want) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const nCols = Math.min(width, sheet.getMaxColumns() - firstCol + 1);
  const colRange = sheet.getRange(2, firstCol, lastRow - 1, 1);

  const hit = colRange.createTextFinder(want).matchEntireCell(true).matchCase(true).findNext();
  if (hit) {
    const r = sheet.getRange(hit.getRow(), firstCol, 1, nCols).getDisplayValues()[0];
    const item = mapFn(padRow_(r, width));
    if (item.kikc === want) return item;
  }
  const col = colRange.getDisplayValues();
  for (let i = 0; i < col.length; i++) {
    if (str_(col[i][0]).trim() === want) {
      const r = sheet.getRange(i + 2, firstCol, 1, nCols).getDisplayValues()[0];
      return mapFn(padRow_(r, width));
    }
  }
  return null;
}

// ---- Sheet RPH sebagai sumber referensi KIKC (setelah WOD, sebelum GRM) ----
// Kolom dicari menurut JUDUL di baris 1: KIKC | (JNS &) NO BENANG | WARNA | QTY (KG) | CONES | M/C | KETERANGAN. Jika satu KIKC tampil beberapa kali di RPH, baris paling BAWAH (terbaru) dipakai.
function rphCols_(sh) {
  const lastC = Math.min(sh.getLastColumn(), 40);
  if (lastC < 1) return null;
  const head = sh.getRange(1, 1, 1, lastC).getDisplayValues()[0].map(function (x) { return str_(x).replace(/\s+/g, ' ').trim().toLowerCase(); });
  const find = function (re) { for (let i = 0; i < head.length; i++) { if (re.test(head[i])) return i; } return -1; };
  const c = { kikc: find(/^kikc$/), noBenang: find(/benang/), warna: find(/^warna/), kg: find(/^(qty|kg|berat)\b/), cone: find(/^cones?\b/), mesin: find(/^(m\/c|mc|mesin)\b/), ket: find(/^(ket|keterangan|catatan|remark)/), n: lastC };
  return c.kikc < 0 ? null : c;
}
function mapRph_(r, c) {
  const g = function (i) { return i < 0 ? '' : str_(r[i]).trim(); };
  return { kikc: g(c.kikc), noBenang: g(c.noBenang), warna: g(c.warna), kg: g(c.kg), cone: g(c.cone), mesin: g(c.mesin), ketKikc: g(c.ket) };
}
function findInRph_(want) {
  const sh = findSheet_(ss_(), SHEET_RPH);
  if (!sh || sh.getLastRow() < 2) return null;
  const c = rphCols_(sh);
  if (!c) return null;
  const last = sh.getLastRow(), col = sh.getRange(2, c.kikc + 1, last - 1, 1).getDisplayValues();
  for (let i = col.length - 1; i >= 0; i--) {
    if (str_(col[i][0]).trim() === want) return mapRph_(sh.getRange(i + 2, 1, 1, c.n).getDisplayValues()[0], c);
  }
  return null;
}

// WOD dulu, lalu RPH, jika tidak ada baru GRM.
function lookupKikc_(kikc) {
  const want = str_(kikc).trim();
  if (!want) return null;
  const cached = idxGet_(want);
  if (cached) return cached;
  const fromWod = findInSheet_(getWodSheet_(), WOD_FIRST_COL, WOD_WIDTH, mapWod_, want);
  if (fromWod) { fromWod.src = 'WOD'; return fromWod; }
  try {
    const fromRph = findInRph_(want);
    if (fromRph) { fromRph.src = 'RPH'; return fromRph; }
  } catch (eR) { /* RPH gagal dibaca: lanjut ke GRM */ }
  const grm = getGrmSheet_();
  if (grm) {
    const fromGrm = findInSheet_(grm, GRM_FIRST_COL, GRM_WIDTH, mapGrm_, want);
    if (fromGrm) { fromGrm.src = 'GRM'; return fromGrm; }
  }
  return null;
}

function baruRef_(kikc) {
  return { kikc: kikc, noBenang: '', warna: '', kg: '', cone: '', mesin: '', ketKikc: '', src: 'BARU' };
}

// ---- Indeks KIKC di CacheService ----
// getKikcData (dipanggil tiap aplikasi dibuka) mengisi cache. Saat simpan, KIKC dicari di cache (puluhan ms)
// tanpa membuka sheet WOD/GRM. Jika tidak ada di cache (KIKC baru ditambah di sheet), dicari langsung di sheet.
const IDX_PREFIX = 'kidx_';
const IDX_TTL = 7200;
const IDX_CHUNK = 45000;

function idxPut_(list) {
  try {
    const m = {};
    list.forEach(function (i) { m[i.kikc] = [i.noBenang, i.warna, i.kg, i.cone, i.mesin, i.ketKikc, i.src]; });
    const s = JSON.stringify(m);
    const n = Math.ceil(s.length / IDX_CHUNK), put = {};
    for (let i = 0; i < n; i++) put[IDX_PREFIX + i] = s.substr(i * IDX_CHUNK, IDX_CHUNK);
    put[IDX_PREFIX + 'n'] = String(n);
    CacheService.getScriptCache().putAll(put, IDX_TTL);
  } catch (e) { /* cache gagal: tidak masalah, jatuh ke pencarian sheet */ }
}

function idxGet_(kikc) {
  try {
    const cache = CacheService.getScriptCache();
    const n = parseInt(cache.get(IDX_PREFIX + 'n') || '0', 10);
    if (!n) return null;
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(IDX_PREFIX + i);
    const got = cache.getAll(keys);
    let s = '';
    for (let i = 0; i < n; i++) { const c = got[IDX_PREFIX + i]; if (c === undefined || c === null) return null; s += c; }
    const v = JSON.parse(s)[kikc];
    if (!v) return null;
    return { kikc: kikc, noBenang: v[0], warna: v[1], kg: v[2], cone: v[3], mesin: v[4], ketKikc: v[5], src: v[6] };
  } catch (e) { return null; }
}

function newId_(ts) {
  return 'YD-' + Utilities.formatDate(ts, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' +
    Utilities.getUuid().slice(0, 3).toUpperCase();
}

function rowToken_(id) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, TOKEN_SALT + '|' + id);
  return Utilities.base64EncodeWebSafe(digest).slice(0, 12);
}

function assertRow_(sheet, rowIndex, tk) {
  const want = str_(tk);
  const last = sheet.getLastRow();
  const r0 = parseInt(rowIndex, 10);
  if (!want || !r0 || r0 < 2) throw new Error('Baris data tidak valid. Muat ulang tabel.');
  const from = Math.max(2, r0 - 80), to = Math.min(last, r0 + 80);
  if (to >= from) {
    const ids = sheet.getRange(from, 2, to - from + 1, 1).getDisplayValues();
    const order = [];
    for (let d = 0; d <= 80; d++) { order.push(r0 + d); if (d) order.push(r0 - d); }
    for (let i = 0; i < order.length; i++) {
      const r = order[i];
      if (r < from || r > to) continue;
      const id = str_(ids[r - from][0]).trim();
      if (id && rowToken_(id) === want) return r;
    }
  }
  throw new Error('Data sudah berubah atau dihapus oleh orang lain. Muat ulang tabel lalu coba lagi.');
}

// Format teks untuk kolom teks (agar "001" tidak jadi 1). Satu panggilan lewat RangeList.
function setTextFormats_(sheet, row) {
  try {
    sheet.getRangeList(['C' + row + ':F' + row, 'I' + row + ':O' + row]).setNumberFormat('@');
  } catch (e) { /* abaikan jika kolom dikunci oleh Table */ }
}

function lock_() {
  const l = LockService.getScriptLock();
  try {
    l.waitLock(15000);
  } catch (e) {
    throw new Error('Server sedang sibuk melayani pengguna lain. Coba lagi beberapa detik lagi.');
  }
  return l;
}

function unlock_(l) {
  if (l) { try { l.releaseLock(); } catch (e) { /* abaikan */ } }
}

// ================= 2. Daftar KIKC untuk dropdown =================
function getKikcData() {
  try {
    const seen = {};
    const out = [];
    let nWod = 0, nRph = 0, nGrm = 0, warn = '';

    const wod = getWodSheet_();
    const wLast = wod.getLastRow();
    if (wLast >= 2) {
      const nCols = Math.min(WOD_WIDTH, wod.getMaxColumns() - WOD_FIRST_COL + 1);
      const values = wod.getRange(2, WOD_FIRST_COL, wLast - 1, nCols).getDisplayValues();
      for (let i = 0; i < values.length; i++) {
        const item = mapWod_(padRow_(values[i], WOD_WIDTH));
        if (!item.kikc || item.kikc.toUpperCase() === 'KIKC' || seen[item.kikc]) continue;
        seen[item.kikc] = true; nWod++;
        out.push({ kikc: item.kikc, noBenang: item.noBenang, warna: item.warna, kg: item.kg, cone: item.cone, mesin: item.mesin, ketKikc: item.ketKikc, src: 'WOD' });
      }
    }

    try {
      const rsh = findSheet_(ss_(), SHEET_RPH);
      if (!rsh) {
        warn = 'Sheet "' + SHEET_RPH + '" tidak ditemukan, KIKC dari RPH tidak dimuat.';
      } else if (rsh.getLastRow() >= 2) {
        const rc = rphCols_(rsh);
        if (!rc) {
          warn = 'Kolom "KIKC" tidak ditemukan di baris 1 sheet ' + SHEET_RPH + ', KIKC dari RPH tidak dimuat.';
        } else {
          const rv = rsh.getRange(2, 1, rsh.getLastRow() - 1, rc.n).getDisplayValues();
          for (let i = rv.length - 1; i >= 0; i--) {   // dari baris paling bawah (terbaru); KIKC yang sudah ada di WOD dilewati
            const item = mapRph_(rv[i], rc);
            if (!item.kikc || item.kikc.toUpperCase() === 'KIKC' || seen[item.kikc]) continue;
            seen[item.kikc] = true; nRph++;
            out.push({ kikc: item.kikc, noBenang: item.noBenang, warna: item.warna, kg: item.kg, cone: item.cone, mesin: item.mesin, ketKikc: item.ketKikc, src: 'RPH' });
          }
        }
      }
    } catch (eR) {
      warn = 'Sheet RPH gagal dibaca (' + eR.message + '), KIKC dari RPH tidak dimuat.';
    }

    try {
      const grm = getGrmSheet_();
      if (!grm) {
        warn = (warn ? warn + ' ' : '') + 'Sheet "' + SHEET_GRM + '" tidak ditemukan, KIKC dari GRM tidak dimuat.';
      } else {
        const gLast = grm.getLastRow();
        if (gLast >= 2) {
          const nCols = Math.min(GRM_WIDTH, grm.getMaxColumns() - GRM_FIRST_COL + 1);
          const values = grm.getRange(2, GRM_FIRST_COL, gLast - 1, nCols).getDisplayValues();
          for (let i = 0; i < values.length; i++) {
            const item = mapGrm_(padRow_(values[i], GRM_WIDTH));
            if (!item.kikc || item.kikc.toUpperCase() === 'KIKC' || seen[item.kikc]) continue;
            seen[item.kikc] = true; nGrm++;
            out.push({ kikc: item.kikc, noBenang: item.noBenang, warna: item.warna, kg: item.kg, cone: item.cone, mesin: item.mesin, ketKikc: item.ketKikc, src: 'GRM' });
          }
        }
      }
    } catch (e2) {
      warn = (warn ? warn + ' ' : '') + 'Sheet GRM gagal dibaca (' + e2.message + '), KIKC dari GRM tidak dimuat.';
    }

    idxPut_(out);
    return { success: true, data: out, counts: { wod: nWod, rph: nRph, grm: nGrm }, warn: warn };
  } catch (e) {
    return { error: e.message };
  }
}

// ================= 2b. Tab daftar WOD / GRM / Celup (hanya baca) =================
// Satu panggilan (getLists) mengambil ketiga daftar sekaligus, dan hasilnya disimpan di CacheService
// selama LIST_TTL detik, jadi membuka tab atau pengguna lain tidak perlu membaca sheet lagi.
// force = true (tombol muat ulang) melewati cache dan membaca langsung dari sheet.
const LIST_KEYS = ['wod', 'grm', 'plan', 'clp'];
const LIST_TTL = 90;
const LIST_CHUNK = 40000;
const LIST_PREFIX = 'lst6_';

// Membaca teks tanggal menjadi {y, m, d}; null jika bukan tanggal.
// Format yyyy-mm-dd dikenali apa adanya. Untuk a/b/yyyy: mdy = true dibaca bulan/hari (MM/DD/YYYY), selain itu hari/bulan (DD/MM/YYYY).
// Jika angka bulan lebih dari 12, urutannya otomatis dibalik (mis. "13/10/2026" atau "10/13/26").
function parseDmy_(t, mdy) {
  t = str_(t).trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let d = mdy ? +m[2] : +m[1], mo = mdy ? +m[1] : +m[2], y = +m[3];
    if (y < 100) y += 2000;
    if (mo > 12 && d <= 12) { const x = d; d = mo; mo = x; }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y: y, m: mo, d: d };
  }
  // Teks seperti "Oct 13, 2026": hanya dicoba jika ada tahun 4 digit dan nama bulan, agar teks biasa ("Mesin 2") tidak salah jadi tanggal
  if (/\d{4}/.test(t) && /[A-Za-z]{3}/.test(t)) {
    const p = Date.parse(t);
    if (!isNaN(p)) { const dt = new Date(p); return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }; }
  }
  return null;
}

// Nilai urut dari sel tanggal: tanggal asli Sheet dipakai langsung; teks dibaca lewat parseDmy_.
function sortKey_(v, disp, mdy) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return v.getTime();
  const x = parseDmy_(disp || v, mdy);
  return x ? new Date(x.y, x.m - 1, x.d).getTime() : 0;
}

// Format tampil seragam DD/MM/YYYY (tanpa jam). Jika tidak terbaca sebagai tanggal, teks asli dipakai apa adanya.
function fmtDmy_(v, disp, tz, mdy) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, tz, 'dd/MM/yyyy');
  const x = parseDmy_(disp || v, mdy);
  if (!x) return str_(disp || v).trim();
  return ('0' + x.d).slice(-2) + '/' + ('0' + x.m).slice(-2) + '/' + x.y;
}

// Membaca satu blok kolom, mengambil kolom yang diminta (pick = indeks di dalam blok, urutan = urutan tampil).
// keepFn (opsional) menyaring baris berdasarkan seluruh blok. Baris kosong dan baris judul dilewati.
// dateIdx = indeks kolom tanggal di dalam blok (diformat DD/MM/YYYY dan dipakai mengurutkan dari terbaru).
// opts.mdy = teks tanggal di sheet ini berformat MM/DD/YYYY; opts.noSort = jangan urut tanggal (baris paling bawah di atas).
function readList_(sheet, firstCol, width, pick, keepFn, dateIdx, opts) {
  opts = opts || {};
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const nCols = Math.min(width, sheet.getMaxColumns() - firstCol + 1);
  const values = sheet.getRange(2, firstCol, last - 1, nCols).getDisplayValues();
  const raw = sheet.getRange(2, firstCol + dateIdx, last - 1, 1).getValues();   // nilai asli kolom tanggal untuk pengurutan
  const tz = sheet.getParent().getSpreadsheetTimeZone();
  const datePos = pick.indexOf(dateIdx);
  const items = [];
  for (let i = 0; i < values.length; i++) {
    const r = padRow_(values[i], width);
    if (keepFn && !keepFn(r)) continue;
    const row = pick.map(function (k) { return str_(r[k]).trim(); });
    if (!row.some(function (x) { return x; })) continue;
    if (datePos >= 0) row[datePos] = fmtDmy_(raw[i][0], r[dateIdx], tz, opts.mdy);   // semua tanggal jadi DD/MM/YYYY
    items.push({ row: row, key: opts.noSort ? 0 : sortKey_(raw[i][0], r[dateIdx], opts.mdy), i: i });
  }
  items.sort(function (x, y) { return (y.key - x.key) || (y.i - x.i); });
  if (opts.rowNos) items.forEach(function (x) { opts.rowNos.push(x.i + 2); });   // nomor baris sheet untuk tiap baris hasil
  return items.map(function (x) { return x.row; });
}

function listResult_(headers, rows) {
  return { success: true, headers: headers, rows: rows, total: rows.length };
}

// Kolom sheet "Plan" dicari menurut JUDUL di baris 1, jadi tetap benar walau kolom baru disisipkan.
// Judul yang tidak ditemukan memakai posisi lama (A..H). Kolom "ALOKASI" (judul diawali ALOKASI) ikut dibaca dan ditaruh paling akhir.
function planCols_(sp) {
  const names = ['KIKC', 'NO BENANG', 'SUPPLIER', 'WARNA', 'MESIN', 'KG', 'CONE', 'KETERANGAN', 'CELUP'];
  const legacy = { 'KIKC': 0, 'NO BENANG': 1, 'WARNA': 2, 'MESIN': 3, 'KG': 4, 'CONE': 5, 'KETERANGAN': 6, 'CELUP': 7 };   // posisi lama bila judul tidak ditemukan (SUPPLIER tidak punya: kosong)
  const n = Math.max(1, Math.min(sp.getMaxColumns() - PLAN_FIRST_COL + 1, 30));
  const head = sp.getRange(1, PLAN_FIRST_COL, 1, n).getDisplayValues()[0].map(function (x) { return str_(x).replace(/\s+/g, ' ').trim().toUpperCase(); });
  const pick = names.map(function (nm) { const k = head.indexOf(nm); return k >= 0 ? k : (legacy[nm] !== undefined ? legacy[nm] : -1); });
  const headers = names.slice();
  let al = -1;
  for (let i = 0; i < head.length; i++) { if (head[i].indexOf('ALOKASI') === 0) { al = i; break; } }
  if (al >= 0) { pick.push(al); headers.push('ALOKASI'); }
  return { pick: pick, headers: headers, width: Math.max.apply(null, pick) + 1, alokasi: al };
}

function buildList_(key) {
  key = String(key || '').toLowerCase();   // kunci daftar selalu huruf kecil: wod, grm, plan, clp
  if (key === 'wod') {
    // A, C, D, E, F, G, I, K, L. Hanya status "B" (kolom O) dan mesin yang tidak berisi "BAK-"
    const rows = readList_(getWodSheet_(), WOD_LIST_FIRST_COL, WOD_LIST_WIDTH, [2, 0, 3, 4, 5, 6, 8, 10, 11], function (r) {
      if (str_(r[WOD_STATUS_IDX]).trim().toUpperCase() !== WOD_STATUS_SHOW) return false;
      if (str_(r[WOD_KIKC_IDX]).trim().toUpperCase() === 'KIKC') return false;
      const mesin = str_(r[WOD_MESIN_IDX]).replace(/\s+/g, '').toUpperCase();
      return mesin.indexOf(WOD_HIDE_MESIN) < 0;
    }, 0, { mdy: !!DATE_TEXT_MDY.wod });
    return listResult_(['KIKC', 'TANGGAL', 'NO BENANG', 'WARNA', 'KG', 'CONE', 'MESIN', 'SUPPLIER', 'KETERANGAN'], rows);
  }
  if (key === 'grm') {
    // Tab GRM bersumber dari sheet WOD (bukan sheet GRM): status kolom O diabaikan, mesin berisi "BAK-" disembunyikan,
    // dan hanya baris yang kolom T "JCONE"-nya berisi "HANK".
    const wsh = getWodSheet_();
    if (!wsh) throw new Error('Tab "' + SHEET_WOD + '" tidak ditemukan di spreadsheet.');
    let jIdx = WOD_JCONE_IDX;   // kolom T; bila ada judul "JCONE" di baris 1, judul itu yang dipakai
    try {
      const hd = wsh.getRange(1, 1, 1, Math.min(wsh.getMaxColumns(), 40)).getDisplayValues()[0].map(function (x) { return str_(x).replace(/\s+/g, '').toUpperCase(); });
      const f = hd.indexOf('JCONE');
      if (f >= 0) jIdx = f;
    } catch (eH) { /* pakai kolom T */ }
    const rows = readList_(wsh, WOD_LIST_FIRST_COL, Math.max(WOD_LIST_WIDTH, jIdx + 1), [2, 0, 3, 4, 8, 5, 6, 11], function (r) {
      if (str_(r[WOD_KIKC_IDX]).trim().toUpperCase() === 'KIKC') return false;
      const mesin = str_(r[WOD_MESIN_IDX]).replace(/\s+/g, '').toUpperCase();
      if (mesin.indexOf(WOD_HIDE_MESIN) >= 0) return false;
      return str_(r[jIdx]).replace(/\s+/g, '').toUpperCase() === GRM_JCONE_HANK;
    }, 0, { mdy: !!DATE_TEXT_MDY.wod });
    // Kolom virtual TGL CELUP (tab Celup / sheet CLP) dan TGL PACK (sheet PACK) menurut KIKC; tidak ditulis ke sheet GRM
    let cmap = {}, pmap = {};
    try { cmap = clpDateMap_(); } catch (eC) { cmap = {}; }
    try { pmap = getPackMap_(false).map || {}; } catch (eP) { pmap = {}; }
    rows.forEach(function (r) { const k = normKikc_(r[0]); r.push(cmap[k] || '', pmap[k] || ''); });
    return listResult_(['KIKC', 'TANGGAL', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'KETERANGAN', 'TGL CELUP', 'TGL PACK'], rows);
  }
  if (key === 'plan') {
    // Urutan tampil: KIKC, No Benang, Supplier, Warna, Mesin, Kg, Cone, Keterangan, Celup (kolom dicari menurut judul baris 1; Celup diformat DD/MM/YYYY jika berisi tanggal)
    const sp = findSheet_(ss_(), SHEET_PLAN);
    if (!sp) throw new Error('Tab "' + SHEET_PLAN + '" tidak ditemukan di spreadsheet. Buat sheet bernama "' + SHEET_PLAN + '" (atau jalankan siapkanSheetPlan dari editor Apps Script).');
    const pc = planCols_(sp);
    const rowNos = [];
    let rows = readList_(sp, PLAN_FIRST_COL, pc.width, pc.pick, function (r) {
      return str_(r[pc.pick[0]]).trim().toUpperCase() !== 'KIKC';
    }, pc.pick[8], { mdy: !!DATE_TEXT_MDY.plan, noSort: true, rowNos: rowNos });
    // Baris tanpa KIKC dibuang (mis. sisa isi kolom Alokasi lama di bawah data Plan), supaya tidak jadi baris kosong di tab Plan, hitungan, dan CSV
    const keep = [];
    rows.forEach(function (r, i) { if (str_(r[0]).trim()) keep.push(i); });
    if (keep.length !== rows.length) {
      const rn = keep.map(function (i) { return rowNos[i]; });
      rows = keep.map(function (i) { return rows[i]; });
      rowNos.length = 0; rn.forEach(function (n) { rowNos.push(n); });
    }
    // Alokasi mesin diambil dari sheet "Alokasi" menurut KIKC, BUKAN dari posisi baris di sheet Plan.
    // Jadi baris Plan boleh bertambah, dihapus, diurutkan ulang atau ditimpa: alokasi tetap mengikuti KIKC-nya.
    const headers = pc.headers.slice();
    let ai = headers.indexOf('ALOKASI');
    if (ai < 0) { headers.push('ALOKASI'); ai = headers.length - 1; }
    const al = readAlokasi_(), saved = al.vals;
    const migrasi = [];
    rows.forEach(function (r) {
      const k = normKikc_(r[0]);
      // Isi kolom Alokasi lama di sheet Plan hanya dipakai SEKALI (saat sheet "Alokasi" belum ada); sesudah itu diabaikan karena posisinya bisa tidak cocok lagi dengan KIKC
      const old = (!al.exists && ai < r.length) ? str_(r[ai]).trim() : '';
      let v;
      if (Object.prototype.hasOwnProperty.call(saved, k)) v = saved[k];
      else { v = old; if (old && k) migrasi.push([k, old]); }   // alokasi lama disalin sekali ke sheet Alokasi
      if (ai < r.length) r[ai] = v; else r.push(v);
    });
    if (migrasi.length) { try { saveAlokasiBatch_(migrasi); } catch (e) { /* dicoba lagi saat daftar dimuat berikutnya */ } }
    const res = listResult_(headers, rows);
    res.rowNos = rowNos;   // dipakai tab Plan untuk mengubah kolom Alokasi
    return res;
  }
  const sh = findSheet_(ss_(), SHEET_CLP);
  if (!sh) throw new Error('Tab "' + SHEET_CLP + '" tidak ditemukan di spreadsheet.');
  const rows = readList_(sh, CLP_FIRST_COL, CLP_WIDTH, [1, 0, 2, 3, 4, 5, 6, 7, 8, 9], function (r) {
    return str_(r[1]).trim().toUpperCase() !== 'KIKC';
  }, 0, { mdy: !!DATE_TEXT_MDY.clp });
  return listResult_(['KIKC', 'TANGGAL', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'SHIFT', 'GRUP', 'KET'], rows);
}

function listCacheGet_(key) {
  try {
    const cache = CacheService.getScriptCache();
    const n = parseInt(cache.get(LIST_PREFIX + key + '_n') || '0', 10);
    if (!n) return null;
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(LIST_PREFIX + key + '_' + i);
    const got = cache.getAll(keys);
    let s = '';
    for (let i = 0; i < n; i++) {
      const c = got[LIST_PREFIX + key + '_' + i];
      if (c === undefined || c === null) return null;
      s += c;
    }
    return JSON.parse(s);
  } catch (e) { return null; }
}

function listCachePut_(key, obj, ttl) {
  try {
    const s = JSON.stringify(obj);
    const n = Math.ceil(s.length / LIST_CHUNK), put = {};
    for (let i = 0; i < n; i++) put[LIST_PREFIX + key + '_' + i] = s.substr(i * LIST_CHUNK, LIST_CHUNK);
    put[LIST_PREFIX + key + '_n'] = String(n);
    CacheService.getScriptCache().putAll(put, ttl || LIST_TTL);
  } catch (e) { /* terlalu besar untuk cache: tidak masalah, tetap dibaca dari sheet */ }
}

function getList(key, force) {
  try {
    key = String(key || '').toLowerCase();
    if (LIST_KEYS.map(function (x) { return x.toLowerCase(); }).indexOf(key) < 0) throw new Error('Daftar tidak dikenal: ' + key);
    if (!force) {
      const hit = listCacheGet_(key);
      if (hit) return hit;
    }
    const res = buildList_(key);
    listCachePut_(key, res);
    return res;
  } catch (e) {
    return { error: e.message };
  }
}

function getLists(force) {
  const lists = {};
  LIST_KEYS.forEach(function (k) { if (k.toLowerCase() === 'plan') return; lists[k.toLowerCase()] = getList(k, force); });   // Plan tidak ikut: tab Plan membaca sheet Plan Harian (getPlanHari)
  return { success: true, lists: lists };
}

// Status mesin STOP / Ready (tombol di tab Mesin). Disimpan di Script Properties, jadi sama untuk semua pengguna.
// Nilai awal (sebelum pernah diubah) ada di MESIN_STOP_AWAL.
const MESIN_STOP_AWAL = ['A50', 'A12'];
// Jumlah siklus per hari (3 shift = 3 siklus, 1 lot per shift per mesin). Kapasitas mesin di tab Mesin = angka di bawah x MESIN_SIKLUS.
const MESIN_SIKLUS = 3;
// Kapasitas tiap mesin PER SIKLUS (Kg). Dipakai tab Mesin: judul mesin, persentase beban, dan hasil unduh PDF/PNG.
// Untuk mengubah kapasitas cukup edit angka di sini lalu Deploy versi baru.
const MESIN_KAPASITAS = {
  A18: 918, A20: 432, A21: 90, A0: 12, A25: 24, A50: 54, A100: 108,
  A8: 44, A9: 44, A10: 44, A11: 165, A12: 165, A13: 165, A14: 165, A15: 165,
  A16: 242, A17: 351
};
function readMesinStop_() {
  const v = PropertiesService.getScriptProperties().getProperty('mesinStop');
  if (v === null || v === undefined) return MESIN_STOP_AWAL.slice();
  try { const a = JSON.parse(v); if (Array.isArray(a)) return a.map(String); } catch (e) { /* jatuh ke nilai awal */ }
  return MESIN_STOP_AWAL.slice();
}
function setMesinStop(mesin, stop, mode) {
  needAdmin_(mode);
  const m = str_(mesin).replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9]{1,10}$/.test(m)) throw new Error('Nama mesin tidak valid.');
  const lock = lock_();
  try {
    const list = readMesinStop_().filter(function (x) { return x !== m; });
    if (stop === true || stop === 'true') list.push(m);
    PropertiesService.getScriptProperties().setProperty('mesinStop', JSON.stringify(list));
    return { stop: list };
  } finally {
    unlock_(lock);
  }
}

// ---------- Status Lot: SISA ORDER / PENDING (kolom virtual tab Plan, disimpan menurut KIKC) ----------
// SISA   = order lot ini di Plan belum terealisasi celup: kolom CELUP di tab Plan tampil "Sisa Order".
// PENDING = lot batal diplan / ditarik: Plan pada tanggal ini dan sebelumnya tidak lagi menghitungnya sebagai Sisa Order; bila di hari lain
//           lot dibuat di Plan lagi, statusnya baru (bukan Sisa Order). TANGGAL = hari status dicentang (yyyy-MM-dd).
function statusLotSheet_() {
  const ss = ss_();
  let sh = findSheet_(ss, SHEET_STATUS_LOT);
  if (!sh) {
    sh = ss.insertSheet(SHEET_STATUS_LOT);
    sh.getRange('A:D').setNumberFormat('@');
    sh.getRange(1, 1, 1, 4).setValues([['KIKC', 'STATUS', 'TANGGAL', 'DIUBAH']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
// { KIKC: { s: 'SISA' | 'PENDING', d: 'yyyy-MM-dd' } }; baris berstatus kosong dilewati
function readStatusLot_() {
  const out = Object.create(null);
  try {
    const sh = findSheet_(ss_(), SHEET_STATUS_LOT);
    if (!sh || sh.getLastRow() < 2) return out;
    sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues().forEach(function (c) {
      const k = normKikc_(c[0]), st = str_(c[1]).trim().toUpperCase();
      if (!k || k === 'KIKC' || (st !== 'SISA' && st !== 'PENDING')) return;
      out[k] = { s: st, d: str_(c[2]).trim() };
    });
  } catch (e) { /* tanpa status: aturan Plan biasa */ }
  return out;
}
// status: 'SISA' | 'PENDING' | '' (hapus centang). Satu KIKC hanya punya satu status.
function setStatusLot(kikc, status, mode) {
  needAdmin_(mode);
  const k = normKikc_(kikc);
  if (!k) throw new Error('KIKC kosong.');
  const st = str_(status).trim().toUpperCase();
  if (st !== '' && st !== 'SISA' && st !== 'PENDING') throw new Error('Status tidak dikenal.');
  const tz = ss_().getSpreadsheetTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'), stamp = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm');
  const lock = lock_();
  try {
    const sh = statusLotSheet_();
    const last = sh.getLastRow();
    let row = 0;
    if (last >= 2) sh.getRange(2, 1, last - 1, 1).getDisplayValues().forEach(function (c, i) { if (!row && normKikc_(c[0]) === k) row = i + 2; });
    const vals = [[st, st ? today : '', stamp]];
    if (row) sh.getRange(row, 2, 1, 3).setNumberFormat('@').setValues(vals);
    else if (st) sh.getRange(Math.max(last, 1) + 1, 1, 1, 4).setNumberFormat('@').setValues([[k, st, today, stamp]]);
    SpreadsheetApp.flush();
    try { CacheService.getScriptCache().remove(LIST_PREFIX + 'plan_n'); } catch (e) { /* abaikan */ }
  } finally {
    unlock_(lock);
  }
  return { kikc: k, status: st, tanggal: st ? today : '' };
}

// ---------- Alokasi mesin per KIKC ----------
// Disimpan di sheet "Alokasi" (A KIKC | B ALOKASI | C DIUBAH), dikunci dengan KIKC, bukan nomor baris.
// Sheet Plan tidak pernah diubah oleh aplikasi, jadi pembaruan Plan (tambah, hapus, urut ulang, tempel data baru) tidak menggeser alokasi.
function alokasiSheet_() {
  const ss = ss_();
  let sh = findSheet_(ss, SHEET_ALOKASI);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ALOKASI);
    sh.getRange('A:C').setNumberFormat('@');
    sh.getRange(1, 1, 1, 3).setValues([['KIKC', 'ALOKASI', 'DIUBAH']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// Membaca semua alokasi: { vals: {KIKC: 'A9'}, rows: {KIKC: nomorBaris} }. Alokasi kosong ('') tetap tercatat sebagai "sengaja dikosongkan".
function readAlokasi_() {
  const out = { vals: {}, rows: {}, exists: false };
  const sh = findSheet_(ss_(), SHEET_ALOKASI);
  if (!sh) return out;
  out.exists = true;
  const last = sh.getLastRow();
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 2).getDisplayValues().forEach(function (c, i) {
    const k = normKikc_(c[0]);
    if (!k || k === 'KIKC') return;
    out.vals[k] = str_(c[1]).replace(/\s+/g, '').toUpperCase();
    out.rows[k] = i + 2;
  });
  return out;
}

// Simpan banyak alokasi sekaligus (pasangan [KIKC, nilai]); KIKC yang sudah ada diperbarui, yang baru ditambahkan di bawah.
function saveAlokasiBatch_(pairs) {
  const lock = lock_();
  try {
    const sh = alokasiSheet_();
    const cur = readAlokasi_();
    const stamp = Utilities.formatDate(new Date(), ss_().getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm');
    const add = [];
    pairs.forEach(function (p) {
      const k = normKikc_(p[0]), v = str_(p[1]).replace(/\s+/g, '').toUpperCase();
      if (!k) return;
      if (cur.rows[k]) { sh.getRange(cur.rows[k], 2, 1, 2).setValues([[v, stamp]]); }
      else if (!Object.prototype.hasOwnProperty.call(cur.vals, k)) { add.push([k, v, stamp]); cur.vals[k] = v; }
    });
    if (add.length) {
      const r0 = Math.max(sh.getLastRow(), 1) + 1;
      sh.getRange(r0, 1, add.length, 3).setNumberFormat('@').setValues(add);
    }
    SpreadsheetApp.flush();
    try { CacheService.getScriptCache().remove(LIST_PREFIX + 'plan_n'); } catch (e) { /* abaikan */ }
  } finally {
    unlock_(lock);
  }
}

// Mengisi alokasi mesin satu KIKC pada Plan satu tanggal (dipanggil dari tab Plan). Disimpan di kolom ALOKASI sheet "Plan Harian" (baris tanggal itu + KIKC),
// dan dicatat juga di sheet "Alokasi" sebagai isian awal untuk Get Plan berikutnya. rowNo tidak dipakai lagi.
function setAlokasi(rowNo, kikc, value, mode, iso) {
  needAdmin_(mode);
  iso = planIsoOk_(iso);
  if (!planEditableIso_(iso)) throw new Error('Plan tanggal yang sudah lewat hanya bisa dilihat.');
  const want = normKikc_(kikc);
  if (!want) throw new Error('KIKC kosong.');
  let v = str_(value).replace(/\s+/g, '').toUpperCase();
  if (/^\d+$/.test(v)) v = 'A' + v;   // ketik 9 = A9
  if (v.length > 12) throw new Error('Isi alokasi terlalu panjang.');
  const lock = lock_();
  try {
    const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
    if (!sh || sh.getLastRow() < 2) throw new Error('Plan tanggal ini belum dibuat. Gunakan Create > Get Plan > Save.');
    const dmy = iso.split('-').reverse().join('/');
    const col = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues();   // A TANGGAL, B KIKC
    let n = 0;
    col.forEach(function (c, i) {
      if (str_(c[0]).trim() === dmy && normKikc_(c[1]) === want) { sh.getRange(i + 2, 7).setValue(v); n++; }   // G = ALOKASI
    });
    if (!n) throw new Error('KIKC ' + want + ' tidak ada di Plan tanggal ini.');
    SpreadsheetApp.flush();
  } finally {
    unlock_(lock);
  }
  saveAlokasiBatch_([[want, v]]);
  return { value: v };
}

// Reset: mengosongkan semua alokasi mesin pada Plan satu tanggal (kolom ALOKASI di "Plan Harian") dan isi sheet "Alokasi" (isian awal Get Plan). Sheet Plan tidak disentuh.
function resetAlokasi(mode, iso) {
  needAdmin_(mode);
  iso = planIsoOk_(iso);
  if (!planEditableIso_(iso)) throw new Error('Plan tanggal yang sudah lewat hanya bisa dilihat.');
  const lock = lock_();
  try {
    let n = 0;
    const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
    if (sh && sh.getLastRow() >= 2) {
      const dmy = iso.split('-').reverse().join('/');
      const last = sh.getLastRow();
      const a = sh.getRange(2, 1, last - 1, 1).getDisplayValues(), g = sh.getRange(2, 7, last - 1, 1).getDisplayValues();
      let changed = false;
      for (let i = 0; i < a.length; i++) {
        if (str_(a[i][0]).trim() === dmy && str_(g[i][0]).trim()) { g[i][0] = ''; n++; changed = true; }
      }
      if (changed) sh.getRange(2, 7, last - 1, 1).setValues(g);
    }
    const al = alokasiSheet_();
    const lastA = al.getLastRow();
    if (lastA >= 2) al.getRange(2, 1, lastA - 1, Math.max(al.getLastColumn(), 3)).clearContent();
    SpreadsheetApp.flush();
    try { CacheService.getScriptCache().remove(LIST_PREFIX + 'plan_n'); } catch (e) { /* abaikan */ }
    return { cleared: n };
  } finally {
    unlock_(lock);
  }
}

// ---------- Plan Harian ----------
// Alur: tab Plan > Create > tentukan tanggal > Get Plan (membaca sheet "Plan" hasil importrange, TIDAK diubah) > Save (menyalin ke sheet "Plan Harian").
// Tab Plan hanya membaca sheet "Plan Harian". Satu tanggal = satu salinan; Save ulang pada tanggal yang sama menggantikan salinan tanggal itu
// (alokasi mesin yang sudah diisi pada tanggal itu dipertahankan menurut KIKC). Sheet "Plan Harian":
// TANGGAL | KIKC | NO BENANG | SUPPLIER | WARNA | MESIN | ALOKASI | KG | CONE | KETERANGAN | CELUP | DISIMPAN
// Tipe kolom: TANGGAL = tanggal, KG = angka desimal, CONE = angka bulat, CELUP = tanggal ("Sisa Order" tetap teks), DISIMPAN = tanggal+jam (dd/MM/yyyy HH:mm).
// Tanggal hari ini dan ke depan boleh dibuat/diubah alokasinya; tanggal yang sudah lewat hanya riwayat (hanya lihat).
const PLAN_HARIAN_HEAD = ['TANGGAL', 'KIKC', 'NO BENANG', 'SUPPLIER', 'WARNA', 'MESIN', 'ALOKASI', 'KG', 'CONE', 'KETERANGAN', 'CELUP', 'DISIMPAN'];

function planHarianSheet_() {
  const ss = ss_();
  let sh = findSheet_(ss, SHEET_PLAN_HARIAN);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PLAN_HARIAN);
    sh.getRange('B:J').setNumberFormat('@');   // KIKC, No Benang, dst. teks apa adanya; kolom tanggal/angka diformat saat Save
    sh.getRange(1, 1, 1, PLAN_HARIAN_HEAD.length).setValues([PLAN_HARIAN_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function planTz_() { return ss_().getSpreadsheetTimeZone(); }
// Batas Sisa Order: lot yang CELUP-nya masih kosong dianggap "Sisa Order" bila sampai pukul 09:00 (SISA_JAM) hari SESUDAH tanggal Plan belum ada tanggal Celup / input data.
const SISA_JAM = 9;
function planSisaLewat_(iso) {
  try {
    if (!planIsoOk_(iso)) return false;
    const t = Utilities.parseDate(iso + ' ' + (SISA_JAM < 10 ? '0' : '') + SISA_JAM + ':00', planTz_(), 'yyyy-MM-dd HH:mm').getTime() + 86400000;
    return Date.now() >= t;
  } catch (e) { return false; }
}
function planIso_(dmy) { const p = str_(dmy).split('/'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : ''; }
function planIsoOk_(iso) {
  iso = str_(iso).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Tanggal Plan tidak valid.');
  return iso;
}
function planEditableIso_(iso) { return iso >= Utilities.formatDate(new Date(), planTz_(), 'yyyy-MM-dd'); }

// Isi sheet Plan seperti yang tampil di tab Plan (urutan kolom tampil; CELUP = tanggal celup atau "Sisa Order").
// plan = hasil buildList_('plan'). ALOKASI awal = isi sheet "Alokasi" menurut KIKC.
// ---- Tipe kolom sheet "Plan Harian": TANGGAL (tanggal), KG (angka desimal), CONE (angka bulat), CELUP (tanggal; "Sisa Order" tetap teks), DISIMPAN (tanggal+jam) ----
const PLAN_HARIAN_FMT = ['dd/MM/yyyy', '@', '@', '@', '@', '@', '@', '#,##0.00', '0', '@', 'dd/MM/yyyy', 'dd/MM/yyyy HH:mm'];
// Teks angka format Indonesia/Inggris ("67,5", "1.234,5", "67.5") -> angka; bukan angka -> null
function numId_(v) {
  let t = str_(v).replace(/\s+/g, '');
  if (!t || !/^-?[\d.,]+$/.test(t)) return null;
  const c = t.lastIndexOf(','), d = t.lastIndexOf('.');
  if (c >= 0 && d >= 0) t = c > d ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (c >= 0) t = t.replace(/,/g, '.');
  else if (d >= 0 && /^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}
function kgCell_(v) { const n = numId_(v); return n === null ? str_(v).trim() : Math.round(n * 100) / 100; }
function coneCell_(v) { const n = numId_(v); return n === null ? str_(v).trim() : Math.round(n); }
function dateCell_(v) {   // "dd/MM/yyyy" -> tanggal; teks lain (mis. "Sisa Order") tetap teks
  const t = str_(v).trim();
  return /^\d{2}\/\d{2}\/\d{4}$/.test(t) ? Utilities.parseDate(t, planTz_(), 'dd/MM/yyyy') : t;
}
function stampCell_(v) {
  const t = str_(v).trim();
  return /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(t) ? Utilities.parseDate(t, planTz_(), 'dd/MM/yyyy HH:mm') : t;
}
function planRowTyped_(dmy, x, stamp) {   // x = 10 kolom (KIKC .. CELUP), stamp = Date
  return [Utilities.parseDate(dmy, planTz_(), 'dd/MM/yyyy'), x[0], x[1], x[2], x[3], x[4], x[5], kgCell_(x[6]), coneCell_(x[7]), x[8], dateCell_(x[9]), stamp];
}
function planFmtRows_(n) { const a = []; for (let i = 0; i < n; i++) a.push(PLAN_HARIAN_FMT.slice()); return a; }

// Lot "Sisa Order" bawaan hari sebelumnya: KIKC yang ada di salinan Plan Harian tanggal SEBELUM iso dan belum bertanggal Celup saat itu
// (kolom CELUP kosong atau "Sisa Order"). Selama lot itu masih ada di Plan dan belum celup, labelnya tetap "Sisa Order",
// walaupun belum ada satu pun baris Plan yang bertanggal Celup.
function planCarry_(iso) {
  const out = Object.create(null);
  if (!iso) return out;
  const stp = readStatusLot_();   // lot PENDING: Plan pada tanggal status dicentang atau sebelumnya tidak dihitung (lot dianggap ditarik)
  try {
    const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
    if (!sh || sh.getLastRow() < 2) return out;
    sh.getRange(2, 1, sh.getLastRow() - 1, 11).getDisplayValues().forEach(function (c) {
      const d = planIso_(str_(c[0]).trim());   // yyyy-MM-dd
      if (!d || d >= iso) return;   // hanya tanggal sebelum tanggal yang dibuat
      const k = normKikc_(c[1]), cel = str_(c[10]).trim();
      if (k && stp[k] && stp[k].s === 'PENDING' && d <= stp[k].d) return;
      if (k && (!cel || /^sisa\s*order$/i.test(cel)) && (!out[k] || d < out[k])) out[k] = d;   // isi = tanggal Plan paling awal (yyyy-MM-dd) lot ini mulai belum celup
    });
  } catch (e) { /* tanpa riwayat: aturan lama (has) tetap berlaku */ }
  return out;
}

function planSnapshotBuild_(plan, iso) {
  plan = plan || buildList_('plan');
  const carry = planCarry_(iso);
  const h = plan.headers, ix = function (n) { return h.indexOf(n); };
  const cols = ['KIKC', 'NO BENANG', 'SUPPLIER', 'WARNA', 'MESIN', 'ALOKASI', 'KG', 'CONE', 'KETERANGAN'].map(ix);
  const iK = ix('KIKC'), iC = ix('CELUP');
  // Tanggal celup menurut KIKC dari tab Celup (baris pertama = tanggal terbaru)
  let clp = null; try { clp = getList('clp', false); } catch (e) { clp = null; }
  const clpMap = Object.create(null);
  if (clp && !clp.error && clp.rows) {
    const ck = clp.headers.indexOf('KIKC'), ct = clp.headers.indexOf('TANGGAL');
    if (ck >= 0 && ct >= 0) clp.rows.forEach(function (r) {
      const k = str_(r[ck]).trim().toUpperCase();
      if (k && !clpMap[k]) clpMap[k] = str_(r[ct]).trim();
    });
  }
  // Lot yang sudah ada di tab Celup (CLP) dengan tanggal SEBELUM tanggal planning tidak bisa diplan lagi (sudah celup). Lot yang celup pada/ sesudah tanggal planning tetap ikut.
  let excluded = 0;
  const src = plan.rows.filter(function (r) {
    const k = str_(r[iK]).trim().toUpperCase(), d = (k && clpMap[k]) ? planIso_(clpMap[k]) : '';
    if (d && iso && d < iso) { excluded++; return false; }
    return true;
  });
  const kemarin = Utilities.formatDate(new Date(Date.now() - 86400000), planTz_(), 'dd/MM/yyyy');
  const eff = src.map(function (r) {
    const k = str_(r[iK]).trim().toUpperCase();
    if (k && clpMap[k]) return clpMap[k];
    const v = iC >= 0 ? str_(r[iC]).trim() : '';
    if (v && !/^sisa\s*order$/i.test(v)) return kemarin;   // tanggal dari kolom Celup sheet Plan = TODAY()-1 (aturan tab Plan)
    return '';
  });
  const lewat = planSisaLewat_(iso);   // sudah lewat pukul 09:00 hari sesudah tanggal Plan
  const stl = readStatusLot_();   // SISA ORDER / PENDING dari tab Plan
  const rows = src.map(function (r, i) {
    const kk = normKikc_(r[iK]), sl = stl[kk];
    // "Sisa Order" = belum celup DAN (batas pukul 09:00 hari sesudah tanggal Plan sudah lewat, ATAU lot ini sisa dari Plan hari sebelumnya)
    let sisa = lewat || !!carry[kk];
    let cel = eff[i];
    if (sl && sl.s === 'SISA') cel = 'Sisa Order';   // dicentang SISA ORDER: order lot ini belum terealisasi celup
    else if (sl && sl.s === 'PENDING' && iso <= sl.d) { sisa = false; if (/^sisa\s*order$/i.test(cel)) cel = ''; }   // PENDING: lot ditarik, bukan Sisa Order
    return cols.map(function (c) { return c >= 0 ? str_(r[c]).trim() : ''; }).concat([cel || (sisa ? 'Sisa Order' : '')]);
  });
  return { headers: PLAN_HARIAN_HEAD.slice(1, 11), rows: rows, excluded: excluded };
}

// Tulis salinan Plan satu tanggal ke sheet "Plan Harian" (mengganti baris tanggal itu). rows = 10 kolom (KIKC .. CELUP).
function writePlanHarian_(iso, rows) {
  const dmy = iso.split('-').reverse().join('/');
  const lock = lock_();
  try {
    const sh = planHarianSheet_();
    const last = sh.getLastRow();
    const keep = {};   // alokasi yang sudah ada pada tanggal ini, menurut KIKC
    let allCleared = false;
    if (last >= 2) {
      const col = sh.getRange(2, 1, last - 1, 7).getDisplayValues();
      const del = [];
      col.forEach(function (c, i) {
        if (str_(c[0]).trim() !== dmy) return;
        del.push(i + 2);
        const k = normKikc_(c[1]), a = str_(c[6]).trim();
        if (k && a) keep[k] = a;
      });
      if (del.length && del.length === last - 1) { sh.getRange(2, 1, last - 1, PLAN_HARIAN_HEAD.length).clearContent(); allCleared = true; }   // semua baris data: kosongkan saja (sheet harus punya baris non-judul)
      else {
        let end = del.length - 1;   // hapus dari bawah, per blok baris berurutan
        while (end >= 0) {
          let start = end;
          while (start > 0 && del[start - 1] === del[start] - 1) start--;
          sh.deleteRows(del[start], end - start + 1);
          end = start - 1;
        }
      }
    }
    const stamp = new Date();
    const data = rows.map(function (r) {
      const x = r.slice(), k = normKikc_(x[0]);
      if (Object.prototype.hasOwnProperty.call(keep, k)) x[5] = keep[k];   // alokasi yang sudah diisi pada tanggal ini tidak hilang saat Save ulang
      return planRowTyped_(dmy, x, stamp);
    });
    const r0 = allCleared ? 2 : Math.max(sh.getLastRow(), 1) + 1;
    sh.getRange(r0, 1, data.length, PLAN_HARIAN_HEAD.length).setNumberFormats(planFmtRows_(data.length)).setValues(data);
    SpreadsheetApp.flush();
    try { CacheService.getScriptCache().remove('plan_dates'); } catch (e) { /* abaikan */ }
    return { saved: data.length };
  } finally {
    unlock_(lock);
  }
}

// GET PLAN: membaca sheet "Plan" (importrange) langsung, tanpa cache, dan mengirim isinya untuk dilihat sebelum Save. Tidak menulis apa pun.
function getPlanSource(iso, mode) {
  needAdmin_(mode);
  iso = planIsoOk_(iso);
  if (!planEditableIso_(iso)) throw new Error('Tanggal planning tidak boleh sebelum hari ini.');
  const built = planSnapshotBuild_(buildList_('plan'), iso);
  const ex = getPlanHari(iso);
  return {
    success: true, date: iso, headers: built.headers, rows: built.rows, total: built.rows.length, excluded: built.excluded || 0,
    exists: (ex && ex.rows) ? ex.rows.length : 0, savedAt: (ex && ex.savedAt) || ''
  };
}

// SAVE: membaca ulang sheet "Plan" di server (bukan kiriman browser) lalu menyimpannya ke "Plan Harian" pada tanggal yang dipilih.
// Plan kosong (mis. importrange sedang gagal) TIDAK disimpan, supaya salinan lama tidak terhapus.
function savePlanTanggal(iso, mode) {
  needAdmin_(mode);
  iso = planIsoOk_(iso);
  if (!planEditableIso_(iso)) throw new Error('Tanggal planning tidak boleh sebelum hari ini.');
  const built = planSnapshotBuild_(buildList_('plan'), iso);
  if (!built.rows.length) throw new Error(built.excluded ? 'Semua lot di sheet Plan sudah ada di tab Celup, jadi tidak ada yang bisa diplan. Plan tidak disimpan.' : 'Sheet Plan kosong (mis. IMPORTRANGE belum terisi). Plan tidak disimpan agar salinan lama aman.');
  const r = writePlanHarian_(iso, built.rows);
  return { success: true, saved: r.saved, date: iso, excluded: built.excluded || 0 };
}

// Daftar tanggal yang punya riwayat, format yyyy-mm-dd, urut naik.
function getPlanTanggal() {
  try {
    const cache = CacheService.getScriptCache(), hit = cache.get('plan_dates');
    if (hit) return { success: true, dates: JSON.parse(hit) };
    const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
    const set = {};
    if (sh && sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().forEach(function (c) { const d = planIso_(str_(c[0]).trim()); if (d) set[d] = 1; });
    const dates = Object.keys(set).sort();
    try { cache.put('plan_dates', JSON.stringify(dates), 120); } catch (e) { /* abaikan */ }
    return { success: true, dates: dates };
  } catch (e) {
    return { error: e.message };
  }
}

// Plan terakhir hanya dibawa ke hari ini sebelum jam PLAN_RESET_JAM (10.00). Lewat jam itu, hari ini tanpa Plan baru tampil kosong sampai Plan baru dibuat lewat Create > Get Plan > Save.
// Tanggal lain (kemarin / besok) yang belum punya Plan juga tampil kosong.
const PLAN_RESET_JAM = 10;
function planCarryOpen_(iso) {
  const now = new Date(), tz = planTz_();
  return iso === Utilities.formatDate(now, tz, 'yyyy-MM-dd') && Number(Utilities.formatDate(now, tz, 'H')) < PLAN_RESET_JAM;
}

// Riwayat Plan satu tanggal (yyyy-mm-dd).
// fb (opsional, true): bila tanggal itu belum punya Plan, kembalikan Plan terakhir sebelum tanggal itu (date = tanggal Plan yang ditampilkan,
// requested = tanggal yang diminta, fallback = true). Plan baru muncul setelah Create > Get Plan > Save dibuat untuk tanggal tersebut.
// sisaFrom: { KIKC: yyyy-mm-dd } tanggal Plan asal tiap lot berlabel "Sisa Order" (Plan paling awal tempat lot itu belum celup).
function getPlanHari(iso, fb, force) {
  try {
    iso = str_(iso).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Tanggal tidak valid.');
    const dates = getPlanTanggal().dates || [];
    let shown = iso, fell = false;
    if (fb && dates.indexOf(iso) < 0 && planCarryOpen_(iso)) {
      const prev = dates.filter(function (d) { return d < iso; }).pop();
      if (prev) { shown = prev; fell = true; }
    }
    const want = shown.split('-').reverse().join('/');
    const out = { success: true, date: shown, requested: iso, fallback: fell, headers: PLAN_HARIAN_HEAD.slice(1, 11), rows: [], savedAt: '', dates: dates, sisaFrom: {}, celupPlan: {}, statusLot: {}, statusAll: {} };
    const stl = readStatusLot_();   // SISA ORDER / PENDING dari tab Plan
    const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
    if (!sh || sh.getLastRow() < 2) return out;
    const last = sh.getLastRow();
    const colA = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    let lo = -1, hi = -1;
    colA.forEach(function (c, i) { if (str_(c[0]).trim() === want) { if (lo < 0) lo = i; hi = i; } });
    if (lo < 0) return out;
    const rng = sh.getRange(2 + lo, 1, hi - lo + 1, PLAN_HARIAN_HEAD.length);
    const block = rng.getDisplayValues(), raw = rng.getValues();
    let carry = null;
    const cm = celupPlanMap_();   // KIKC -> tanggal Plan terbaru yang sudah disusul input data
    const live = livePlanMap_(!!force);   // data terkini sheet Plan / WOD untuk melengkapi isian yang kosong
    const clpd = clpDateMap_();   // KIKC -> tanggal tab Celup (CLP): prioritas utama
    block.forEach(function (r, i) {
      if (str_(r[0]).trim() !== want) return;
      const row = r.slice(1, 11).map(function (x) { return str_(x).trim(); });
      const kg = raw[i][7], cone = raw[i][8];   // KG angka desimal (koma), CONE angka bulat; sel lama berisi teks dipakai apa adanya
      if (typeof kg === 'number') row[6] = String(Math.round(kg * 100) / 100).replace('.', ',');
      if (typeof cone === 'number') row[7] = String(Math.round(cone));
      fillPlanRow_(row, live);   // isian yang kosong saat Save, bila kini sudah terisi di sheet Plan, ikut terbaca
      const kc = normKikc_(row[0]);
      if (kc && clpd[kc]) row[9] = clpd[kc];   // 1) tanggal tab Celup (CLP) = master data produksi
      else if (kc && cm[kc]) { row[9] = cm[kc]; out.celupPlan[kc] = cm[kc]; }   // 2) tanggal Plan bila lot sudah terinput setelah Plan itu (bukan Sisa Order)
      const sl = kc ? stl[kc] : null;
      if (sl) {
        out.statusAll[kc] = sl.s;   // status centang (kolom virtual SISA ORDER / PENDING di tab Plan)
        if (sl.s === 'SISA') { out.statusLot[kc] = 'SISA'; row[9] = 'Sisa Order'; delete out.celupPlan[kc]; }   // dicentang SISA ORDER: belum terealisasi celup
        else if (sl.s === 'PENDING' && shown <= sl.d) { out.statusLot[kc] = 'PENDING'; if (/^sisa\s*order$/i.test(row[9])) row[9] = ''; }   // PENDING (berlaku untuk Plan tanggal ini): lot ditarik, bukan Sisa Order
      }
      out.rows.push(row);
      if (!out.savedAt) out.savedAt = str_(r[11]).trim();
      if (/^sisa\s*order$/i.test(row[9])) {   // CELUP = "Sisa Order": cari Plan asalnya
        if (!carry) carry = planCarry_(shown);
        const k = normKikc_(row[0]);
        if (k && !out.sisaFrom[k]) out.sisaFrom[k] = carry[k] || shown;
      }
    });
    // Baris CELUP masih kosong setelah pukul 09:00 hari sesudah tanggal Plan = "Sisa Order"
    if (planSisaLewat_(shown)) {
      out.rows.forEach(function (r) {
        if (r[9]) return;
        const sp = stl[normKikc_(r[0])];
        if (sp && sp.s === 'PENDING' && shown <= sp.d) return;   // PENDING: lot ditarik, tidak menjadi Sisa Order
        r[9] = 'Sisa Order';
        if (!carry) carry = planCarry_(shown);
        const k = normKikc_(r[0]);
        if (k && !out.sisaFrom[k]) out.sisaFrom[k] = carry[k] || shown;
      });
    }
    return out;
  } catch (e) {
    return { error: e.message };
  }
}

// Tanggal tab Celup (sheet CLP) per KIKC (baris pertama = terbaru).
function clpDateMap_() {
  const out = Object.create(null);
  try {
    const clp = getList('clp', false);
    if (clp && !clp.error && clp.rows) {
      const ck = clp.headers.indexOf('KIKC'), ct = clp.headers.indexOf('TANGGAL');
      if (ck >= 0 && ct >= 0) clp.rows.forEach(function (r) {
        const k = normKikc_(r[ck]), t = str_(r[ct]).trim();
        if (k && t && !out[k]) out[k] = t;
      });
    }
  } catch (e) { /* tanpa peta CLP: aturan lain berlaku */ }
  return out;
}

// Tanggal Celup menurut Plan. Untuk tiap KIKC: tanggal Plan Harian TERBARU (P) yang sudah disusul input data di sheet Jawaban pada tanggal SETELAH P.
// Contoh: lot ada di Plan 19/10, diinput 20/10 -> CELUP = 19/10. Lot Sisa Order dari Plan 16/10 yang dibuat lagi di Plan 19/10 lalu diinput 20/10 -> CELUP = 19/10 (Plan terbaru).
// Lot yang belum terinput setelah Plan-nya tidak masuk peta ini (tetap memakai isi lama: tanggal tab Celup / "Sisa Order").
function celupPlanMap_() {
  const out = Object.create(null);
  try {
    const ph = findSheet_(ss_(), SHEET_PLAN_HARIAN), jw = getJawabanSheet_(false);
    if (!ph || ph.getLastRow() < 2 || !jw || jw.getLastRow() < 2) return out;
    const tz = planTz_(), n = jw.getLastRow() - 1;
    const ts = jw.getRange(2, 1, n, 1).getValues(), kk = jw.getRange(2, 3, n, 1).getDisplayValues();
    const inp = Object.create(null);   // KIKC -> tanggal input terakhir (yyyy-MM-dd)
    for (let i = 0; i < n; i++) {
      const d = dateKey_(ts[i][0], tz), k = normKikc_(kk[i][0]);
      if (d && k && (!inp[k] || d > inp[k])) inp[k] = d;
    }
    const best = Object.create(null);   // KIKC -> Plan terbaru (yyyy-MM-dd) yang tanggalnya sebelum input terakhir
    ph.getRange(2, 1, ph.getLastRow() - 1, 2).getDisplayValues().forEach(function (c) {
      const d = planIso_(str_(c[0]).trim()), k = normKikc_(c[1]);
      if (d && k && inp[k] && d < inp[k] && (!best[k] || d > best[k])) best[k] = d;
    });
    Object.keys(best).forEach(function (k) { out[k] = best[k].split('-').reverse().join('/'); });
  } catch (e) { /* tanpa peta: tampilan lama berlaku */ }
  return out;
}

// Penyimpanan otomatis harian sudah diganti dengan Create > Get Plan > Save. Pemicu lama (jika pernah dipasang) menghapus dirinya sendiri
// saat jalan berikutnya, atau jalankan hapusPemicuPlanHarian() sekali dari editor Apps Script.
function hapusPemicuPlanHarian() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'simpanPlanHarianOtomatis') { ScriptApp.deleteTrigger(t); n++; } });
  return n + ' pemicu lama dihapus.';
}
function pasangPemicuPlanHarian() { return 'Tidak dipakai lagi. Plan disimpan lewat tab Plan > Create > Get Plan > Save. ' + hapusPemicuPlanHarian(); }
function simpanPlanHarianOtomatis() { return hapusPemicuPlanHarian(); }

// Jalankan SEKALI dari editor Apps Script: merapikan baris lama di sheet "Plan Harian" (yang tersimpan sebagai teks) menjadi tipe yang benar:
// TANGGAL/CELUP = tanggal, KG = angka desimal, CONE = angka bulat, DISIMPAN = tanggal+jam. Aman dijalankan ulang.
function rapikanPlanHarian() {
  const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
  if (!sh || sh.getLastRow() < 2) return 'Sheet Plan Harian kosong.';
  const n = sh.getLastRow() - 1, rng = sh.getRange(2, 1, n, PLAN_HARIAN_HEAD.length);
  const lock = lock_();
  try {
    const out = rng.getDisplayValues().map(function (r) {
      if (!str_(r[1]).trim() && !str_(r[0]).trim()) return r;
      const x = r.map(function (c) { return str_(c).trim(); });
      x[0] = dateCell_(x[0]); x[7] = kgCell_(x[7]); x[8] = coneCell_(x[8]); x[10] = dateCell_(x[10]); x[11] = stampCell_(x[11]);
      return x;
    });
    rng.setNumberFormats(planFmtRows_(n)).setValues(out);
    SpreadsheetApp.flush();
    try { CacheService.getScriptCache().remove('plan_dates'); } catch (e) { /* abaikan */ }
    return n + ' baris dirapikan.';
  } finally {
    unlock_(lock);
  }
}

// Jalankan SEKALI dari editor Apps Script (opsional): menyalin isi kolom Alokasi lama di sheet Plan ke sheet Alokasi.
// Tanpa menjalankan ini pun, penyalinan terjadi otomatis saat tab Plan pertama kali dimuat setelah kode ini dipasang.
function migrasiAlokasiLama() {
  const sp = findSheet_(ss_(), SHEET_PLAN);
  if (!sp) throw new Error('Sheet Plan tidak ditemukan.');
  const pc = planCols_(sp);
  if (pc.alokasi < 0) return 'Kolom Alokasi lama tidak ada di sheet Plan.';
  const last = sp.getLastRow();
  if (last < 2) return 'Sheet Plan kosong.';
  const kc = pc.pick[0] + PLAN_FIRST_COL, ac = pc.alokasi + PLAN_FIRST_COL;
  const kk = sp.getRange(2, kc, last - 1, 1).getDisplayValues(), aa = sp.getRange(2, ac, last - 1, 1).getDisplayValues();
  const saved = readAlokasi_().vals, pairs = [];
  for (let i = 0; i < kk.length; i++) {
    const k = normKikc_(kk[i][0]), v = str_(aa[i][0]).trim();
    if (k && v && !Object.prototype.hasOwnProperty.call(saved, k)) pairs.push([k, v]);
  }
  if (pairs.length) saveAlokasiBatch_(pairs);
  return pairs.length + ' alokasi disalin ke sheet Alokasi.';
}

// ================= 2c. Tanggal Pack (sheet PACK) dan lot Outstanding =================
// Tanggal Pack = kolom A sheet "PACK", dicocokkan dengan KIKC (judul "KIKC" di baris 1 sheet PACK; jika tidak ada: kolom B).
// Lot yang sudah punya Tanggal Pack dianggap FINISH, jadi tidak perlu dilacak lagi di tab Data / Outstanding.
// Peta {KIKC: 'dd/MM/yyyy'} disimpan di CacheService (PACK_TTL). Jika satu KIKC muncul beberapa kali di PACK, tanggal TERBARU yang dipakai.
function dmyToDate_(dmy) {
  const x = parseDmy_(dmy, false);
  return x ? new Date(x.y, x.m - 1, x.d) : '';
}

// Lot yang disebut di keterangan PACK dengan kata "EX" (mis. "EX.ZZN26J096/PKN KHUSUS STRIPAN (PRB)" di baris lot ZZT26J001) = lot asal yang sudah dipack ulang
// sebagai lot lain, jadi dianggap sudah Pack. Hasilnya hanya untuk tab Outstanding (peta .ex), tidak mengubah peta utama (.map) yang dipakai tab Delivery, WIP, dan sinkron kolom P.
function exLots_(ket) {
  const s = str_(ket).toUpperCase(), out = [];
  const re = /(?:^|[^A-Z])EX[\s.:\-]*/g, tk = /^\s*(?:[,\/&+]|DAN)?\s*([A-Z]{2,4}\d{2}[A-Z]\d{2,4})/;
  let m;
  while ((m = re.exec(s)) !== null) {
    let rest = s.slice(re.lastIndex), t;
    while ((t = tk.exec(rest)) !== null) { out.push(t[1]); rest = rest.slice(t[0].length); }
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  return out;
}

function getPackMap_(force, cacheOnly) {
  if (!force) {
    const hit = listCacheGet_('packmap');
    if (hit && hit.map && hit.ex) return hit;   // cache lama (tanpa .ex) diabaikan
  }
  if (cacheOnly) return null;
  const sh = findSheet_(ss_(), SHEET_PACK);
  if (!sh) return { map: {}, ex: {}, missing: true, n: 0 };
  const last = sh.getLastRow();
  const res = { map: {}, ex: {}, missing: false, n: 0 };
  if (last < 2) { listCachePut_('packmap', res, PACK_TTL); return res; }
  const nHead = Math.max(1, Math.min(sh.getMaxColumns(), 30));
  const head = sh.getRange(1, 1, 1, nHead).getDisplayValues()[0].map(function (x) { return str_(x).replace(/\s+/g, ' ').trim().toUpperCase(); });
  let kc = head.indexOf('KIKC') + 1;
  if (kc < 1) kc = PACK_KIKC_DEFAULT;
  let ketc = -1;
  for (let j = 0; j < head.length; j++) { if (/^KET(ERANGAN)?\.?$/.test(head[j])) { ketc = j + 1; break; } }
  const width = Math.max(PACK_DATE_COL, kc, ketc);
  const disp = sh.getRange(2, 1, last - 1, width).getDisplayValues();
  const raw = sh.getRange(2, PACK_DATE_COL, last - 1, 1).getValues();
  const tz = sh.getParent().getSpreadsheetTimeZone(), mdy = !!DATE_TEXT_MDY.pack;
  const best = {}, bestEx = {};
  for (let i = 0; i < disp.length; i++) {
    const k = normKikc_(disp[i][kc - 1]);
    if (!k || k === 'KIKC') continue;
    const key = sortKey_(raw[i][0], disp[i][PACK_DATE_COL - 1], mdy);
    if (!key) continue;   // tanggal kosong / bukan tanggal: belum dianggap Pack
    const dmy = fmtDmy_(raw[i][0], disp[i][PACK_DATE_COL - 1], tz, mdy);
    if (best[k] === undefined || key > best[k]) { best[k] = key; res.map[k] = dmy; }
    if (ketc > 0) {
      exLots_(disp[i][ketc - 1]).forEach(function (x) {
        x = normKikc_(x);
        if (x === k) return;
        if (bestEx[x] === undefined || key > bestEx[x]) { bestEx[x] = key; res.ex[x] = dmy; }
      });
    }
  }
  res.n = Object.keys(res.map).length;
  listCachePut_('packmap', res, PACK_TTL);
  return res;
}

function isoShift_(iso, d) {
  const p = iso.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + d)).toISOString().slice(0, 10);
}
const POSISI_URUT = ['CELUP', 'HDX', 'RF', 'WIP', 'KELOS', 'PACK'];

// Kontrol lot outstanding: lot yang pernah terdata dalam TERLEWAT_HARI hari sebelum tanggal iso, tetapi TIDAK terdata pada tanggal iso,
// kecuali lot yang sudah punya Tanggal Pack pada/ sebelum iso (KIKC ada di sheet PACK dengan tanggal terisi, atau kolom P di sheet Jawaban terisi).
// Sheet PACK hanya dipakai untuk kontrol ini; lot Pack tetap bisa diinput seperti biasa.
const TERLEWAT_HARI = 14;   // jendela pemeriksaan ke belakang (hari)
function getTerlewat(iso, force, mode) {
  try {
    if (str_(mode) !== MODE_ADMIN) return { error: 'Daftar Outstanding hanya untuk mode Admin.' };
    iso = planIsoOk_(iso);
    const from = isoShift_(iso, -TERLEWAT_HARI);
    const out = { success: true, date: iso, from: from, days: TERLEWAT_HARI, rows: [], warn: '', counts: { prev: 0, today: 0, packed: 0, missing: 0 } };
    const sheet = getJawabanSheet_(false);
    if (!sheet || sheet.getLastRow() < 2) return out;
    const pack = getPackMap_(!!force);
    if (pack.missing) out.warn = 'Sheet "' + SHEET_PACK + '" tidak ditemukan, jadi hanya kolom Tanggal Pack di sheet Jawaban yang dipakai.';   // lot yang disebut "EX.<KIKC>" di keterangan PACK juga dianggap sudah Pack
    const tz = sheet.getParent().getSpreadsheetTimeZone();
    const last = sheet.getLastRow();
    const tsCol = sheet.getRange(2, 1, last - 1, 1).getValues();
    const keys = tsCol.map(function (r) { return dateKey_(r[0], tz); });
    let lo = -1, hi = -1;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] && keys[i] >= from && keys[i] <= iso) { if (lo < 0) lo = i; hi = i; }
    }
    if (lo < 0) return out;
    const nCols = Math.min(TOTAL_COLS, sheet.getMaxColumns());
    const block = sheet.getRange(2 + lo, 1, hi - lo + 1, nCols).getDisplayValues();
    const prev = {}, today = {};
    for (let i = lo; i <= hi; i++) {
      const key = keys[i];
      if (!key || key < from || key > iso) continue;   // baris di antara yang tanggalnya di luar jendela
      const r = padRow_(block[i - lo], TOTAL_COLS), k = normKikc_(r[2]);
      if (!k || !str_(r[1]).trim()) continue;
      if (key === iso) today[k] = 1;
      else if (!prev[k] || key >= prev[k].key) prev[k] = { r: r, key: key, ts: fmtTs_(tsCol[i][0], r[0], tz) };   // input terakhir sebelum iso
    }
    const refs = refMaps_();
    const dayMs = 86400000, isoMs = Date.parse(iso + 'T00:00:00Z');
    const list = [];
    Object.keys(prev).forEach(function (k) {
      out.counts.prev++;
      if (today[k]) { out.counts.today++; return; }
      const r = prev[k].r, stored = fmtDmy_(r[COL_PACK - 1], r[COL_PACK - 1], tz, false);
      const pd = pack.map[k] || (pack.ex && pack.ex[k]) || stored, pdIso = pd ? planIso_(pd) : '';
      if (pd && (!pdIso || pdIso <= iso)) { out.counts.packed++; return; }   // sudah Pack pada/ sebelum tanggal ini = Finish
      const cl = refs.clp[k] || {}, pl = refs.plan[k] || {};
      const pick = function (f, own) { return cl[f] || pl[f] || own; };
      list.push({
        kikc: str_(r[2]).trim(), noBenang: pick('noBenang', r[3]), warna: pick('warna', r[4]), mesin: pick('mesin', r[5]),
        kg: pick('kg', r[6]), cone: pick('cone', r[7]), shift: pick('shift', r[8]), grup: pick('grup', r[9]),
        posisi: stripNum_(r[10]), qc: stripNum_(r[11]), keterangan: str_(r[13]).trim(), waktu: prev[k].ts,
        tglCelup: cl.tanggal || '', hari: Math.round((isoMs - Date.parse(prev[k].key + 'T00:00:00Z')) / dayMs), terakhir: prev[k].key.split('-').reverse().join('/')
      });
    });
    const rank = function (p) { const x = POSISI_URUT.indexOf(p); return x < 0 ? 99 : x; };
    list.sort(function (a, b) { return (b.hari - a.hari) || (rank(a.posisi) - rank(b.posisi)) || a.kikc.localeCompare(b.kikc); });
    out.rows = list;
    out.counts.missing = list.length;
    return out;
  } catch (e) {
    return { error: e.message };
  }
}

// Mengisi kolom P (Tanggal Pack) di sheet Jawaban dari sheet PACK. Hanya MENGISI / MEMPERBARUI bila PACK punya tanggal; isi lama tidak pernah dihapus.
// Jika kolom P berisi rumus sheet, tidak ditulis (rumus dibiarkan).
function syncTanggalPack(mode) {
  needAdmin_(mode);
  return syncPack_();
}
function syncPack_() {
  const lock = lock_();
  try {
    const sheet = getJawabanSheet_(false);
    if (!sheet || sheet.getLastRow() < 2) return { filled: 0, updated: 0, total: 0, formula: false };
    ensureColumns_(sheet);
    const pack = getPackMap_(true);
    if (pack.missing) throw new Error('Sheet "' + SHEET_PACK + '" tidak ditemukan di spreadsheet.');
    const n = sheet.getLastRow() - 1;
    const rng = sheet.getRange(2, COL_PACK, n, 1);
    if (rng.getFormulas().some(function (r) { return r[0]; })) return { filled: 0, updated: 0, total: n, formula: true };
    const kk = sheet.getRange(2, 3, n, 1).getDisplayValues();
    const raw = rng.getValues(), disp = rng.getDisplayValues();
    const tz = sheet.getParent().getSpreadsheetTimeZone();
    let filled = 0, updated = 0;
    const out = raw.map(function (c, i) {
      const k = normKikc_(kk[i][0]), want = k ? pack.map[k] : '';
      if (!want) return [c[0]];
      const cur = fmtDmy_(c[0], disp[i][0], tz, false);
      if (cur === want) return [c[0]];
      if (cur) updated++; else filled++;
      return [dmyToDate_(want)];
    });
    if (filled || updated) {
      rng.setNumberFormat('dd/MM/yyyy');
      rng.setValues(out);
      SpreadsheetApp.flush();
    }
    return { filled: filled, updated: updated, total: n, formula: false };
  } finally {
    unlock_(lock);
  }
}

// Opsional, jalankan SEKALI dari editor Apps Script: pemicu otomatis tiap jam untuk menyinkronkan kolom P (Tanggal Pack).
function pasangPemicuTanggalPack() {
  hapusPemicuTanggalPack();
  ScriptApp.newTrigger('sinkronTanggalPackOtomatis').timeBased().everyHours(1).create();
  return 'Pemicu sinkron Tanggal Pack dipasang (tiap 1 jam).';
}
function hapusPemicuTanggalPack() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sinkronTanggalPackOtomatis') { ScriptApp.deleteTrigger(t); n++; } });
  return n + ' pemicu dihapus.';
}
function sinkronTanggalPackOtomatis() { return syncPack_(); }
// Uji dari editor: melihat hasil baca sheet PACK tanpa menulis apa pun.
function tesPack() {
  const r = getPackMap_(true);
  Logger.log(r.missing ? 'Sheet PACK tidak ditemukan.' : 'KIKC dengan Tanggal Pack: ' + r.n);
  Logger.log('Contoh: ' + JSON.stringify(Object.keys(r.map).slice(0, 5).map(function (k) { return [k, r.map[k]]; })));
}

// ================= 2d. Page 2: tab Pack (sheet PACK) dan RPH (sheet RPH) =================
// Isi sheet ditampilkan apa adanya menurut judul kolom baris 1 (maks. 40 kolom). Kolom tanggal (judul berisi TANGGAL/TGL/DATE, atau kolom A bila isinya tanggal)
// diformat DD/MM/YYYY dan dipakai mengurutkan dari terbaru; tanpa kolom tanggal, baris paling bawah di sheet tampil paling atas.
const SHEET_LIST2 = { pack: SHEET_PACK, rph: SHEET_RPH, soft: 'SOFT' };   // 'SOFT' = SHEET_SOFT (ditulis langsung: const itu dideklarasikan di bagian bawah file)
function buildSheetList_(name) {
  const sh = findSheet_(ss_(), name);
  if (!sh) throw new Error(name === 'SOFT' ? 'Sheet "SOFT" belum ada. Isi dulu lewat Home > Input > SOFT.' : 'Tab "' + name + '" tidak ditemukan di spreadsheet.');
  const lastR = sh.getLastRow(), lastC = Math.min(sh.getLastColumn(), 40);
  if (lastR < 1 || lastC < 1) return { success: true, headers: [], rows: [], total: 0, name: name };
  const head = sh.getRange(1, 1, 1, lastC).getDisplayValues()[0].map(function (x, i) { const t = str_(x).replace(/\s+/g, ' ').trim(); return t || ('KOLOM ' + (i + 1)); });
  if (lastR < 2) return { success: true, headers: head, rows: [], total: 0, name: name };
  const rng = sh.getRange(2, 1, lastR - 1, lastC), disp = rng.getDisplayValues(), raw = rng.getValues();
  const tz = sh.getParent().getSpreadsheetTimeZone(), mdy = !!DATE_TEXT_MDY[name.toLowerCase()];
  let dc = -1;
  for (let j = 0; j < head.length; j++) { if (/tanggal|tgl|date/i.test(head[j])) { dc = j; break; } }
  if (dc < 0) {   // kolom A dianggap tanggal bila sebagian besar isinya tanggal asli
    let n = 0, d = 0;
    for (let i = 0; i < raw.length && n < 60; i++) { if (str_(disp[i][0]).trim()) { n++; if (Object.prototype.toString.call(raw[i][0]) === '[object Date]') d++; } }
    if (n && d / n >= 0.5) dc = 0;
  }
  const items = [];
  for (let i = 0; i < disp.length; i++) {
    const row = disp[i].map(function (v, j) {
      const x = raw[i][j];
      if (Object.prototype.toString.call(x) === '[object Date]' && !isNaN(x.getTime())) {
        const hm = Utilities.formatDate(x, tz, 'HH:mm');
        return Utilities.formatDate(x, tz, 'dd/MM/yyyy') + (hm !== '00:00' ? ' ' + hm : '');
      }
      return str_(v).trim();
    });
    if (!row.some(function (c) { return c; })) continue;
    let key = 0;
    if (dc >= 0) { key = sortKey_(raw[i][dc], disp[i][dc], mdy); if (Object.prototype.toString.call(raw[i][dc]) !== '[object Date]') row[dc] = fmtDmy_(raw[i][dc], disp[i][dc], tz, mdy); }
    items.push({ row: row, key: key, i: i });
  }
  items.sort(function (a, b) { return (b.key - a.key) || (b.i - a.i); });
  return { success: true, headers: head, rows: items.map(function (x) { return x.row; }), total: items.length, name: name, dc: dc };
}
// from/to (yyyy-MM-dd) = periode menurut kolom tanggal (dikosongkan = semua). query tidak kosong = cari di SEMUA tanggal (periode diabaikan), maks. 2000 hasil.
function getSheetList(which, force, from, to, query) {
  try {
    which = str_(which).toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(SHEET_LIST2, which)) throw new Error('Daftar tidak dikenal: ' + which);
    const ck = 'shl_' + which;
    let full = force ? null : listCacheGet_(ck);
    if (!full) { full = buildSheetList_(SHEET_LIST2[which]); listCachePut_(ck, full); }
    const dc = (full.dc === undefined || full.dc === null) ? -1 : full.dc, qn = normQ_(query).trim();
    const f = str_(from).trim(), t = str_(to).trim();
    let rows = full.rows || [], truncated = false;
    if (qn) {
      rows = rows.filter(function (r) { return normQ_(r.join(' ')).indexOf(qn) >= 0; });
      if (rows.length > 2000) { rows = rows.slice(0, 2000); truncated = true; }
    } else if (dc >= 0 && (f || t)) {
      rows = rows.filter(function (r) {
        const iso = planIso_(str_(r[dc]).slice(0, 10));
        return iso && (!f || iso >= f) && (!t || iso <= t);
      });
    }
    return { success: true, headers: full.headers, rows: rows, total: rows.length, all: full.total, dateCol: dc, name: full.name, truncated: truncated, from: f, to: t };
  } catch (e) {
    return { error: e.message };
  }
}

// ================= 2e. Page 2: tab Delivery (lama proses Celup -> Pack) =================
// Lama proses = Tanggal Pack (sheet PACK, kolom A) dikurangi Tanggal Celup (tab Celup / sheet CLP), dalam hari kalender (celup dan pack di hari yang sama = 0 hari).
//   Lama <= DELIVERY_BATAS_HARI                              -> TEPAT WAKTU
//   Lama > DELIVERY_BATAS_HARI dan <= DELIVERY_TELAT_HARI    -> TOLERANSI (lewat batas, belum dianggap telat)
//   Lama > DELIVERY_TELAT_HARI (lebih dari seminggu)         -> TERLAMBAT
// Lot yang dihitung = lot yang Tanggal Pack-nya jatuh di dalam periode. Jika satu KIKC celup lebih dari sekali, tanggal celup PERTAMA dipakai (awal proses);
// jika satu KIKC dipack beberapa kali, Tanggal Pack TERAKHIR yang dipakai (sama seperti peta PACK di tab WIP). Lot tanpa tanggal celup, atau pack lebih awal dari celup,
// diberi status "cek" dan tidak ikut dihitung persentase. Persentase dan ringkasan dihitung di halaman (mengikuti pencarian), server hanya mengirim barisnya.
const DELIVERY_BATAS_HARI = 5;
const DELIVERY_TELAT_HARI = 7;
const DELIVERY_MAX = 5000;
function kgNum_(v) {
  let s = str_(v).trim().replace(/[^\d.,\-]/g, '');
  if (!s) return 0;
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  if (c >= 0 && d >= 0) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) s = s.replace(/\./g, '').replace(/,(?=.*,)/g, '').replace(',', '.');
  else if (d >= 0 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function daysBetweenIso_(a, b) {
  const pa = a.split('-'), pb = b.split('-');
  return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
}
function getDelivery(from, to, force) {
  try {
    const clp = getList('clp', !!force);
    if (!clp || clp.error) throw new Error((clp && clp.error) || 'Tab Celup tidak bisa dibaca.');
    const pack = getPackMap_(!!force);
    if (pack.missing) throw new Error('Sheet "' + SHEET_PACK + '" tidak ditemukan di spreadsheet.');
    const h = clp.headers, ix = function (n) { return h.indexOf(n); };
    const iK = ix('KIKC'), iT = ix('TANGGAL'), iB = ix('NO BENANG'), iW = ix('WARNA'), iM = ix('MESIN'), iG = ix('KG');
    if (iK < 0 || iT < 0) throw new Error('Kolom KIKC / TANGGAL tidak ditemukan di tab Celup.');
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    const first = Object.create(null);   // KIKC -> data celup paling awal
    (clp.rows || []).forEach(function (r) {
      const k = normKikc_(r[iK]), dmy = str_(r[iT]).trim(), iso = planIso_(dmy);
      if (!k || !isoRe.test(iso)) return;
      const cur = first[k];
      if (!cur || iso < cur.iso) first[k] = { iso: iso, dmy: dmy, noBenang: str_(r[iB]).trim(), warna: str_(r[iW]).trim(), mesin: str_(r[iM]).trim(), kg: 0 };
      if (first[k].iso === iso) first[k].kg += kgNum_(r[iG]);   // beberapa baris celup pada hari yang sama dijumlahkan
    });
    const f = str_(from).trim(), t = str_(to).trim();
    const out = [];
    Object.keys(pack.map || {}).forEach(function (k) {
      const pdmy = pack.map[k], piso = planIso_(pdmy);
      if (!isoRe.test(piso)) return;
      if ((f && piso < f) || (t && piso > t)) return;
      const c = first[k];
      let hari = null, status = 'cek';
      if (c) {
        hari = daysBetweenIso_(c.iso, piso);
        if (hari >= 0) status = hari <= DELIVERY_BATAS_HARI ? 'tepat' : (hari <= DELIVERY_TELAT_HARI ? 'toleransi' : 'telat');
      }
      out.push({ kikc: k, noBenang: c ? c.noBenang : '', warna: c ? c.warna : '', mesin: c ? c.mesin : '', kg: c ? Math.round(c.kg * 100) / 100 : 0,
        celup: c ? c.dmy : '', pack: pdmy, packIso: piso, hari: hari, status: status });
    });
    out.sort(function (a, b) { return a.packIso < b.packIso ? 1 : (a.packIso > b.packIso ? -1 : (a.kikc < b.kikc ? -1 : 1)); });
    const truncated = out.length > DELIVERY_MAX;
    return { success: true, rows: truncated ? out.slice(0, DELIVERY_MAX) : out, total: out.length, truncated: truncated,
      batas: DELIVERY_BATAS_HARI, telat: DELIVERY_TELAT_HARI, from: f, to: t };
  } catch (e) {
    return { error: e.message };
  }
}

// ================= 2f. Input SOFT (stok WIP cone per benang di mesin SSM, FADIS, TAIHE) =================
// Referensi: sheet "SUP" (kolom A = daftar Benang, kolom B = daftar Supplier; DUA DAFTAR TERPISAH, bukan pasangan per baris; baris 1 = judul). Tujuan simpan: sheet "SOFT" (dibuat otomatis bila belum ada), SATU BARIS per baris isian:
//   A Timestamp | B ID UNIK | C TANGGAL | D BENANG | E SUPPLIER | F KETERANGAN | G BERAT (KG/CONE) | H SSM | I FADIS | J TAIHE | K SUM CONE | L SUM KG
// Timestamp sama untuk semua baris dalam satu pengiriman; ID UNIK berbeda per baris. SUM CONE = SSM + FADIS + TAIHE; SUM KG = SUM CONE x BERAT (dihitung ulang di server).
const SHEET_SUP = 'SUP';
const SHEET_SOFT = 'SOFT';
const SOFT_HEADERS = ['Timestamp', 'ID UNIK', 'TANGGAL', 'BENANG', 'SUPPLIER', 'KETERANGAN', 'BERAT (KG/CONE)', 'SSM', 'FADIS', 'TAIHE', '∑ CONE', '∑ KG'];
const SUP_TTL = 60;
function getSoftRef(force) {
  try {
    if (!force) { const hit = listCacheGet_('sup2'); if (hit && hit.benang) return hit; }
    const sh = findSheet_(ss_(), SHEET_SUP);
    if (!sh) throw new Error('Tab "' + SHEET_SUP + '" tidak ditemukan di spreadsheet.');
    const last = sh.getLastRow();
    const benang = [], suppliers = [], seenB = Object.create(null), seenS = Object.create(null);
    // Kolom A (Benang) dan kolom B (Supplier) adalah DUA DAFTAR TERPISAH (bukan pasangan per baris): semua supplier bisa dipakai untuk semua benang.
    if (last >= 2) {
      const v = sh.getRange(2, 1, last - 1, 2).getDisplayValues();
      for (let i = 0; i < v.length; i++) {
        const b = str_(v[i][0]).replace(/\s+/g, ' ').trim(), sp = str_(v[i][1]).replace(/\s+/g, ' ').trim();
        if (b && b.toUpperCase() !== 'BENANG' && !seenB[b.toLowerCase()]) { seenB[b.toLowerCase()] = true; benang.push(b); }
        if (sp && sp.toUpperCase() !== 'SUPPLIER' && !seenS[sp.toLowerCase()]) { seenS[sp.toLowerCase()] = true; suppliers.push(sp); }
      }
    }
    const cmp = function (x, y) { return x.localeCompare(y, 'id', { numeric: true, sensitivity: 'base' }); };
    benang.sort(cmp); suppliers.sort(cmp);
    const res = { success: true, benang: benang, suppliers: suppliers };
    listCachePut_('sup2', res, SUP_TTL);
    return res;
  } catch (e) {
    return { error: e.message };
  }
}
// Tambah satu nilai ke kolom daftar di sheet SUP (kolom 1 = Benang, kolom 2 = Supplier): ditulis tepat di bawah isi terakhir KOLOM ITU. Mengembalikan false bila sudah ada.
function supAppend_(sh, col, val) {
  const max = sh.getMaxRows();
  const v = sh.getRange(1, col, max, 1).getValues(), low = val.toLowerCase();
  let last = 1;
  for (let i = 0; i < v.length; i++) {
    const t = str_(v[i][0]).replace(/\s+/g, ' ').trim();
    if (!t) continue;
    last = i + 1;
    if (t.toLowerCase() === low) return false;
  }
  if (last + 1 > max) sh.insertRowsAfter(max, 1);
  const c = sh.getRange(last + 1, col);
  c.setNumberFormat('@');   // teks biasa: nama yang diawali = atau + tidak dibaca sebagai rumus
  c.setValue(val);
  return true;
}
function supName_(t, label, no) {
  if (!t) throw new Error(no + label + ' kosong.');
  if (t.length > 60) throw new Error(no + label + ' terlalu panjang (maksimal 60 huruf).');
  if (/[\u0000-\u001f]/.test(t)) throw new Error(no + label + ' mengandung karakter yang tidak diperbolehkan.');
  return t;
}
function softNum_(v, label, int) {
  const t = str_(v).trim().replace(',', '.');
  if (!t) return 0;
  const n = Number(t);
  if (!isFinite(n) || n < 0) throw new Error(label + ' harus berupa angka 0 atau lebih.');
  if (int && Math.floor(n) !== n) throw new Error(label + ' harus bilangan bulat.');
  return n;
}
function saveSoft(p) {
  p = p || {};
  needSoft_(p.mode);
  const tg = str_(p.tanggal).trim(), m = tg.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Tanggal tidak valid.');
  const tanggal = new Date(+m[1], +m[2] - 1, +m[3]);
  const inRows = Array.isArray(p.rows) ? p.rows : [];
  if (!inRows.length) throw new Error('Belum ada baris yang diisi.');
  if (inRows.length > 200) throw new Error('Terlalu banyak baris sekaligus (maksimal 200).');
  const ref = getSoftRef(false);
  if (ref.error) throw new Error(ref.error);
  const knownB = Object.create(null), knownS = Object.create(null);
  ref.benang.forEach(function (x) { knownB[x.toLowerCase()] = x; });
  ref.suppliers.forEach(function (x) { knownS[x.toLowerCase()] = x; });
  const addB = [], addS = [];   // benang / supplier baru yang akan ditambahkan ke sheet SUP
  const cid = str_(p.cid).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const out = [];
  inRows.forEach(function (r, i) {
    const no = 'Baris ' + (i + 1) + ': ';
    const b = str_(r.benang).replace(/\s+/g, ' ').trim();
    let canon = knownB[b.toLowerCase()];
    if (!canon) {
      if (r.baruBenang !== true) throw new Error(no + 'Benang "' + b + '" tidak ada di sheet ' + SHEET_SUP + '. Pilih dari daftar atau tambahkan sebagai benang baru.');
      canon = supName_(b, 'Benang', no); knownB[canon.toLowerCase()] = canon; addB.push(canon);
    }
    const sp = str_(r.supplier).replace(/\s+/g, ' ').trim();
    let spc = '';
    if (sp) {
      spc = knownS[sp.toLowerCase()];
      if (!spc) {
        if (r.baruSupplier !== true) throw new Error(no + 'Supplier "' + sp + '" tidak ada di sheet ' + SHEET_SUP + '. Pilih dari daftar atau tambahkan sebagai supplier baru.');
        spc = supName_(sp, 'Supplier', no); knownS[spc.toLowerCase()] = spc; addS.push(spc);
      }
    }
    let berat, ssm, fadis, taihe;
    try {
      berat = softNum_(r.berat, 'Berat (Kg/Cone)', false);
      ssm = softNum_(r.ssm, 'SSM', true); fadis = softNum_(r.fadis, 'FADIS', true); taihe = softNum_(r.taihe, 'TAIHE', true);
    } catch (e) { throw new Error(no + e.message); }
    const cone = ssm + fadis + taihe;
    out.push({ benang: canon, supplier: spc, ket: str_(r.keterangan).trim(), berat: berat, ssm: ssm, fadis: fadis, taihe: taihe, cone: cone, kg: Math.round(cone * berat * 100) / 100 });
  });
  const lock = lock_();
  try {
    if (cid && CacheService.getScriptCache().get('sf_' + cid)) return 'Data SOFT tersimpan (' + out.length + ' baris).';   // kiriman ulang: jangan simpan dua kali
    const ss = ss_();
    const baru = [];
    if (addB.length || addS.length) {
      const sup = findSheet_(ss, SHEET_SUP);
      if (!sup) throw new Error('Tab "' + SHEET_SUP + '" tidak ditemukan di spreadsheet.');
      addB.forEach(function (x) { if (supAppend_(sup, 1, x)) baru.push('benang ' + x); });
      addS.forEach(function (x) { if (supAppend_(sup, 2, x)) baru.push('supplier ' + x); });
      try { CacheService.getScriptCache().remove(LIST_PREFIX + 'sup2_n'); } catch (e) { /* abaikan */ }
    }
    let sh = findSheet_(ss, SHEET_SOFT);
    if (!sh) sh = ss.insertSheet(SHEET_SOFT);
    if (sh.getMaxColumns() < SOFT_HEADERS.length) sh.insertColumnsAfter(sh.getMaxColumns(), SOFT_HEADERS.length - sh.getMaxColumns());
    if (!str_(sh.getRange(1, 1).getDisplayValue()).trim()) {
      sh.getRange(1, 1, 1, SOFT_HEADERS.length).setValues([SOFT_HEADERS]).setFontWeight('bold').setBackground('#d9ead3');
      sh.setFrozenRows(1);
    }
    const ts = new Date(), base = newId_(ts).replace(/^YD-/, 'SF-');
    const vals = out.map(function (o, i) {
      return [ts, base + '-' + ('0' + (i + 1)).slice(-2), tanggal, o.benang, o.supplier, o.ket, o.berat, o.ssm, o.fadis, o.taihe, o.cone, o.kg];
    });
    const row = Math.max(sh.getLastRow(), 1) + 1;
    const rng = sh.getRange(row, 1, vals.length, SOFT_HEADERS.length);
    rng.setValues(vals);
    sh.getRange(row, 1, vals.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sh.getRange(row, 3, vals.length, 1).setNumberFormat('dd/MM/yyyy');
    sh.getRange(row, 4, vals.length, 3).setNumberFormat('@');
    sh.getRange(row, 7, vals.length, 1).setNumberFormat('0.0###');
    sh.getRange(row, 8, vals.length, 4).setNumberFormat('0');
    sh.getRange(row, 12, vals.length, 1).setNumberFormat('0.00');
    if (cid) { try { CacheService.getScriptCache().put('sf_' + cid, '1', 21600); } catch (e) { /* abaikan */ } }
    try { CacheService.getScriptCache().remove(LIST_PREFIX + 'shl_soft_n'); } catch (e) { /* abaikan */ }   // tabel SOFT di Page 2 langsung memuat baris baru
    return 'Data SOFT tersimpan (' + out.length + ' baris).' + (baru.length ? ' Ditambahkan ke SUP: ' + baru.join(', ') + '.' : '');
  } finally {
    unlock_(lock);
  }
}

// Cari baris sheet SOFT menurut ID UNIK (kolom B). Mengembalikan nomor baris, atau 0 bila tidak ada.
function softRowById_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2 || !id) return 0;
  const v = sh.getRange(2, 2, last - 1, 1).getDisplayValues();
  for (let i = 0; i < v.length; i++) { if (str_(v[i][0]).trim() === id) return i + 2; }
  return 0;
}
function softIdOk_(v) {
  const id = str_(v).trim();
  if (!id || id.length > 80 || /[\u0000-\u001f]/.test(id)) throw new Error('ID baris SOFT tidak valid.');
  return id;
}
// Ubah satu baris SOFT (dicari lewat ID UNIK). Timestamp dan ID UNIK tidak berubah; ∑ Cone dan ∑ Kg dihitung ulang.
function updateSoft(p) {
  p = p || {};
  needSoft_(p.mode);
  const id = softIdOk_(p.id);
  const m = str_(p.tanggal).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Tanggal tidak valid.');
  const tanggal = new Date(+m[1], +m[2] - 1, +m[3]);
  const ref = getSoftRef(false);
  if (ref.error) throw new Error(ref.error);
  const knownB = Object.create(null), knownS = Object.create(null);
  ref.benang.forEach(function (x) { knownB[x.toLowerCase()] = x; });
  ref.suppliers.forEach(function (x) { knownS[x.toLowerCase()] = x; });
  const b = str_(p.benang).replace(/\s+/g, ' ').trim();
  let canon = knownB[b.toLowerCase()], newB = '', newS = '';
  if (!canon) {
    if (p.baruBenang !== true) throw new Error('Benang "' + b + '" tidak ada di sheet ' + SHEET_SUP + '. Pilih dari daftar atau tambahkan sebagai benang baru.');
    canon = supName_(b, 'Benang', ''); newB = canon;
  }
  const sp = str_(p.supplier).replace(/\s+/g, ' ').trim();
  let spc = '';
  if (sp) {
    spc = knownS[sp.toLowerCase()];
    if (!spc) {
      if (p.baruSupplier !== true) throw new Error('Supplier "' + sp + '" tidak ada di sheet ' + SHEET_SUP + '. Pilih dari daftar atau tambahkan sebagai supplier baru.');
      spc = supName_(sp, 'Supplier', ''); newS = spc;
    }
  }
  const berat = softNum_(p.berat, 'Berat (Kg/Cone)', false), ssm = softNum_(p.ssm, 'SSM', true), fadis = softNum_(p.fadis, 'FADIS', true), taihe = softNum_(p.taihe, 'TAIHE', true);
  const cone = ssm + fadis + taihe;
  if (cone > 0 && !(berat > 0)) throw new Error('Berat (Kg/Cone) wajib diisi jika ada cone.');
  const lock = lock_();
  try {
    const sh = findSheet_(ss_(), SHEET_SOFT);
    if (!sh) throw new Error('Sheet "' + SHEET_SOFT + '" tidak ditemukan.');
    const row = softRowById_(sh, id);
    if (!row) throw new Error('Baris SOFT tidak ditemukan (mungkin sudah dihapus). Muat ulang daftar.');
    if (newB || newS) {
      const sup = findSheet_(ss_(), SHEET_SUP);
      if (!sup) throw new Error('Tab "' + SHEET_SUP + '" tidak ditemukan di spreadsheet.');
      if (newB) supAppend_(sup, 1, newB);
      if (newS) supAppend_(sup, 2, newS);
      try { CacheService.getScriptCache().remove(LIST_PREFIX + 'sup2_n'); } catch (e) { /* abaikan */ }
    }
    const rng = sh.getRange(row, 3, 1, 10);   // C..L: TANGGAL, BENANG, SUPPLIER, KETERANGAN, BERAT, SSM, FADIS, TAIHE, ∑ CONE, ∑ KG
    rng.setValues([[tanggal, canon, spc, str_(p.keterangan).trim(), berat, ssm, fadis, taihe, cone, Math.round(cone * berat * 100) / 100]]);
    sh.getRange(row, 3).setNumberFormat('dd/MM/yyyy');
    sh.getRange(row, 4, 1, 3).setNumberFormat('@');
    sh.getRange(row, 7).setNumberFormat('0.0###');
    sh.getRange(row, 8, 1, 4).setNumberFormat('0');
    sh.getRange(row, 12).setNumberFormat('0.00');
    try { CacheService.getScriptCache().remove(LIST_PREFIX + 'shl_soft_n'); } catch (e) { /* abaikan */ }
    return 'Baris SOFT diperbarui.';
  } finally {
    unlock_(lock);
  }
}
// Hapus satu baris SOFT (dicari lewat ID UNIK). Baris di sheet benar-benar dihapus.
function deleteSoft(p) {
  p = p || {};
  needSoft_(p.mode);
  const id = softIdOk_(p.id);
  const lock = lock_();
  try {
    const sh = findSheet_(ss_(), SHEET_SOFT);
    if (!sh) throw new Error('Sheet "' + SHEET_SOFT + '" tidak ditemukan.');
    const row = softRowById_(sh, id);
    if (!row) throw new Error('Baris SOFT tidak ditemukan (mungkin sudah dihapus). Muat ulang daftar.');
    sh.deleteRow(row);
    try { CacheService.getScriptCache().remove(LIST_PREFIX + 'shl_soft_n'); } catch (e) { /* abaikan */ }
    return 'Baris SOFT dihapus.';
  } finally {
    unlock_(lock);
  }
}

// Laporan "STOCK WIP SOFT WINDING HARIAN" (Page 2 > tab SOFT): semua baris sheet SOFT yang TANGGAL-nya sama dengan iso (yyyy-MM-dd), urutan sesuai sheet.
// Jika tanggal itu diinput dalam beberapa kali simpan, semua barisnya tampil. ∑ Cone dan ∑ Kg dihitung dari SSM+FADIS+TAIHE dan Berat. "latest" = tanggal terbaru yang ada isinya.
function getSoftHari(iso) {
  try {
    const want = str_(iso).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(want)) throw new Error('Tanggal tidak valid.');
    const sh = findSheet_(ss_(), SHEET_SOFT);
    if (!sh) return { success: true, rows: [], latest: '', tanggal: want, missing: true };
    if (sh.getLastRow() < 2) return { success: true, rows: [], latest: '', tanggal: want };
    const nCols = Math.min(SOFT_HEADERS.length, sh.getMaxColumns());
    const rng = sh.getRange(2, 1, sh.getLastRow() - 1, nCols), raw = rng.getValues(), disp = rng.getDisplayValues();
    const tz = sh.getParent().getSpreadsheetTimeZone();
    const num = function (x) { return typeof x === 'number' ? x : kgNum_(x); };
    const rows = []; let latest = '';
    for (let i = 0; i < raw.length; i++) {
      const v = raw[i][2];
      let d = '';
      if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) d = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      else { const x = parseDmy_(disp[i][2], false); if (x) d = x.y + '-' + ('0' + x.m).slice(-2) + '-' + ('0' + x.d).slice(-2); }
      if (!d) continue;
      if (d > latest) latest = d;
      if (d !== want) continue;
      const berat = num(raw[i][6]), ssm = num(raw[i][7]), fadis = num(raw[i][8]), taihe = num(raw[i][9]), cone = ssm + fadis + taihe;
      rows.push({ benang: str_(raw[i][3]).trim(), supplier: str_(raw[i][4]).trim(), ket: str_(raw[i][5]).trim(), berat: berat, ssm: ssm, fadis: fadis, taihe: taihe, cone: cone, kg: Math.round(cone * berat * 100) / 100 });
    }
    return { success: true, rows: rows, latest: latest, tanggal: want };
  } catch (e) {
    return { error: e.message };
  }
}

// ================= 3. Simpan data baru =================
// Pencarian KIKC dipercepat (TextFinder), spreadsheet dibuka sekali, pengecekan header dilewati, format sel digabung.
// Kunci hanya dipegang saat menulis ke sheet (pencarian KIKC dilakukan SEBELUM kunci), jadi antrean pengguna lain lebih pendek.
function saveData(p) {
  p = p || {};
  needAdmin_(p.mode);
  need_(p.kikc, 'KIKC');
  need_(p.posisi, 'Posisi');
  p.kikc = str_(p.kikc).replace(/\s+/g, ' ').trim();

  let ref = lookupKikc_(p.kikc);
  if (!ref) {
    // KIKC baru (tidak ada di WOD/GRM): hanya diterima jika form mengirim tanda "baru"; data referensi dikosongkan.
    if (p.baru !== true) throw new Error('KIKC "' + p.kikc + '" tidak ditemukan di sheet WOD maupun GRM. Gunakan "Tambah KIKC baru" untuk mengisi manual.');
    ref = baruRef_(p.kikc);
  }

  const mesin = (p.mesin === undefined || p.mesin === null) ? ref.mesin : str_(p.mesin).trim();
  const ket = str_(p.keterangan).trim();
  const posisi = stripNum_(p.posisi);
  const qc = stripNum_(p.qc);
  const cid = str_(p.cid).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const lock = lock_();
  try {
    // Pengiriman ulang dari antrean HP (mis. balasan hilang saat sinyal jelek) tidak boleh menyimpan dua kali
    if (cid && CacheService.getScriptCache().get('cid_' + cid)) return 'Data tersimpan.';

    const sheet = getJawabanSheet_(true);
    ensureColumns_(sheet);
    const ts = new Date();
    const row = sheet.getLastRow() + 1;

    const vals = [
      ts, newId_(ts),
      ref.kikc, ref.noBenang, ref.warna, mesin, ref.kg, ref.cone,
      str_(p.shift), str_(p.grup), posisi, qc,
      str_(p.noteQc), ket,
      ref.ketKikc
    ];
    // Tanggal Pack: dari cache peta PACK (tanpa membuka sheet PACK agar simpan tetap cepat); jika belum ada di cache, diisi saat sinkron
    if (PropertiesService.getScriptProperties().getProperty('packFormula') !== '1') {
      const pk = getPackMap_(false, true);
      vals.push(pk && pk.map[normKikc_(ref.kikc)] ? dmyToDate_(pk.map[normKikc_(ref.kikc)]) : '');
    }
    sheet.getRange(row, 1, 1, vals.length).setValues([vals]);

    if (cid) { try { CacheService.getScriptCache().put('cid_' + cid, '1', 21600); } catch (e) { /* abaikan */ } }
    return 'Data tersimpan.';
  } finally {
    unlock_(lock);
  }
}

// ================= 4. Data untuk tabel =================
function normKikc_(s) { return str_(s).replace(/\s+/g, ' ').trim().toUpperCase(); }

// Peta referensi per KIKC untuk tampilan tab Data. Prioritas (per kolom, kolom kosong jatuh ke sumber berikutnya):
//   1. tab Celup (sheet CLP)  2. tab Plan (Mesin: kolom Alokasi dulu, jika kosong baru kolom Mesin)  3. data tersimpan di sheet Jawaban (berasal dari WOD/GRM saat input).
// Daftar Celup sudah urut tanggal terbaru dulu, jadi bila satu KIKC muncul beberapa kali, baris terbaru yang dipakai.
// Memakai cache daftar (LIST_TTL); jika salah satu daftar gagal dibaca, tab Data tetap tampil memakai sumber berikutnya.
function refMaps_() {
  const out = { clp: Object.create(null), plan: Object.create(null) };
  function fill(key, map, build) {
    try {
      const res = getList(key, false);
      if (!res || res.error || !res.rows) return;
      const h = res.headers.map(function (x) { return String(x).toUpperCase(); });
      const iK = h.indexOf('KIKC');
      if (iK < 0) return;
      const cell = function (r, name) { const i = h.indexOf(name); return i >= 0 ? str_(r[i]).trim() : ''; };
      res.rows.forEach(function (r) {
        const k = normKikc_(r[iK]);
        if (!k || map[k]) return;
        map[k] = build(r, cell);
      });
    } catch (e) { /* abaikan: pakai sumber berikutnya */ }
  }
  fill('clp', out.clp, function (r, c) {
    return { noBenang: c(r, 'NO BENANG'), warna: c(r, 'WARNA'), mesin: c(r, 'MESIN'), kg: c(r, 'KG'), cone: c(r, 'CONE'),
             shift: c(r, 'SHIFT'), grup: c(r, 'GRUP'), ketKikc: c(r, 'KET'), tanggal: c(r, 'TANGGAL') };
  });
  fill('plan', out.plan, function (r, c) {
    return { noBenang: c(r, 'NO BENANG'), warna: c(r, 'WARNA'), mesin: c(r, 'ALOKASI') || c(r, 'MESIN'), kg: c(r, 'KG'), cone: c(r, 'CONE'),
             ketKikc: c(r, 'KETERANGAN'), celup: c(r, 'CELUP') };
  });
  return out;
}

function getData(dateStr) {
  try {
    const sheet = getJawabanSheet_(false);
    if (!sheet) return { success: true, data: [], total: 0 };

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, data: [], total: 0 };

    const tz = sheet.getParent().getSpreadsheetTimeZone();
    const want = /^\d{4}-\d{2}-\d{2}$/.test(str_(dateStr)) ? str_(dateStr) : '';

    let start, end, keys = null;
    if (want) {
      const tsCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      keys = tsCol.map(function (r) { return dateKey_(r[0], tz); });
      let first = -1, last = -1;
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] === want) { if (first < 0) first = i; last = i; }
      }
      if (first < 0) return { success: true, data: [], total: lastRow - 1 };
      start = first + 2;
      end = last + 2;
    } else {
      start = Math.max(2, lastRow - MAX_ROWS + 1);
      end = lastRow;
    }
    return { success: true, data: jawabanRows_(sheet, start, end, tz, keys, want), total: lastRow - 1 };
  } catch (e) {
    return { error: e.message };
  }
}

// Membangun baris tampilan tab Data dari sheet Jawaban (baris start..end). keys/want (opsional) menyaring menurut tanggal.
// Mesin: alokasi mesin (sheet "Alokasi", hasil tab Plan atau ubah Mesin di tab Data) paling utama, lalu tab Celup, tab Plan, lalu isian sheet.
function jawabanRows_(sheet, start, end, tz, keys, want) {
  const nCols = Math.min(TOTAL_COLS, sheet.getMaxColumns());
  const values = sheet.getRange(start, 1, end - start + 1, nCols).getDisplayValues();
  const tsRaw = sheet.getRange(start, 1, end - start + 1, 1).getValues();
  const refs = refMaps_();   // referensi per KIKC: Celup, lalu Plan
  let cpm = {}; try { cpm = celupPlanMap_(); } catch (eCp) { cpm = {}; }   // tanggal Plan terbaru yang sudah disusul input data (kolom CELUP Plan)
  let packMap = {}; try { packMap = getPackMap_(false).map || {}; } catch (ePk) { packMap = {}; }   // Tanggal Pack dari sheet PACK (kosong bila sheet tidak ada)
  let clpF = null;   // peta CLP langsung dari sheet, dibuat hanya bila ada lot yang tanggalnya belum ketemu
  let alk = {}; try { alk = readAlokasi_().vals || {}; } catch (eAl) { alk = {}; }
  const kemarin = Utilities.formatDate(new Date(Date.now() - 86400000), tz, 'dd/MM/yyyy');   // TODAY()-1, dipakai untuk tanggal dari kolom Celup tab Plan
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const rowNo = start + i;
    if (want && keys && keys[rowNo - 2] !== want) continue;
    const r = padRow_(values[i], TOTAL_COLS);
    const id = str_(r[1]).trim();
    if (!id) continue;
    const k = normKikc_(r[2]), cl = refs.clp[k] || {}, pl = refs.plan[k] || {};
    const pick = function (f, own) { return cl[f] || pl[f] || own; };
    out.push({
      rowIndex: rowNo, tk: rowToken_(id), timestamp: fmtTs_(tsRaw[i][0], r[0], tz),
      kikc: r[2], noBenang: pick('noBenang', r[3]), warna: pick('warna', r[4]), mesin: alk[k] || pick('mesin', r[5]),
      kg: pick('kg', r[6]), cone: pick('cone', r[7]),
      shift: pick('shift', r[8]), grup: pick('grup', r[9]),
      // Tgl Celup: 1) kolom CELUP di tab Plan (tanggal Plan yang sudah disusul input; atau isi tanggal di sheet Plan = TODAY()-1), 2) bila Plan tidak punya, tab Celup
      tglCelup: cpm[k] || ((pl.celup && !/sisa\s*order/i.test(pl.celup)) ? kemarin : '') || cl.tanggal || (k ? (clpF || (clpF = clpFreshMap_()))[compactKikc_(k)] || '' : ''),   // 3) lot tanpa Plan: tab Celup (CLP), dibaca langsung bila peta daftar tidak memuatnya
      tglPack: packMap[k] || fmtDmy_(r[COL_PACK - 1], r[COL_PACK - 1], tz, false),
      shiftIn: r[8], grupIn: r[9], mesinIn: r[5],   // isian asli di sheet (dipakai form Ubah)
      posisi: stripNum_(r[10]),
      qc: stripNum_(r[11]),
      noteQc: r[12], keterangan: r[13], ketKikc: pick('ketKikc', r[14])
    });
  }
  return out;
}

// Cadangan Tgl Celup: baca LANGSUNG sheet CLP (tanpa cache daftar) untuk KIKC yang tanggalnya belum ketemu lewat peta biasa.
// Kolom KIKC / TANGGAL dicari menurut judul baris 1 (cadangan: B dan A). Kunci dicocokkan tanpa spasi/tanda baca, jadi "ZZN26J215", "ZZN-26J215" dan "ZZN26J215 " dianggap sama.
// Baris terbaru (paling bawah) yang punya tanggal dipakai.
function compactKikc_(v) { return normKikc_(v).replace(/[^A-Z0-9]/g, ''); }
function clpFreshMap_() {
  const out = Object.create(null);
  try {
    const sh = findSheet_(ss_(), SHEET_CLP);
    if (!sh || sh.getLastRow() < 2) return out;
    const nC = Math.min(sh.getMaxColumns(), 12);
    const head = sh.getRange(1, 1, 1, nC).getDisplayValues()[0].map(function (x) { return str_(x).replace(/\s+/g, ' ').trim().toUpperCase(); });
    let ck = head.indexOf('KIKC'), ct = head.indexOf('TANGGAL');
    if (ck < 0) ck = 1;
    if (ct < 0) ct = 0;
    const n = sh.getLastRow() - 1, w = Math.max(ck, ct) + 1;
    const disp = sh.getRange(2, 1, n, w).getDisplayValues(), raw = sh.getRange(2, ct + 1, n, 1).getValues();
    const tz = sh.getParent().getSpreadsheetTimeZone(), mdy = !!DATE_TEXT_MDY.clp;
    for (let i = 0; i < n; i++) {
      const k = compactKikc_(disp[i][ck]);
      if (!k || k === 'KIKC') continue;
      const t = fmtDmy_(raw[i][0], disp[i][ct], tz, mdy);
      if (t && parseDmy_(t, false)) out[k] = t;   // baris yang lebih bawah menimpa (lebih baru)
    }
  } catch (e) { /* abaikan: Tgl Celup tetap kosong */ }
  return out;
}

function normQ_(s) { return str_(s).toLowerCase().replace(/\./g, ''); }

// Pencarian tab Data di SEMUA tanggal (tidak terpaku pada satu hari). Maksimal 500 hasil terbaru.
function cariData(query, mode) {
  try {
    const qn = normQ_(query).trim();
    const out = { success: true, data: [], matches: 0, truncated: false };
    if (!qn) return out;
    const sheet = getJawabanSheet_(false);
    if (!sheet || sheet.getLastRow() < 2) return out;
    const tz = sheet.getParent().getSpreadsheetTimeZone(), admin = str_(mode) === MODE_ADMIN;
    const all = jawabanRows_(sheet, 2, sheet.getLastRow(), tz, null, '');
    const hits = all.filter(function (e) {
      return normQ_([e.kikc, e.warna, e.noBenang, e.mesin, e.ketKikc, e.tglCelup, admin ? e.noteQc : '', e.keterangan].join(' ')).indexOf(qn) >= 0;
    });
    hits.sort(function (a, b) { return b.rowIndex - a.rowIndex; });
    out.matches = hits.length;
    out.truncated = hits.length > 500;
    out.data = hits.slice(0, 500);
    return out;
  } catch (e) {
    return { error: e.message };
  }
}

// Pencarian tab Plan / Mesin di SEMUA tanggal Plan Harian. Baris: KIKC, TANGGAL, NO BENANG, SUPPLIER, WARNA, MESIN, ALOKASI, KG, CONE, KETERANGAN, CELUP.
function cariPlan(query) {
  try {
    const qn = normQ_(query).trim();
    const headers = ['KIKC', 'TANGGAL', 'NO BENANG', 'SUPPLIER', 'WARNA', 'MESIN', 'ALOKASI', 'KG', 'CONE', 'KETERANGAN', 'CELUP'];
    const out = { success: true, headers: headers, rows: [], matches: 0, truncated: false };
    if (!qn) return out;
    const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
    if (!sh || sh.getLastRow() < 2) return out;
    const rng = sh.getRange(2, 1, sh.getLastRow() - 1, PLAN_HARIAN_HEAD.length);
    const disp = rng.getDisplayValues(), raw = rng.getValues();
    const live = livePlanMap_(false), clpd = clpDateMap_();
    const items = [];
    disp.forEach(function (r, i) {
      const dmy = str_(r[0]).trim(), kc = normKikc_(r[1]);
      if (!kc) return;
      const row = r.slice(1, 11).map(function (x) { return str_(x).trim(); });
      if (typeof raw[i][7] === 'number') row[6] = String(Math.round(raw[i][7] * 100) / 100).replace('.', ',');
      if (typeof raw[i][8] === 'number') row[7] = String(Math.round(raw[i][8]));
      fillPlanRow_(row, live);
      if (clpd[kc]) row[9] = clpd[kc];
      const line = [row[0], dmy].concat(row.slice(1));
      if (normQ_(line.join(' ')).indexOf(qn) < 0) return;
      items.push({ line: line, iso: planIso_(dmy), i: i });
    });
    items.sort(function (a, b) { return (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0) || (a.i - b.i); });
    out.matches = items.length;
    out.truncated = items.length > 500;
    out.rows = items.slice(0, 500).map(function (x) { return x.line; });
    return out;
  } catch (e) {
    return { error: e.message };
  }
}

// Isian yang KOSONG di salinan Plan Harian dilengkapi dari data terkini: sheet "Plan" (importrange), lalu tab WOD. Isian yang sudah ada tidak diganti.
const PLAN_FILL = [[1, 'NO BENANG'], [2, 'SUPPLIER'], [3, 'WARNA'], [4, 'MESIN'], [6, 'KG'], [7, 'CONE'], [8, 'KETERANGAN']];   // [indeks di baris Plan Harian (KIKC..CELUP), judul kolom]
function livePlanMap_(force) {
  const out = Object.create(null);
  ['plan', 'wod'].forEach(function (key) {
    try {
      const res = getList(key, !!force && key === 'plan');
      if (!res || res.error || !res.rows) return;
      const h = res.headers.map(function (x) { return String(x).toUpperCase(); }), ik = h.indexOf('KIKC');
      if (ik < 0) return;
      const idx = PLAN_FILL.map(function (f) { return h.indexOf(f[1]); });
      res.rows.forEach(function (r) {
        const k = normKikc_(r[ik]);
        if (!k) return;
        const o = out[k] || (out[k] = {});
        PLAN_FILL.forEach(function (f, j) {
          const v = idx[j] >= 0 ? str_(r[idx[j]]).trim() : '';
          if (v && !o[f[1]]) o[f[1]] = v;
        });
      });
    } catch (e) { /* sumber ini dilewati */ }
  });
  return out;
}
function fillPlanRow_(row, live) {
  const L = live && live[normKikc_(row[0])];
  if (!L) return;
  PLAN_FILL.forEach(function (f) { if (!str_(row[f[0]]).trim() && L[f[1]]) row[f[0]] = L[f[1]]; });
}

// Timestamp riwayat: DD/MM/YYYY HH:mm:ss (data lama berformat dd-MM-yyyy ikut diseragamkan)
function fmtTs_(v, disp, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, tz, 'dd/MM/yyyy HH:mm:ss');
  const t = str_(disp || v).trim();
  const x = parseDmy_(t);
  if (!x) return t;
  const tm = t.match(/\d{1,2}:\d{2}(:\d{2})?\s*$/);
  return ('0' + x.d).slice(-2) + '/' + ('0' + x.m).slice(-2) + '/' + x.y + (tm ? ' ' + tm[0].trim() : '');
}

function padRow_(arr, n) {
  const out = arr.slice();
  while (out.length < n) out.push('');
  return out;
}

function dateKey_(v, tz) {
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  const s = str_(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

// ================= 5. Ubah data =================
// Ubah data (tab Data). Bila kolom Mesin diubah, nilainya juga dicatat sebagai alokasi mesin lot itu (satu sumber dengan tab Plan), supaya tab Mesin ikut dan tidak bentrok.
function updateRowData(p) {
  const ctx = {};
  const msg = updateRowCore_(p, ctx);
  if (ctx.mesin !== undefined) {
    try { syncMesinEdit_(ctx.kikc, ctx.mesin); } catch (e) { /* data tersimpan; sinkron alokasi dicoba lagi pada ubah berikutnya */ }
  }
  return msg;
}

function syncMesinEdit_(kikc, rawVal) {
  const k = normKikc_(kikc);
  if (!k) return;
  let v = str_(rawVal).replace(/\s+/g, '').toUpperCase();
  if (/^\d+$/.test(v)) v = 'A' + v;   // ketik 9 = A9
  if (v.length > 12) v = v.slice(0, 12);
  saveAlokasiBatch_([[k, v]]);   // sheet "Alokasi" (isian awal Get Plan + tampilan tab Data)
  const lock = lock_();
  try {
    const sh = findSheet_(ss_(), SHEET_PLAN_HARIAN);
    if (!sh || sh.getLastRow() < 2) return;
    const col = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues();   // A TANGGAL, B KIKC
    let best = '';
    col.forEach(function (c) { if (normKikc_(c[1]) === k) { const d = planIso_(str_(c[0]).trim()); if (d && d > best) best = d; } });
    if (!best) return;
    const dmy = best.split('-').reverse().join('/');
    col.forEach(function (c, i) {
      if (str_(c[0]).trim() === dmy && normKikc_(c[1]) === k) sh.getRange(i + 2, 7).setValue(v);   // G = ALOKASI pada Plan terbaru yang memuat lot ini
    });
    SpreadsheetApp.flush();
  } finally {
    unlock_(lock);
  }
}

function updateRowCore_(p, ctx) {
  p = p || {};
  needAdmin_(p.mode);
  need_(p.kikc, 'KIKC');
  need_(p.posisi, 'Posisi');
  const newKikc = str_(p.kikc).replace(/\s+/g, ' ').trim();

  const lock = lock_();
  try {
    const sheet = getJawabanSheet_(false);
    if (!sheet) throw new Error('Sheet "' + SHEET_JAWABAN + '" belum ada.');
    const row = assertRow_(sheet, p.rowIndex, p.tk);

    ensureColumns_(sheet);
    const cur = sheet.getRange(row, 1, 1, TOTAL_COLS).getDisplayValues()[0];
    const want = {};
    if (newKikc !== str_(cur[2]).trim()) {
      let ref = lookupKikc_(newKikc);
      if (!ref) {
        if (p.baru !== true) throw new Error('KIKC "' + newKikc + '" tidak ditemukan di sheet WOD maupun GRM. Gunakan "Tambah KIKC baru" untuk mengisi manual.');
        ref = baruRef_(newKikc);
      }
      want[3] = ref.kikc; want[4] = ref.noBenang; want[5] = ref.warna; want[7] = ref.kg; want[8] = ref.cone;
      want[COL_KET_KIKC] = ref.ketKikc;
      if (PropertiesService.getScriptProperties().getProperty('packFormula') !== '1') want[COL_PACK] = '';   // KIKC diganti: Tanggal Pack lama dikosongkan, diisi ulang saat sinkron
    } else if (!str_(cur[COL_KET_KIKC - 1]).trim()) {
      try { const ref0 = lookupKikc_(newKikc); if (ref0 && ref0.ketKikc) want[COL_KET_KIKC] = ref0.ketKikc; } catch (e) { /* abaikan */ }
    }
    want[6] = str_(p.mesin).trim();
    want[9] = str_(p.shift);
    want[10] = str_(p.grup);
    want[11] = stripNum_(p.posisi);
    want[12] = stripNum_(p.qc);
    if (p.noteQc !== undefined && p.noteQc !== null) want[13] = str_(p.noteQc).trim();
    want[COL_KET] = str_(p.keterangan);

    const changed = [];
    for (let c = 3; c <= TOTAL_COLS; c++) {
      if (want[c] !== undefined && str_(want[c]).trim() !== str_(cur[c - 1]).trim()) changed.push(c);
    }
    if (!changed.length) return 'Tidak ada perubahan.';
    if (changed.indexOf(6) >= 0) { ctx.kikc = want[3] || cur[2]; ctx.mesin = str_(want[6]); }   // Mesin berubah: disinkronkan ke alokasi setelah kunci dilepas

    let i = 0;
    while (i < changed.length) {
      let j = i;
      while (j + 1 < changed.length && changed[j + 1] === changed[j] + 1) j++;
      const c1 = changed[i], n = j - i + 1, vals = [];
      for (let c = c1; c < c1 + n; c++) vals.push(want[c]);
      try {
        const rng = sheet.getRange(row, c1, 1, n);
        for (let c = c1; c < c1 + n; c++) {
          if (c === 7 || c === 8 || c === COL_PACK) continue;
          try { sheet.getRange(row, c).setNumberFormat('@'); } catch (e) { /* abaikan */ }
        }
        rng.setValues([vals]);
      } catch (e) {
        const names = [];
        for (let c = c1; c < c1 + n; c++) names.push(HEADERS[c - 1]);
        throw new Error('Sheet menolak perubahan pada kolom ' + names.join(', ') + ' (baris ' + row + '): ' + e.message +
          ' Cek proteksi sel atau validasi data di kolom itu.');
      }
      i = j + 1;
    }
    SpreadsheetApp.flush();
    return 'Data diperbarui.';
  } finally {
    unlock_(lock);
  }
}

// ================= 6. Hapus data =================
function deleteData(rowIndex, tk, mode) {
  needAdmin_(mode);
  const lock = lock_();
  try {
    const sheet = getJawabanSheet_(false);
    if (!sheet) throw new Error('Sheet "' + SHEET_JAWABAN + '" belum ada.');
    const row = assertRow_(sheet, rowIndex, tk);
    sheet.deleteRow(row);
    return 'Data dihapus.';
  } finally {
    unlock_(lock);
  }
}

// ================= Alat bantu (jalankan dari editor Apps Script) =================
// Jalankan SEKALI: membuang nomor urut pada data lama di kolom Posisi (K) dan QC (L) di sheet jawaban.
function hapusNomorUrutLama() {
  const sheet = getJawabanSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) { Logger.log('Tidak ada data.'); return; }
  const n = sheet.getLastRow() - 1;
  const rng = sheet.getRange(2, 11, n, 2);
  const vals = rng.getDisplayValues();
  let changed = 0;
  const out = vals.map(function (r) {
    const a = stripNum_(r[0]), b = stripNum_(r[1]);
    if (a !== r[0] || b !== r[1]) changed++;
    return [a, b];
  });
  rng.setNumberFormat('@');
  rng.setValues(out);
  Logger.log('Selesai. Baris yang diperbaiki: ' + changed + ' dari ' + n);
}

// Opsional, jalankan SEKALI dari editor Apps Script: membuat sheet "Plan" beserta judul kolomnya jika belum ada.
// Jika sheet "Plan" sudah ada, tidak ada yang diubah (isinya aman).
function siapkanSheetPlan() {
  const ss = ss_();
  if (findSheet_(ss, SHEET_PLAN)) { Logger.log('Sheet "' + SHEET_PLAN + '" sudah ada, tidak diubah.'); return; }
  const sh = ss.insertSheet(SHEET_PLAN);
  const heads = ['KIKC', 'No Benang', 'Supplier', 'Warna', 'Mesin', 'Kg', 'Cone', 'Keterangan', 'Celup'];
  sh.getRange(1, 1, 1, heads.length).setValues([heads]).setFontWeight('bold').setBackground('#d9ead3');
  sh.setFrozenRows(1);
  Logger.log('Sheet "' + SHEET_PLAN + '" dibuat dengan judul kolom: ' + heads.join(' | '));
}

function tesKikc() {
  const ss = ss_();
  Logger.log('Spreadsheet: ' + ss.getName());
  Logger.log('Tab: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(' | '));
  const r = getKikcData();
  if (r.counts) Logger.log('Dari WOD: ' + r.counts.wod + ' | Dari GRM (tambahan): ' + r.counts.grm + (r.warn ? ' | PERINGATAN: ' + r.warn : ''));
  if (r.error) {
    Logger.log('ERROR: ' + r.error);
  } else {
    Logger.log('Jumlah KIKC: ' + r.data.length);
    Logger.log('Contoh: ' + JSON.stringify(r.data.slice(0, 3)));
  }
}

// Ukur waktu simpan tanpa menyimpan: jalankan dari editor, lihat Log.
function tesKecepatanCariKikc() {
  const r = getKikcData();
  if (r.error || !r.data.length) { Logger.log('Tidak ada data KIKC.'); return; }
  const t0 = Date.now();
  const ref = lookupKikc_(r.data[r.data.length - 1].kikc);
  Logger.log('Cari KIKC terakhir: ' + (Date.now() - t0) + ' ms, ketemu: ' + !!ref);
}