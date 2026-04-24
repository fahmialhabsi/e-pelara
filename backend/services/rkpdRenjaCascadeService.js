"use strict";

const crypto = require("crypto");

const SYNC_FIELDS = [
  "program",
  "kegiatan",
  "sub_kegiatan",
  "indikator",
  "target",
  "pagu",
];

function strVal(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * Setelah baris RKPD diubah, sinkronkan nilai ke baris Renja yang ter-map.
 * Mencatat perubahan ke planning_line_item_change_log dengan source cascade_rkpd.
 */
async function cascadeRkpdItemToLinkedRenja(
  db,
  rkpdItemRow,
  { transaction, userId = null },
) {
  const { RenjaRkpdItemMap, RenjaItem, PlanningLineItemChangeLog, RkpdRenjaCascadeTrace } = db;

  const batchId = crypto.randomUUID();

  const maps = await RenjaRkpdItemMap.findAll({
    where: { rkpd_item_id: rkpdItemRow.id },
    transaction,
  });

  const out = { renja_items_updated: [], change_rows: 0 };

  for (const m of maps) {
    const ri = await RenjaItem.findByPk(m.renja_item_id, { transaction });
    if (!ri) continue;

    const before = ri.get({ plain: true });
    const patch = {};
    for (const f of SYNC_FIELDS) {
      if (rkpdItemRow[f] !== undefined) {
        patch[f] = rkpdItemRow[f];
      }
    }
    if (Object.keys(patch).length === 0) continue;

    await ri.update(patch, { transaction });

    let cascadeFieldChanges = 0;
    for (const f of SYNC_FIELDS) {
      if (patch[f] === undefined) continue;
      const oldV = strVal(before[f]);
      const newV = strVal(patch[f]);
      if (oldV === newV) continue;

      await PlanningLineItemChangeLog.create(
        {
          entity_type: "renja_item",
          entity_id: ri.id,
          field_key: f,
          old_value: oldV,
          new_value: newV,
          source: "cascade_rkpd",
          change_type: "cascade_rkpd",
          change_batch_id: batchId,
          user_id: userId,
        },
        { transaction },
      );
      out.change_rows += 1;
      cascadeFieldChanges += 1;
    }

    if (cascadeFieldChanges > 0) {
      await RkpdRenjaCascadeTrace.create(
        {
          rkpd_item_id: rkpdItemRow.id,
          renja_item_id: ri.id,
          change_batch_id: batchId,
          cascade_type: "field_sync",
        },
        { transaction },
      );
    }

    out.renja_items_updated.push(ri.id);
  }

  return { batchId, ...out };
}

/**
 * Catat perubahan field pada rkpd_item (sumber user / API).
 */
async function logRkpdItemFieldChanges(
  db,
  beforePlain,
  afterPlain,
  { userId, batchId, transaction },
) {
  const { PlanningLineItemChangeLog } = db;
  let n = 0;
  for (const f of SYNC_FIELDS) {
    if (afterPlain[f] === undefined) continue;
    const oldV = strVal(beforePlain[f]);
    const newV = strVal(afterPlain[f]);
    if (oldV === newV) continue;
    await PlanningLineItemChangeLog.create(
      {
        entity_type: "rkpd_item",
        entity_id: afterPlain.id,
        field_key: f,
        old_value: oldV,
        new_value: newV,
        source: "user",
        change_type: "manual",
        change_batch_id: batchId,
        user_id: userId,
      },
      { transaction },
    );
    n += 1;
  }
  return n;
}

module.exports = {
  cascadeRkpdItemToLinkedRenja,
  logRkpdItemFieldChanges,
  SYNC_FIELDS,
};
