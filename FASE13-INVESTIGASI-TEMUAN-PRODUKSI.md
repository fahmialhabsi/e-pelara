# Fase 13 — Investigasi 6 Temuan Review PDF Produksi Nyata (LAKIP 2025, Dinas Pangan)

**Status:** Murni investigasi. **Tidak ada kode maupun data yang diubah** — seluruh temuan diverifikasi lewat `Read`/`Grep` (kode) dan query `SELECT` read-only (data), dikonfirmasi via `git status` bahwa file terkait (`lakipGeneratorController.js`, `lakipAnalisaService.js`) tidak punya perubahan baru dari sesi ini.

**Konteks data uji:** OPD aktif = `renstra_opd.id = 1` ("Dinas Pangan"), tahun LAKIP = 2025, 97 baris `lakip` untuk tahun tsb.

---

## 1. Nama OPD hardcode "Dinas Ketahanan Pangan"

**Root cause:** `backend/controllers/lakipGeneratorController.js:18` — konstanta modul `OPD_CONFIG` di-hardcode dan **salah**, tidak pernah disinkronkan ke master data:

```js
const OPD_CONFIG = {
  nama_opd: 'Dinas Ketahanan Pangan',        // ← SALAH, seharusnya "Dinas Pangan"
  nama_provinsi: 'Maluku Utara',              // benar
  kepala_opd: 'Kepala Dinas Ketahanan Pangan',// ← ikut salah
  nip_kepala: 'NIP. —',                       // placeholder belum diisi (isu terpisah, minor)
  tahun_anggaran: new Date().getFullYear(),
};
```

Dipakai di 3 titik: `namaOpd: OPD_CONFIG.nama_opd` (baris 332, masuk ke `analisaOtomatis()` sehingga ikut mencemari narasi "Analisis: ..."), `opd: OPD_CONFIG` (baris 433, jadi `meta.opd` yang dipakai cover/header/footer/Kata Pengantar/tanda tangan Bab IV di `buildHtml()`), dan fallback visi baris 438 (`'Visi Dinas Ketahanan Pangan Maluku Utara'` — ikut salah juga, meski saat ini tidak kepakai karena `visi` dari DB tidak null).

**Data DB yang benar** (dua sumber master konsisten):
```sql
SELECT id, nama_opd, is_aktif FROM renstra_opd WHERE is_aktif=1;
-- {"id":1,"nama_opd":"Dinas Pangan","is_aktif":1}

SELECT DISTINCT nama_opd FROM opd_penanggung_jawab LIMIT 10;
-- tidak ada satupun "Dinas Ketahanan Pangan", semua nama OPD termasuk ini pakai "Dinas Pangan"
```

**Kenapa Lampiran 1 (PK) sudah benar:** Lampiran PK dibangun lewat `lakipPkService.getPkDetail(renstraAktif.id, tahun)` (dipanggil baris 47), yang mengambil `nama_opd` langsung dari `RenstraOPD` — bukan dari `OPD_CONFIG`. Jadi dokumen yang sama punya 2 sumber nama OPD berbeda: badan dokumen (cover/header/Kata Pengantar/TTD) pakai `OPD_CONFIG` (hardcode salah), Lampiran 1 pakai `RenstraOPD` (DB, benar).

**Rekomendasi fix (konkret, root cause sudah jelas):** Hapus `OPD_CONFIG` sebagai sumber nama OPD; ambil `nama_opd`/`kepala_opd` dari `renstraAktif`/tabel `renstra_opd` (dan `opd_penanggung_jawab` untuk field kepala/NIP kalau ada) — pola query sama seperti `lakipPkService.getPkDetail()` sudah pakai. `OPD_CONFIG` bisa disederhanakan hanya menyisakan `nama_provinsi`/`tahun_anggaran` (field yang memang tidak punya sumber per-OPD di DB), atau dihapus total kalau field itu juga bisa diturunkan dari tempat lain.

---

## 2. Duplikasi Visi/Misi di Ringkasan Eksekutif

