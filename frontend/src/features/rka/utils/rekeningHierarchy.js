export function getLevelKode(kode) {
  if (!kode) return 'UNKNOWN';

  const jumlah = kode.split('.').length;

  switch (jumlah) {
    case 1:
      return 'AKUN';

    case 2:
      return 'KELOMPOK';

    case 3:
      return 'JENIS';

    case 4:
      return 'OBJEK';

    case 5:
      return 'RINCIAN';

    case 6:
      return 'SUB_RINCIAN';

    default:
      return 'ITEM';
  }
}

export function indentLevel(level) {
  switch (level) {
    case 'AKUN':
      return 0;

    case 'KELOMPOK':
      return 12;

    case 'JENIS':
      return 24;

    case 'OBJEK':
      return 36;

    case 'RINCIAN':
      return 48;

    case 'SUB_RINCIAN':
      return 60;

    case 'ITEM':
      return 78;

    default:
      return 60;
  }
}

export function getParentKode(kode) {
  if (!kode) return null;

  const arr = kode.split('.');

  if (arr.length <= 1) return null;

  arr.pop();

  return arr.join('.');
}

export function isParent(childKode, parentKode) {
  if (!childKode || !parentKode) return false;

  return childKode.startsWith(parentKode + '.');
}

export function isVisible(item, rows) {
  let parent = item.parent_kode;

  while (parent) {
    const p = rows.find((r) => r.kode_rekening === parent);

    if (!p) break;

    if (!p.expanded) {
      return false;
    }

    parent = p.parent_kode;
  }

  return true;
}
