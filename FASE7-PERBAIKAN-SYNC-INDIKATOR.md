# Fase 7 — Perbaikan Bug Pencocokan Indikator di `lakipRealisasiAnggaranSyncService.js`

**Status:** Bug diperbaiki & **diverifikasi dengan data uji nyata** (bukan cuma baca kode). Data uji sudah dihapus, database dikonfirmasi kembali ke kondisi semula.

---

## 1. Preseden yang dipelajari — `renstraRealisasiAnggaranSyncService.js`

Dibaca penuh (346 baris). Pola intinya, fungsi `syncKegiatanRealisasi({ kegiatan_id })` (baris 103-114):
```js
const kegiatan = await RenstraTabelKegiatan.findOne({ where: { kegiatan_id }, transaction });
const subs = await RenstraTabelSubkegiatan.findAll({ where: { kegiatan_id }, transaction });
const realisasi = sumRealisasi(subs);   // SUM semua Sub Kegiatan di bawah 1 Kegiatan
```
Kuncinya: **agregasi lewat FK `kegiatan_id` langsung** (1 Kegiatan bisa punya banyak Sub Kegiatan → dijumlahkan), bukan lewat pencocokan teks nama indikator di level Sub Kegiatan. Dikonfirmasi juga lewat `renstra_tabelSubKegiatanModel.js`: `RenstraTabelSubkegiatan.belongsTo(RenstraKegiatan, { foreignKey: 'kegiatan_id' })` — jadi `kegiatan_id` di situ FK langsung ke `RenstraKegiatan.id` (entitas Kegiatan yang "sesungguhnya", bukan tabel cascading-nya sendiri).

## 2. Perbaikan yang diterapkan

**File:** `backend/services/lakipRealisasiAnggaranSyncService.js` (satu-satunya file yang diubah).

| Sebelum | Sesudah |
|---|---|
| Cocokkan `lakip.indikator_kinerja` ke `IndikatorRenstra` **stage `'sub_kegiatan'`** | Cocokkan ke `IndikatorRenstra` **stage `'kegiatan'`** (baris 97) — sesuai grain asli `lakip.indikator_kinerja` (dikonfirmasi dari docstring `lakipAutoGenerateService.js`: *"Grain: 1 baris per Kegiatan, ref_id langsung = RenstraKegiatan.id"*) |
| `RenstraTabelSubkegiatan.findOne({ where: { indikator_id: ir.id } })` — cari **1 baris** by `indikator_id` (harus di-set manual di form, level Sub Kegiatan) | `RenstraTabelSubkegiatan.findAll({ where: { kegiatan_id: ir.ref_id } })` (baris 133-136) — ambil **SEMUA** Sub Kegiatan di bawah Kegiatan itu, pola sama persis dengan `syncKegiatanRealisasi()` di atas |
| Baca `pagu_tahun_N`/`realisasi_tahun_N` dari 1 baris | **SUM** `pagu_tahun_N`/`realisasi_tahun_N` lintas semua baris Sub Kegiatan (baris 139-142) |
| Include `RenstraOPD` on-the-fly per baris (query N+1) | `tahunMulaiCacheByRenstraId` — cache `tahun_mulai` per `renstra_id`, query sekali per Renstra bukan per baris `lakip` (perbaikan kecil tambahan, bukan bug fungsional, cuma efisiensi — jumlah query drastis berkurang untuk dataset besar) |

Fungsi/nama/signature/export **tidak berubah** (`syncRealisasiAnggaranLakipTahun(tahun)`, `resolveOffsetTahun`) — pemanggil existing (`lakipController.js`, `lakipRealisasiAnggaranController.js`) tidak perlu disentuh.

## 3. Temuan tambahan saat verifikasi — koreksi atas Fase 6

