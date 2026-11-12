// ====== SINKRON RESEPDB ======
const RSP_ID_WODMETA = "1DdaVzmZVcBWiHr9HglPG3aY_MP_9FhNvktRdO9CdS2I";
const RSP_ID_KAMUS   = "1permlYdPpNDIpFkugH2tq79y5BKPO70RHgMNBC_IGF4";
const RSP_ID_DB      = "1-NtOx3JK4YWK15g7QfAMJBKUy8bei06Wj8tWOrZkgpE";

function rspTulis_(sheet, out, lebar) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(1, 1, lastRow, lebar).clearContent();
  if (out.length > 0) sheet.getRange(1, 1, out.length, lebar).setValues(out);
}

function rspKunci_(a, b) {
  return String(a).trim().toUpperCase() + "||" + String(b).trim().toUpperCase();
}

// 1. Kamus <- file Kamus, kolom A, B, C
function rspSyncKamus() {
  const src = SpreadsheetApp.openById(RSP_ID_KAMUS).getSheetByName("Kamus");
  const data = src.getDataRange().getValues();
  const out = data
    .map(r => [r[0], r[1], r[2]])
    .filter((r, i) => i === 0 || String(r[0]).trim() !== "" || String(r[1]).trim() !== "");
  const sh = SpreadsheetApp.openById(RSP_ID_DB).getSheetByName("Kamus");
  rspTulis_(sh, out, 3);
}

// 2. C.dbb <- WODMETA kolom B, I, J, L (hanya L = Confirmed)
function rspSyncWodmeta() {
  const cols = [1, 8, 9, 11];
  const src = SpreadsheetApp.openById(RSP_ID_WODMETA).getSheetByName("WODMETA");
  const data = src.getDataRange().getValues();
  const header = cols.map(i => data[0][i]);
  const rows = data.slice(1)
    .filter(r => String(r[11]).trim().toLowerCase() === "confirmed")
    .map(r => cols.map(i => r[i]));
  const sh = SpreadsheetApp.openById(RSP_ID_DB).getSheetByName("C.dbb");
  rspTulis_(sh, [header].concat(rows), cols.length);
}

// 3. RESEP <- RSP (B, F, G, N) + Kamus (cocok D -> Kamus A atau B, ambil C) + RSP!U
function rspSyncResep() {
  const ss = SpreadsheetApp.openById(RSP_ID_DB);
  const norm = v => String(v).replace(/\s+/g, " ").trim().toUpperCase();

  // peta: nilai kolom A atau B Kamus => kolom C
  const kamus = ss.getSheetByName("Kamus").getDataRange().getValues().slice(1);
  const peta = {};
  kamus.forEach(r => {
    const c = r[2];
    [r[0], r[1]].forEach(x => {
      const k = norm(x);
      if (k && !(k in peta)) peta[k] = c; // jika kunci ganda, yang pertama dipakai
    });
  });

  const data = ss.getSheetByName("RSP").getDataRange().getValues();
  const h = data[0];
  const header = [h[1], h[5], h[6], h[13], "Item (Kamus)", h[20]];

  const rows = data.slice(1)
    .filter(r => String(r[1]).trim() !== "")
    .map(r => {
      const e = peta[norm(r[13])];
      return [r[1], r[5], r[6], r[13], e !== undefined ? e : "", r[20]];
    });

  rspTulis_(ss.getSheetByName("RESEP"), [header].concat(rows), 6);
}

