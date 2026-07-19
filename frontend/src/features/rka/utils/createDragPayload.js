export default function createDragPayload(item) {
  if (!item) return null;

  return {
    item,
    id_temp: item.id_temp,
    kode_rekening: item.kode_rekening,
    level_rekening: item.level_rekening,
    is_group: item.is_group,
  };
}
