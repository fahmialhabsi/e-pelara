# Fase 8 — Investigasi 80 Baris `lakip` Level Sub Kegiatan (Sisa dari Fase 7)

**Sifat:** Investigasi murni. **Tidak ada kode/data yang diubah.**
**Kesimpulan singkat (detail §3-4):** Dibutuhkan **cabang kedua** yang terpisah di `lakipRealisasiAnggaranSyncService.js`, BUKAN generalisasi 1 pola tunggal untuk kedua grain — level Kegiatan (Fase 7) butuh **SUM lintas banyak Sub Kegiatan** via `kegiatan_id`, level Sub Kegiatan (Fase 8 ini) butuh **pencocokan langsung 1:1** via `indikator_id`. Kedua cabang independen (nama indikator di 2 stage tidak pernah tumpang tindih — dibuktikan ulang, lihat §3), jadi menambah cabang kedua **tidak berisiko meregresi** perbaikan Fase 7. Perubahan kode BELUM dikerjakan di fase ini (sesuai instruksi) — laporan ini rencana + temuan untuk fase berikutnya.

---

## 1. Asal data 80 baris — tidak bisa dipastikan 100%, tapi tidak menghalangi analisis struktural

Dibaca ulang `lakipBridgeService.js` penuh (sudah dibaca sebagian di Fase 6/7). Fungsi `bridgeIndikatorRenstraKeLakip()` MEMANG mencocokkan ke `IndikatorRenstra` stage `'sub_kegiatan'` (baris 42) — cocok secara KONSEP dengan grain 80 baris ini. **Tapi** fungsi ini menyetel `jenis_dokumen: 'RENJA'` (baris 82) pada tiap baris `lakip` yang dibuat/di-update — sedangkan **ke-97 baris `lakip` tahun 2025 di database sekarang semuanya bertanda `jenis_dokumen = 'LAKIP'`** (dicek ulang, tanpa kecuali), termasuk 80 baris level Sub Kegiatan ini. Jadi **`lakipBridgeService.js`, dengan kode yang ADA SEKARANG, bukan penjelasan langsung** untuk 80 baris ini — kalaupun fungsi ini yang pernah dipakai, `jenis_dokumen`-nya seharusnya `'RENJA'`, bukan `'LAKIP'`.

Ditelusuri kemungkinan lain:
- `generateLakipDariRenstraTahun` (dipakai tombol live "Sinkron BAB II dari Renstra"): riwayat git-nya cuma **1 commit** (`15e6c1ef`, judul *"feat(lakip): auto-generate BAB II dari Renstra (grain Kegiatan)"*) — sejak awal ditulis SUDAH grain Kegiatan (stage `'kegiatan'`), tidak ada versi lama yang stage-nya beda untuk dibandingkan.
- `lakipController.js` fungsi `create` (CRUD generik, baris 109-119) — bisa jadi jalur manual/API call satu-per-satu, tapi tidak ada bukti langsung 80 baris dibuat lewat sini (tidak ada log/audit trail yang cukup).
- Tidak ditemukan seed script khusus LAKIP di `backend/scripts/`, tidak ada `INSERT INTO lakip` mentah di kode manapun.

**Kesimpulan Q1 bagian asal-usul: tidak bisa dipastikan definitif dari sisi kode saat ini** (kandidat paling masuk akal: sisa dari versi kode `generateLakipDariRenstraTahun` yang lebih lama, sebelum commit `15e6c1ef` yang sekarang jadi satu-satunya riwayat git — kemungkinan pernah ada iterasi lain yang tidak tercatat/ter-squash di git, konsisten dengan pola "iterasi cepat" khas repo ini). **Ini tidak menghalangi jawaban Q1 bagian skema** di bawah, yang jadi fokus utama untuk merancang fix.

### Skema: TIDAK ADA kolom penanda level/grain eksplisit

Dicek `SHOW COLUMNS FROM lakip`:
```
id, tahun, periode_id, program, kegiatan, indikator_kinerja, target, realisasi,
evaluasi, rekomendasi, jenis_dokumen, renstra_id, rkpd_id, renja_id, lk_dispang_id,
created_at, updated_at, approval_status, pagu_anggaran, realisasi_anggaran,
realisasi_anggaran_synced_at, needs_recall, recall_reason, last_recall_at
```
**Tidak ada** kolom `level`/`grain`/`stage`, dan **tidak ada** kolom FK `kegiatan_id`/`sub_kegiatan_id` sama sekali — `program`/`kegiatan`/`indikator_kinerja` semuanya teks bebas. Satu-satunya FK yang ada (`renstra_id`, `rkpd_id`, `renja_id`, `lk_dispang_id`) tidak satupun menunjuk ke Kegiatan/Sub Kegiatan secara langsung.

