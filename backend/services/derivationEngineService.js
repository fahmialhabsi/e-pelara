"use strict";

/**
 * Sprint 2.6 — Derivation hardening & domain alignment
 *
 * Sumber utama: hierarki RPJMD lewat tabel `cascading` yang merujuk
 * tujuan, sasaran, program, kegiatan, sub_kegiatan (bukan sekadar teks acak).
 * Filter PD: `perangkat_daerah_opd_mapping` → `program.opd_penanggung_jawab` (ID).
 *
 * DUAL RENJA (jujur): Renja v2 (`renja_dokumen`) adalah dokumen perencanaan;
 * tabel `renja` legacy tetap dipakai modul RKA/DPA. Strategi jangka menengah:
 * (1) `renja_dokumen.legacy_renja_id` menautkan ke baris legacy yang disintesis;
 * (2) unify: migrasi FK RKA ke renja_dokumen_id + deprecate kolom renja_id; atau
 * (3) adapter view yang menyatukan keduanya. Belum diimplementasi penuh — hanya jejak FK.
 */

const crypto = require("crypto");
const { Op } = require("sequelize");

class DerivationConflictError extends Error {
  constructor(message, payload) {
    super(message);
    this.name = "DerivationConflictError";
    this.payload = payload;
  }
}

function shaKey(parts) {
  return crypto
    .createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 48);
}

function keyRenstraPd(periodeId, pdId, tahun) {
  return shaKey(["renstra_pd", String(periodeId), String(pdId), String(tahun)]);
}

function keyRkpd(renstraPdId, tahun) {
  return shaKey(["rkpd", String(renstraPdId), String(tahun)]);
}

function keyRenja(rkpdId, renstraPdId) {
  return shaKey(["renja", String(rkpdId), String(renstraPdId)]);
}

/** Satu DPA derivasi per pasangan (rka_id, jenis_dokumen) — selaras dengan derivation_key dokumen lain. */
function keyDpaFromRka(rkaId, jenisDokumen) {
  const j = jenisDokumen != null && String(jenisDokumen).trim() !== ""
    ? String(jenisDokumen)
    : "dpa_derived";
  return shaKey(["dpa", String(rkaId), j]);
}

