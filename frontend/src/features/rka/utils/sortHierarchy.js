export function sortHierarchy(rows = []) {
  return [...rows].sort((a, b) => {
    const ka = (a.kode_rekening || '').split('.');
    const kb = (b.kode_rekening || '').split('.');

    const len = Math.max(ka.length, kb.length);

    for (let i = 0; i < len; i++) {
      const na = Number(ka[i] || 0);
      const nb = Number(kb[i] || 0);

      if (na !== nb) return na - nb;
    }

    // Parent selalu di atas child ITEM
    if (a.is_group && !b.is_group) return -1;
    if (!a.is_group && b.is_group) return 1;

    return 0;
  });
}
