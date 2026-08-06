# Fase 14 — Eksekusi Perbaikan Poin 1/2/5/6, Investigasi Keamanan Poin 3, Dokumentasi Poin 4

**Status:** Poin 1, 2 (parsial — lihat catatan blocker), 4, 5, 6 **dieksekusi dan diverifikasi** (generate ulang data + HTML via `lakipGeneratorController.preview()`, data real OPD "Dinas Pangan" tahun 2025). Poin 3 **murni investigasi tambahan, TIDAK ada data yang dihapus** — menunggu keputusan lanjut.

**File yang diubah:**
- `backend/controllers/lakipGeneratorController.js`
- `backend/services/lakipAnalisaService.js`

Tidak ada migrasi baru, tidak ada perubahan skema, tidak ada `DELETE`/`UPDATE` yang dijalankan ke database manapun.

---

## Poin 1 — Nama OPD

### Perubahan kode
`OPD_CONFIG` (konstanta modul, dulu hardcode `nama_opd: 'Dinas Ketahanan Pangan'`) **dihapus sebagai sumber nama OPD**. Diganti:
- `OPD_CONFIG_DEFAULT` — hanya menyisakan field yang memang tidak punya sumber per-OPD di DB (`nama_provinsi`, `tahun_anggaran`).
- Query `renstraAktif` (`lakipGeneratorController.js` sekitar baris 35) ditambah kolom `nama_opd`.
- `opdConfig` dibangun dinamis di dalam `collectLakipData()`:
  ```js
  const namaOpdAktif = renstraAktif?.nama_opd || 'OPD';
  const opdConfig = {
    ...OPD_CONFIG_DEFAULT,
    nama_opd: namaOpdAktif,
    kepala_opd: `Kepala ${namaOpdAktif}`,
    nip_kepala: 'NIP. —',
  };
  ```
- Semua pemakaian `OPD_CONFIG` (2 titik: `namaOpd` di `analisaOtomatis()`, dan `opd: OPD_CONFIG` di return object) diganti `opdConfig`.
- Fallback teks Visi (`'Visi Dinas Ketahanan Pangan Maluku Utara'`, dulu ikut hardcode salah) diganti dinamis: `` `Visi ${namaOpdAktif} ${opdConfig.nama_provinsi}` ``.

`nip_kepala` **sengaja tidak diubah** (tetap placeholder `'NIP. —'`) — di luar scope Poin 1 (nama OPD), sudah dicatat terpisah sebagai isu minor di Fase 13.

### Verifikasi (generate ulang, `tahun=2025`, OPD aktif = Dinas Pangan)
```
Kemunculan "Dinas Ketahanan Pangan" (harus 0): 0
Kemunculan "Dinas Pangan" (harus > 0): 43
Kemunculan "Kepala Dinas Pangan": 4
```
0 kemunculan nama salah di seluruh HTML (cover, header/footer, Kata Pengantar, tanda tangan Bab IV semuanya masuk dalam 43 kemunculan "Dinas Pangan" — termasuk 4 kemunculan spesifik "Kepala Dinas Pangan" di bagian tanda tangan). Konsisten dengan Lampiran 1 (PK) yang dari awal sudah benar.

---

## Poin 2 — Duplikasi Misi

### (a) Cleanup data — **DIBATALKAN, TIDAK DIEKSEKUSI** (blocker ditemukan)

Sesuai instruksi ("cek dulu sebelum eksekusi, laporkan kalau ada"), dicek FK yang mereferensikan `misi.id` sebelum menghapus 18 baris duplikat:

```sql
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'misi' AND TABLE_SCHEMA = DATABASE();
```

Ditemukan FK formal: `cascading.misi_id`, `indikator.misi_id`, `indikatortujuans.misi_id`, **`tujuan.misi_id` (constraint `tujuan_ibfk_1`)**.

**Temuan kritis:** `tujuan.misi_id` **mereferensikan SELURUH 24 id `misi`** (bukan cuma 6 id "asli"), dan `tujuan_ibfk_1` bertipe **`ON DELETE CASCADE`**:
```sql
SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE TABLE_NAME='tujuan' AND CONSTRAINT_SCHEMA=DATABASE();
-- tujuan_ibfk_1: DELETE_RULE = CASCADE
```

