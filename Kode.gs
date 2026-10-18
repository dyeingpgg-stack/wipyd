/**
 * WIP Yarn Dyeing - Kode.gs  (v17: kolom Supplier di tab Plan (setelah No Benang). v16: kapasitas mesin per siklus (MESIN_KAPASITAS) x 3 siklus (MESIN_SIKLUS) dikirim ke tab Mesin untuk unduh PDF/PNG HD. v15: mode Admin / Viewer tanpa login. v14: semua tanggal DD/MM/YYYY, tab baru Plan; kolom TANGGAL di tab WOD/GRM/CLP setelah KIKC; tab WOD, GRM, Plan, Celup hanya baca + terbaru di atas + cache cepat, WOD tanpa mesin BAK-, tanpa input Cone; antrean simpan, cache KIKC, KIKC baru manual, Posisi/QC tanpa nomor urut)
 *
 * Sumber referensi KIKC (dua sheet, WOD diutamakan):
 *   Sheet "WOD": C = KIKC | D = No Benang | E = Warna | F = Kg | G = Cone | I = Mesin | L = Keterangan KIKC
 *   Sheet "GRM": A = Tanggal Celup | B = KIKC | C = No Benang | D = Warna | E = Mesin | F = Kg | G = Cone | H = Keterangan KIKC
 *   Server selalu mengambil ulang data KIKC dari sheet (tidak percaya kiriman browser).
 *   Jika satu KIKC ada di WOD dan GRM, data WOD yang dipakai.
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
const SHEET_ALOKASI = 'Alokasi';   // penyimpanan alokasi mesin per KIKC (tidak terpengaruh perubahan sheet Plan)
const SHEET_JAWABAN = 'WIP YD (Jawaban)';
const WOD_FIRST_COL = 3;         // kolom C = KIKC
const WOD_WIDTH = 10;            // C..L
const GRM_FIRST_COL = 2;         // kolom B = KIKC
const GRM_WIDTH = 7;             // B..H
const WOD_LIST_FIRST_COL = 1;    // tab WOD dibaca dari kolom A (TANGGAL)
const WOD_LIST_WIDTH = 15;       // A..O (O = status)
const WOD_STATUS_IDX = 14;       // kolom O di dalam A..O
const WOD_KIKC_IDX = 2;          // kolom C di dalam A..O
const GRM_LIST_FIRST_COL = 1;    // tab GRM dibaca dari kolom A (TANGGAL)
const GRM_LIST_WIDTH = 8;        // A..H
const WOD_STATUS_SHOW = 'B';     // hanya baris berstatus ini yang tampil di tab WOD
const WOD_MESIN_IDX = 8;         // kolom I di dalam A..O
const WOD_HIDE_MESIN = 'BAK-';   // baris WOD dengan mesin berisi teks ini disembunyikan dari tab WOD
const CLP_FIRST_COL = 1;         // kolom A = TANGGAL
const CLP_WIDTH = 10;            // A..J (J = KET)
const PLAN_FIRST_COL = 1;        // kolom A = KIKC
const PLAN_WIDTH = 8;            // A..H (H = CELUP)
const DATE_TEXT_MDY = { clp: true };   // sheet yang menyimpan tanggal sebagai TEKS MM/DD/YYYY (selain itu dibaca DD/MM/YYYY)
const MAX_ROWS = 300;
const TOKEN_SALT = 'wipyd-v1';
const APP_PIN = '';              // OPSIONAL: isi mis. '2468'. Kosong = tanpa PIN.
const MODE_ADMIN = 'admin';       // tanda yang dikirim aplikasi saat berada di mode Admin
const HEADERS = ['Timestamp', 'ID UNIK', 'KIKC', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'SHIFT', 'GRUP', 'POSISI', 'QC', 'NOTE QC', 'KETERANGAN', 'KET KIKC'];
const TOTAL_COLS = 15;
const COL_KET = 14;
const COL_KET_KIKC = 15;

// ================= 1. Render HTML + API =================
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.fn === 'ping') return json_({ ok: true, result: 'pong' });
  let page = HtmlService.createHtmlOutputFromFile('Index');
  // Link Viewer: <URL web app>?mode=viewer. Halaman Apps Script berada di dalam iframe sehingga ?mode= tidak terbaca oleh halaman,
  // jadi server menyisipkan tandanya. Tanpa ?mode= (link utama) aplikasi terbuka sebagai Admin.
  const want = str_(p.mode).toLowerCase();
  if (want === 'viewer' || want === 'admin') {
    page = HtmlService.createHtmlOutput(page.getContent().replace('<head>', '<head><script>window.WIPYD_FORCE_MODE="' + want + '";</script>'));
  }
  return page
    .setTitle('Sistem WIP YD')
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
  setAlokasi: function (a) { return setAlokasi(a[0], a[1], a[2], a[3]); },
  resetAlokasi: function (a) { return resetAlokasi(a[0]); },
  getMesinStop: function () { return { success: true, stop: readMesinStop_(), kap: MESIN_KAPASITAS, siklus: MESIN_SIKLUS }; },
  setMesinStop: function (a) { return setMesinStop(a[0], a[1], a[2]); }
};

// Alamat link Viewer (URL web app + ?mode=viewer). Dipakai tombol Bagikan di aplikasi Admin.
function getViewerUrl() {
  const u = ScriptApp.getService().getUrl();
  return u ? u + '?mode=viewer' : '';
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
  if (props.getProperty('colsOk4') === '1' && sheet.getMaxColumns() >= TOTAL_COLS) return;
  if (sheet.getMaxColumns() < TOTAL_COLS) sheet.insertColumnsAfter(sheet.getMaxColumns(), TOTAL_COLS - sheet.getMaxColumns());
  const h = sheet.getRange(1, COL_KET_KIKC).getDisplayValue();
  if (!String(h).trim()) {
    sheet.getRange(1, COL_KET_KIKC).setValue(HEADERS[COL_KET_KIKC - 1]).setFontWeight('bold').setBackground('#d9ead3');
  }
  // Format kolom diatur SEKALI untuk seluruh kolom, jadi setiap simpan tidak perlu mengatur format sel lagi.
  try {
    sheet.getRangeList(['C:F', 'I:O']).setNumberFormat('@');
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  } catch (e) { /* abaikan jika dikunci */ }
  props.setProperty('colsOk4', '1');
}