**Jawaban Q1: level HARUS disimpulkan** dari hasil pencocokan teks `indikator_kinerja` terhadap `IndikatorRenstra.nama_indikator` per `stage` (`'kegiatan'` vs `'sub_kegiatan'`) — persis pola yang dipakai Fase 7, tidak ada jalan pintas dari skema `lakip` itu sendiri.

---

## 2. Kecocokan ke `renstra_tabel_subkegiatan` — LANGSUNG 1:1, tapi kolom join-nya perlu hati-hati (ada 2 kolom mirip)

Untuk baris level Sub Kegiatan, `IndikatorRenstra` stage `'sub_kegiatan'` punya 2 nilai identitas yang relevan per baris (`ir`):
- `ir.id` — PK `indikator_renstra` itu sendiri.
- `ir.ref_id` — merujuk ke `RenstraSubkegiatan.id` (master referensi Sub Kegiatan; dikonfirmasi dari `renjaIndicatorMappingService.js` baris 165: `x.stage === "sub_kegiatan" && Number(x.ref_id) === Number(item.source_renstra_subkegiatan_id)`).

Dan `renstra_tabel_subkegiatan` (yang mau diambil datanya) punya kolom yang **membingungkan karena mirip nama tapi arti beda** (dicek langsung dari `renstra_tabelSubKegiatanController.js` baris 416-419, bukan diasumsikan):
| Kolom di `renstra_tabel_subkegiatan` | Wajib? | Isinya sebenarnya |
|---|---|---|
| `indikator_id` | opsional di model, **wajib divalidasi controller** ("Harus ID indikator_renstra stage sub_kegiatan") | = `IndikatorRenstra.id` — dipilih user lewat dropdown indikator di form |
| `sub_kegiatan_id` | opsional di model, **wajib divalidasi controller** ("Harus ID RenstraSubkegiatan") | = `RenstraSubkegiatan.id` (master OPD-spesifik) |
| `subkegiatan_id` | **wajib (NOT NULL) di model** | = `RenstraSubkegiatan.sub_kegiatan_id` — kolom LAIN di tabel master `renstra_subkegiatan` (kemungkinan referensi ke katalog nasional Sub Kegiatan, BUKAN `RenstraSubkegiatan.id`) — **JANGAN dipakai untuk cocokkan ke `ir.ref_id`**, beda arti meski namanya mirip |

**Jadi ada 2 kolom join yang sama-sama valid secara struktur** untuk mencapai relasi 1:1 langsung (tanpa SUM):
- **Opsi A (direkomendasikan): `indikator_id`** — cocokkan `RenstraTabelSubkegiatan.indikator_id = ir.id` (match langsung PK-ke-PK, tidak perlu percaya interpretasi `ref_id` di tabel lain). Ini **persis pola yang dipakai kode SEBELUM Fase 7** (`RenstraTabelSubkegiatan.findOne({ where: { indikator_id: ir.id } })`) — **secara struktural sebenarnya SUDAH BENAR untuk grain Sub Kegiatan**, cuma waktu itu diterapkan ke SEMUA baris `lakip` (termasuk yang level Kegiatan, di situ salah) dan lagipula tabel `renstra_tabel_subkegiatan`-nya kosong total (Fase 4) sehingga tidak kelihatan bedanya sama sekali.
- **Opsi B: `sub_kegiatan_id`** — cocokkan `RenstraTabelSubkegiatan.sub_kegiatan_id = ir.ref_id`. Valid juga, tapi butuh percaya 1 lapis interpretasi tambahan (`ref_id` di `indikator_renstra` benar-benar = `RenstraSubkegiatan.id`, dikonfirmasi cuma dari 1 file lain yang tidak berhubungan langsung dengan modul LAKIP).

**Jawaban Q2: YA, relasinya seharusnya LANGSUNG 1:1** (`findOne`, bukan `findAll`+SUM seperti Fase 7) — sesuai dugaan di pertanyaan Anda. Kolom FK yang dipakai: **`indikator_id`** (Opsi A, lebih aman/langsung).