Lebih jauh, tabel `tujuan` sendiri **ikut terduplikasi dengan pola yang sama** — 26 baris, tiap `misi.id` (termasuk 18 yang tadinya mau dihapus) punya minimal 1 baris `tujuan` sendiri, dengan timestamp `created_at` yang berbaris rapi mengikuti 4 gelombang yang sama persis dengan duplikasi `misi` (2025-08-02, 2026-04-01, 2026-07-08 10:29:05, 2026-07-08 10:29:06 — 2 gelombang terakhir cuma berjarak 1 detik). Ini bukan isu terisolasi di tabel `misi` saja — **seluruh rantai Misi→Tujuan level RPJMD ikut ter-clone berulang kali**, kemungkinan besar dari sebuah aksi "generate/clone RPJMD" yang tidak sengaja dijalankan berkali-kali.

**Konsekuensi kalau tetap dihapus:** menghapus 18 baris `misi` akan **cascade-delete** 18+ baris `tujuan` terkait (bukan gagal dengan error FK — MySQL akan diam-diam mengeksekusi cascade), yang lalu berpotensi cascade lagi ke `indikator`/`indikatortujuans` (keduanya juga `ON DELETE CASCADE` terhadap `tujuan_id`). Karena belum ada pemetaan yang jelas "baris `tujuan` mana yang betul-betul dead/orphan vs mana yang mungkin sudah dipakai turunan lain" tanpa audit tambahan, **penghapusan sepihak berisiko menghilangkan data yang sebetulnya aktif dipakai**, bukan sekadar 18 baris kosong seperti asumsi awal Fase 13.

**Kesimpulan:** cleanup data **tidak dieksekusi**. Ini butuh migrasi terpisah yang lebih hati-hati — kemungkinan perlu memetakan dulu mana Tujuan "kanonik" per Misi (mis. `tujuan.id` dengan `created_at` paling awal per `misi_id` kanonik), lalu repoint semua FK turunan (`indikator`, `indikatortujuans`, `cascading`, dst.) ke pasangan Misi-Tujuan kanonik sebelum baris duplikat aman dihapus. Di luar scope Fase 14.

### (b) Fix kode defensif — **DIEKSEKUSI**

Dua perubahan (bukan satu, karena dedup render saja ternyata tidak cukup — lihat verifikasi):

1. **Query Misi** (`lakipGeneratorController.js`, sekitar baris 67-71) — diubah dari `SELECT id, no_misi, isi_misi FROM misi ORDER BY no_misi ASC LIMIT 10` menjadi:
   ```sql
   SELECT MIN(id) AS id, no_misi, isi_misi FROM misi GROUP BY no_misi, isi_misi ORDER BY no_misi ASC
   ```
   **Kenapa perlu diubah juga (bukan cuma dedup di render):** `LIMIT 10` lama, dikombinasi data yang 4x terduplikasi, membuat query berhenti di **no_misi 1-3 saja** (4+4+2=10 baris persis kepotong LIMIT 10) — Misi 4/5/6 **tidak pernah ikut terambil dari DB sama sekali**. Dedup di render (poin berikut) tidak bisa memperbaiki ini karena datanya sudah keburu hilang sebelum sampai ke JS.

2. **`misiHtml`** (buildHtml(), sekitar baris 665-673) — dedup by `no_misi` sebagai lapis pertahanan tambahan (independen dari fix query di atas, supaya tetap aman kalau suatu saat data dobel muncul lagi dalam bentuk lain):
   ```js
   const misiUnik = [...new Map((misi || []).map((m) => [m.no_misi, m])).values()];
   const misiHtml = misiUnik.length
     ? misiUnik.map((m) => `<li>Misi ${m.no_misi}: ${escH(m.isi_misi)}</li>`).join('')
     : '<li>Belum ada data misi</li>';
   ```

