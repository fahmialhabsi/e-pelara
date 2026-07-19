export default function canDragItem(item) {
  if (!item) return false;

  // Hanya ITEM yang boleh dipindahkan
  return !item.is_group && item.level_rekening === 'ITEM';
}