**Root cause BUKAN seperti hipotesis awal (bukan JOIN-multiplication).** Query Misi (`lakipGeneratorController.js:58-60`):
```sql
SELECT id, no_misi, isi_misi FROM misi ORDER BY no_misi ASC LIMIT 10
```
Tidak ada JOIN sama sekali. Root cause sebenarnya: **tabel `misi` sendiri punya data duplikat mentah**:
```sql
SELECT COUNT(*) FROM misi;                                    -- 24 baris total
SELECT COUNT(DISTINCT no_misi) FROM misi;                      -- 6 unik
SELECT no_misi, isi_misi, COUNT(*) c FROM misi GROUP BY no_misi, isi_misi;
-- SEMUA 6 misi unik masing-masing muncul PERSIS 4×, semuanya rpjmd_id=2 (bukan isu lintas-periode)
```
6×4 = 24, cocok persis. Ini menjelaskan pola yang terlihat di PDF (Misi 1-3 muncul 4×, lalu terpotong `LIMIT 10`: 4+4+2=10).

Lapisan kedua: kode **tidak defensif** terhadap duplikasi data — `misiHtml` (baris 656-658) merender `misi.map(...)` mentah-mentah tanpa dedup:
```js
const misiHtml = misi.length
  ? misi.map((m) => `<li>Misi ${m.no_misi}: ${escH(m.isi_misi)}</li>`).join('')
  : '<li>Belum ada data misi</li>';
```

**Jumlah Misi yang benar:** 6 (no_misi 1-6, satu baris masing-masing).

**Rekomendasi fix (dua lapis, root cause sudah jelas):**
- **Data:** Bersihkan 18 baris duplikat di tabel `misi` (sisakan 1 baris per `no_misi`, misal `id` terkecil) — kemungkinan besar penyebabnya seed/import script yang jalan berulang tanpa guard unique. Ini tindakan data terpisah, di luar scope kode.
- **Kode (defensif, disarankan tetap dilakukan walau data sudah dibersihkan):** tambahkan dedup di query (`GROUP BY no_misi, isi_misi`) atau di JS sebelum render `misiHtml` (`Map` keyed by `no_misi`), supaya generator LAKIP tidak rapuh terhadap kualitas data `misi` di masa depan.

---

## 3. Duplikasi header "Program: ..." dengan "Belum ada indikator"

**Konfirmasi mekanisme render:** `indikatorTree` (dibangun `lakipGeneratorController.js:360-391`) sudah menyusun 1 blok Program per baris `programList` yang lolos filter `resolveSasaranIdFromProgram(p.id) === s.id` (baris 360), dengan seluruh Kegiatan-nya di-nest DI DALAM blok itu (`kegiatan: kegiatanAnak.map(...)`, baris 379-389) — **bukan** dicetak ulang per-Kegiatan seperti hipotesis awal. Render-nya (`indikatorHierarkiHtml`, baris 587-604) memetakan `s.program.map(p => <div class="program-block">...)` 1:1 dari `programAnak`.

**Root cause sebenarnya: `renstra_program` (tabel sumber `programList`) punya baris "stub" duplikat per nama Program.** Query murni `SELECT id, kebijakan_id, nama_program FROM renstra_program WHERE renstra_id=:id` (baris 95-99, tanpa JOIN) — tidak melakukan dedup by `nama_program`. Data real untuk `renstra_id=1`:

```
Total baris renstra_program : 17
Distinct nama_program       : 5
```

Breakdown per nama_program (id = program.id, kegCount = jumlah Kegiatan anak, indCount = jumlah indikator level-Program):

| nama_program | id "asli" (kegCount>0) | id "stub" (kegCount=0, indCount=0) |
|---|---|---|
| PENGELOLAAN SUMBER DAYA EKONOMI... | 1 (keg=1, ind=1) | 6 |
| PENINGKATAN DIVERSIFIKASI DAN KETAHANAN PANGAN | 2 (keg=4, ind=1) | 7, 8, 9, 10, 11 |
| PENANGANAN KERAWANAN PANGAN | 3 (keg=2, ind=1) | 12, 13, 14 |
| PENGAWASAN KEAMANAN PANGAN | 4 (keg=1, ind=1) | 15, 16 |
| PENUNJANG URUSAN PEMERINTAHAN DAERAH PROVINSI | 5 (keg=8, ind=1) | 17 |