### Verifikasi (generate ulang)
```
Total baris <li>Misi N: ...</li> (harus 6): 6
Distribusi: {"Misi 1:":1,"Misi 2:":1,"Misi 3:":1,"Misi 4:":1,"Misi 5:":1,"Misi 6:":1}
```
Sebelum fix query (dedup render saja): hanya 3 baris (Misi 1-3, masing-masing 1x — Misi 4-6 hilang karena `LIMIT 10`). Setelah fix query + dedup render: tepat 6 baris, tiap Misi tercetak persis 1×.

---

## Poin 6 — Formula Efisiensi edge case 0%/0%

### Perubahan kode

**`backend/services/lakipAnalisaService.js`** — `analisaEfisiensi()` (Opsi A dari Fase 13):
```js
let status;
if (pctKinerja === null || pctAnggaran === null) {
  status = 'Tidak Dapat Dihitung';
} else if (pctKinerja === 0 && pctAnggaran === 0) {
  status = 'Belum Dilaksanakan';
} else if (pctKinerja >= pctAnggaran) {
  status = 'Efisien';
} else {
  status = 'Kurang Efisien';
}
```

**`backend/controllers/lakipGeneratorController.js`** — 2 penyesuaian tambahan supaya status baru ini tampil & terhitung benar di dokumen (ditemukan saat verifikasi, bukan permintaan awal, tapi perlu supaya Opsi A benar-benar berfungsi end-to-end):
1. `efisiensiBadge()` — ditambah cabang `'Belum Dilaksanakan'` → `badge-yellow` (sebelumnya status baru ini akan jatuh ke cabang default "Tidak Dapat Dihitung" abu-abu, salah tampil).
2. Narasi ringkasan Bab III D — sebelumnya `efisiensiDapatDihitung.length - efisiensiJumlahEfisien` otomatis melabeli SEMUA yang bukan "Efisien" sebagai "Kurang Efisien" (termasuk status baru). Ditambah hitungan terpisah `efisiensiJumlahBelumDilaksanakan` dan `efisiensiJumlahKurang` supaya ketiganya tidak saling menimpa di narasi.

### Verifikasi (generate ulang, tabel Bab III D lengkap 16 baris)

Baris target:
```
PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH PROVINSI / Pengadaan Barang Milik Daerah
Penunjang Urusan Pemerintah Daerah → 0% / 0% → badge-yellow "Belum Dilaksanakan"
```
✅ Sesuai permintaan — sebelumnya "Efisien", sekarang "Belum Dilaksanakan".

**15 baris lain — distribusi status sebelum vs sesudah:**

| Status | Sebelum (Fase 13) | Sesudah (Fase 14) |
|---|---|---|
| Efisien | 11 | 10 (−1, pindah ke Belum Dilaksanakan) |
| Kurang Efisien | 3 | 3 (tetap) |
| Tidak Dapat Dihitung | 2 | 2 (tetap) |
| Belum Dilaksanakan | — | 1 (baru) |
| **Total** | **16** | **16** |

Persis 1 baris pindah, 15 baris lain **tidak berubah status**. Dikonfirmasi baris-per-baris dari tabel HTML hasil generate ulang (16 baris, termasuk membandingkan tiap Program/Kegiatan terhadap posisinya di Fase 13).

Narasi ringkasan Bab III D ikut terupdate otomatis dan konsisten:
> "Dari 14 Kegiatan yang dapat dianalisis efisiensinya (dari total 16 Kegiatan...), tercatat **10 Kegiatan efisien**... dan **3 Kegiatan kurang efisien**. **1 Kegiatan** tercatat belum dilaksanakan sama sekali (capaian kinerja dan serapan anggaran sama-sama 0%). 2 Kegiatan lainnya belum dapat dianalisis..."

(14 dapat dihitung = 10 Efisien + 3 Kurang Efisien + 1 Belum Dilaksanakan; 2 sisanya Tidak Dapat Dihitung; 14+2=16 total — konsisten.)

---

## Poin 5 — Perjelas label kartu ringkasan (keputusan final: Opsi A + C)

### Perubahan kode

