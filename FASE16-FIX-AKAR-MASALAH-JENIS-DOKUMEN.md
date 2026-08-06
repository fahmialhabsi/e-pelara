# Fase 16 — Fix Akar Masalah: Filter `jenis_dokumen` di Query Misi LAKIP

**Status:** Dieksekusi dan diverifikasi. Menggantikan dedup Fase 14 Poin 2b sebagai solusi UTAMA — dedup lama dipertahankan sebagai lapis pertahanan sekunder (bukan dihapus, sesuai instruksi).

**File yang diubah:** `backend/controllers/lakipGeneratorController.js` (2 titik: query Misi + komentar `misiHtml`).

---

## A. Fix akar masalah

### 1-2. Identifikasi query & filter yang benar

**Hanya `misi` yang bermasalah** — `lakipGeneratorController.js` **tidak pernah** query tabel legacy `tujuan` sama sekali (dicek ulang lewat grep menyeluruh, semua referensi "tujuan" di file ini mengarah ke `renstra_tujuan`, tabel Renstra-OPD level yang terpisah). Hierarki Tujuan di LAKIP (Bab III A) berasal dari:
```sql
SELECT id, misi_id, no_tujuan, isi_tujuan FROM renstra_tujuan WHERE renstra_id = :renstraId ORDER BY id ASC
```
— sudah dikonfirmasi BERSIH di Fase 15A (2 baris, 2 distinct, scoped `renstra_id`, tidak punya kolom `jenis_dokumen` sama sekali sehingga tidak kena masalah clone-per-modul). **Bagian A.4 permintaan ("terapkan hal sama untuk Tujuan") karena itu tidak berlaku** — tidak ada query Tujuan di LAKIP yang perlu diperbaiki. Ini dicatat eksplisit supaya tidak ada asumsi keliru bahwa perbaikan Misi otomatis "harus" ada pasangannya di Tujuan.

Query Misi lama (`lakipGeneratorController.js`, hasil Fase 14):
```sql
SELECT MIN(id) AS id, no_misi, isi_misi FROM misi GROUP BY no_misi, isi_misi ORDER BY no_misi ASC
```
Tidak ada `WHERE jenis_dokumen`, sehingga menggabungkan 4 salinan sah (`rpjmd`/`rkpd`/`rka`/`renja`) dari `autoCloneMisiIfNeeded()` (Fase 15A) menjadi 1 himpunan.

### 2. Nilai filter yang benar — referensi silang 2 sumber

**Cek konstanta `jenis_dokumen` LAKIP sendiri:**
```sql
SELECT DISTINCT jenis_dokumen, COUNT(*) FROM lakip GROUP BY jenis_dokumen;
-- {"jenis_dokumen":"renja","c":6}, {"jenis_dokumen":"LAKIP","c":97}
```
Tidak ada baris `misi` dengan `jenis_dokumen='LAKIP'` (LAKIP tidak pernah punya salinan Misi sendiri lewat mekanisme clone) — jadi filter tidak bisa sekadar "samakan dengan `lakip.jenis_dokumen`".

**Cek pola referensi `renstraGenerateController.js`** (diminta sebagai pembanding "sudah punya proteksi"): untuk Misi, file itu **tidak filter by string `jenis_dokumen`** — dia resolve lewat rantai FK: `misiIds = tujuans.map(t => t.misi_id)` lalu `Misi.findAll({ where: { id: misiIds } })`, di mana `tujuans` adalah `renstra_tujuan` (Renstra-OPD level). Dicek nilai nyatanya untuk `renstra_id=1`:
```
renstra_tujuan.misi_id → [2, 3]
Misi id 2 & 3 → jenis_dokumen='rpjmd' (keduanya)
```
Ini mengonfirmasi **`renstra_tujuan.misi_id` HANYA PERNAH ditautkan ke baris `misi` berjenis `'rpjmd'`** (sumber kanonik), tidak pernah ke salinan rkpd/rka/renja — memperkuat bahwa `'rpjmd'` memang nilai yang benar secara semantik untuk "Misi resmi daerah".

**Catatan penting:** pola `renstraGenerateController.js` (resolve via FK `renstra_tujuan.misi_id`) **TIDAK cocok dipakai langsung untuk blok Visi/Misi Ringkasan Eksekutif LAKIP** — pola itu hanya mengembalikan misi_id yang *dipakai* OPD tsb (di data ini cuma 2 dari 6 Misi, karena Renstra Dinas Pangan cuma cascading dari Misi 2 dan 3), padahal blok Visi/Misi LAKIP memang dimaksudkan menampilkan **seluruh 6 Misi resmi daerah** (bukan cuma yang relevan ke 1 OPD). Karena itu solusi yang dipakai adalah **filter langsung `jenis_dokumen='rpjmd'`** (Opsi A), bukan meniru pola FK Opsi B — namun `renstraGenerateController.js` tetap berguna sebagai bukti independen bahwa `'rpjmd'` adalah nilai `jenis_dokumen` yang benar untuk sumber kanonik.

