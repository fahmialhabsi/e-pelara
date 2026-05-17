const {
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategis,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
  SubKegiatan,
} = require("../models");

function normalizeKode(kode = "") {
  return String(kode).trim().toUpperCase();
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function getAffectedCodesFromIskKode(kodeIndikator) {
  const kode = normalizeKode(kodeIndikator);

  if (!kode.startsWith("ISK")) return null;

  const match = kode.match(/^ISK(\d+)(?:-(.+))?$/);
  if (!match) return null;

  const nomor = match[1];

  return {
    tujuan: `IT${nomor}`,
    sasaran: `IS${nomor}`,
    strategi: `IST${nomor}`,
    arahKebijakan: `AR${nomor}`,
    program: `IP${nomor}`,
    kegiatan: `IK${nomor}`,
    subKegiatanPrefix: kode,
  };
}

async function sumPaguByIskPrefix(prefix, transaction = null) {
  const normalizedPrefix = normalizeKode(prefix);

  const rows = await IndikatorSubKegiatan.findAll({
    where: {
      kode_indikator: {
        [require("sequelize").Op.like]: `${escapeLike(normalizedPrefix)}%`,
      },
    },
    include: [
      {
        model: SubKegiatan,
        as: "sub_kegiatan",
        attributes: ["id", "pagu_anggaran"],
      },
    ],
    transaction,
  });

  const uniqueSubKegiatan = new Map();

  for (const row of rows) {
    const sub = row.sub_kegiatan;
    if (!sub) continue;

    uniqueSubKegiatan.set(
      sub.id,
      Number(sub.pagu_anggaran || 0)
    );
  }

  return [...uniqueSubKegiatan.values()].reduce((sum, value) => sum + value, 0);
}

async function updateOne(model, kodeIndikator, pagu, transaction = null) {
  if (!kodeIndikator) return 0;

  const [count] = await model.update(
    {
      pagu_cached: pagu,
      pagu_cached_at: new Date(),
    },
    {
      where: {
        kode_indikator: kodeIndikator,
      },
      transaction,
    }
  );

  return count;
}

async function syncPaguCachedByIskPrefix(prefix, transaction = null) {
  const affected = getAffectedCodesFromIskKode(prefix);

  if (!affected) {
    return {
      success: false,
      message: "Prefix ISK tidak valid",
      prefix,
    };
  }

  const pagu = await sumPaguByIskPrefix(
    affected.subKegiatanPrefix,
    transaction
  );

  const result = {
    pagu,
    tujuan: await updateOne(
      IndikatorTujuan,
      affected.tujuan,
      pagu,
      transaction
    ),
    sasaran: await updateOne(
      IndikatorSasaran,
      affected.sasaran,
      pagu,
      transaction
    ),
    strategi: await updateOne(
      IndikatorStrategis,
      affected.strategi,
      pagu,
      transaction
    ),
    arah_kebijakan: await updateOne(
      IndikatorArahKebijakan,
      affected.arahKebijakan,
      pagu,
      transaction
    ),
    program: await updateOne(
      IndikatorProgram,
      affected.program,
      pagu,
      transaction
    ),
    kegiatan: await updateOne(
      IndikatorKegiatan,
      affected.kegiatan,
      pagu,
      transaction
    ),
    sub_kegiatan: await IndikatorSubKegiatan.update(
      {
        pagu_cached: pagu,
        pagu_cached_at: new Date(),
      },
      {
        where: {
          kode_indikator: {
            [require("sequelize").Op.like]: `${escapeLike(
              affected.subKegiatanPrefix
            )}%`,
          },
        },
        transaction,
      }
    ).then(([count]) => count),
  };

  return {
    success: true,
    prefix: affected.subKegiatanPrefix,
    affected,
    result,
  };
}

async function syncPaguCachedBySubKegiatanId(subKegiatanId, transaction = null) {
  const rows = await IndikatorSubKegiatan.findAll({
    where: {
      sub_kegiatan_id: subKegiatanId,
    },
    attributes: ["id", "kode_indikator"],
    transaction,
  });

  const prefixes = [
    ...new Set(
      rows
        .map((row) => normalizeKode(row.kode_indikator))
        .filter((kode) => kode.startsWith("ISK"))
    ),
  ];

  const results = [];

  for (const prefix of prefixes) {
    results.push(await syncPaguCachedByIskPrefix(prefix, transaction));
  }

  return {
    success: true,
    sub_kegiatan_id: subKegiatanId,
    synced_prefixes: prefixes,
    results,
  };
}

async function syncAffectedParentsFromIndikatorSubKegiatan(row, transaction = null) {
  if (!row?.kode_indikator) {
    return {
      success: false,
      message: "kode_indikator tidak ditemukan",
    };
  }

  return syncPaguCachedByIskPrefix(row.kode_indikator, transaction);
}

module.exports = {
  syncPaguCachedByIskPrefix,
  syncPaguCachedBySubKegiatanId,
  syncAffectedParentsFromIndikatorSubKegiatan,
};