Sebelum menulis fix, dicek ulang **seberapa banyak dari 97 baris `lakip` (tahun 2025) yang benar-benar level Kegiatan** (asumsi Fase 6) vs level Sub Kegiatan:
```sql
-- match ke stage='kegiatan': 16 baris
-- match ke stage='sub_kegiatan': 80 baris
-- (total 97, 1 tidak match keduanya)
```
**Data aktual ternyata CAMPURAN**, bukan 100% level Kegiatan seperti asumsi Fase 6 (Fase 6 hanya membuktikan bahwa SET nama stage kegiatan & stage sub_kegiatan itu sendiri tidak overlap — bukan menentukan dari mana `lakip.indikator_kinerja` yang SEDANG ADA di database benar-benar berasal). Investigasi lanjutan menemukan 80 baris itu kemungkinan besar sisa dari batch/versi kode lain (`lakipBridgeService.js`, yang memang secara sengaja pakai stage `'sub_kegiatan'` untuk kasus Renja→LAKIP — beda alur dari `generateLakipDariRenstraTahun`/tombol "Sinkron BAB II dari Renstra" yang dipakai sepanjang Fase 1-6) — sama-sama menandai `jenis_dokumen='LAKIP'` dan tanggal `created_at` yang sama, jadi tidak bisa dibedakan lewat kolom itu, cuma lewat isi nama indikatornya.

**Scope perbaikan Fase 7 ini SESUAI PERSIS instruksi**: memperbaiki jalur level-Kegiatan (16/97 baris saat ini). **80 baris sisanya (level Sub Kegiatan) TIDAK tersentuh fix ini** — sebelum & sesudah fix, baris-baris itu tetap `skipped` (dibuktikan di §4, baris `id 14/15/16` tidak berubah). Ini **bukan regresi** (sebelum fix pun mereka gagal, akibat tabel `renstra_tabel_subkegiatan` kosong total sesuai temuan Fase 4) — tapi juga **bukan cakupan penuh 100% dari 97 baris**. Kalau suatu saat 80 baris level Sub Kegiatan itu juga ingin ditangani, perlu logika tambahan terpisah (cocokkan ke stage `'sub_kegiatan'`, `ref_id`-nya merujuk `RenstraSubkegiatan.id` bukan `RenstraKegiatan.id` — jalur berbeda, di luar apa yang diminta & diverifikasi di Fase 7 ini, dicatat di sini supaya tidak hilang sebagai catatan lanjutan kalau relevan).

---

## 4. Verifikasi dengan data uji nyata

**Baris uji dipilih:** `lakip.id = 95` — `indikator_kinerja` = *"Persentase Implementasi Perencanaan Dan Evaluasi Kinerja Perangkat Daerah"*, Kegiatan *"Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah"*, cocok ke `IndikatorRenstra` stage `'kegiatan'` dengan `ref_id = 8` (= `renstra_kegiatan.id`).

**Data uji dimasukkan** (2 baris, ditandai jelas `kode_subkegiatan = "FASE7-TEST-1"/"FASE7-TEST-2"`, `nama_subkegiatan = "FASE7 TEST DATA - HAPUS SETELAH VERIFIKASI"`, `kegiatan_id = 8`, `subkegiatan_id` merujuk Sub Kegiatan master asli id 4 & 5 di bawah Kegiatan itu):

| kode_subkegiatan | pagu_tahun_1 | realisasi_tahun_1 |
|---|---|---|
| FASE7-TEST-1 | Rp 1.000.000 | Rp 400.000 |
| FASE7-TEST-2 | Rp 500.000 | Rp 100.000 |
| **Total (harus muncul di `lakip.id=95`)** | **Rp 1.500.000** | **Rp 500.000** |

**Sebelum fix dijalankan:** `lakip.id=95` → `pagu_anggaran = 0.00`, `realisasi_anggaran = 0.00`, `realisasi_anggaran_synced_at = null`.

**Sync dijalankan** (`syncRealisasiAnggaranLakipTahun("2025")`):
```json
{ "tahun": "2025", "updated": 1, "skipped": 96, "total": 97 }
```
`updated: 1` — tepat 1 baris (persis baris uji, bukan lebih bukan kurang — membuktikan tidak ada Kegiatan lain yang ikut ke-update).

