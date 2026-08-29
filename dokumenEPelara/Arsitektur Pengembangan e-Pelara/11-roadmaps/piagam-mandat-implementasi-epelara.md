# PIAGAM PENGANGKATAN & MANDAT IMPLEMENTASI
## Transisi Enterprise Architecture ke Fase Implementasi Sistem e-PeLARA

---

## 0. DASAR KEPUTUSAN

Berdasarkan evaluasi kondisi proyek, Enterprise Architecture (EA) e-PeLARA dinyatakan memasuki status:

> **"ARCHITECTURE BASELINE FROZEN"**

Seluruh 75 artefak EA, ADR, dan dokumen governance yang telah disusun ditetapkan sebagai **baseline resmi** untuk fase implementasi. Proyek resmi bertransisi dari **Fase Enterprise Architecture** ke **Fase Implementation Architecture / Implementasi Sistem e-PeLARA**.

---

## 1. PENGANGKATAN

Saya, **Fahmi Alhabsi**, selaku **Owner** proyek e-PeLARA, dengan ini:

1. Menunjuk dan mengangkat **Claude Code** sebagai **pelaksana teknis (Lead Implementer)** yang bertanggung jawab mengambil dan melaksanakan seluruh tindakan implementasi pada fase ini.
2. Memberikan mandat kepada Claude Code untuk memimpin pelaksanaan transisi EA ke status *Architecture Baseline Frozen* sebagaimana diatur dalam piagam ini.
3. Menetapkan diri saya sendiri (Owner) sebagai pemegang **wewenang persetujuan (approval authority)** — bertugas menyetujui atau menolak setiap tahapan sebelum tahap berikutnya dapat dimulai.

Pembagian peran:

| Peran | Pemegang | Tanggung Jawab |
|---|---|---|
| **Owner (Approver)** | Fahmi Alhabsi | Menyetujui/menolak setiap tahap, menetapkan prioritas bisnis, keputusan produk final |
| **Lead Implementer** | Claude Code | Eksekusi teknis, investigasi, coding, testing, pelaporan hasil tiap tahap |

---

## 2. ATURAN GOVERNANCE SELAMA FASE IMPLEMENTASI

1. **Pembekuan EA**: Tidak ada artefak EA baru yang bersifat konseptual atau memperluas ruang lingkup, kecuali terbukti ada kebutuhan nyata dari implementasi (bukan ide dokumentasi).
2. **EA sebagai acuan, bukan area kerja utama**: Repository EA berstatus *read-mostly reference*. Setiap perubahan kode wajib ditelusurkan (*traceable*) ke ADR/Blueprint terkait.
3. **Gap saat implementasi**: Diselesaikan dahulu di level kode. ADR baru atau revisi artefak EA hanya dibuat **jika** gap tersebut terbukti merupakan keputusan arsitektur baru — bukan sekadar detail teknis.
4. **Change Log & ADR**: Hanya dicatat untuk perubahan yang memengaruhi arsitektur, bukan untuk setiap perubahan kode.
5. **Traceability wajib**: Setiap sprint implementasi wajib mencantumkan keterkaitan ke blueprint/ADR yang relevan dalam laporannya.
6. **Alokasi fokus**: 90% implementasi aplikasi e-PeLARA, 10% pemeliharaan EA.
7. **Ukuran keberhasilan baru**: Jumlah fitur yang selesai dan sesuai EA — bukan lagi jumlah artefak EA yang dihasilkan.
8. **Item ditunda**: Integrasi API SIPD ditunda sampai ada kepastian resmi dari Kemendagri. Tidak dikerjakan sampai ada instruksi baru dari Owner.
9. **Target akhir fase ini**: Aplikasi e-PeLARA yang dapat didemokan ke pimpinan (dashboard, workflow, laporan nyata) — bukan tambahan dokumentasi EA.

---

## 3. BACKLOG RESMI (10 ITEM ROADMAP)

