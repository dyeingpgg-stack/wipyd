/**
 * WIP Yarn Dyeing - Kode.gs  (v11: tab WOD, GRM, Celup hanya baca + cache cepat, WOD tanpa mesin BAK-, tanpa input Cone; antrean simpan, cache KIKC, KIKC baru manual, Posisi/QC tanpa nomor urut)
 *
 * Sumber referensi KIKC (dua sheet, WOD diutamakan):
 *   Sheet "WOD": C = KIKC | D = No Benang | E = Warna | F = Kg | G = Cone | I = Mesin | L = Keterangan KIKC
 *   Sheet "GRM": A = Tanggal Celup | B = KIKC | C = No Benang | D = Warna | E = Mesin | F = Kg | G = Cone | H = Keterangan KIKC
 *   Server selalu mengambil ulang data KIKC dari sheet (tidak percaya kiriman browser).
 *   Jika satu KIKC ada di WOD dan GRM, data WOD yang dipakai.
 *
 * Tab daftar (hanya baca, ditampilkan di tab bawah aplikasi):
 *   WOD : C KIKC | D NO BENANG | E WARNA | F KG | G CONE | I MESIN | K SUPPLIER | L KETERANGAN
 *         hanya baris berstatus "B" di kolom O, dan MESIN tidak berisi "BAK-" (BAK-1, BAK-2, BAK-3, ...)
 *   GRM : B KIKC | C NO BENANG | D WARNA | E MESIN | F KG | G CONE | H KETERANGAN
 *   CLP : A TANGGAL | B KIKC | C NO BENANG | D WARNA | E MESIN | F KG | G CONE | H SHIFT | I GRUP | J KET
 *
 * Sheet "WIP YD (Jawaban)":
 *   A Timestamp | B ID UNIK | C KIKC | D No Benang | E Warna | F Mesin | G Kg | H Cone
 *   I Shift | J Grup | K Posisi | L QC | M Note QC | N Keterangan | O Ket KIKC (otomatis)
 *
 * Posisi dan QC disimpan TANPA nomor urut: CELUP, HDX, RF, WIP, KELOS, PACK / LAYAK, UJI QC, TIDAK LAYAK.
 * Data lama yang masih "1. CELUP" dll: jalankan fungsi hapusNomorUrutLama() sekali dari editor Apps Script.
 *
 * Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 * Setiap mengubah kode ini, deploy ulang dengan "New version".
 */
const SPREADSHEET_ID = '13M-SaO4YYpnSke--WFHYSrA5X7NlKjj0IFDxHKHOpIY';
const SHEET_WOD = 'WOD';
const SHEET_GRM = 'GRM';
const SHEET_CLP = 'CLP';
const SHEET_JAWABAN = 'WIP YD (Jawaban)';
const WOD_FIRST_COL = 3;         // kolom C = KIKC
const WOD_WIDTH = 10;            // C..L
const GRM_FIRST_COL = 2;         // kolom B = KIKC
const GRM_WIDTH = 7;             // B..H
const WOD_LIST_WIDTH = 13;       // C..O (O = status)
const WOD_STATUS_IDX = 12;       // kolom O di dalam C..O
const WOD_STATUS_SHOW = 'B';     // hanya baris berstatus ini yang tampil di tab WOD
const WOD_MESIN_IDX = 6;         // kolom I di dalam C..O
const WOD_HIDE_MESIN = 'BAK-';   // baris WOD dengan mesin berisi teks ini disembunyikan dari tab WOD
const CLP_FIRST_COL = 1;         // kolom A = TANGGAL
const CLP_WIDTH = 10;            // A..J (J = KET)
const MAX_ROWS = 300;
const TOKEN_SALT = 'wipyd-v1';
const APP_PIN = '';              // OPSIONAL: isi mis. '2468'. Kosong = tanpa PIN.
const HEADERS = ['Timestamp', 'ID UNIK', 'KIKC', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'SHIFT', 'GRUP', 'POSISI', 'QC', 'NOTE QC', 'KETERANGAN', 'KET KIKC'];
const TOTAL_COLS = 15;
const COL_KET = 14;
const COL_KET_KIKC = 15;

// ================= 1. Render HTML + API =================
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.fn === 'ping') return json_({ ok: true, result: 'pong' });
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Sistem WIP YD')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const API_FUNCS = {
  getKikcData: function () { return getKikcData(); },
  getData: function (a) { return getData(a[0]); },
  saveData: function (a) { return saveData(a[0]); },
  updateRowData: function (a) { return updateRowData(a[0]); },
  deleteData: function (a) { return deleteData(a[0], a[1]); },
  getList: function (a) { return getList(a[0], a[1]); },
  getLists: function (a) { return getLists(a[0]); }
};

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
  if (props.getProperty('colsOk2') === '1' && sheet.getMaxColumns() >= TOTAL_COLS) return;
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
  props.setProperty('colsOk2', '1');
}

