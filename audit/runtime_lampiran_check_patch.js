// Patch: ganti logika placeholderCount agar hanya hitung field BLOCKING
// Field blocking = yang wajib diisi sebelum laporan final
const BLOCKING_FIELDS = ['hasil_monitoring', 'realisasi_mitigasi', 'kendala', 'tindak_lanjut'];

const placeholderCount = [...efektivitas, ...monitoring].filter((r) =>
  BLOCKING_FIELDS.some((f) => {
    const val = r[f];
    return !val || val === 'belum tersedia' || val === 'belum diisi' || val === '-';
  })
).length;
