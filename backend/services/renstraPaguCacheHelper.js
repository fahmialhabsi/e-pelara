// backend/services/renstraPaguCacheHelper.js
const { Op } = require("sequelize");
const { RenstraPaguCache } = require("../models");

const PAGU_FIELDS = [
  "pagu_tahun_1",
  "pagu_tahun_2",
  "pagu_tahun_3",
  "pagu_tahun_4",
  "pagu_tahun_5",
  "pagu_tahun_6",
];

const emptyPagu = () => ({
  pagu_tahun_1: 0,
  pagu_tahun_2: 0,
  pagu_tahun_3: 0,
  pagu_tahun_4: 0,
  pagu_tahun_5: 0,
  pagu_tahun_6: 0,
  pagu_akhir_renstra: 0,
});

const applyPaguFromCache = (item, cache = null) => {
  const json = item?.toJSON ? item.toJSON() : { ...item };

  if (cache) {
    for (const field of PAGU_FIELDS) {
      json[field] = Number(cache?.[field] || 0);
    }

    json.pagu_akhir_renstra = Number(cache?.pagu_akhir_renstra || 0);
  } else {
    for (const field of PAGU_FIELDS) {
      json[field] = Number(json?.[field] || 0);
    }

    json.pagu_akhir_renstra = Number(json?.pagu_akhir_renstra || 0);
  }

  json.pagu_readonly = true;

  return json;
};

const attachCacheToRows = async ({
  rows,
  stage,
  renstraIdField = "renstra_id",
  refIdField,
  transaction,
}) => {
  const plainRows = rows.map((r) => (r?.toJSON ? r.toJSON() : r));

  const refIds = plainRows
    .map((r) => r[refIdField])
    .filter((v) => v !== null && v !== undefined);

  const renstraIds = plainRows
    .map((r) => r[renstraIdField])
    .filter((v) => v !== null && v !== undefined);

  if (!refIds.length) {
    return plainRows.map((r) => applyPaguFromCache(r, null));
  }

  const caches = await RenstraPaguCache.findAll({
    where: {
      stage,
      ref_id: { [Op.in]: refIds },
      ...(renstraIds.length ? { renstra_id: { [Op.in]: renstraIds } } : {}),
    },
    transaction,
  });

  const cacheMap = new Map(
    caches.map((c) => [`${c.renstra_id}-${c.ref_id}`, c])
  );

  return plainRows.map((row) => {
    const cache = cacheMap.get(`${row[renstraIdField]}-${row[refIdField]}`);
    return applyPaguFromCache(row, cache);
  });
};

module.exports = {
  PAGU_FIELDS,
  emptyPagu,
  applyPaguFromCache,
  attachCacheToRows,
};