// 4. Booking <- total JML bahan (RESEP kolom F, satuan GRAM) dari lot yang ada di C.dbb
//    Lot cocok bila NO_KIKC = wod_no, KODE_RESEP = dye_rec_no dan NO_BON = no_bon. Jika no_bon lot itu tidak ada di RESEP
//    (nomor bon bisa beda antara RESEP dan C.dbb), dipakai pasangan wod_no + dye_rec_no saja. Baris RESEP dihitung sekali.
//    Item cocok menurut nama: Booking kolom C = RESEP kolom E (Item Kamus), huruf besar/kecil dan spasi diabaikan.
//    Hasil: Booking kolom D (gram) dan E (Kg = D / 1000). Jumlah lot per item disimpan di Script Properties (bookingLot); Kode Entry, Kode Kimia dan Jumlah Lot
//    TIDAK ditulis ke sheet: dihitung virtual saat tab Booking dibuka (lihat getKimia di Kode.gs). Kolom A..C tidak disentuh.
//    Mengembalikan ringkasan (dipakai tombol di Page 3 untuk menunjukkan apa yang cocok).
function rspSyncBooking() {
  const ss = SpreadsheetApp.openById(RSP_ID_DB);
  const norm = v => String(v).replace(/\s+/g, " ").trim().toUpperCase();
  const angka = v => {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v).trim().replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const cdbb = ss.getSheetByName("C.dbb").getDataRange().getValues().slice(1).filter(r => String(r[0]).trim() !== "");
  const resep = ss.getSheetByName("RESEP").getDataRange().getValues().slice(1);

  // indeks RESEP per KIKC (tanpa spasi/tanda baca). Lot cocok bila KIKC sama DAN kode resep sama (atau salah satunya awalan dari yang lain,
  // mis. 10 vs 12 karakter) DAN no bon sama. Jika no bon tidak cocok, cukup KIKC + kode resep. Tiap baris RESEP dihitung sekali.
  const kc = v => String(v).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const porsiSama = (x, y) => x !== "" && y !== "" && (x === y || x.indexOf(y) === 0 || y.indexOf(x) === 0);
  const byKikc = {};
  resep.forEach((r, i) => { (byKikc[kc(r[0])] = byKikc[kc(r[0])] || []).push(i); });

  const pakai = new Set();   // nomor baris RESEP yang dihitung
  let lotCocok = 0, contoh = "";
  const lotSeen = new Set();
  cdbb.forEach(r => {
    const a = kc(r[0]), c = kc(r[1]), bn = kc(r[2]);
    const key = a + "||" + c + "||" + bn;
    if (lotSeen.has(key)) return;
    lotSeen.add(key);
    const kand = (byKikc[a] || []).filter(i => porsiSama(kc(resep[i][2]), c));
    const rows = kand.filter(i => kc(resep[i][1]) === bn).length ? kand.filter(i => kc(resep[i][1]) === bn) : kand;
    if (rows.length) lotCocok++;
    else if (!contoh) {   // contoh lot pertama yang tidak cocok, untuk diagnosa
      const ada = byKikc[a] || [];
      contoh = String(r[0]).trim() + " / " + String(r[1]).trim() + " / " + String(r[2]).trim() + ": " +
        (ada.length ? "KIKC ada di RESEP (" + ada.length + " baris), kode resep di RESEP: " +
          Array.from(new Set(ada.map(i => String(resep[i][2]).trim()))).slice(0, 3).join(", ") + "; bon: " +
          Array.from(new Set(ada.map(i => String(resep[i][1]).trim()))).slice(0, 3).join(", ")
          : "KIKC tidak ada di RESEP");
    }
    rows.forEach(i => pakai.add(i));
  });

  const total = {}, lotPer = {}, brgPer = {};   // total gram, KIKC berbeda, dan Kode Brg (kode entry) per item
  pakai.forEach(i => {
    const item = norm(resep[i][4]);
    if (!item) return;
    total[item] = (total[item] || 0) + angka(resep[i][5]);
    (lotPer[item] = lotPer[item] || new Set()).add(kc(resep[i][0]));
    const brg = String(resep[i][3]).trim();
    if (brg) { brgPer[item] = brgPer[item] || {}; brgPer[item][brg] = (brgPer[item][brg] || 0) + 1; }
  });

  const sh = ss.getSheetByName("Booking");
  const last = sh.getLastRow();
  const ringkas = { lot: lotSeen.size, lotCocok: lotCocok, baris: pakai.size, item: 0, terisi: 0, tanpaItem: [], contoh: contoh, versi: "7" };
  if (last < 2) return ringkas;
  const items = sh.getRange(2, 3, last - 1, 1).getValues();
  const dikenal = new Set();
  const lotMap = {};   // jumlah lot per item: disimpan di Script Properties (virtual, tidak ditulis ke sheet)
  const out = items.map(r => {
    const k = norm(r[0]);
    if (!k) return ["", ""];
    dikenal.add(k);
    const t = Math.round((total[k] || 0) * 100) / 100;
    if (lotPer[k]) lotMap[k] = lotPer[k].size;
    return [t, Math.round(t * 10) / 10000];
  });
  sh.getRange(1, 4, 1, 2).setValues([["Booking", "Booking (Kg)"]]);
  sh.getRange(2, 4, out.length, 2).setValues(out);
  PropertiesService.getScriptProperties().setProperty("bookingLot", JSON.stringify(lotMap));
  ringkas.item = out.filter(x => x[0] !== "").length;
  ringkas.terisi = out.filter(x => x[0] > 0).length;
  // item yang dipakai di resep tetapi namanya tidak ada di sheet Booking (maks. 5 contoh)
  Object.keys(total).forEach(k => { if (!dikenal.has(k) && ringkas.tanpaItem.length < 5) ringkas.tanpaItem.push(k); });
  return ringkas;
}