**Catatan risiko kecil (berlaku utk Opsi A maupun B, dan sebenarnya JUGA berlaku diam-diam di pola Fase 7 yang sudah jalan)**: tidak ada `UNIQUE` constraint di level DB untuk `indikator_id` maupun `sub_kegiatan_id` di `renstra_tabel_subkegiatan` (dicek migrasi, tidak ada). Tabel ini punya kolom `versi`+`status_revisi` (`draft/verifikasi/approved/ditolak`) — **secara teori bisa ada lebih dari 1 baris** untuk `indikator_id` yang sama (draft lama + versi approved terbaru, misalnya). `findOne()` tanpa filter tambahan akan mengambil baris pertama yang ketemu (urutan tidak dijamin) — bisa saja bukan yang `approved`. **Preseden Fase 7 (`syncKegiatanRealisasi` di `renstraRealisasiAnggaranSyncService.js`) JUGA tidak memfilter `status_revisi`** (jadi ini bukan celah baru yang diperkenalkan Fase 7/8, tapi kelemahan yang sudah ada di pola aslinya) — dicatat di sini sebagai pertimbangan desain untuk Fase berikutnya, BUKAN blocker investigasi ini.

---

## 3. Logika sync yang dibutuhkan — DUA CABANG terpisah, bukan 1 pola seragam

**Tidak ada pola tunggal yang menangani keduanya secara alami**, karena levelnya beda kardinalitas: 1 Kegiatan → BANYAK Sub Kegiatan (perlu SUM), sedangkan 1 baris `lakip` level Sub Kegiatan → TEPAT 1 baris `renstra_tabel_subkegiatan` (langsung, tanpa SUM). Memaksakan 1 pola (mis. selalu SUM, atau selalu `findOne`) akan salah untuk salah satu grain.

**Rancangan 2-cabang** (belum diimplementasi, untuk fase berikutnya):
```js
// Cabang 1 (SUDAH ADA, Fase 7) — coba level Kegiatan dulu
const irKegiatan = byNamaKegiatan.get(key);      // Map stage='kegiatan'
if (irKegiatan?.ref_id) {
  const subs = await RenstraTabelSubkegiatan.findAll({ where: { kegiatan_id: irKegiatan.ref_id } });
  if (subs.length) {
    // SUM pagu_tahun_N / realisasi_tahun_N lintas subs — logika Fase 7, TIDAK DIUBAH
  }
}
// Cabang 2 (BARU, Fase 8) — kalau tidak ketemu di level Kegiatan, coba level Sub Kegiatan
else {
  const irSubKegiatan = byNamaSubKegiatan.get(key);   // Map stage='sub_kegiatan'
  if (irSubKegiatan) {
    const sub = await RenstraTabelSubkegiatan.findOne({ where: { indikator_id: irSubKegiatan.id } });
    if (sub) {
      // Ambil LANGSUNG pagu_tahun_N / realisasi_tahun_N dari 1 baris ini, tanpa SUM
    }
  }
}
```
Karena SET nama indikator di stage `'kegiatan'` dan stage `'sub_kegiatan'` **tidak pernah tumpang tindih** (dibuktikan ulang di §4 di bawah, konsisten dengan Fase 6/7), urutan "coba Kegiatan dulu, baru Sub Kegiatan" AMAN — tidak ada baris `lakip` yang bisa match ke keduanya sekaligus, jadi tidak ada ambiguitas soal mana yang "menang".

---

## 4. Risiko regresi terhadap Fase 7 — dicek, TIDAK ADA

Diverifikasi ulang (bukan asumsi) bahwa dasar pemisahan 2 cabang ini valid:
```sql
SELECT COUNT(*) FROM indikator_renstra a
  INNER JOIN indikator_renstra b ON a.nama_indikator = b.nama_indikator
  WHERE a.renstra_id=1 AND a.stage='kegiatan' AND b.renstra_id=1 AND b.stage='sub_kegiatan';
-- hasil: 0 (sama seperti temuan Fase 6/7, dicek ulang tetap konsisten)
```
Karena cabang 1 (Fase 7) dan cabang 2 (Fase 8, rencana) dipisahkan oleh `if/else` berdasarkan hasil pencocokan nama yang **saling eksklusif**, menambahkan cabang 2:
- **Tidak mengubah satu baris kode pun** di jalur cabang 1 (logika SUM Fase 7 tetap persis sama).
- **Tidak bisa "mencuri" baris yang sebelumnya sudah match di cabang 1** — kalau `key` ketemu di `byNamaKegiatan`, cabang 2 tidak pernah dieksekusi untuk baris itu (else-branch).
- 16 baris yang sudah diverifikasi Fase 7 (via data uji, sudah dihapus) akan tetap diproses lewat cabang 1, hasilnya identik dengan sebelumnya.

