import { calculateHierarchyTotal } from './calculateHierarchyTotal';
import { calculateHierarchyCount } from './calculateHierarchyCount';
import { sortHierarchy } from './sortHierarchy';

export default function refreshHierarchy(rows = []) {
  console.log('A. refreshHierarchy masuk :', rows.length);

  const total = calculateHierarchyTotal(rows);
  console.log('B. setelah total :', total.length);

  const count = calculateHierarchyCount(total);
  console.log('C. setelah count :', count.length);

  const sorted = sortHierarchy(count);
  console.log('D. setelah sort :', sorted.length);

  console.table(
    sorted.map((r) => ({
      kode: r.kode_rekening,
      group: r.is_group,
      level: r.level_rekening,
      uraian: r.uraian,
    })),
  );

  return sorted;
}