**5 baris "asli" (id 1-5)** masing-masing punya `kebijakan_id` sendiri dan memang terhubung ke Kegiatan + indikator level-Program — ini yang tampil benar di PDF. **12 baris "stub" (id 6-17)** masing-masing punya `kebijakan_id` LAIN (unik per stub) yang lewat rantai `kebijakan→strategi→sasaran` kebetulan resolve ke **Sasaran yang sama** dengan baris aslinya, tapi `kegCount=0` DAN `indCount=0` — nol Kegiatan, nol indikator. Setiap stub ini otomatis lolos filter `programAnak` di Sasaran yang sama, menghasilkan `<div class="program-block">` baru dengan judul sama persis + `indikatorTableHtml([])` → "Belum ada indikator", dan tanpa blok Kegiatan sama sekali (karena `p.kegiatan` juga kosong).

**Hasil hitung di data real: tepat 12 duplikasi** "Program: ..." + "Belum ada indikator" — sesuai selisih 17 baris total dikurangi 5 nama unik.

**Kaitan dengan desain domain (konsisten dengan catatan sesi sebelumnya):** 1 Program memang sah menopang >1 Arah Kebijakan/Kebijakan secara desain. Tapi pola yang benar untuk itu seharusnya **banyak Kebijakan menunjuk ke 1 baris `renstra_program` yang sama** (relasi many-to-one lewat FK/mapping), bukan **1 baris `renstra_program` baru dibuat untuk tiap Kebijakan** dengan `nama_program` yang di-copy manual. 12 stub ini kemungkinan besar artefak proses cascading (tiap kali sebuah Kebijakan baru ditambahkan/di-generate, ikut ter-generate juga 1 baris Program baru bernama sama, alih-alih di-link ke Program yang sudah ada) — konsisten dengan pola "iterative development, same-day paired migrations" yang memang umum di repo ini.

**Rekomendasi fix (konkret, root cause sudah jelas):**
- **Data (paling aman — semua 12 stub kegCount=0 & indCount=0, tidak ada data yang perlu dipindah dulu):** `DELETE FROM renstra_program WHERE id IN (6,7,8,9,10,11,12,13,14,15,16,17)` — hapus 12 baris stub, sisakan hanya 5 baris asli. **Perlu dicek dulu**: apakah `renstra_kebijakan` (12 baris kebijakan yang tadinya menunjuk ke stub-stub ini) butuh di-repoint ke `renstra_program.id` yang benar (1/2/3/4/5) supaya rantai Kebijakan→Program tetap utuh secara semantik — ini di luar scope "murni investigasi", perlu keputusan produk terpisah soal bagaimana 12 Kebijakan itu seharusnya dipetakan.
- **Kode (defensif, independen dari fix data):** di pembentukan `programAnak` (baris 360) atau saat render (`indikatorHierarkiHtml`), dedup Program dalam 1 Sasaran berdasarkan `nama_program` — gabungkan `kegiatan`/`indikator` dari semua baris dengan nama sama jadi 1 blok, supaya kalau suatu saat ada stub serupa lagi di data, PDF tidak ikut menampilkan blok kosong duplikat.

---

## 4. Kolom "Evaluasi" kosong 100% di tabel Bab III B

**Konfirmasi:** Tabel Bab III B ("Rincian Realisasi Program dan Kegiatan") dirender oleh `lakipRows` (`lakipGeneratorController.js:638-653`), yang membaca `l.evaluasi` **langsung dari kolom `lakip.evaluasi`** (hasil query mentah baris 194-201) — **tidak ada logika auto-generate apapun** untuk kolom ini, berbeda total dari Bab III A yang manggil `analisaOtomatis()` per indikator (baris 321-333) untuk mensintesis narasi "Analisis: ...".