`buildHtml()`, blok KPI Ringkasan Eksekutif (`lakipGeneratorController.js` sekitar baris 1258-1276):
1. Label kartu utama: `Indikator Kinerja` → `` `${indikator.length} Indikator Kinerja (Sasaran-Kegiatan)` `` (dinamis, bukan hardcode "27" — nilai kartu besar `kpi-val` di atasnya tetap `${indikator.length}` seperti semula, tidak diubah).
2. Kartu kecil baru `.kpi-extra` (CSS baru, terpisah dari grid 3-kolom `.kpi-grid` supaya tidak merusak layout yang sudah ada) di bawah grid:
   ```html
   <div class="kpi-extra"><strong>+${(iku?.length || 0) + (ikk?.length || 0)} IKU/IKK</strong> — Indikator Kinerja Utama & Kunci level OPD, disajikan terpisah di Bab III A, di luar hitungan kartu di atas.</div>
   ```
3. Perhitungan "Tercapai"/"Perlu Perhatian" (`indikator.filter(...)`) **tidak disentuh** — tetap berbasis `indikator.length` yang sama seperti sebelumnya, sesuai instruksi.

### Verifikasi (generate ulang)
```
Label kartu utama: 27 Indikator Kinerja (Sasaran-Kegiatan)
Kartu kecil IKU/IKK: +8 IKU/IKK
```
Kedua angka dinamis benar untuk data OPD ini (27 = 6 Sasaran + 5 Program + 16 Kegiatan; 8 = 2 IKU + 6 IKK — sama persis dengan hitungan manual di Fase 13). Kartu "Tercapai"/"Perlu Perhatian" tidak berubah nilainya (masih berbasis 27, tidak ikut 8 tambahan).

---

## Poin 4 — Dokumentasikan sebagai known gap (tanpa implementasi)

### Perubahan kode

Komentar JSDoc ditambahkan di atas `lakipRows` (`lakipGeneratorController.js`, sebelum baris `const lakipRows = ...`), isi:
- Menjelaskan `l.evaluasi` murni field manual dari `lakip.evaluasi` (form CRUD `lakipController.js`), **tidak ada** logika auto-generate untuk pipeline 2025 — beda dari narasi "Analisis: ..." di Bab III A yang otomatis lewat `analisaOtomatis()`.
- Menyebutkan pipeline auto-generate (`lakipAutoGenerateService.js`/`lakipBridgeService.js`) tidak pernah mengisi field ini.
- Referensi eksplisit ke `FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md` Poin 4 untuk 3 opsi jangka panjang yang sudah dinilai (manual, auto-generate, kombinasi) — belum ada keputusan produk, sengaja tidak dikerjakan di Fase 14.

Tidak ada perubahan logika/behavior — kolom `evaluasi` tetap tampil `—` untuk baris kosong seperti sebelumnya, cuma alasan & rencana ke depan sekarang terdokumentasi di kode.

---

## Poin 3 — Investigasi keamanan penghapusan 12 stub `renstra_program` (BELUM DIEKSEKUSI)

### 1. Cek FK ke `renstra_program` dari semua tabel

**FK formal** (referensi ke `renstra_program.id`):
```sql
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'renstra_program' AND TABLE_SCHEMA = DATABASE();
```
Hasil: `lakip.renstra_id`, `renja_item.source_renstra_program_id`, `renstra_subkegiatan.renstra_program_id`, `renstra_tabel_kegiatan.program_id`, `renstra_tabel_program.program_id`, `rkpd.renstra_program_id`.

**Dicek satu-satu, apakah ADA baris yang menunjuk ke salah satu dari 12 id stub (6,7,8,9,10,11,12,13,14,15,16,17):**
```
lakip.renstra_id                          : (tidak ada referensi ke id stub)
renja_item.source_renstra_program_id      : (tidak ada referensi ke id stub)
renstra_subkegiatan.renstra_program_id    : (tidak ada referensi ke id stub)
renstra_tabel_kegiatan.program_id         : (tidak ada referensi ke id stub)
renstra_tabel_program.program_id          : (tidak ada referensi ke id stub)
rkpd.renstra_program_id                   : (tidak ada referensi ke id stub)
renstra_kegiatan.program_id (informal)    : (tidak ada referensi ke id stub — sudah dikonfirmasi juga di Fase 13 lewat kegCount=0)
```