### Perubahan kode

```sql
-- SEBELUM (Fase 14):
SELECT MIN(id) AS id, no_misi, isi_misi FROM misi
GROUP BY no_misi, isi_misi ORDER BY no_misi ASC

-- SESUDAH (Fase 16):
SELECT MIN(id) AS id, no_misi, isi_misi FROM misi
WHERE jenis_dokumen = 'rpjmd' AND tahun = :tahun   -- klausa tahun kondisional, cuma aktif kalau param tahun diisi
GROUP BY no_misi, isi_misi ORDER BY no_misi ASC
```
Klausa `tahun` ditambahkan berjaga-jaga untuk skenario yang diminta diverifikasi (lihat §Verifikasi) — supaya kalau kelak ada >1 periode RPJMD (`periode_rpjmds` di DB ini sudah terdaftar 2 periode: 2020-2024 dan 2025-2029, meski baris `misi` yang ada baru untuk tahun 2025), query tidak menggabungkan Misi dari periode RPJMD yang beda tahun.

### 3. Evaluasi: apakah dedup render (Fase 14 Poin 2b) masih diperlukan?

**Direkomendasikan: DIPERTAHANKAN sebagai lapis pertahanan sekunder, bukan solusi utama lagi.** Dengan filter `jenis_dokumen='rpjmd'` saja, query sudah mengembalikan tepat 6 baris bersih (dikonfirmasi §Verifikasi) — `GROUP BY no_misi,isi_misi` di level query dan dedup `Map` di `misiHtml` (`buildHtml()`) sudah TIDAK berpengaruh terhadap hasil untuk data saat ini (keduanya jadi no-op karena input yang masuk sudah bersih). Tapi:
- Biayanya nyaris nol (satu `GROUP BY` tambahan di query kecil, satu `Map` di JS untuk array 6 elemen).
- Tetap berguna sebagai jaring pengaman kalau baris `jenis_dokumen='rpjmd'` itu SENDIRI suatu saat kemasukan duplikat karena sebab lain (mis. re-import RPJMD baru tanpa guard unique, insiden yang sama sekali independen dari mekanisme clone-per-modul).

**Keduanya TIDAK dihapus** — komentar di kode diperbarui (bukan dihapus) untuk menjelaskan perubahan peran ini: dari "solusi utama" (Fase 14) menjadi "lapis pertahanan kedua" (Fase 16), dengan riwayat singkat supaya developer berikutnya paham kenapa ada 2 lapis dedup yang sekilas tampak redundan.

### 4. Tujuan — tidak berlaku (lihat §1)

---

## Verifikasi

### Before vs after (query langsung)

**Query PALING LAMA** (sebelum Fase 14, `ORDER BY no_misi ASC LIMIT 10`, tanpa filter apapun) — simulasi ulang untuk bukti:
```
no_misi=1: jenis_dokumen rpjmd, rka, rkpd, renja (4 baris tercampur)
no_misi=2: jenis_dokumen rpjmd, renja, rkpd, rka (4 baris tercampur)
no_misi=3: jenis_dokumen rpjmd, rka, ... (baru sampai sini, LIMIT 10 sudah habis)
```
Persis gejala PDF asli: Misi 1-3 berulang, Misi 4-6 hilang.

**Query Fase 14** (`GROUP BY` tanpa filter jenis_dokumen) — sudah menghasilkan 6 baris bersih SECARA KEBETULAN (karena isi antar jenis_dokumen identik saat ini), tapi tanpa dasar semantik yang benar.

**Query Fase 16** (filter `jenis_dokumen='rpjmd' AND tahun=:tahun`):
```
Jumlah baris: 6 → no_misi: [1, 2, 3, 4, 5, 6]
```

### Generate ulang dokumen lengkap (`tahun=2025`, OPD "Dinas Pangan") — regresi Fase 14 & 15B dicek ulang