**Sesudah sync**, `lakip.id=95`:
```json
{
  "id": 95,
  "pagu_anggaran": "1500000.00",
  "realisasi_anggaran": "500000.00",
  "realisasi_anggaran_synced_at": "2026-08-03T00:09:47.000Z"
}
```
**Rp 1.500.000 dan Rp 500.000 — tepat sama dengan jumlah 2 baris uji, bisa ditelusuri langsung ke `kode_subkegiatan FASE7-TEST-1/2`.** Traceability terbukti: bukan angka kebetulan, sengaja dipilih angka bulat gampang dicek (1jt+500rb, 400rb+100rb) supaya tidak ambigu dengan data asli lain.

**Regression check** — dicek baris lain yang TIDAK seharusnya berubah:
- `lakip.id 14/15/16` (Kegiatan sama persis secara teks, tapi levelnya Sub Kegiatan — lihat §3): tetap `0.00/0.00/null`, tidak ikut ter-update. ✅ Tidak salah sasaran.
- `lakip.id 96/97` (Kegiatan lain, tidak ada data uji): tetap `0.00/0.00/null`. ✅ Tidak ada efek samping ke baris lain.

---

## 5. Pembersihan data uji

Dijalankan setelah verifikasi §4 selesai:
```js
await RenstraTabelSubkegiatan.destroy({ where: { kode_subkegiatan: ["FASE7-TEST-1", "FASE7-TEST-2"] } });
await Lakip.update(
  { pagu_anggaran: 0, realisasi_anggaran: 0, realisasi_anggaran_synced_at: null },
  { where: { id: 95 } },
);
```
Baris `lakip.id=95` juga sengaja **dikembalikan manual** ke `0.00/0.00/null` (bukan cuma menghapus baris `renstra_tabel_subkegiatan`-nya) — supaya efek samping sync terhadap data uji tidak tertinggal di tabel `lakip`, konsisten dengan instruksi "jangan tinggalkan data dummy di database".

**Dikonfirmasi ulang setelah cleanup:**
```json
renstra_tabel_subkegiatan total rows: 0
lakip.id=95: { "pagu_anggaran": "0.00", "realisasi_anggaran": "0.00", "realisasi_anggaran_synced_at": null }
lakip rows tahun 2025 dengan realisasi_anggaran_synced_at terisi: 0
```
Database persis kembali ke kondisi sebelum verifikasi — tidak ada jejak data uji tersisa.

---

## 6. Update JSDoc "KNOWN ISSUE" (Fase 4b → Fase 7)

Komentar JSDoc di kepala `lakipRealisasiAnggaranSyncService.js` diperbarui total (baris 3-59):
- Bagian penjelasan alur ditulis ulang mengikuti logika baru (level Kegiatan + SUM Sub Kegiatan).
- Ditambah blok **"Fase 7 fix"** — riwayat bug lama (stage salah, `findOne` bukan `findAll`+SUM) dan referensi ke laporan ini.
- Blok **"KNOWN ISSUE"** dari Fase 4b **dipertahankan** (kolom `lakip.pagu_anggaran`/`realisasi_anggaran` tetap bukan sumber render dokumen resmi — itu keputusan produk yang tidak berubah oleh perbaikan bug ini), tapi ditegaskan ulang bahwa itu murni soal *kode sudah benar, cuma datanya belum diisi* — bukan lagi *"struktural akan selalu gagal"*.
- Ditambah baris **"STATUS DATA"** baru sesuai instruksi Anda: *kode SUDAH DIPERBAIKI & TERBUKTI BENAR (Fase 7), tapi `renstra_tabel_subkegiatan` untuk Renstra OPD aktif MASIH KOSONG — pengisian 83 Sub Kegiatan × 6 tahun target+pagu adalah tugas operasional terpisah (lihat FASE6-INVESTIGASI-RENSTRA-SUBKEGIATAN.md §2, form-nya sudah ada & live), di luar scope perbaikan kode ini.*

---

## 7. File yang diubah

- `backend/services/lakipRealisasiAnggaranSyncService.js` — satu-satunya file kode yang diubah (logika pencocokan + JSDoc). +84/-19 baris.

Tidak ada perubahan di file lain, tidak ada migrasi baru, tidak ada perubahan skema. Data uji yang sempat dimasukkan ke `renstra_tabel_subkegiatan` (2 baris) dan efek sampingnya di `lakip.id=95` sudah dihapus/direset — dikonfirmasi ulang di §5.