**Kesimpulan bagian ini: TIDAK ADA satupun tabel di seluruh database yang mereferensikan 12 id stub tersebut.** Berbeda dari kasus Misi (Poin 2) — di sini **secara referensial murni aman dihapus**, tidak ada risiko cascade tersembunyi.

### 2. Penjelasan detail "per Kebijakan seharusnya di-link, bukan di-copy"

Ditelusuri lebih dalam ke tabel `renstra_kebijakan` — **temuan penting yang mengoreksi kesan Fase 13**: ke-12 baris Kebijakan yang jadi induk stub-stub tersebut (`kebijakan_id` 9, 10, 13, 14, 36, 37, 38, 39, 40, 41, 42, 43, 44 — beberapa dipakai lebih dari 1 stub) **BUKAN data duplikat/sampah**. Tiap baris `renstra_kebijakan` punya `deskripsi` dan `kode_kebjkn` yang **berbeda-beda dan valid** (contoh: "Stabilisasi Pasokan dan Harga Pangan", "Pengembangan Usaha Pengolahan Pangan Lokal Masyarakat", "Peningkatan Sarana dan Prasarana Keamanan dan Mutu Pangan", dst — masing-masing kode `AKR-01-03.2.2.03`, `AKR-01-03.2.1.01`, dst, unik dan berurutan secara sistematis per `rpjmd_arah_id`). Ini benar-benar 12 arah kebijakan RPJMD yang berbeda dan sah, yang semuanya secara substansi memang harus bermuara ke salah satu dari 5 Program yang sama.

**Akar masalah sebenarnya adalah struktural/skema, bukan data kotor:**
```sql
SHOW COLUMNS FROM renstra_program;
-- kebijakan_id: int, nullable, TANPA FK constraint formal terdaftar
```
`renstra_program.kebijakan_id` adalah **1 kolom scalar tunggal** — 1 baris Program hanya bisa menyimpan **SATU** `kebijakan_id`. Skema saat ini secara struktural memodelkan relasi sebagai "1 Kebijakan → banyak Program" (via FK di sisi Program menunjuk ke SATU induk Kebijakan), padahal kebutuhan nyatanya kebalikan/many-to-many: **banyak Kebijakan boleh bermuara ke Program yang sama** (sesuai catatan sesi sebelumnya: "1 Program sah menopang >1 Arah Kebijakan").

Karena skema tidak punya cara untuk "1 Program dipakai lebih dari 1 Kebijakan" tanpa mengubah struktur tabel, satu-satunya jalan yang tersedia bagi proses cascading/generate saat itu adalah: **bikin baris `renstra_program` baru untuk tiap Kebijakan tambahan, dengan `nama_program` yang di-copy-paste sama** — bukan benar-benar "link" ke Program yang sudah ada. Itulah yang menghasilkan 12 stub.

**Apakah sudah ada infrastruktur mapping many-to-many yang bisa dipakai?** Ditemukan tabel `program_arah_kebijakan` (kolom: `program_id`, `arah_kebijakan_id`, `strategi_id` — pola many-to-many yang benar), berisi 13 baris. **Tapi ini BUKAN pasangan tabel yang sama** — `program_id`/`arah_kebijakan_id` di sini merujuk ke tabel legacy `program`/`arah_kebijakan` (level RPJMD lama), **bukan** `renstra_program`/`renstra_kebijakan` (level Renstra OPD yang dipakai modul LAKIP ini). Jadi tabel ini **tidak bisa langsung dipakai** sebagai solusi drop-in — kalaupun mau diadopsi polanya, perlu dibuatkan tabel pivot baru khusus untuk `renstra_kebijakan` ↔ `renstra_program` (mis. `renstra_program_kebijakan`), lalu migrasi 12 relasi Kebijakan-stub di atas supaya menunjuk ke tabel pivot itu alih-alih membuat baris Program baru.

### 3. Ringkasan & rekomendasi (belum dieksekusi, menunggu keputusan)

