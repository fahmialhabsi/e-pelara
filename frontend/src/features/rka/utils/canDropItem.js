export default function canDropItem(dragItem, dropItem) {
  if (!dragItem || !dropItem) return false;

  // Tidak boleh drop ke dirinya sendiri
  if (dragItem === dropItem) return false;

  // Yang boleh dipindahkan hanya ITEM
  if (dragItem.is_group) return false;
  if (dragItem.level_rekening !== 'ITEM') return false;

  // Target hanya boleh group rekening
  return dropItem.is_group === true;
}