```js
const lakipRows = lakipEntries.length
  ? lakipEntries.map((l, i) => `... <td>${escH(l.evaluasi || '—')}</td> ...`).join('')
  : ...
```

**Cek apakah kolom ini pernah terisi untuk data lain:**
```sql
SELECT COUNT(*) FROM lakip;                                                 -- 103 baris total
SELECT COUNT(*) FROM lakip WHERE evaluasi IS NOT NULL AND evaluasi <> '';   -- 3 baris terisi
SELECT tahun, COUNT(*), SUM(evaluasi terisi) FROM lakip GROUP BY tahun;
-- 2024: 6 baris, 3 terisi (isi manual: "Target tercapai 100%", "Realisasi mendekati target, 3 orang mutasi/pensiun", dll — narasi manusiawi, bukan template)
-- 2025: 97 baris, 0 terisi
```

**Root cause:** `evaluasi`/`rekomendasi` adalah kolom **isian manual** (form CRUD LAKIP lewat `lakipController.js`) — 3 dari 6 baris tahun 2024 memang diisi manual oleh operator. Tapi 97 baris tahun 2025 dibuat lewat pipeline auto-generate (`lakipAutoGenerateService.js`/`lakipBridgeService.js`, dikonfirmasi tidak menyentuh kolom `evaluasi`/`rekomendasi` sama sekali — grep tidak menemukan referensi field ini di kedua file), sehingga tetap `NULL` sejak insert dan tidak pernah diisi ulang manual sesudahnya. **Ini bukan bug logika yang menghasilkan string kosong — ini memang belum ada logika pengisiannya untuk jalur auto-generate**, murni gap fitur.

**Rekomendasi (laporan temuan saja, tanpa implementasi sesuai instruksi):**
- Opsi A: sediakan form/endpoint untuk operator mengisi `evaluasi`/`rekomendasi` manual per baris `lakipEntries` tahun 2025 (mengikuti pola 2024) sebelum dokumen final di-generate.
- Opsi B: bangun `analisaEvaluasiOtomatis()` semacam `analisaOtomatis()` tapi untuk grain Program/Kegiatan (bukan per-indikator) — perlu didefinisikan dulu evidence apa yang dipakai (capaian gabungan Kegiatan? serapan anggaran? keterangan realisasi?).
- Opsi C: kombinasi — auto-generate draft narasi (Opsi B) sebagai default, tapi tetap bisa di-override manual (Opsi A) kalau operator mau menulis ulang.

Ketiganya perlu keputusan produk (bukan cuma teknis) sebelum implementasi, sesuai instruksi untuk tidak menulis kode di poin ini.

---

## 5. Ketidakcocokan "27 Indikator Kinerja" vs jumlah baris tabel detail

**Sumber angka ringkasan** (`lakipGeneratorController.js:1215-1223`, Ringkasan Eksekutif):
```js
${indikator.length}                                          // kartu "Indikator Kinerja"
${indikator.filter((i) => i.pct_capaian >= 100).length}       // "Tercapai"
${indikator.filter((i) => i.pct_capaian < 100).length}        // "Perlu Perhatian"
```
`indikator` = `indikatorFlat` (baris 338-340), dibangun dari query baris 144-155 yang secara eksplisit **membatasi** `WHERE stage IN ('sasaran','program','kegiatan')` — sengaja **tidak termasuk** `stage IN ('iku','ikk')` (itu query terpisah, baris 160-171, jadi variabel `iku`/`ikk` sendiri).

**Sumber baris tabel detail Bab III A:** `indikatorHierarkiHtml` menampilkan seluruh `indikatorFlat` (lewat `indikatorTree` + `indikatorOrphanHtml` untuk yang ancestry-nya putus — keduanya berasal dari `indikatorFlat` yang sama, tidak ada yang hilang), **DITAMBAH** 2 section terpisah `indikatorIkuHtml`/`indikatorIkkHtml` (baris 622-635) yang merender `iku`/`ikk` — populasi yang TIDAK dihitung di kartu ringkasan.

