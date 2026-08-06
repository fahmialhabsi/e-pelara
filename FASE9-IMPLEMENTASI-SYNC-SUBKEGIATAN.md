# Fase 9 — Implementasi Cabang Sync Level Sub Kegiatan (rencana Fase 8)

**Status:** Implementasi selesai, **diverifikasi dengan data uji nyata untuk KEDUA cabang** (Sub Kegiatan baru + Kegiatan re-test), data uji sudah dihapus, database dikonfirmasi kembali ke kondisi semula.

---

## 1. Perubahan kode

**File:** `backend/services/lakipRealisasiAnggaranSyncService.js` (satu-satunya file yang diubah). +161/-26 baris (sebagian besar kenaikan ada di JSDoc yang diperluas, lihat §5).

### Struktur baru (baris 92-217, fungsi `syncRealisasiAnggaranLakipTahun`)

Per baris `lakip`, sekarang dicoba 2 cabang berurutan, saling eksklusif:

```js
const irKegiatan = byNamaKegiatan.get(key);                       // baris 143
const irSubKegiatan = irKegiatan ? null : byNamaSubKegiatan.get(key);

if (!irKegiatan && !irSubKegiatan) { skipped++; continue; }
// ... resolve tahunMulai & offset (dipakai kedua cabang, tidak diduplikasi) ...

if (irKegiatan) {                                                  // baris 180
  // CABANG 1 (Fase 7, TIDAK DIUBAH satu baris kode pun):
  // RenstraTabelSubkegiatan.findAll({ where: { kegiatan_id: irKegiatan.ref_id } })
  // → SUM pagu_tahun_N / realisasi_tahun_N lintas semua Sub Kegiatan.
} else {                                                            // baris 197
  // CABANG 2 (BARU, Fase 9):
  // RenstraTabelSubkegiatan.findOne({ where: { indikator_id: irSubKegiatan.id } })
  // → ambil LANGSUNG pagu_tahun_N / realisasi_tahun_N dari 1 baris, TANPA SUM.
}
```

**Poin penting sesuai instruksi:**
- Cabang 1 (level Kegiatan) **isi logikanya sama persis** dengan Fase 7 — cuma dipindah ke dalam blok `if`, tidak ada 1 baris pun logika SUM/pengambilan data yang berubah.
- Cabang 2 (level Sub Kegiatan) pakai **`indikator_id`** untuk join — **BUKAN** `sub_kegiatan_id` maupun `subkegiatan_id` (2 kolom mirip nama yang ternyata artinya beda total, sesuai peringatan Fase 8 §2: `subkegiatan_id` di `renstra_tabel_subkegiatan` merujuk ke kolom LAIN di `RenstraSubkegiatan`, bukan `RenstraSubkegiatan.id`).
- Cabang 2 hanya dicoba **kalau cabang 1 tidak ketemu** (`irSubKegiatan = irKegiatan ? null : ...`) — mustahil 1 baris `lakip` masuk kedua cabang sekaligus.
- Cache indikator dipecah 2 (`indikatorCacheKegiatanByRenstraId`, `indikatorCacheSubKegiatanByRenstraId`) — masing-masing tetap 1 query per `renstra_id` (bukan per baris `lakip`), pola caching sama seperti Fase 7.

---

## 2. Verifikasi #1 — cabang baru (level Sub Kegiatan)

**Baris uji:** `lakip.id = 14` — *"Jumlah Dokumen Perencanaan Perangkat Daerah"*, cocok ke `IndikatorRenstra.id = 251` (stage `'sub_kegiatan'`, dari Fase 6/7).

**Data uji dimasukkan** (1 baris, sesuai rencana Fase 8, kode `FASE8-TEST-1`):
```js
{
  program_id: 5, kegiatan_id: 8, sub_kegiatan_id: 4, subkegiatan_id: 6,
  indikator_id: 251,   // <- kunci join cabang 2
  kode_subkegiatan: "FASE8-TEST-1",
  pagu_tahun_1: 750000.00, realisasi_tahun_1: 250000.00,
}
```

**Sebelum sync:** `lakip.id=14` → `0.00 / 0.00 / null`.

**Sesudah sync:**
```json
{ "id": 14, "pagu_anggaran": "750000.00", "realisasi_anggaran": "250000.00", "realisasi_anggaran_synced_at": "2026-08-03T00:53:32.000Z" }
```
**Tepat Rp 750.000 / Rp 250.000 — sama persis dengan data uji, langsung 1:1 tanpa SUM (cuma 1 baris `renstra_tabel_subkegiatan`, tidak ada penjumlahan yang mungkin salah).** Traceable ke `kode_subkegiatan FASE8-TEST-1`.

---

## 3. Verifikasi #2 — re-test cabang lama (level Kegiatan, Fase 7) — WAJIB, tanpa regresi

**Baris uji dipilih Kegiatan BERBEDA** dari verifikasi #1 (`kegiatan_id=10`, "Administrasi Keuangan", `lakip.id=96`) — sengaja dipisah supaya kedua verifikasi tidak saling mempengaruhi/membingungkan hasil.

**Data uji** (2 baris, kode `FASE7-RETEST-1`/`FASE7-RETEST-2`, angka **identik dengan skenario Fase 7 asli** supaya hasilnya bisa dibandingkan langsung):
```js
[
  { kegiatan_id: 10, kode_subkegiatan: "FASE7-RETEST-1", pagu_tahun_1: 1000000.00, realisasi_tahun_1: 400000.00 },
  { kegiatan_id: 10, kode_subkegiatan: "FASE7-RETEST-2", pagu_tahun_1: 500000.00,  realisasi_tahun_1: 100000.00 },
]
```