```
=== Nama OPD (Fase 14 Poin 1) ===
Kemunculan "Dinas Ketahanan Pangan": 0 | "Dinas Pangan": 43 | "Kepala Dinas Pangan": 4

=== Misi (Fase 14/16 Poin 2) ===
Total baris <li>Misi N: ...</li>: 6 (harus 6)
Distribusi: Misi 1-6 masing-masing tepat 1×

=== KPI cards (Fase 14 Poin 5) ===
Label kartu utama: "27 Indikator Kinerja (Sasaran-Kegiatan)"
Kartu kecil: "+8 IKU/IKK"

=== Status Efisiensi (Fase 14 Poin 6) ===
"Belum Dilaksanakan": 1× (Kegiatan target)

=== Program (Fase 15B) ===
Total blok "Program: ...": 5 (bukan 17) — 5 nama match persis dgn Program asli
Total blok "Kegiatan: ...": 16 (tidak berubah)
```
Semua perbaikan Fase 14 dan 15B **tidak ada regresi** — fix Fase 16 murni menggantikan MEKANISME di balik hasil Misi yang sudah benar sejak Fase 14 (hasil akhirnya sama: 6 Misi unik), bukan mengubah perilaku yang terlihat pengguna.

### Cek OPD/tahun lain (permintaan eksplisit) — keterbatasan

```sql
SELECT id, nama_opd, is_aktif FROM renstra_opd;  -- hanya 1 baris: {"id":1,"nama_opd":"Dinas Pangan","is_aktif":1}
SELECT DISTINCT tahun, rpjmd_id, jenis_dokumen FROM misi;  -- hanya tahun='2025' untuk SEMUA jenis_dokumen
```
**Database saat ini cuma punya 1 OPD (Dinas Pangan) dan 1 tahun (2025)** — tidak ada OPD/tahun lain untuk cross-check empiris skenario "LAKIP tahun 2025 tertukar ambil Misi dari RKPD tahun 2025" secara langsung. Namun risiko itu **dicegah secara struktural** oleh filter `jenis_dokumen='rpjmd'` itu sendiri — berapapun banyaknya baris `misi` bertipe `rkpd`/`rka`/`renja` untuk tahun manapun, filter ini tidak akan pernah mengambilnya, terlepas dari ada-tidaknya data uji untuk memverifikasi secara empiris. Klausa `tahun` tambahan juga sudah disiapkan berjaga-jaga untuk skenario multi-periode RPJMD (`periode_rpjmds` sudah terdaftar 2 periode) meski belum bisa diuji empiris karena baru ada 1 periode berisi data `misi` saat ini.

---

## B. Konsumen lain berisiko (dari Fase 15A) — dicatat, TIDAK diperbaiki

Sesuai instruksi, di luar scope audit LAKIP. Detail lengkap: `FASE15A-INVESTIGASI-CAKUPAN-DUPLIKASI.md` §4.

- **`monitoringController.getMonitoring()`** (`GET /api/monitoring`, live & routed di `server.js:500`) — query `Misi.findAll({ include: [...] })` **TANPA `where` sama sekali**, berpotensi menampilkan seluruh 24 baris Misi (4 jenis_dokumen tercampur) beserta cabang Tujuan→Sasaran→Program→Kegiatan masing-masing — gejala visual berpotensi sama dengan yang dulu ditemukan di LAKIP.
- **`laporanRpjmdController.getLaporanRpjmd()`** (`GET /api/laporan/...`, live & routed di `server.js:487`) — filter `where: { rpjmd_id: rpjmd.id }` saja, TIDAK cukup karena semua 4 jenis_dokumen berbagi `rpjmd_id` yang sama.

**Rekomendasi untuk tim (bukan tindakan sekarang):** kedua controller ini butuh perbaikan serupa — tambahkan `jenis_dokumen='rpjmd'` (atau filter yang sesuai konteks masing-masing endpoint, perlu didiskusikan apakah "Monitoring" dan "Laporan RPJMD" secara produk memang seharusnya selalu merujuk data kanonik RPJMD, atau ada skenario sah di mana endpoint itu perlu menampilkan data per-modul tertentu — perlu klarifikasi produk sebelum asal tempel filter yang sama). Tidak disentuh di Fase 16 ini.

---

## Ringkasan

| | Sebelum Fase 16 | Sesudah Fase 16 |
|---|---|---|
| Query Misi | `GROUP BY` tanpa filter jenis_dokumen (hasil benar secara kebetulan) | `WHERE jenis_dokumen='rpjmd' AND tahun=:tahun` + `GROUP BY` (hasil benar secara semantik) |
| Dedup render `misiHtml` | Solusi utama | Lapis pertahanan sekunder (dipertahankan) |
| Query Tujuan LAKIP | — | Tidak berlaku, LAKIP tidak query tabel `tujuan` legacy |
| Konsumen lain berisiko | Belum terdokumentasi jelas | Didokumentasikan (§B), belum diperbaiki |

Tidak ada perubahan data di database — seluruh perubahan Fase 16 murni di kode `lakipGeneratorController.js`.
