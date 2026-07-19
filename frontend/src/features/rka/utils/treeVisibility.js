export function buildVisibleRows(rows = []) {
  const visible = [];

  const expandedMap = {};

  rows.forEach((r) => {
    expandedMap[r.kode_rekening] = r.expanded !== false;
  });

  rows.forEach((row) => {
    let tampil = true;

    let parent = row.parent_kode;

    while (parent) {
      if (expandedMap[parent] === false) {
        tampil = false;
        break;
      }

      const idx = parent.lastIndexOf('.');

      parent = idx > 0 ? parent.substring(0, idx) : null;
    }

    if (tampil) visible.push(row);
  });

  return visible;
}