function numPagu(v) {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function loadPdOpdMapping(models, perangkat_daerah_id) {
  const { PerangkatDaerahOpdMapping } = models;
  if (!PerangkatDaerahOpdMapping) return null;
  return PerangkatDaerahOpdMapping.findOne({
    where: { perangkat_daerah_id },
  });
}

/**
 * Baris cascading + domain RPJMD (tujuan, sasaran, strategi via M2M).
 */
async function loadDomainCascadeRows(models, { periode_id, tahun, filter_mode, opd_penanggung_jawab_id }) {
  const {
    Cascading,
    Program,
    Kegiatan,
    SubKegiatan,
    Tujuan,
    Sasaran,
    Strategi,
  } = models;

  const baseWhere = {
    periode_id,
    tahun: String(tahun),
    program_id: { [Op.ne]: null },
    kegiatan_id: { [Op.ne]: null },
    sub_kegiatan_id: { [Op.ne]: null },
  };

  const programInclude = {
    model: Program,
    as: "program",
    required: true,
    ...(filter_mode === "pd" && opd_penanggung_jawab_id != null
      ? { where: { opd_penanggung_jawab: opd_penanggung_jawab_id } }
      : {}),
  };

  const rows = await Cascading.findAll({
    where: baseWhere,
    include: [
      programInclude,
      { model: Tujuan, as: "tujuan", required: false },
      { model: Sasaran, as: "sasaran", required: false },
      { model: Kegiatan, as: "kegiatan", required: true },
      { model: SubKegiatan, as: "subKegiatan", required: true },
      {
        model: Strategi,
        as: "strategis",
        required: false,
        through: { attributes: [] },
      },
    ],
    order: [["id", "ASC"]],
  });

  return { rows };
}

/**
 * rpjmd_id wajib di DB untuk renstra_opd — diambil dari domain (Tujuan.rpjmd_id) lalu fallback RPJMD pertama.
 */
async function resolveRpjmdIdForRenstraOpd(models, { rows, transaction }) {
  const { Tujuan, RPJMD } = models;
  for (const r of rows) {
    if (r.tujuan?.rpjmd_id != null) return Number(r.tujuan.rpjmd_id);
  }
  const tids = [...new Set(rows.map((x) => x.tujuan_id).filter(Boolean))];
  for (const tid of tids) {
    const t = await Tujuan.findByPk(tid, {
      transaction,
      attributes: ["id", "rpjmd_id"],
    });
    if (t?.rpjmd_id != null) return Number(t.rpjmd_id);
  }
  const any = await RPJMD.findOne({
    order: [["id", "ASC"]],
    transaction,
    attributes: ["id"],
  });
  if (any?.id != null) return Number(any.id);
  throw new Error(
    "Tidak dapat menentukan rpjmd_id untuk Renstra OPD: pastikan ada baris rpjmd dan tujuan RPJMD terisi rpjmd_id.",
  );
}

/** Kolom renstra_tujuan.rpjmd_tujuan_id di DB char(36); pakai string konsisten dengan penyimpanan. */
function renstraTujuanRefId(tujuanPk) {
  return String(tujuanPk);
}

/**
 * Mengisi struktur Renstra lama: RenstraOPD + RenstraTujuan + IndikatorRenstra + renstra_tabel_tujuan.
 */
async function fillRenstraStructureFromRpjmd(models, sequelize, transaction, {
  rows,
  renstraPdDoc,
  periode,
  opdPenanggungJawabId,
}) {
  const {
    RenstraOPD,
    RenstraTujuan,
    RenstraTabelTujuan,
    IndikatorRenstra,
    IndikatorTujuan,
    Tujuan,
    OpdPenanggungJawab,
  } = models;

  const tAwal = Number(periode.tahun_awal);
  const tAkhir = Number(periode.tahun_akhir);
  const rpjmdId = await resolveRpjmdIdForRenstraOpd(models, { rows, transaction });

  const opdRow = await OpdPenanggungJawab.findByPk(opdPenanggungJawabId, {
    transaction,
    attributes: ["id", "nama_opd", "nama_bidang_opd"],
  });
  const bidangOpd = (opdRow?.nama_bidang_opd || opdRow?.nama_opd || "-").trim() || "-";
  const namaOpdRenstra =
    (opdRow?.nama_opd || "").trim() ||
    `PD ${renstraPdDoc.perangkat_daerah_id} (derivasi)`;

  const [opdRenstra, createdOpd] = await RenstraOPD.findOrCreate({
    where: {
      opd_id: opdPenanggungJawabId,
      tahun_mulai: tAwal,
      tahun_akhir: tAkhir,
      rpjmd_id: rpjmdId,
    },
    defaults: {
      opd_id: opdPenanggungJawabId,
      rpjmd_id: rpjmdId,
      tahun_mulai: tAwal,
      tahun_akhir: tAkhir,
      bidang_opd: bidangOpd,
      sub_bidang_opd: bidangOpd,
      nama_opd: namaOpdRenstra,
      is_aktif: true,
    },
    transaction,
  });

  if (!createdOpd && (opdRenstra.rpjmd_id == null || Number(opdRenstra.rpjmd_id) !== rpjmdId)) {
    await opdRenstra.update({ rpjmd_id: rpjmdId }, { transaction });
  }

  const tujuanIds = [
    ...new Set(rows.map((r) => r.tujuan_id).filter(Boolean)),
  ];

  for (const tid of tujuanIds) {
    const tujuan = await Tujuan.findByPk(tid, { transaction });
    if (!tujuan) continue;

    const refTujuan = renstraTujuanRefId(tujuan.id);

    const [rt, createdRt] = await RenstraTujuan.findOrCreate({
      where: {
        renstra_id: opdRenstra.id,
        rpjmd_tujuan_id: refTujuan,
      },
      defaults: {
        renstra_id: opdRenstra.id,
        rpjmd_tujuan_id: refTujuan,
        no_tujuan: tujuan.no_tujuan || String(tujuan.id),
        isi_tujuan: tujuan.isi_tujuan,
        isi_tujuan_rpjmd: tujuan.isi_tujuan,
        no_rpjmd: tujuan.no_tujuan,
      },
      transaction,
    });
    if (!createdRt) {
      await rt.update(
        {
          isi_tujuan: tujuan.isi_tujuan,
          isi_tujuan_rpjmd: tujuan.isi_tujuan,
        },
        { transaction },
      );
    }

    let indRen = null;
    const indRpjmd = await IndikatorTujuan.findOne({
      where: {
        tujuan_id: tujuan.id,
        jenis_dokumen: "rpjmd",
      },
      transaction,
    });

    if (indRpjmd) {
      [indRen] = await IndikatorRenstra.findOrCreate({
        where: {
          renstra_id: opdRenstra.id,
          ref_id: rt.id,
          stage: "tujuan",
        },
        defaults: {
          renstra_id: opdRenstra.id,
          ref_id: rt.id,
          stage: "tujuan",
          kode_indikator: indRpjmd.kode_indikator,
          nama_indikator: indRpjmd.nama_indikator,
          satuan: indRpjmd.satuan,
          tahun: String(tAwal),
          jenis_dokumen: "renstra",
        },
        transaction,
      });
    }

    await RenstraTabelTujuan.findOrCreate({
      where: {
        opd_id: opdRenstra.id,
        tujuan_id: rt.id,
      },
      defaults: {
        opd_id: opdRenstra.id,
        tujuan_id: rt.id,
        indikator_id: indRen ? indRen.id : null,
        kode_tujuan: tujuan.no_tujuan || `T-${tujuan.id}`,
        nama_tujuan: tujuan.isi_tujuan ? String(tujuan.isi_tujuan).slice(0, 255) : `Tujuan ${tujuan.id}`,
      },
      transaction,
    });
  }

  await renstraPdDoc.update(
    { renstra_opd_id: opdRenstra.id },
    { transaction },
  );

  return {
    renstra_opd_id: opdRenstra.id,
    renstra_opd_created: createdOpd,
    tujuan_count: tujuanIds.length,
  };
}

async function generateRenstraPdFromRpjmd(models, sequelize, body) {
  const { RenstraPdDokumen, PeriodeRpjmd } = models;
  const {
    periode_id,
    perangkat_daerah_id,
    judul,
    tahun,
    filter_mode = "pd",
    idempotency = "reuse",
  } = body;

  const periode = await PeriodeRpjmd.findByPk(periode_id);
  if (!periode) throw new Error("periode_id tidak valid.");

  const tNum = Number(tahun);
  if (tNum < Number(periode.tahun_awal) || tNum > Number(periode.tahun_akhir)) {
    throw new Error("tahun di luar rentang periode RPJMD.");
  }

  const derivation_key = keyRenstraPd(periode_id, perangkat_daerah_id, tNum);
  const existing = await RenstraPdDokumen.findOne({ where: { derivation_key } });
  if (existing) {
    if (idempotency === "error") {
      throw new DerivationConflictError("Derivation sudah ada untuk kunci ini.", {
        renstra_pd_dokumen_id: existing.id,
      });
    }
    return {
      success: true,
      idempotent_hit: true,
      renstra_pd_dokumen: existing,
      meta: { derivation_key, derivation: "rpjmd_domain", idempotent_hit: true },
    };
  }

  let opd_penanggung_jawab_id = null;
  if (filter_mode === "pd") {
    const map = await loadPdOpdMapping(models, perangkat_daerah_id);
    if (!map) {
      throw new Error(
        "Belum ada mapping PD ↔ OPD (ID). Gunakan POST /api/derivation/pd-opd-mapping atau set filter_mode=all.",
      );
    }
    opd_penanggung_jawab_id = map.opd_penanggung_jawab_id;
  }

  const { rows } = await loadDomainCascadeRows(models, {
    periode_id,
    tahun: tNum,
    filter_mode,
    opd_penanggung_jawab_id,
  });

  if (!rows.length) {
    throw new Error(
      "Tidak ada baris cascading domain untuk parameter ini. Periksa data RPJMD, mapping PD, atau gunakan filter_mode=all.",
    );
  }

  const t = await sequelize.transaction();
  try {
    const doc = await RenstraPdDokumen.create(
      {
        periode_id,
        perangkat_daerah_id,
        judul:
          judul ||
          `Renstra PD (derivasi RPJMD ${tNum}) — ${rows.length} baris sumber`,
        versi: 1,
        status: "draft",
        is_final_active: false,
        tanggal_pengesahan: null,
        derivation_key,
      },
      { transaction: t },
    );

    let structMeta = {};
    if (filter_mode === "pd" && opd_penanggung_jawab_id != null) {
      structMeta = await fillRenstraStructureFromRpjmd(models, sequelize, t, {
        rows,
        renstraPdDoc: doc,
        periode,
        opdPenanggungJawabId: opd_penanggung_jawab_id,
      });
    }

    await t.commit();
    return {
      success: true,
      idempotent_hit: false,
      renstra_pd_dokumen: await RenstraPdDokumen.findByPk(doc.id),
      meta: {
        derivation: "rpjmd_domain_cascading",
        derivation_key,
        source_rows: rows.length,
        tahun: tNum,
        domain: {
          tujuan_ids: [...new Set(rows.map((r) => r.tujuan_id).filter(Boolean))],
          sasaran_ids: [...new Set(rows.map((r) => r.sasaran_id).filter(Boolean))],
          strategi_ids: [
            ...new Set(
              rows.flatMap((r) => (r.strategis || []).map((s) => s.id)),
            ),
          ],
        },
        renstra_structure: structMeta,
      },
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function generateRkpdFromRenstra(models, sequelize, body) {
  const { RkpdDokumen, RkpdItem, RenstraPdDokumen } = models;
  const {
    renstra_pd_dokumen_id,
    tahun,
    judul,
    filter_mode = "pd",
    idempotency = "reuse",
  } = body;

  const rs = await RenstraPdDokumen.findByPk(renstra_pd_dokumen_id);
  if (!rs) throw new Error("renstra_pd_dokumen_id tidak ditemukan.");

  const tNum = Number(tahun);
  const derivation_key = keyRkpd(renstra_pd_dokumen_id, tNum);
  const existing = await RkpdDokumen.findOne({ where: { derivation_key } });
  if (existing) {
    if (idempotency === "error") {
      throw new DerivationConflictError("RKPD derivasi sudah ada.", {
        rkpd_dokumen_id: existing.id,
      });
    }
    return {
      success: true,
      idempotent_hit: true,
      rkpd_dokumen: existing,
      rkpd_items: await RkpdItem.findAll({
        where: { rkpd_dokumen_id: existing.id },
      }),
      meta: { derivation_key, idempotent_hit: true },
    };
  }

  let opd_penanggung_jawab_id = null;
  if (filter_mode === "pd") {
    const map = await loadPdOpdMapping(models, rs.perangkat_daerah_id);
    if (!map) {
      throw new Error(
        "Belum ada mapping PD ↔ OPD (ID). Gunakan POST /api/derivation/pd-opd-mapping atau set filter_mode=all.",
      );
    }
    opd_penanggung_jawab_id = map.opd_penanggung_jawab_id;
  }

  const { rows } = await loadDomainCascadeRows(models, {
    periode_id: rs.periode_id,
    tahun: tNum,
    filter_mode,
    opd_penanggung_jawab_id,
  });

  if (!rows.length) {
    throw new Error(
      "Tidak ada baris cascading untuk RKPD. Periksa tahun atau gunakan filter_mode=all.",
    );
  }

  const t = await sequelize.transaction();
  try {
    const dok = await RkpdDokumen.create(
      {
        periode_id: rs.periode_id,
        tahun: tNum,
        judul:
          judul ||
          `RKPD ${tNum} (derivasi Renstra PD #${renstra_pd_dokumen_id})`,
        versi: 1,
        status: "draft",
        is_final_active: false,
        tanggal_pengesahan: null,
        derivation_key,
      },
      { transaction: t },
    );

    let urutan = 0;
    const items = [];
    for (const c of rows) {
      urutan += 1;
      const sk = c.subKegiatan;
      const pagu = numPagu(sk?.pagu_anggaran ?? sk?.total_pagu_anggaran);
      const indikatorText =
        sk?.nama_sub_kegiatan || c.program?.nama_program || "Indikator derivasi RPJMD";

      const item = await RkpdItem.create(
        {
          rkpd_dokumen_id: dok.id,
          urutan,
          program: c.program?.nama_program || null,
          kegiatan: c.kegiatan?.nama_kegiatan || null,
          sub_kegiatan: sk?.nama_sub_kegiatan || null,
          indikator: indikatorText,
          target: null,
          satuan: null,
          pagu,
          perangkat_daerah_id: rs.perangkat_daerah_id,
          status_baris: "draft",
        },
        { transaction: t },
      );
      items.push(item);
    }

    await t.commit();
    return {
      success: true,
      idempotent_hit: false,
      rkpd_dokumen: dok,
      rkpd_items: items,
      meta: {
        derivation: "renstra_pd_to_rkpd",
        renstra_pd_dokumen_id,
        derivation_key,
        source_cascade_rows: rows.length,
      },
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function generateRenjaFromRkpd(models, sequelize, body) {
  const {
    RenjaDokumen,
    RenjaItem,
    RenjaRkpdItemMap,
    RkpdDokumen,
    RkpdItem,
    RenstraPdDokumen,
  } = models;
  const { rkpd_dokumen_id, renstra_pd_dokumen_id, judul, idempotency = "reuse" } = body;

  const rk = await RkpdDokumen.findByPk(rkpd_dokumen_id);
  if (!rk) throw new Error("rkpd_dokumen_id tidak ditemukan.");
  const rs = await RenstraPdDokumen.findByPk(renstra_pd_dokumen_id);
  if (!rs) throw new Error("renstra_pd_dokumen_id tidak ditemukan.");

  if (Number(rs.periode_id) !== Number(rk.periode_id)) {
    throw new Error("Periode Renstra PD dan RKPD harus sama.");
  }

  const derivation_key = keyRenja(rk.id, rs.id);
  const existing = await RenjaDokumen.findOne({ where: { derivation_key } });
  if (existing) {
    if (idempotency === "error") {
      throw new DerivationConflictError("Renja derivasi sudah ada.", {
        renja_dokumen_id: existing.id,
      });
    }
    return {
      success: true,
      idempotent_hit: true,
      renja_dokumen: existing,
      items: [],
      meta: { derivation_key, idempotent_hit: true },
    };
  }

  const rkItems = await RkpdItem.findAll({
    where: { rkpd_dokumen_id: rk.id },
    order: [["urutan", "ASC"], ["id", "ASC"]],
  });

  if (!rkItems.length) {
    throw new Error("RKPD tidak memiliki item untuk diturunkan.");
  }

  const firstPd = rkItems[0].perangkat_daerah_id;
  if (
    firstPd != null &&
    Number(firstPd) !== Number(rs.perangkat_daerah_id)
  ) {
    throw new Error(
      "perangkat_daerah pada rkpd_item tidak konsisten dengan Renstra PD.",
    );
  }

  const tahunRenja = Number(body.tahun ?? rk.tahun);
  if (Number(rk.tahun) !== tahunRenja) {
    throw new Error("tahun Renja harus sama dengan tahun dokumen RKPD.");
  }

  const t = await sequelize.transaction();
  try {
    const doc = await RenjaDokumen.create(
      {
        periode_id: rk.periode_id,
        tahun: tahunRenja,
        perangkat_daerah_id: rs.perangkat_daerah_id,
        renstra_pd_dokumen_id: rs.id,
        rkpd_dokumen_id: rk.id,
        judul:
          judul ||
          `Renja PD ${tahunRenja} (derivasi RKPD #${rk.id})`,
        versi: 1,
        status: "draft",
        is_final_active: false,
        tanggal_pengesahan: null,
        derivation_key,
      },
      { transaction: t },
    );

    const outItems = [];
    let u = 0;
    for (const ri of rkItems) {
      u += 1;
      const ji = await RenjaItem.create(
        {
          renja_dokumen_id: doc.id,
          urutan: u,
          program: ri.program,
          kegiatan: ri.kegiatan,
          sub_kegiatan: ri.sub_kegiatan,
          indikator: ri.indikator,
          target: ri.target,
          satuan: ri.satuan,
          pagu: ri.pagu,
          status_baris: "draft",
        },
        { transaction: t },
      );
      await RenjaRkpdItemMap.create(
        {
          renja_item_id: ji.id,
          rkpd_item_id: ri.id,
        },
        { transaction: t },
      );
      outItems.push({ renja_item: ji, rkpd_item_id: ri.id });
    }

    await t.commit();
    return {
      success: true,
      idempotent_hit: false,
      renja_dokumen: doc,
      items: outItems,
      meta: {
        derivation: "rkpd_to_renja",
        rkpd_dokumen_id: rk.id,
        maps_created: outItems.length,
        derivation_key,
      },
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function generateRkaFromRenja(models, sequelize, body) {
  const {
    RenjaDokumen,
    RenjaItem,
    Renja,
    Rka,
    PerangkatDaerah,
  } = models;
  const { renja_dokumen_id, jenis_dokumen = "rka_derived" } = body;

  const doc = await RenjaDokumen.findByPk(renja_dokumen_id);
  if (!doc) throw new Error("renja_dokumen_id tidak ditemukan.");

  if (doc.legacy_renja_id) {
    return {
      success: true,
      idempotent_hit: true,
      renja_legacy_id: doc.legacy_renja_id,
      renja_dokumen_id: doc.id,
      rka: await Rka.findAll({ where: { renja_id: doc.legacy_renja_id } }),
      meta: { idempotent_hit: true, note: "legacy_renja_id sudah diisi" },
    };
  }

  const items = await RenjaItem.findAll({
    where: { renja_dokumen_id: doc.id },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
  });
  if (!items.length) throw new Error("Renja tidak memiliki item.");

  const pd = await PerangkatDaerah.findByPk(doc.perangkat_daerah_id);
  const first = items[0];

  const t = await sequelize.transaction();
  try {
    const legacyRenja = await Renja.create(
      {
        tahun: doc.tahun,
        judul: `Legacy Renja untuk RKA (dok #${doc.id})`,
        perangkat_daerah: pd?.nama || null,
        periode_id: doc.periode_id,
        status: "draft",
        approval_status: "DRAFT",
        jenis_dokumen: jenis_dokumen,
        program: first.program || "-",
        kegiatan: first.kegiatan || "-",
        sub_kegiatan: first.sub_kegiatan || "-",
      },
      { transaction: t },
    );

    const rkaRows = [];
    for (const it of items) {
      const r = await Rka.create(
        {
          tahun: String(doc.tahun),
          periode_id: doc.periode_id,
          program: it.program || "-",
          kegiatan: it.kegiatan || "-",
          sub_kegiatan: it.sub_kegiatan || "-",
          indikator: it.indikator || null,
          target: it.target != null ? String(it.target) : null,
          anggaran: it.pagu != null ? Number(it.pagu) : 0,
          jenis_dokumen: jenis_dokumen,
          renja_id: legacyRenja.id,
        },
        { transaction: t },
      );
      rkaRows.push(r);
    }

    await doc.update({ legacy_renja_id: legacyRenja.id }, { transaction: t });

    await t.commit();
    return {
      success: true,
      idempotent_hit: false,
      renja_legacy_id: legacyRenja.id,
      renja_dokumen_id: doc.id,
      rka: rkaRows,
      meta: { derivation: "renja_v2_to_rka", rows: rkaRows.length, legacy_linked: true },
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function generateDpaFromRka(models, sequelize, body) {
  const { Dpa, Rka } = models;
  const {
    rka_id,
    renja_legacy_id,
    jenis_dokumen = "dpa_derived",
    idempotency = "reuse",
  } = body;

  let rkaList = [];
  if (rka_id) {
    const one = await Rka.findByPk(rka_id);
    if (!one) throw new Error("rka_id tidak ditemukan.");
    rkaList = [one];
  } else if (renja_legacy_id) {
    rkaList = await Rka.findAll({
      where: { renja_id: renja_legacy_id },
      order: [["id", "ASC"]],
    });
    if (!rkaList.length) throw new Error("Tidak ada RKA untuk renja_legacy_id.");
  } else {
    throw new Error("Wajib rka_id atau renja_legacy_id.");
  }

  const t = await sequelize.transaction();
  try {
    const created = [];
    const reused = [];

    for (const rk of rkaList) {
      const derivation_key = keyDpaFromRka(rk.id, jenis_dokumen);

      let existing = await Dpa.findOne({
        where: { derivation_key },
        transaction: t,
      });

      if (!existing) {
        existing = await Dpa.findOne({
          where: { rka_id: rk.id, jenis_dokumen },
          transaction: t,
        });
        if (existing && (existing.derivation_key == null || existing.derivation_key === "")) {
          await existing.update({ derivation_key }, { transaction: t });
        } else if (
          existing &&
          existing.derivation_key &&
          existing.derivation_key !== derivation_key
        ) {
          throw new Error(
            `DPA untuk rka_id ${rk.id} punya derivation_key lain; tidak menimpa.`,
          );
        }
      }

      if (existing) {
        if (idempotency === "error") {
          throw new DerivationConflictError(
            "DPA derivasi untuk RKA ini sudah ada.",
            {
              dpa_id: existing.id,
              rka_id: rk.id,
              derivation_key,
            },
          );
        }
        reused.push(existing);
        continue;
      }

      const d = await Dpa.create(
        {
          tahun: rk.tahun,
          periode_id: rk.periode_id,
          program: rk.program,
          kegiatan: rk.kegiatan,
          sub_kegiatan: rk.sub_kegiatan,
          indikator: rk.indikator,
          target: rk.target,
          anggaran: rk.anggaran,
          jenis_dokumen,
          rka_id: rk.id,
          approval_status: "DRAFT",
          derivation_key,
        },
        { transaction: t },
      );
      created.push(d);
    }

    await t.commit();
    const allReuse = created.length === 0 && reused.length === rkaList.length;
    const combined = [...created, ...reused].sort((a, b) => a.id - b.id);
    return {
      success: true,
      idempotent_hit: allReuse && rkaList.length > 0,
      dpa: combined,
      created,
      reused,
      meta: {
        derivation: "rka_to_dpa",
        rows_created: created.length,
        rows_reused: reused.length,
        jenis_dokumen,
      },
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function upsertPdOpdMapping(models, sequelize, body) {
  const { PerangkatDaerahOpdMapping } = models;
  if (!PerangkatDaerahOpdMapping) {
    throw new Error("Model perangkat_daerah_opd_mapping tidak terdaftar.");
  }
  const { perangkat_daerah_id, opd_penanggung_jawab_id } = body;
  const [row] = await PerangkatDaerahOpdMapping.findOrCreate({
    where: { perangkat_daerah_id },
    defaults: { perangkat_daerah_id, opd_penanggung_jawab_id },
  });
  if (row.opd_penanggung_jawab_id !== opd_penanggung_jawab_id) {
    await row.update({ opd_penanggung_jawab_id });
  }
  return row;
}

module.exports = {
  generateRenstraPdFromRpjmd,
  generateRkpdFromRenstra,
  generateRenjaFromRkpd,
  generateRkaFromRenja,
  generateDpaFromRka,
  loadDomainCascadeRows,
  loadPdOpdMapping,
  upsertPdOpdMapping,
  DerivationConflictError,
  keyRenstraPd,
  keyDpaFromRka,
};
