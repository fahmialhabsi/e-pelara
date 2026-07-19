import { isParent } from './rekeningHierarchy';

export function isVisibleRow(rows, row) {
  if (!row.parent_kode) return true;

  let parent = row.parent_kode;

  while (parent) {
    const p = rows.find((r) => r.kode_rekening === parent);

    if (p) {
      if (p.expanded === false) {
        return false;
      }

      parent = p.parent_kode;
    } else {
      break;
    }
  }

  return true;
}