function str_(v) { return (v === undefined || v === null) ? '' : String(v); }

// Fungsi yang mengubah data hanya jalan jika aplikasi berada di mode Admin (lihat catatan "Mode Admin / Viewer" di atas).
function needAdmin_(mode) {
  if (str_(mode) !== MODE_ADMIN) {
    throw new Error('Mode Viewer: data hanya bisa dilihat. Ganti ke mode Admin untuk menyimpan, mengubah, atau menghapus data.');
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

// WOD dulu, jika tidak ada baru GRM.
function lookupKikc_(kikc) {
  const want = str_(kikc).trim();
  if (!want) return null;
  const cached = idxGet_(want);
  if (cached) return cached;
  const fromWod = findInSheet_(getWodSheet_(), WOD_FIRST_COL, WOD_WIDTH, mapWod_, want);
  if (fromWod) { fromWod.src = 'WOD'; return fromWod; }
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
    let nWod = 0, nGrm = 0, warn = '';

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
      const grm = getGrmSheet_();
      if (!grm) {
        warn = 'Sheet "' + SHEET_GRM + '" tidak ditemukan, hanya KIKC dari WOD yang dimuat.';
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
      warn = 'Sheet GRM gagal dibaca (' + e2.message + '), hanya KIKC dari WOD yang dimuat.';
    }

    idxPut_(out);
    return { success: true, data: out, counts: { wod: nWod, grm: nGrm }, warn: warn };
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
    const sh = getGrmSheet_();
    if (!sh) throw new Error('Tab "' + SHEET_GRM + '" tidak ditemukan di spreadsheet.');
    const rows = readList_(sh, GRM_LIST_FIRST_COL, GRM_LIST_WIDTH, [1, 0, 2, 3, 4, 5, 6, 7], function (r) {
      return str_(r[1]).trim().toUpperCase() !== 'KIKC';
    }, 0, { mdy: !!DATE_TEXT_MDY.grm });
    return listResult_(['KIKC', 'TANGGAL', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'KETERANGAN'], rows);
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

function listCachePut_(key, obj) {
  try {
    const s = JSON.stringify(obj);
    const n = Math.ceil(s.length / LIST_CHUNK), put = {};
    for (let i = 0; i < n; i++) put[LIST_PREFIX + key + '_' + i] = s.substr(i * LIST_CHUNK, LIST_CHUNK);
    put[LIST_PREFIX + key + '_n'] = String(n);
    CacheService.getScriptCache().putAll(put, LIST_TTL);
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
  LIST_KEYS.forEach(function (k) { lists[k.toLowerCase()] = getList(k, force); });
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

// Mengisi alokasi mesin satu KIKC (dipanggil dari tab Plan). rowNo tidak dipakai lagi; hanya KIKC yang menentukan.
function setAlokasi(rowNo, kikc, value, mode) {
  needAdmin_(mode);
  const want = normKikc_(kikc);
  if (!want) throw new Error('KIKC kosong.');
  let v = str_(value).replace(/\s+/g, '').toUpperCase();
  if (/^\d+$/.test(v)) v = 'A' + v;   // ketik 9 = A9
  if (v.length > 12) throw new Error('Isi alokasi terlalu panjang.');
  saveAlokasiBatch_([[want, v]]);
  return { value: v };
}

// Reset: mengosongkan SEMUA alokasi mesin (menghapus isi sheet "Alokasi" selain judul). Sheet Plan tidak disentuh.
function resetAlokasi(mode) {
  needAdmin_(mode);
  const lock = lock_();
  try {
    const sh = alokasiSheet_();
    const last = sh.getLastRow();
    const n = last >= 2 ? last - 1 : 0;
    if (n) sh.getRange(2, 1, n, Math.max(sh.getLastColumn(), 3)).clearContent();
    SpreadsheetApp.flush();
    try { CacheService.getScriptCache().remove(LIST_PREFIX + 'plan_n'); } catch (e) { /* abaikan */ }
    return { cleared: n };
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

    sheet.getRange(row, 1, 1, TOTAL_COLS).setValues([[
      ts, newId_(ts),
      ref.kikc, ref.noBenang, ref.warna, mesin, ref.kg, ref.cone,
      str_(p.shift), str_(p.grup), posisi, qc,
      str_(p.noteQc), ket,
      ref.ketKikc
    ]]);

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
    const nCols = Math.min(TOTAL_COLS, sheet.getMaxColumns());

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

    const values = sheet.getRange(start, 1, end - start + 1, nCols).getDisplayValues();
    const tsRaw = sheet.getRange(start, 1, end - start + 1, 1).getValues();
    const refs = refMaps_();   // referensi per KIKC: Celup, lalu Plan (Mesin: Alokasi dulu)
    const kemarin = Utilities.formatDate(new Date(Date.now() - 86400000), tz, 'dd/MM/yyyy');   // TODAY()-1, dipakai untuk tanggal dari kolom Celup tab Plan
    const out = [];
    for (let i = 0; i < values.length; i++) {
      const rowNo = start + i;
      if (want && keys[rowNo - 2] !== want) continue;
      const r = padRow_(values[i], TOTAL_COLS);
      const id = str_(r[1]).trim();
      if (!id) continue;
      // Tampilan tab Data: tiap kolom identitas diambil dari tab Celup; jika kosong/tidak ada, dari tab Plan (Mesin: Alokasi dulu, lalu kolom Mesin);
      // jika masih kosong, dipakai nilai yang tersimpan di sheet (hasil WOD/GRM saat input; Shift dan Grup dari isian tab Input).
      const k = normKikc_(r[2]), cl = refs.clp[k] || {}, pl = refs.plan[k] || {};
      const pick = function (f, own) { return cl[f] || pl[f] || own; };
      out.push({
        rowIndex: rowNo, tk: rowToken_(id), timestamp: fmtTs_(tsRaw[i][0], r[0], tz),
        kikc: r[2], noBenang: pick('noBenang', r[3]), warna: pick('warna', r[4]), mesin: pick('mesin', r[5]),
        kg: pick('kg', r[6]), cone: pick('cone', r[7]),
        shift: pick('shift', r[8]), grup: pick('grup', r[9]),
        tglCelup: cl.tanggal || ((pl.celup && !/sisa\s*order/i.test(pl.celup)) ? kemarin : ''),   // kolom virtual (tidak ada di sheet): tanggal dari tab Celup; jika tidak ada dan Plan berisi tanggal Celup, memakai TODAY()-1 seperti kolom Celup tab Plan ("SISA ORDER" dikosongkan)
        shiftIn: r[8], grupIn: r[9], mesinIn: r[5],   // isian asli di sheet (dipakai form Ubah agar sheet tidak tertimpa nilai dari Celup/Plan)
        posisi: stripNum_(r[10]),   // data lama "1. CELUP" tampil sebagai "CELUP"
        qc: stripNum_(r[11]),
        noteQc: r[12], keterangan: r[13], ketKikc: pick('ketKikc', r[14])
      });
    }
    return { success: true, data: out, total: lastRow - 1 };
  } catch (e) {
    return { error: e.message };
  }
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
function updateRowData(p) {
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

    let i = 0;
    while (i < changed.length) {
      let j = i;
      while (j + 1 < changed.length && changed[j + 1] === changed[j] + 1) j++;
      const c1 = changed[i], n = j - i + 1, vals = [];
      for (let c = c1; c < c1 + n; c++) vals.push(want[c]);
      try {
        const rng = sheet.getRange(row, c1, 1, n);
        for (let c = c1; c < c1 + n; c++) {
          if (c === 7 || c === 8) continue;
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