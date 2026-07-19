export function calculateHierarchyTotal(rows = []) {
  const itemRows = rows.filter((r) => !r.is_group);

  return rows.map((row) => {
    if (!row.is_group) return row;

    const total = itemRows
      .filter((item) => item.kode_rekening.startsWith(row.kode_rekening + '.'))
      .reduce((sum, item) => sum + Number(item.jumlah || 0), 0);

    return {
      ...row,
      jumlah: total,
    };
  });
}