| | Temuan |
|---|---|
| Aman dihapus dari sisi FK? | **Ya** — 0 referensi ke 12 id stub di seluruh database (formal maupun informal) |
| Apakah 12 Kebijakan sumbernya itu sendiri data sampah? | **Tidak** — semuanya arah kebijakan RPJMD yang sah dan berbeda-beda substansinya |
| Akar masalah | `renstra_program.kebijakan_id` scalar tunggal (skema 1-Kebijakan-ke-banyak-Program), bukan didesain untuk kasus banyak-Kebijakan-ke-1-Program |
| Solusi cepat (simtomatik) | `DELETE FROM renstra_program WHERE id IN (6,7,8,9,10,11,12,13,14,15,16,17)` — aman secara FK, langsung memperbaiki gejala duplikasi di PDF. **TIDAK mengubah struktur data Kebijakan** (12 Kebijakan itu tetap ada, hanya jadi tidak "terhubung" ke Program manapun secara eksplisit lewat `kebijakan_id` — status "orphan" dari sisi Program, meski `resolveSasaranIdFromProgram()` di kode saat ini pun sebetulnya sudah tidak butuh baris Program per-Kebijakan itu untuk resolusi Sasaran, karena resolusi jalan lewat Kebijakan→Strategi→Sasaran, bukan lewat Program) |
| Solusi struktural (akar masalah) | Skema baru: tabel pivot many-to-many `renstra_kebijakan` ↔ `renstra_program` (bisa mencontoh pola `program_arah_kebijakan` tapi untuk pasangan tabel yang benar), lalu migrasi 12 Kebijakan di atas untuk menunjuk Program kanonik lewat pivot tsb, baru setelah itu 12 baris stub dihapus. **Ini perubahan skema, bukan sekadar hapus data** — perlu perencanaan terpisah (dampak ke `resolveSasaranIdFromProgram()` dan kode lain yang masih mengandalkan `kebijakan_id` scalar), di luar scope Fase 14 |

**Tidak ada eksekusi apapun untuk Poin 3 di Fase 14 ini** — baik solusi cepat maupun struktural, keduanya menunggu keputusan eksplisit sebelum dijalankan, sesuai instruksi.

---

## Ringkasan status akhir

| Poin | Status Fase 14 | Verifikasi |
|---|---|---|
| 1. Nama OPD | ✅ Dieksekusi | 0 "Dinas Ketahanan Pangan", 43× "Dinas Pangan", 4× "Kepala Dinas Pangan" |
| 2a. Cleanup data Misi | ❌ Dibatalkan — FK `tujuan.misi_id` CASCADE ke seluruh 24 id, `tujuan` ikut terduplikasi | Investigasi FK selesai, tidak ada DELETE dijalankan |
| 2b. Dedup kode Misi | ✅ Dieksekusi (query + render) | 6 Misi, masing-masing tercetak 1× |
| 3. Investigasi stub Program | 🔍 Investigasi selesai, TIDAK dieksekusi | Aman FK, tapi 12 Kebijakan sumbernya valid — solusi struktural perlu keputusan terpisah |
| 4. JSDoc known-gap Evaluasi | ✅ Dieksekusi (dokumentasi saja) | Tidak ada perubahan behavior |
| 5. Label kartu ringkasan | ✅ Dieksekusi | "27 Indikator Kinerja (Sasaran-Kegiatan)" + "+8 IKU/IKK", kartu Tercapai/Perlu Perhatian tidak berubah |
| 6. Efisiensi 0%/0% | ✅ Dieksekusi (Opsi A + badge + narasi) | 1 baris pindah ke "Belum Dilaksanakan", 15 baris lain (10 Efisien+3 Kurang Efisien+2 Tidak Dapat Dihitung) tidak berubah |

**Tidak ada perubahan data di database manapun di Fase 14 ini** — seluruh eksekusi murni perubahan kode di 2 file (`lakipGeneratorController.js`, `lakipAnalisaService.js`), diverifikasi lewat generate ulang data & HTML (bukan lewat PDF/DOCX fisik — verifikasi dilakukan langsung terhadap output `buildHtml()`/`collectLakipData()` yang menjadi sumber tunggal untuk kedua format export sesuai arsitektur modul ini).
