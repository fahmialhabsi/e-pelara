export default function reorderItem(rows = [], fromIndex, toIndex) {
  const result = [...rows];

  const [moved] = result.splice(fromIndex, 1);

  result.splice(toIndex, 0, moved);

  return result;
}