**Jawaban Q4: risiko regresi terhadap Fase 7 = tidak ada**, selama implementasi benar-benar berbentuk "coba cabang 1 dulu, cabang 2 cuma fallback kalau cabang 1 tidak match" (bukan diproses independen/duplikat untuk baris yang sama).

---

## 5. Rencana implementasi & verifikasi (untuk fase berikutnya, BELUM dikerjakan)

**Perubahan kode yang dibutuhkan** (di `lakipRealisasiAnggaranSyncService.js`, fungsi `syncRealisasiAnggaranLakipTahun`):
1. Tambah cache kedua `indikatorCacheSubKegiatanByRenstraId` (paralel dengan `indikatorCacheByRenstraId` milik Fase 7, isi dari `IndikatorRenstra` stage `'sub_kegiatan'`).
2. Tambah cabang `else` (§3) — kalau tidak match di stage `'kegiatan'`, coba stage `'sub_kegiatan'`, ambil `RenstraTabelSubkegiatan.findOne({ where: { indikator_id } })`, isi `pagu_anggaran`/`realisasi_anggaran` langsung dari `pagu_tahun_N`/`realisasi_tahun_N` baris itu (tanpa SUM) — pola yang sama seperti kode SEBELUM Fase 7, cuma sekarang cuma dieksekusi utk baris yang MEMANG level Sub Kegiatan, bukan untuk semua baris.
3. Update ringkasan hasil (`updated`/`skipped`) supaya tetap akurat menghitung kedua cabang.
4. Update JSDoc "KNOWN ISSUE"/"Fase 7 fix" jadi mencakup cabang baru (pola yang sama seperti update dokumentasi Fase 7).

**Rencana verifikasi** (pola sama seperti Fase 7, §4 laporan itu):
1. Pilih 1 baris `lakip` yang match ke stage `'sub_kegiatan'` (mis. `lakip.id=14`, indikator *"Jumlah Dokumen Perencanaan Perangkat Daerah"*, `IndikatorRenstra.id` untuk itu = 251 per Fase 6/7).
2. Masukkan **1 baris** data uji ke `renstra_tabel_subkegiatan` dengan `indikator_id=251`, `kegiatan_id`+`program_id`+`subkegiatan_id` valid, `kode_subkegiatan` ditandai jelas (mis. `FASE8-TEST-1`), `pagu_tahun_1`/`realisasi_tahun_1` = angka bulat gampang dicek (mis. Rp 750.000 / Rp 250.000).
3. Jalankan sync, buktikan `lakip.id=14` ter-update **tepat** Rp 750.000/Rp 250.000 (langsung dari 1 baris, TANPA SUM — beda dari pola Fase 7 yang menjumlahkan).
4. **Regression check**: pastikan baris yang SUDAH divalidasi Fase 7 (mis. Kegiatan id=8 punya 2 Sub Kegiatan berbeda) tidak terpengaruh — bisa sekalian tes campuran (1 data uji Kegiatan + 1 data uji Sub Kegiatan berbeda dalam 1 kali jalan sync, buktikan keduanya benar & saling tidak mengganggu).
5. Hapus data uji + reset kolom `lakip` yang kena efek samping, persis pola Fase 7 §5.

Effort estimasi: **kecil** (perubahan lokal di 1 fungsi, pola sudah 2x terbukti baik di Fase 7 maupun preseden `renstraRealisasiAnggaranSyncService.js`) — tapi tetap perlu verifikasi data uji sebelum dianggap selesai, konsisten dengan standar semua Fase sebelumnya.

---

## File yang dibaca (investigasi murni, tidak ada yang diubah)

- `backend/services/lakipBridgeService.js`, `backend/services/lakipAutoGenerateService.js`, `backend/services/lakipRealisasiAnggaranSyncService.js` (state pasca-Fase 7)
- `backend/controllers/lakipController.js`, `backend/controllers/renstra_tabelSubKegiatanController.js`
- `backend/services/renjaIndicatorMappingService.js` (referensi makna `ref_id` untuk stage `sub_kegiatan`)
- `backend/migrations/20250905094909-create-renstra-tabel-subkegiatan.js` (cek constraint unique — tidak ada)
- `git log --follow` untuk `lakipAutoGenerateService.js`
- Query read-only ke `lakip`, `indikator_renstra`, `renstra_tabel_subkegiatan`, `renstra_subkegiatan` (tidak ada `INSERT`/`UPDATE`, dikonfirmasi `renstra_tabel_subkegiatan` tetap 0 baris di akhir investigasi — sama seperti kondisi akhir Fase 7)
