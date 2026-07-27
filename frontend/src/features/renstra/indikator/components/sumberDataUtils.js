export const SUMBER_DATA_TABEL_DEFAULT_COLUMNS = [
  'Indikator',
  'Sumber Data Utama',
  'Keterangan/Instansi Terkait',
  'Periode Data',
];

export const emptySumberDataTabel = () => ({
  columns: [...SUMBER_DATA_TABEL_DEFAULT_COLUMNS],
  rows: [],
});

const buildTabelSummaryText = (tabel) => {
  const columns = tabel?.columns || [];
  const rows = tabel?.rows || [];
  let no = 0;
  return rows
    .map((row) => {
      if (row?._type === 'group') {
        return row._label && row._label.trim() ? row._label.trim() : null;
      }
      const parts = columns
        .map((col) => (row?.[col] ? `${col}: ${row[col]}` : null))
        .filter(Boolean);
      if (!parts.length) return null;
      no += 1;
      return `${no}. ${parts.join(' — ')}`;
    })
    .filter(Boolean)
    .join('\n');
};

/**
 * Menghasilkan teks polos dari sumber_data (mode teks/tabel) + referensi,
 * dipakai untuk mengisi kolom sumber_data (TEXT) agar tetap kompatibel
 * dengan tampilan daftar/cetak yang lama (yang hanya membaca sumber_data).
 */
export const buildSumberDataText = ({ sumber_data_mode, sumber_data, sumber_data_tabel, referensi }) => {
  const mode = sumber_data_mode || 'teks';
  let base =
    mode === 'tabel' ? buildTabelSummaryText(sumber_data_tabel) : (sumber_data || '').trim();

  const refs = (referensi || []).filter((r) => r && r.trim());
  if (refs.length) {
    const refsText = refs.map((r, i) => `[${i + 1}] ${r}`).join('\n');
    base = base ? `${base}\n\nReferensi:\n${refsText}` : `Referensi:\n${refsText}`;
  }
  return base;
};