function str_(v) { return (v === undefined || v === null) ? '' : String(v); }

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
const LIST_KEYS = ['wod', 'grm', 'clp'];
const LIST_TTL = 90;
const LIST_CHUNK = 40000;
const LIST_PREFIX = 'lst_';

// Membaca satu blok kolom, mengambil kolom yang diminta (pick = indeks di dalam blok, urutan = urutan tampil).
// keepFn (opsional) menyaring baris berdasarkan seluruh blok. Baris kosong dan baris judul dilewati.
function readList_(sheet, firstCol, width, pick, keepFn) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const nCols = Math.min(width, sheet.getMaxColumns() - firstCol + 1);
  const values = sheet.getRange(2, firstCol, last - 1, nCols).getDisplayValues();
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const r = padRow_(values[i], width);
    if (keepFn && !keepFn(r)) continue;
    const row = pick.map(function (k) { return str_(r[k]).trim(); });
    if (!row.some(function (x) { return x; })) continue;
    out.push(row);
  }
  return out;
}

function listResult_(headers, rows) {
  return { success: true, headers: headers, rows: rows, total: rows.length };
}

function buildList_(key) {
  if (key === 'wod') {
    // C, D, E, F, G, I, K, L. Hanya status "B" (kolom O) dan mesin yang tidak berisi "BAK-"
    const rows = readList_(getWodSheet_(), WOD_FIRST_COL, WOD_LIST_WIDTH, [0, 1, 2, 3, 4, 6, 8, 9], function (r) {
      if (str_(r[WOD_STATUS_IDX]).trim().toUpperCase() !== WOD_STATUS_SHOW) return false;
      if (str_(r[0]).trim().toUpperCase() === 'KIKC') return false;
      const mesin = str_(r[WOD_MESIN_IDX]).replace(/\s+/g, '').toUpperCase();
      return mesin.indexOf(WOD_HIDE_MESIN) < 0;
    });
    return listResult_(['KIKC', 'NO BENANG', 'WARNA', 'KG', 'CONE', 'MESIN', 'SUPPLIER', 'KETERANGAN'], rows);
  }
  if (key === 'grm') {
    const sh = getGrmSheet_();
    if (!sh) throw new Error('Tab "' + SHEET_GRM + '" tidak ditemukan di spreadsheet.');
    const rows = readList_(sh, GRM_FIRST_COL, GRM_WIDTH, [0, 1, 2, 3, 4, 5, 6], function (r) {
      return str_(r[0]).trim().toUpperCase() !== 'KIKC';
    });
    return listResult_(['KIKC', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'KETERANGAN'], rows);
  }
  const sh = findSheet_(ss_(), SHEET_CLP);
  if (!sh) throw new Error('Tab "' + SHEET_CLP + '" tidak ditemukan di spreadsheet.');
  const rows = readList_(sh, CLP_FIRST_COL, CLP_WIDTH, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], function (r) {
    return str_(r[1]).trim().toUpperCase() !== 'KIKC';
  });
  return listResult_(['TANGGAL', 'KIKC', 'NO BENANG', 'WARNA', 'MESIN', 'KG', 'CONE', 'SHIFT', 'GRUP', 'KET'], rows);
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
    if (LIST_KEYS.indexOf(key) < 0) throw new Error('Daftar tidak dikenal: ' + key);
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
  LIST_KEYS.forEach(function (k) { lists[k] = getList(k, force); });
  return { success: true, lists: lists };
}

// ================= 3. Simpan data baru =================
// Pencarian KIKC dipercepat (TextFinder), spreadsheet dibuka sekali, pengecekan header dilewati, format sel digabung.
// Kunci hanya dipegang saat menulis ke sheet (pencarian KIKC dilakukan SEBELUM kunci), jadi antrean pengguna lain lebih pendek.
function saveData(p) {
  p = p || {};
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
    const out = [];
    for (let i = 0; i < values.length; i++) {
      const rowNo = start + i;
      if (want && keys[rowNo - 2] !== want) continue;
      const r = padRow_(values[i], TOTAL_COLS);
      const id = str_(r[1]).trim();
      if (!id) continue;
      out.push({
        rowIndex: rowNo, tk: rowToken_(id), timestamp: r[0],
        kikc: r[2], noBenang: r[3], warna: r[4], mesin: r[5], kg: r[6], cone: r[7],
        shift: r[8], grup: r[9],
        posisi: stripNum_(r[10]),   // data lama "1. CELUP" tampil sebagai "CELUP"
        qc: stripNum_(r[11]),
        noteQc: r[12], keterangan: r[13], ketKikc: r[14]
      });
    }
    return { success: true, data: out, total: lastRow - 1 };
  } catch (e) {
    return { error: e.message };
  }
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
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

// ================= 5. Ubah data =================
function updateRowData(p) {
  p = p || {};
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
function deleteData(rowIndex, tk) {
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