**Angka real (renstra_id=1):**
```sql
SELECT stage, COUNT(*) FROM indikator_renstra WHERE renstra_id=1 GROUP BY stage;
-- sasaran:6, program:5, kegiatan:16  → 6+5+16 = 27  (persis cocok dgn kartu ringkasan)
-- iku:2, ikk:6                        → 8 baris TAMBAHAN yang tampil di tabel detail tapi tidak dihitung di "27"
```

**Kesimpulan:** Ini **bukan bug perhitungan** (kedua sisi menghitung himpunan datanya masing-masing dengan benar dan konsisten) — ini **perbedaan cakupan by design**: kartu ringkasan sengaja hanya menghitung indikator hierarki Tujuan→Sasaran→Program→Kegiatan (27), sedangkan tabel detail Bab III A menampilkan itu **plus** section IKU+IKK (8) sebagai satu kesatuan dokumen = total 35 baris indikator yang benar-benar tampil ke pembaca. Masalahnya murni **label yang tidak cukup spesifik** — "Indikator Kinerja" polos di kartu ringkasan menyiratkan total keseluruhan, padahal cuma sebagian (27 dari 35 baris indikator yang ada di dokumen yang sama).

**Rekomendasi (laporan temuan saja, tanpa implementasi sesuai instruksi):**
- Opsi A: ubah label kartu jadi lebih spesifik, mis. "Indikator Kinerja (Sasaran-Kegiatan)" atau "27 dari 35 Indikator Kinerja (di luar IKU/IKK)".
- Opsi B: kartu ringkasan menghitung total gabungan (27+8=35) supaya match dengan jumlah baris di tabel detail, dan IKU/IKK dipisah sebagai info tambahan (bukan dikeluarkan dari hitungan utama).
- Opsi C: tambah 1 kartu kecil terpisah "IKU/IKK: 8 indikator" di samping kartu utama "27", supaya kedua angka terlihat eksplisit dan pembaca bisa menjumlahkan sendiri kalau perlu.

---

## 6. Analisis Efisiensi edge case 0%/0%

**Kode saat ini** (`backend/services/lakipAnalisaService.js:181-205`, fungsi `analisaEfisiensi`, dibuat Fase 9):
```js
function analisaEfisiensi(rows) {
  return (rows || []).map((r) => {
    const pctKinerja = angka(r.pct_capaian_kinerja);
    const pagu = angka(r.pagu) || 0;
    const realisasi = angka(r.realisasi) || 0;
    const pctAnggaran = pagu > 0 ? Math.round((realisasi / pagu) * 100) : null;

    let status;
    if (pctKinerja === null || pctAnggaran === null) {
      status = 'Tidak Dapat Dihitung';
    } else if (pctKinerja >= pctAnggaran) {
      status = 'Efisien';           // ← 0 >= 0 juga masuk sini
    } else {
      status = 'Kurang Efisien';
    }
    ...
  });
}
```

**Konfirmasi bug edge case di data real:** dipanggil dari `collectLakipData()` (`lakipGeneratorController.js:406-429`, grain per-Kegiatan) untuk `renstra_id=1`/tahun 2025 menghasilkan 16 baris efisiensi:
```
Status distribution: { "Efisien": 11, "Kurang Efisien": 3, "Tidak Dapat Dihitung": 2 }
```
1 dari 11 baris "Efisien" adalah **Kegiatan "Pengadaan Barang Milik Daerah Penunjang Urusan Pemerintah Daerah"** dengan `pct_capaian_kinerja=0` DAN `pct_capaian_anggaran=0` — belum dilaksanakan sama sekali (0% capaian kinerja, 0% serapan anggaran meski `pagu>0`), tapi berlabel "Efisien" karena `0 >= 0` bernilai `true`. Secara substansi ini menyesatkan pembaca laporan (menyiratkan kinerja bagus, padahal kegiatannya belum jalan).

**Opsi perbaikan (laporan logika saja, TIDAK diimplementasikan sesuai instruksi):**

