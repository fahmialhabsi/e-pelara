# Kontrak internal: Restore versi dokumen perencanaan

**Status:** karakteristik sistem (bukan bug tersembunyi).  
**Lingkup:** hardening audit & versioning periode berjalan.

## Pernyataan operasional (untuk dokumentasi Dinas)

**Restore version saat ini memulihkan field material pada baris dokumen utama, dan tidak melakukan rollback child rows / relasi turunan secara penuh.**

Endpoint restore (`POST /api/planning/versions/:versionId/restore`) dengan sengaja:

1. Membaca snapshot dari tabel `planning_document_versions`.
2. Menerapkan **hanya kolom yang terdaftar** di `planningAuditMaterialFields.js` (`resolveMaterialKeys`) ke **satu baris** model dokumen induk (mis. `renja_dokumen`, `rkpd_dokumen`, `Renja`, `Dpa`, dll.).
3. Menulis audit `RESTORE_VERSION`, menaikkan versi dokumen (`versi` / `version` sesuai model), dan mencatat versi global baru.
4. Mengembalikan **`restore_meta`** di body respons (dan ringkasan di UI) agar tester/UAT memahami cakupan tanpa membuka kode.

Baris anak (mis. `renja_item`, `rkpd_item`, mapping RKPD–Renja, dll.) **tidak** dihapus, dibuat ulang, atau diselaraskan otomatis oleh operasi restore ini.

## Anti-regresi kode

Lokal atau CI:

```bash
cd backend
npm run verify:planning-audit-snapshots
```

- **GitHub Actions:** `.github/workflows/planning-audit-verify.yml` (jalan otomatis pada push/PR bila file terkait berubah).
- **GitLab / Azure DevOps / lain:** salin langkah yang sama (`working-directory: backend`, lalu `node scripts/verifyPlanningAuditSnapshots.js`) ke job pipeline Anda.

## Kapan perlu fitur di luar kontrak ini

Jika kebijakan bisnis memerlukan **rollback graph penuh**, itu adalah pekerjaan terpisah (desain snapshot anak, urutan delete/insert, konsistensi domain, dan volume data).
