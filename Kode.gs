/**
 * WIP Yarn Dyeing - Kode.gs  (v6: penyimpanan dipercepat, Posisi/QC tanpa nomor urut)
 *
 * Sumber referensi KIKC (dua sheet, WOD diutamakan):
 *   Sheet "WOD": C = KIKC | D = No Benang | E = Warna | F = Kg | G = Cone | I = Mesin | L = Keterangan KIKC
 *   Sheet "GRM": A = Tanggal Celup | B = KIKC | C = No Benang | D = Warna | E = Mesin | F = Kg | G = Cone | H = Keterangan KIKC
 *   Server selalu mengambil ulang data KIKC dari sheet (tidak percaya kiriman browser).
 *   Jika satu KIKC ada di WOD dan GRM, data WOD yang dipakai.
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
const SHEET_JAWABAN = 'WIP YD (Jawaban)';
const WOD_FIRST_COL = 3;         // kolom C = KIKC
const WOD_WIDTH = 10;            // C..L
const GRM_FIRST_COL = 2;         // kolom B = KIKC
const GRM_WIDTH = 7;             // B..H
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
  deleteData: function (a) { return deleteData(a[0], a[1]); }
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
  if (props.getProperty('colsOk') === '1' && sheet.getMaxColumns() >= TOTAL_COLS) return;
  if (sheet.getMaxColumns() < TOTAL_COLS) sheet.insertColumnsAfter(sheet.getMaxColumns(), TOTAL_COLS - sheet.getMaxColumns());
  const h = sheet.getRange(1, COL_KET_KIKC).getDisplayValue();
  if (!String(h).trim()) {
    sheet.getRange(1, COL_KET_KIKC).setValue(HEADERS[COL_KET_KIKC - 1]).setFontWeight('bold').setBackground('#d9ead3');
  }
  props.setProperty('colsOk', '1');
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
  const fromWod = findInSheet_(getWodSheet_(), WOD_FIRST_COL, WOD_WIDTH, mapWod_, want);
  if (fromWod) { fromWod.src = 'WOD'; return fromWod; }
  const grm = getGrmSheet_();
  if (grm) {
    const fromGrm = findInSheet_(grm, GRM_FIRST_COL, GRM_WIDTH, mapGrm_, want);
    if (fromGrm) { fromGrm.src = 'GRM'; return fromGrm; }
  }
  return null;
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

    return { success: true, data: out, counts: { wod: nWod, grm: nGrm }, warn: warn };
  } catch (e) {
    return { error: e.message };
  }
}

// ================= 3. Simpan data baru =================
// Pencarian KIKC dipercepat (TextFinder), spreadsheet dibuka sekali, pengecekan header dilewati, format sel digabung.
// Kunci hanya dipegang saat menulis ke sheet (pencarian KIKC dilakukan SEBELUM kunci), jadi antrean pengguna lain lebih pendek.
function saveData(p) {
  p = p || {};
  need_(p.kikc, 'KIKC');
  need_(p.posisi, 'Posisi');

  const ref = lookupKikc_(p.kikc);
  if (!ref) throw new Error('KIKC "' + p.kikc + '" tidak ditemukan di sheet WOD maupun GRM.');

  const mesin = (p.mesin === undefined || p.mesin === null) ? ref.mesin : str_(p.mesin).trim();
  const ket = str_(p.keterangan).trim();
  const posisi = stripNum_(p.posisi);
  const qc = stripNum_(p.qc);

  const lock = lock_();
  try {
    const sheet = getJawabanSheet_(true);
    ensureColumns_(sheet);
    const ts = new Date();
    const row = sheet.getLastRow() + 1;

    setTextFormats_(sheet, row);
    try { sheet.getRange(row, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss'); } catch (e) { /* abaikan */ }

    sheet.getRange(row, 1, 1, TOTAL_COLS).setValues([[
      ts, newId_(ts),
      ref.kikc, ref.noBenang, ref.warna, mesin, ref.kg, ref.cone,
      str_(p.shift), str_(p.grup), posisi, qc,
      str_(p.noteQc), ket,
      ref.ketKikc
    ]]);

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
  const newKikc = str_(p.kikc).trim();

  const lock = lock_();
  try {
    const sheet = getJawabanSheet_(false);
    if (!sheet) throw new Error('Sheet "' + SHEET_JAWABAN + '" belum ada.');
    const row = assertRow_(sheet, p.rowIndex, p.tk);

    ensureColumns_(sheet);
    const cur = sheet.getRange(row, 1, 1, TOTAL_COLS).getDisplayValues()[0];
    const want = {};
    if (newKikc !== str_(cur[2]).trim()) {
      const ref = lookupKikc_(newKikc);
      if (!ref) throw new Error('KIKC "' + newKikc + '" tidak ditemukan di sheet WOD maupun GRM.');
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
