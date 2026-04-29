// backend/services/paguAggregatorService.js
const { Op, fn, col } = require("sequelize");
const { IndikatorSubKegiatan, SubKegiatan } = require("../models");

function normalizeKodeToIskPrefix(kode) {
  const raw = String(kode || "").trim();
  if (!raw) return "";

  if (raw.startsWith("ISK")) {
    return raw.replace(/-\d{2}$/, "");
  }

  if (raw.startsWith("IK")) return `ISK${raw.slice(2)}`;
  if (raw.startsWith("IP")) return `ISK${raw.slice(2)}`;
  if (raw.startsWith("AR")) return `ISK${raw.slice(2)}`;

  if (raw.startsWith("IST")) {
    return raw.replace(/^IST/, "ISK").replace(".1-01", ".1.1-01");
  }

  if (raw.startsWith("SST")) {
    return raw.replace(/^SST/, "ISK").replace(".1-01", ".1.1-01");
  }

  if (raw.startsWith("IS")) {
    const body = raw.slice(2);
    const parts = body.split("-");

    if (parts.length >= 4) {
      return `ISK${parts[0]}-${parts[1]}-${parts[2]}.1.1-${parts[3]}`;
    }

    return `ISK${body}`;
  }

  if (raw.startsWith("IT")) {
    const body = raw.slice(2);
    const parts = body.split("-");

    if (parts.length >= 2) {
      return `ISK${parts[0]}-${parts[1]}`;
    }

    return `ISK${body}`;
  }

  return raw;
}

function getRowKode(row) {
  return row.get?.("kode_indikator") ?? row.kode_indikator;
}

function setRowPagu(row, total) {
  if (typeof row.setDataValue === "function") {
    row.setDataValue("pagu", total);
    row.setDataValue("total_pagu_anggaran", total);
    row.setDataValue("total_pagu", total);
  } else {
    row.pagu = total;
    row.total_pagu_anggaran = total;
    row.total_pagu = total;
  }
}

async function attachPaguByIndikatorKode(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const prefixByKode = new Map();

  for (const row of rows) {
    const kode = getRowKode(row);
    const prefix = normalizeKodeToIskPrefix(kode);

    if (prefix) {
      prefixByKode.set(kode, prefix);
    }
  }

  const prefixes = [...new Set(prefixByKode.values())];

  if (prefixes.length === 0) {
    for (const row of rows) setRowPagu(row, 0);
    return rows;
  }

  const orLike = prefixes.map((prefix) => ({
    kode_indikator: {
      [Op.like]: `${prefix}%`,
    },
  }));

  const indikatorSubs = await IndikatorSubKegiatan.findAll({
    attributes: ["kode_indikator", "sub_kegiatan_id"],
    where: {
      [Op.or]: orLike,
      sub_kegiatan_id: {
        [Op.ne]: null,
      },
    },
    raw: true,
  });

  const prefixToSubIds = new Map();

  for (const prefix of prefixes) {
    prefixToSubIds.set(prefix, new Set());
  }

  for (const item of indikatorSubs) {
    const kodeISK = String(item.kode_indikator || "");
    const subId = Number(item.sub_kegiatan_id);

    if (!subId) continue;

    for (const prefix of prefixes) {
      if (kodeISK.startsWith(prefix)) {
        prefixToSubIds.get(prefix).add(subId);
      }
    }
  }

  const allSubIds = [
    ...new Set(
      [...prefixToSubIds.values()]
        .flatMap((set) => [...set])
        .filter(Boolean)
    ),
  ];

  const subPaguMap = new Map();

  if (allSubIds.length > 0) {
    const subRows = await SubKegiatan.findAll({
      attributes: ["id", "pagu_anggaran"],
      where: {
        id: {
          [Op.in]: allSubIds,
        },
      },
      raw: true,
    });

    for (const sub of subRows) {
      subPaguMap.set(Number(sub.id), Number(sub.pagu_anggaran || 0));
    }
  }

  const prefixTotalMap = new Map();

  for (const [prefix, subIdSet] of prefixToSubIds.entries()) {
    const total = [...subIdSet].reduce((sum, subId) => {
      return sum + Number(subPaguMap.get(Number(subId)) || 0);
    }, 0);

    prefixTotalMap.set(prefix, total);
  }

  for (const row of rows) {
    const kode = getRowKode(row);
    const prefix = prefixByKode.get(kode);
    const total = Number(prefixTotalMap.get(prefix) || 0);

    setRowPagu(row, total);
  }

  return rows;
}

module.exports = {
  normalizeKodeToIskPrefix,
  attachPaguByIndikatorKode,
};