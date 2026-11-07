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
//    Hasil: Booking kolom D (gram) dan kolom E (Kg = D / 1000). Kolom A..C tidak disentuh.
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

  const total = {};
  pakai.forEach(i => {
    const item = norm(resep[i][4]);
    if (!item) return;
    total[item] = (total[item] || 0) + angka(resep[i][5]);
  });

  const sh = ss.getSheetByName("Booking");
  const last = sh.getLastRow();
  const ringkas = { lot: lotSeen.size, lotCocok: lotCocok, baris: pakai.size, item: 0, terisi: 0, tanpaItem: [], contoh: contoh, versi: "3" };
  if (last < 2) return ringkas;
  const items = sh.getRange(2, 3, last - 1, 1).getValues();
  const dikenal = new Set();
  const out = items.map(r => {
    const k = norm(r[0]);
    if (!k) return ["", ""];
    dikenal.add(k);
    const t = Math.round((total[k] || 0) * 100) / 100;
    return [t, Math.round(t * 10) / 10000];
  });
  sh.getRange(1, 4, 1, 2).setValues([["Booking", "Booking (Kg)"]]);
  sh.getRange(2, 4, out.length, 2).setValues(out);
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
}

// Jalankan SEKALI. Aman dijalankan ulang (pemicu lama dihapus dulu, tidak dobel)
function rspBuatTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "rspSyncAll") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("rspSyncAll").timeBased().everyHours(1).create();
}
