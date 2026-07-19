export function calculateHierarchyCount(rows = []) {
  return rows.map((row) => {
    if (!row.is_group) {
      return row;
    }

    const totalItem = rows.filter(
      (x) => !x.is_group && x.kode_rekening.startsWith(row.kode_rekening + '.'),
    ).length;

    return {
      ...row,
      total_item: totalItem,
    };
  });
}
