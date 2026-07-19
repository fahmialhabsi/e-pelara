import { getParentKode, getLevelKode } from './rekeningHierarchy';

export function buildHierarchy(rows = []) {
  const hasil = [];
  const inserted = new Set();

  rows.forEach((row) => {
    const kode = row.kode_rekening;

    if (!kode) return;

    // Abaikan node hierarchy yang bukan rekening item asli
    const parts = kode.split('.');

    if (parts.length < 6) return;

    // hanya parent, jangan buat node untuk ITEM
    for (let i = 1; i < parts.length; i++) {
      const kodeNode = parts.slice(0, i).join('.');

      if (!inserted.has(kodeNode)) {
        hasil.push({
          id_temp: `group-${kodeNode}`,
          kode_rekening: kodeNode,
          nama_rekening: kodeNode,
          uraian: kodeNode,

          level_rekening: getLevelKode(kodeNode),

          parent_kode: getParentKode(kodeNode),

          is_group: true,

          expanded: true,
        });

        inserted.add(kodeNode);
      }
    }

    hasil.push({
      ...row,

      id_temp: row.id || row.id_temp || `item-${kode}`,

      parent_kode: getParentKode(kode),

      level_rekening: 'ITEM',

      is_group: false,

      expanded: row.expanded !== false,
    });
  });

  console.table(
    hasil.map((r) => ({
      kode: r.kode_rekening,
      group: r.is_group,
      level: r.level_rekening,
      uraian: r.uraian,
      nama: r.nama_rekening,
      id: r.id,
      id_temp: r.id_temp,
    })),
  );

  return hasil;
}