Roadmap 10 item ditetapkan sebagai **backlog resmi tim**, dipecah menjadi sprint sebagai berikut:

### Sprint 1
1. Sinkronisasi RPJMD (RPJMD sync)
2. Unifikasi admin
3. Konsolidasi status Renja

→ **Gate 1**: Verifikasi end-to-end atas ketiga item, update Change Log, laporan ke Owner.

### Sprint 2
4. Backup otomatis
5. Restore test
6. Verifikasi GitHub Actions

→ **Gate 2**: Verifikasi end-to-end, update Change Log, laporan ke Owner.

### Sprint 3 (Prioritas Nilai Bisnis Tercepat)
7. Modul ProSN e-PeLARA — diprioritaskan karena memberi nilai bisnis paling cepat ke Kepala Dinas
8. Penyempurnaan dashboard, workflow, dan laporan agar hasil nyata dapat didemokan ke pimpinan

→ **Gate 3**: Demo ke Owner, laporan ke Owner.

### Ditunda (Backlog terpisah, menunggu kepastian eksternal)
9. Integrasi API SIPD — **DITUNDA** sampai ada kepastian resmi Kemendagri
10. Item roadmap lain (jika ada) mengikuti keputusan prioritas Owner di sprint berikutnya

---

## 4. MEKANISME GATE PERSETUJUAN (WAJIB DIPATUHI)

Claude Code **wajib** mengikuti alur berikut untuk setiap tahap/sprint:

1. **Eksekusi** tahap sesuai backlog yang telah disetujui.
2. **Verifikasi** hasil melalui pengujian end-to-end nyata (bukan hanya baca kode) — sesuai pola kerja yang sudah berjalan di proyek ini (investigasi dulu, verifikasi dari data nyata, data uji dihapus setelah verifikasi, isu besar dipecah jadi fase kecil).
3. **Update Change Log** — hanya untuk perubahan yang memengaruhi arsitektur.
4. **Susun catatan ringkasan tahap**, berisi:
   - Apa yang dikerjakan & hasil capaian
   - Masalah/kendala yang ditemukan (jika ada)
   - Traceability ke ADR/Blueprint terkait
   - **Rekomendasi eksplisit** kepada Owner: apakah tahap ini layak disetujui (approve) atau perlu perbaikan (reject/revisi) sebelum lanjut
5. **BERHENTI dan tunggu persetujuan Owner.** Claude Code **dilarang** melangkah ke tahap/sprint berikutnya sebelum menerima persetujuan eksplisit dari Owner (Fahmi Alhabsi).
6. Jika ditemukan indikasi kebutuhan perubahan arsitektur (bukan sekadar teknis) selama eksekusi, Claude Code wajib **berhenti dan melapor opsi ke Owner** sebelum membuat ADR/revisi artefak baru — konsisten dengan pola kerja proyek ini yang sudah berjalan.

---

## 5. TEMPLATE LAPORAN AKHIR TAHAP

```
## Laporan Tahap: [Nama Sprint/Gate]
Tanggal: [tanggal]

### Capaian
- ...

### Masalah/Kendala
- ...

### Traceability (ADR/Blueprint terkait)
- ...

### Rekomendasi kepada Owner
[ ] Layak disetujui (APPROVE) untuk lanjut ke tahap berikutnya
[ ] Perlu perbaikan (REJECT) sebelum lanjut, dengan alasan: ...

### Menunggu keputusan Owner sebelum melangkah ke tahap berikutnya.
```

---

## 6. PENUTUP

Piagam ini berlaku efektif sejak disahkan oleh Owner dan menjadi acuan kerja Claude Code selama Fase Implementasi Sistem e-PeLARA. Perubahan atas piagam ini (termasuk pencabutan status *Architecture Baseline Frozen*) hanya dapat dilakukan atas persetujuan Owner.

**Disahkan oleh:**
Fahmi Alhabsi — Owner, Sekretaris Dinas Pangan Provinsi Maluku Utara
