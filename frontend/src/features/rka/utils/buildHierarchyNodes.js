import { getLevelKode, getParentKode } from './rekeningHierarchy';

export function buildHierarchyNodes(rekening) {
  const nodes = [];

  let kode = rekening.kode_rekening;

  while (kode) {
    nodes.unshift({
      id_temp: `group-${kode}`,

      kode_rekening: kode,

      nama_rekening: rekening.uraian,

      uraian: rekening.uraian,

      level_rekening: getLevelKode(kode),

      parent_kode: getParentKode(kode),

      expanded: true,

      is_group: true,
    });

    kode = getParentKode(kode);
  }

  return nodes;
}
