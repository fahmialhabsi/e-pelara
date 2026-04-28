"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/database");
const {
  Tujuan,
  Sasaran,
  Strategi,
  ArahKebijakan,
  SubKegiatan,
  Kegiatan,
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
} = require("../models");

function toInt(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

async function maxSuffixAfterPrefix(model, scopeWhere, prefix) {
  if (!prefix) return 0;
  const result = await model.findOne({
    where: {
      ...scopeWhere,
      kode_indikator: { [Op.like]: `${prefix}-%` },
    },
    attributes: [
      [
        sequelize.fn(
          "MAX",
          sequelize.literal(
            "CAST(SUBSTRING_INDEX(kode_indikator,'-',-1) AS UNSIGNED)",
          ),
        ),
        "maxNumber",
      ],
    ],
    raw: true,
  });
  return Number(result?.maxNumber) || 0;
}

/** Sama logika dengan indikatorTujuanController.generateKodeIndikator — batch isi beberapa baris sekaligus. */
/**
 * Desain bisnis: satu tujuan unik = SATU indikator tujuan referensi utama.
 * Suffix kode_indikator untuk level indikatortujuans selalu "-01".
 * Contoh: T1-01 → T1-01-01, T2-01 → T2-01-01, dst.
 * Tidak ada T1-01-02 / T1-01-03 pada konteks indikatortujuans.
 */
async function allocateKodeTujuanGroup(payloads) {
  if (!payloads.length) return;
  const p0 = payloads[0];
  const tujuan_id = toInt(p0.tujuan_id);
  if (!tujuan_id) return;

  const tujuan = await Tujuan.findByPk(tujuan_id, {
    attributes: ["no_tujuan"],
  });
  const clean = String(tujuan?.no_tujuan || "").trim();
  if (!clean) return;

  // Suffix selalu "-01": satu tujuan unik = satu indikator tujuan referensi.
  // Jika ada lebih dari 1 payload dalam grup yang sama (seharusnya tidak terjadi
  // karena groupKeyForAutoKode sudah pisah per prefix/tujuan), tetap beri "-01"
  // untuk semua — dedup import_raw_id akan menangani sisa-nya saat apply.
  for (const p of payloads) {
    p.kode_indikator = `I${clean}-01`;
  }
}

/**
 * Desain bisnis: satu sasaran unik = SATU indikator sasaran referensi.
 * kode_indikator = sasaran.nomor langsung (misal ST1-01-01).
 * Tidak ada suffix angka — nomor sasaran sudah hierarkis penuh.
 */
async function allocateKodeSasaranGroup(payloads) {
  if (!payloads.length) return;
  const sasaran_id = toInt(payloads[0].sasaran_id);
  if (!sasaran_id) return;
  const sasaran = await Sasaran.findByPk(sasaran_id, { attributes: ["nomor"] });
  const nomor = String(sasaran?.nomor || "").trim();
  if (!nomor) return;
  for (const p of payloads) {
    p.kode_indikator = `IS${nomor.slice(2)}-01`;
  }
}

/**
 * Desain bisnis: satu strategi unik = SATU indikator strategi referensi.
 * kode_indikator = "STR" + sasaran.nomor.slice(2) + "-01"
 * Contoh: sasaran.nomor = "ST1-01-01" → "STR1-01-01-01"
 */
async function allocateKodeStrategiGroup(payloads) {
  if (!payloads.length) return;
  const strategi_id = toInt(payloads[0].strategi_id);
  if (!strategi_id) return;
  const st = await Strategi.findByPk(strategi_id, {
    attributes: ["sasaran_id", "kode_strategi"],
  });
  const sasaran_id = toInt(st?.sasaran_id);
  if (!sasaran_id) return;
  const sasaran = await Sasaran.findByPk(sasaran_id, { attributes: ["nomor"] });
  const nomor = String(sasaran?.nomor || "").trim();
  if (!nomor || nomor.length < 3) return;
  const kodeStrategi = String(st?.kode_strategi || "").trim();
  const prefix = kodeStrategi.startsWith("SST")
    ? kodeStrategi.replace(/^SST/, "IST")
    : `IST${nomor.slice(2)}`;
  for (const p of payloads) {
    p.kode_indikator = `${prefix}-01`;
  }
}

/**
 * Desain bisnis: satu arah kebijakan unik = SATU indikator arah referensi.
 * kode_indikator = "AR" + sasaran.nomor.slice(2) + "-01"
 * Contoh: sasaran.nomor = "ST1-01-01" → "AR1-01-01-01"
 */
function buildKodeIndikatorFromKodeArah(kodeArah) {
  return String(kodeArah || "").replace(/^ASST/, "AR");
}

async function allocateKodeArahGroup(payloads) {
  if (!payloads.length) return;
  const arah_kebijakan_id = toInt(payloads[0].arah_kebijakan_id);
  if (!arah_kebijakan_id) return;
  const arah = await ArahKebijakan.findByPk(arah_kebijakan_id, {
    attributes: ["strategi_id", "kode_arah"],
  });
  const kodeArah = String(arah?.kode_arah || "").trim();
  let prefix;
  if (kodeArah.startsWith("ASST")) {
    prefix = buildKodeIndikatorFromKodeArah(kodeArah);
  } else {
    const strategi_id = toInt(arah?.strategi_id);
    if (!strategi_id) return;
    const st = await Strategi.findByPk(strategi_id, {
      attributes: ["sasaran_id"],
    });
    const sasaran_id = toInt(st?.sasaran_id);
    if (!sasaran_id) return;
    const sasaran = await Sasaran.findByPk(sasaran_id, {
      attributes: ["nomor"],
    });
    const nomor = String(sasaran?.nomor || "").trim();
    if (!nomor || nomor.length < 3) return;
    prefix = `AR${nomor.slice(2)}`;
  }
  let n = await maxSuffixAfterPrefix(
    IndikatorArahKebijakan,
    { arah_kebijakan_id },
    prefix,
  );
  for (const p of payloads) {
    n += 1;
    p.kode_indikator = `${prefix}-${String(n).padStart(2, "0")}`;
  }
}

/**
 * Alur impor: tabel `indikatorprograms` di beberapa DB tidak punya kolom `program_id`.
 * Generate kode per kelompok `indikator_sasaran_id` (FK kolom DB = `sasaran_id` pada model IndikatorProgram).
 */
async function allocateKodeProgramGroup(payloads) {
  if (!payloads.length) return;
  const iakId = toInt(payloads[0].indikator_arah_kebijakan_id);
  if (!iakId) return;
  const iakRow = await IndikatorArahKebijakan.findByPk(iakId, {
    attributes: ["kode_indikator"],
  });
  const rawPrefix = String(iakRow?.kode_indikator || "").trim();
  const prefix = rawPrefix.startsWith("AR")
    ? `IP${rawPrefix.slice(2)}`
    : `IP-${iakId}`;
  let n = await maxSuffixAfterPrefix(
    IndikatorProgram,
    { indikator_arah_kebijakan_id: iakId },
    prefix,
  );
  for (const p of payloads) {
    n += 1;
    p.kode_indikator = `${prefix}-${String(n).padStart(2, "0")}`;
  }
}

async function allocateKodeKegiatanGroup(payloads) {
  if (!payloads.length) return;
  const indProgId = toInt(payloads[0].indikator_program_id);
  if (!indProgId) return;
  let prefix;
  const ipRow = await IndikatorProgram.findByPk(indProgId, { attributes: ["kode_indikator"] });
  const ipKode = String(ipRow?.kode_indikator || "").trim();
  if (ipKode.startsWith("IP")) {
    prefix = `IK${ipKode.slice(2)}`;
  } else {
    const kid = toInt(payloads[0].kegiatan_id);
    if (kid) {
      const keg = await Kegiatan.findByPk(kid, { attributes: ["kode_kegiatan"] });
      const kk = String(keg?.kode_kegiatan || "").trim();
      if (kk) prefix = `IK-${kk}`;
    }
    if (!prefix) prefix = `IK-IP${indProgId}`;
  }
  let n = await maxSuffixAfterPrefix(
    IndikatorKegiatan,
    { indikator_program_id: indProgId },
    prefix,
  );
  for (const p of payloads) {
    n += 1;
    p.kode_indikator = `${prefix}-${String(n).padStart(2, "0")}`;
  }
}

async function allocateKodeSubKegiatanGroup(payloads) {
  if (!payloads.length) return;
  const sub_kegiatan_id = toInt(payloads[0].sub_kegiatan_id);
  if (!sub_kegiatan_id) return;
  let prefix;
  const indKegId = toInt(payloads[0].indikator_kegiatan_id);
  if (indKegId) {
    const ikRow = await IndikatorKegiatan.findByPk(indKegId, { attributes: ["kode_indikator"] });
    const ikKode = String(ikRow?.kode_indikator || "").trim();
    if (ikKode.startsWith("IK")) prefix = `ISK${ikKode.slice(2)}`;
  }
  if (!prefix) {
    const sk = await SubKegiatan.findByPk(sub_kegiatan_id, { attributes: ["kode_sub_kegiatan"] });
    const skKode = String(sk?.kode_sub_kegiatan || "").trim();
    prefix = skKode ? `ISK-${skKode}` : `ISK-${sub_kegiatan_id}`;
  }
  let n = await maxSuffixAfterPrefix(
    IndikatorSubKegiatan,
    { sub_kegiatan_id },
    prefix,
  );
  for (const p of payloads) {
    n += 1;
    p.kode_indikator = `${prefix}-${String(n).padStart(2, "0")}`;
  }
}

function groupKeyForAutoKode(table, payload) {
  const p = payload || {};
  switch (table) {
    case "indikatortujuans":
      return [
        "tu",
        toInt(p.tujuan_id),
        p.tahun || "",
        String(p.jenis_dokumen || "").toLowerCase(),
      ].join("|");
    case "indikatorsasarans":
      return ["sas", toInt(p.sasaran_id)].join("|");
    case "indikatorstrategis":
      return ["st", toInt(p.strategi_id)].join("|");
    case "indikatorarahkebijakans":
      return ["ak", toInt(p.arah_kebijakan_id)].join("|");
    case "indikatorprograms":
      return ["ip", toInt(p.indikator_arah_kebijakan_id)].join("|");
    case "indikatorkegiatans":
      return ["ik", toInt(p.indikator_program_id)].join("|");
    case "indikatorsubkegiatans":
      return ["isk", toInt(p.sub_kegiatan_id), toInt(p.indikator_kegiatan_id) || ""].join("|");
    default:
      return null;
  }
}

/**
 * Isi `kode_indikator` pada payload yang masih kosong, selaras pola form / endpoint next-kode.
 * Hanya memproses entri dengan `relErrs` kosong (relasi sudah valid).
 * @param {string} table
 * @param {{ line: number, payload: object, relErrs: string[] }[]} entries — urutan = urutan baris sheet
 */
async function fillMissingKodeIndikatorsForSheet(table, entries, _periodeId) {
  const need = (entries || []).filter(
    (e) =>
      e &&
      e.payload &&
      !String(e.payload.kode_indikator || "").trim() &&
      !(e.relErrs && e.relErrs.length),
  );
  if (!need.length) return;

  const groups = new Map();
  const order = [];
  for (const e of need) {
    const k = groupKeyForAutoKode(table, e.payload);
    if (k == null) continue;
    if (!groups.has(k)) {
      groups.set(k, []);
      order.push(k);
    }
    groups.get(k).push(e.payload);
  }

  for (const k of order) {
    const payloads = groups.get(k);
    if (!payloads?.length) continue;
    switch (table) {
      case "indikatortujuans":
        await allocateKodeTujuanGroup(payloads);
        break;
      case "indikatorsasarans":
        await allocateKodeSasaranGroup(payloads);
        break;
      case "indikatorstrategis":
        await allocateKodeStrategiGroup(payloads);
        break;
      case "indikatorarahkebijakans":
        await allocateKodeArahGroup(payloads);
        break;
      case "indikatorprograms":
        await allocateKodeProgramGroup(payloads);
        break;
      case "indikatorkegiatans":
        await allocateKodeKegiatanGroup(payloads);
        break;
      case "indikatorsubkegiatans":
        await allocateKodeSubKegiatanGroup(payloads);
        break;
      default:
        break;
    }
  }
}

module.exports = {
  fillMissingKodeIndikatorsForSheet,
  allocateKodeSasaranGroup,
  allocateKodeStrategiGroup,
  allocateKodeArahGroup,
  allocateKodeProgramGroup,
  allocateKodeKegiatanGroup,
  allocateKodeSubKegiatanGroup,
};