- **Opsi A — kondisi khusus 0%/0% murni:** tambah pengecekan `if (pctKinerja === 0 && pctAnggaran === 0) status = 'Belum Dilaksanakan';` SEBELUM pengecekan `>=`. Paling sederhana, tapi hanya menangkap kasus persis 0/0 — Kegiatan dengan realisasi kecil tapi bukan nol (mis. kinerja 2%, anggaran 1%) tetap lolos ke "Efisien" walau secara substansi juga baru mulai.
- **Opsi B — ambang batas "belum berjalan berarti":** ganti syarat jadi rentang, mis. `pctKinerja <= 5 && pctAnggaran <= 5` → "Belum Dilaksanakan" (perlu diskusi angka ambang yang wajar, supaya tidak salah label Kegiatan yang memang progress-nya lambat tapi valid).
- **Opsi C — status baru independen berbasis anggaran saja:** kalau `pctAnggaran === 0` (belum ada realisasi anggaran sama sekali, terlepas dari kinerja) → "Belum Dilaksanakan"; baru bandingkan kinerja vs anggaran untuk sisanya. Lebih longgar dari opsi A/B, menangani juga kasus `pctKinerja=null` (Kegiatan tanpa indikator langsung) yang kebetulan `pctAnggaran=0` — saat ini kasus itu sudah masuk "Tidak Dapat Dihitung" karena `pctKinerja===null`, jadi opsi ini utamanya relevan kalau `pctKinerja` numerik tapi anggaran nol.
- **Opsi D — pisahkan warna/badge tapi status teks tetap "Efisien":** kalau tidak ingin menambah kategori status baru (supaya tidak mengubah kontrak data konsumen lain), cukup tambahkan flag terpisah `belum_dilaksanakan: boolean` di objek hasil, dan `buildHtml()` yang memutuskan warna badge/keterangan tambahan tanpa mengubah nilai `status_efisiensi` itu sendiri.

Rekomendasi personal (tanpa implementasi): **Opsi A** paling minim risiko regresi (satu syarat tambahan, tidak mengubah threshold yang sudah ada untuk kasus lain), tapi kalau ternyata ditemukan kasus "hampir 0/0" (mis. 0%/2%) di data OPD lain nantinya, **Opsi C** lebih tahan lama karena berbasis kondisi anggaran-nol yang jelas maknanya secara akuntansi (belum ada realisasi = belum dilaksanakan), bukan ambang batas kinerja yang butuh mendefinisikan angka arbitrer.

---

## Ringkasan status per poin

| Poin | Root cause | Sifat | Rekomendasi fix diusulkan |
|---|---|---|---|
| 1. Nama OPD | `OPD_CONFIG.nama_opd` hardcode salah (`lakipGeneratorController.js:18`) | Bug kode | Ya — ambil dari `renstra_opd` |
| 2. Duplikasi Misi | Data mentah `misi` 4× duplikat (6 unik → 24 baris) + kode tanpa dedup | Data + kode defensif | Ya — cleanup data + dedup kode |
| 3. Duplikasi Program | 12 baris stub `renstra_program` (0 Kegiatan, 0 indikator) per Kebijakan yang seharusnya di-link, bukan di-copy | Data + kode defensif | Ya — hapus 12 stub (perlu keputusan repoint Kebijakan) + dedup kode |
| 4. Evaluasi kosong | Belum ada logika auto-generate evaluasi untuk pipeline 2025; kolom hanya terisi lewat form manual (3/6 baris 2024) | Gap fitur | Tidak — 3 opsi dilaporkan |
| 5. Mismatch 27 vs detail | By design (27 = hierarki Tujuan-Kegiatan; +8 IKU/IKK tampil terpisah di detail = 35) | Label kurang spesifik | Tidak — 3 opsi label/angka dilaporkan |
| 6. Efisiensi 0%/0% | Formula `kinerja >= anggaran` meloloskan 0>=0 jadi "Efisien" (1 kasus nyata di data) | Edge case logika | Tidak — 4 opsi logika dilaporkan |
