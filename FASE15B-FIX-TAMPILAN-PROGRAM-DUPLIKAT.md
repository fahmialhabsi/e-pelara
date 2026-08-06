# Fase 15B — Fix Tampilan Sementara: Suppress Blok Program Kosong Duplikat

**Status:** Dieksekusi dan diverifikasi. **Fix tampilan (render-only), BUKAN solusi akar masalah** — data `renstra_program` di database tidak diubah sama sekali. Akar masalah struktural (kolom `renstra_program.kebijakan_id` scalar tunggal) masih perlu diredesain terpisah — lihat `FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md` Poin 3 dan `FASE15A-INVESTIGASI-CAKUPAN-DUPLIKASI.md`.

**File yang diubah:** `backend/controllers/lakipGeneratorController.js` (satu fungsi baru + satu titik pemakaian).

---

## Perubahan kode

Fungsi baru `suppressProgramKosongDuplikat()` ditambahkan tepat sebelum `indikatorHierarkiHtml` (di dalam `buildHtml()`):

```js
const suppressProgramKosongDuplikat = (programList) => {
  const grup = new Map();
  (programList || []).forEach((p) => {
    const kunci = p.nama_program || '';
    if (!grup.has(kunci)) grup.set(kunci, []);
    grup.get(kunci).push(p);
  });
  const hasil = [];
  for (const rows of grup.values()) {
    if (rows.length === 1) {
      hasil.push(rows[0]);
      continue;
    }
    const berisi = rows.filter(
      (p) => (p.indikator?.length || 0) > 0 || (p.kegiatan?.length || 0) > 0,
    );
    hasil.push(...(berisi.length > 0 ? berisi : [rows[0]]));
  }
  return hasil;
};
```

Dipakai di titik render Program dalam Sasaran (menggantikan `s.program` polos):
```js
${suppressProgramKosongDuplikat(s.program)
  .map((p) => `...`)
  .join('')}
```

Disertai komentar JSDoc panjang di kode yang menjelaskan (1) ini fix tampilan sementara bukan solusi akar masalah, (2) akar masalah sebenarnya (`kebijakan_id` scalar), (3) data DB tidak diubah, (4) referensi ke `FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md` Poin 3 dan `FASE15A-INVESTIGASI-CAKUPAN-DUPLIKASI.md`.

### Logika aturan (sesuai spesifikasi)

Untuk tiap Sasaran, kelompokkan `s.program` berdasarkan `nama_program`:
- Grup dengan 1 baris → tampil apa adanya (tidak tersentuh logika ini).
- Grup dengan >1 baris nama sama:
  - Kalau **ada** baris yang punya indikator dan/atau Kegiatan → tampilkan **semua** baris yang punya data (hierarki asli utuh), baris yang benar-benar kosong dalam grup yang sama **disembunyikan**.
  - Kalau **semua** baris di grup kosong (0 indikator & 0 Kegiatan) → tampilkan cuma baris pertama sebagai representasi tunggal (bukan N blok kosong berulang).

Ini murni filter pada tahap `map()`/render — struktur `indikatorTree`/`s.program` sendiri (dan tentu saja tabel `renstra_program` di database) tidak dimodifikasi.

---

## Verifikasi (generate ulang, `tahun=2025`, OPD "Dinas Pangan")

### Before (baseline Fase 13/14, sebelum fix ini)
17 blok "Program: ..." tampil (5 asli + 12 duplikat kosong), masing-masing 12 duplikat diikuti "Belum ada indikator" dan tanpa blok Kegiatan sama sekali.

### After (setelah fix Fase 15B)
```
Total blok "Program: ..." tampil (harus 5, sebelumnya 17): 5
 - Program: PROGRAM PENGELOLAAN SUMBER DAYA EKONOMI UNTUK KEDAULATAN DAN KEMANDIRIAN PANGAN
 - Program: PROGRAM PENINGKATAN DIVERSIFIKASI DAN KETAHANAN PANGAN MASYARAKAT
 - Program: PROGRAM PENANGANAN KERAWANAN PANGAN
 - Program: PROGRAM PENGAWASAN KEAMANAN PANGAN
 - Program: PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH PROVINSI

Total blok "Kegiatan: ..." tampil (harus 16, tidak berubah): 16

Total "Belum ada indikator" di seluruh dokumen: 0

Semua 5 nama asli match persis dgn yg tampil (urutan bebas)? true
```

**Hasil:**
- 12 blok kosong duplikat **hilang dari tampilan** (17 → 5 blok Program).
- **Semua 5 Program asli (yang punya Kegiatan/indikator) tetap tampil, tidak ada satupun yang hilang** — nama-nama cocok 100% dengan 5 Program asli yang dikonfirmasi Fase 13/14.
- **16 blok Kegiatan tidak berubah sama sekali** (jumlah maupun isinya) — data Kegiatan di bawah tiap Program utuh, tidak ada yang ikut ke-suppress atau tergabung secara keliru.
- "Belum ada indikator" turun ke 0 kemunculan di seluruh dokumen — konsisten karena 12 kemunculan itu memang persis berasal dari 12 blok kosong yang sekarang disembunyikan, dan tidak ada tabel indikator lain di dokumen yang kosong untuk data OPD ini.

Fix ini juga tidak mengganggu perbaikan Fase 14 (Poin 1/2/5/6) — dijalankan ulang bersamaan dan hasilnya tetap konsisten (nama OPD, dedup Misi 6×, kartu ringkasan dinamis, status Efisiensi "Belum Dilaksanakan" untuk Kegiatan target).

---

## Catatan untuk tindak lanjut (bukan bagian eksekusi Fase 15B)

- Ini **hanya menyembunyikan gejala** di dokumen LAKIP. Data `renstra_program` (17 baris, 12 stub) tetap ada di database apa adanya.
- Solusi akar masalah (skema many-to-many Kebijakan↔Program) masih perlu perencanaan terpisah — lihat `FASE13-INVESTIGASI-TEMUAN-PRODUKSI.md` Poin 3 dan `FASE15A-INVESTIGASI-CAKUPAN-DUPLIKASI.md` §2-3.
- `renstraGenerateController.js` (dokumen Renstra T-C.27) sudah punya penanganan serupa lebih dulu (ditemukan di Fase 15A) — pendekatannya sedikit berbeda (menggabung Kegiatan dari semua baris kembar, bukan cuma suppress yang kosong). Kalau nanti solusi akar masalah dikerjakan, kedua modul (LAKIP dan Renstra generator) sebaiknya disatukan polanya.
- Fix ini **tidak menyentuh** temuan Fase 15A lainnya (clone Misi/Tujuan per jenis_dokumen, konsumen berisiko `monitoringController`/`laporanRpjmdController`) — di luar scope Fase 15B yang spesifik untuk Poin 3.