// Urutan penting: Kamus dulu, lalu C.dbb, RESEP, terakhir Booking
function rspSyncAll() {
  rspSyncKamus();
  rspSyncWodmeta();
  rspSyncResep();
  rspSyncBooking();
  PropertiesService.getScriptProperties().setProperty("rspSyncAt", Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm"));   // waktu sinkron terakhir, ditampilkan di Page 3
}

// Jalankan SEKALI. Aman dijalankan ulang (pemicu lama dihapus dulu, tidak dobel)
function rspBuatTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "rspSyncAll") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("rspSyncAll").timeBased().everyMinutes(30).create();   // tiap 30 menit
}

// ====== PENGGANTI IMPORTRANGE: salin sheet WOD dan RPH dari spreadsheet RPH ke WIP YD (Jawaban) ======
// Hasilnya NILAI (bukan rumus), jadi tidak bisa #REF! dan cepat dibaca. Isi lama sheet tujuan diganti hanya jika data sumber berhasil dibaca.
// Jalankan syncWodRph sekali secara manual (beri izin), lalu jalankan pasangTriggerWodRph sekali agar jalan otomatis tiap 10 menit.
function syncWodRphSheet_(nama) {
  const src = SpreadsheetApp.openById(RSP_ID_WODMETA).getSheetByName(nama);
  if (!src) throw new Error('Sheet "' + nama + '" tidak ada di spreadsheet RPH.');
  const lr = src.getLastRow(), lc = src.getLastColumn();
  if (lr < 1 || lc < 1) throw new Error('Sheet "' + nama + '" di spreadsheet RPH kosong, tidak disalin.');
  const vals = src.getRange(1, 1, lr, lc).getValues();
  if (String(vals[0][0]).indexOf("#REF") >= 0) throw new Error('Sheet "' + nama + '" di sumber berisi error, tidak disalin.');
  const dst = ss_().getSheetByName(nama) || ss_().insertSheet(nama);
  if (dst.getMaxColumns() < lc) dst.insertColumnsAfter(dst.getMaxColumns(), lc - dst.getMaxColumns());
  if (dst.getMaxRows() < lr) dst.insertRowsAfter(dst.getMaxRows(), lr - dst.getMaxRows());
  dst.clearContents();   // menghapus rumus IMPORTRANGE lama; format sel tetap
  dst.getRange(1, 1, lr, lc).setValues(vals);
  return lr;
}
function syncWodRph() {
  const hasil = {};
  ["WOD", "RPH"].forEach(n => { try { hasil[n] = syncWodRphSheet_(n); } catch (e) { hasil[n] = "GAGAL: " + e.message; } });
  PropertiesService.getScriptProperties().setProperty("wodRphSyncAt", Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm"));
  Logger.log(JSON.stringify(hasil));
  return hasil;
}
function pasangTriggerWodRph() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "syncWodRph") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("syncWodRph").timeBased().everyMinutes(10).create();
}