**Sebelum sync:** `lakip.id=96` → `0.00 / 0.00 / null`.

**Sesudah sync (dijalankan BERSAMAAN dengan data uji verifikasi #1 di atas — 1x panggilan sync, membuktikan kedua cabang tidak saling ganggu):**
```json
{ "id": 96, "pagu_anggaran": "1500000.00", "realisasi_anggaran": "500000.00", "realisasi_anggaran_synced_at": "..." }
```
**Rp 1.500.000 / Rp 500.000 = SUM Rp 1.000.000+Rp 500.000 / Rp 400.000+Rp 100.000 — angka identik dengan hasil verifikasi Fase 7 asli.** Konfirmasi: cabang level Kegiatan **berperilaku sama persis seperti sebelum Fase 9**, tidak ada regresi.

### Temuan tambahan (bukan bug, konfirmasi konsistensi lintas-cabang)

Sync yang sama juga meng-update `lakip.id=95` (level Kegiatan untuk `kegiatan_id=8` — Kegiatan YANG SAMA dipakai data uji verifikasi #1) jadi `750.000/250.000` — **ini BENAR, bukan efek samping tak terduga**: karena data uji `FASE8-TEST-1` (cabang 2) kebetulan disetel dengan `kegiatan_id=8` (realistis — Sub Kegiatan itu memang anak dari Kegiatan tsb), cabang 1 (SUM per Kegiatan) otomatis ikut menghitungnya untuk `lakip.id=95`. Ini justru **bukti bagus** kedua cabang konsisten satu sama lain (total di level Kegiatan = jumlah Sub Kegiatan-nya, sesuai definisi), bukan tanda ada yang salah. Baris ini ikut dibersihkan di §4.

**Regression check tambahan** — baris lain yang tidak boleh berubah, dicek tetap `0.00/0.00/null`: `lakip.id 15, 16` (Kegiatan sama dengan id=14 tapi indikator berbeda, tidak ikut data uji), `lakip.id 97, 98, 99` (Kegiatan lain, tanpa data uji). Semua **konfirmasi tidak berubah**.

**Ringkasan hasil sync gabungan:** `{ "updated": 3, "skipped": 94, "total": 97 }` — 3 baris ter-update (`14`, `95`, `96`), semuanya bisa dijelaskan & ditelusuri, tidak ada satupun yang tidak terduga.

---

## 4. Pembersihan data uji

```js
await RenstraTabelSubkegiatan.destroy({
  where: { kode_subkegiatan: ["FASE8-TEST-1", "FASE7-RETEST-1", "FASE7-RETEST-2"] },
});
await Lakip.update(
  { pagu_anggaran: 0, realisasi_anggaran: 0, realisasi_anggaran_synced_at: null },
  { where: { id: [14, 95, 96] } },
);
```
Ketiga baris `lakip` yang kena efek samping (termasuk `id=95` yang ter-update secara tidak langsung, §3) **semuanya direset manual**, bukan cuma yang jadi target utama verifikasi.

**Dikonfirmasi ulang setelah cleanup:**
```json
renstra_tabel_subkegiatan total rows: 0
lakip.id 14/95/96: semua "0.00" / "0.00" / null
lakip rows tahun 2025 dengan realisasi_anggaran_synced_at terisi: 0
```
Database persis kembali ke kondisi sebelum verifikasi Fase 9 — tidak ada jejak data uji tersisa.

---

## 5. Update JSDoc "KNOWN ISSUE"

Komentar JSDoc di kepala file ditulis ulang total supaya menjelaskan **kedua cabang** (bukan cuma cabang Kegiatan seperti versi Fase 7), termasuk:
- Peringatan eksplisit soal kolom `sub_kegiatan_id` vs `subkegiatan_id` yang mirip tapi beda arti (supaya developer berikutnya tidak terjebak seperti yang hampir terjadi di investigasi Fase 8).
- Riwayat ringkas Fase 7 → Fase 8 → Fase 9.
- Baris **"STATUS DATA"** diperbarui sesuai instruksi: *"kode sync SEKARANG SUDAH BENAR untuk SELURUH 97 baris lakip tahun 2025 (16 level Kegiatan + 80 level Sub Kegiatan, diverifikasi masing-masing dengan data uji), tapi `renstra_tabel_subkegiatan` untuk Renstra OPD aktif MASIH KOSONG ... tugas operasional terpisah, di luar scope perbaikan kode."*
- Blok "KNOWN ISSUE" (kolom ini tetap bukan sumber render dokumen resmi) **dipertahankan tanpa perubahan substansi** — itu keputusan produk dari Fase 4/4b yang tidak berubah oleh perbaikan bug Fase 7-9.

---

## 6. File yang diubah

- `backend/services/lakipRealisasiAnggaranSyncService.js` — satu-satunya file kode yang diubah.

Tidak ada perubahan di file lain, tidak ada migrasi baru, tidak ada perubahan skema. Seluruh data uji (3 baris `renstra_tabel_subkegiatan`, efek samping di 3 baris `lakip`) sudah dihapus/direset dan dikonfirmasi ulang — dikonfirmasi di §4.
