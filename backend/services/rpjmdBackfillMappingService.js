"use strict";

const {
  sequelize,
  SubKegiatan,
  Kegiatan,
  Program,
  MasterSubKegiatan,
  MasterKegiatan,
  MasterProgram,
} = require("../models");
const {
  evaluateSubBackfillCandidate,
  evaluateKegiatanBackfillHint,
  normKode,
  normNama,
} = require("./rpjmdLegacyBackfillHintService");

const DEFAULT_DATASET_KEY = "kepmendagri_provinsi_900_2024";

const ENTITY = {
  SUB_KEGIATAN: "SUB_KEGIATAN",
  KEGIATAN: "KEGIATAN",
  PROGRAM: "PROGRAM",
};

function datasetOrDefault(v) {
  const s = String(v || "").trim();
  return s || DEFAULT_DATASET_KEY;
}

function jsonSnapshotSub(row) {
  if (!row) return null;
  return {
    id: row.id,
    kegiatan_id: row.kegiatan_id,
    kode_sub_kegiatan: row.kode_sub_kegiatan,
    nama_sub_kegiatan: row.nama_sub_kegiatan,
    master_sub_kegiatan_id: row.master_sub_kegiatan_id,
    regulasi_versi_id: row.regulasi_versi_id,
    input_mode: row.input_mode,
  };
}

function jsonSnapshotKeg(row) {
  if (!row) return null;
  return {
    id: row.id,
    program_id: row.program_id,
    kode_kegiatan: row.kode_kegiatan,
    nama_kegiatan: row.nama_kegiatan,
    master_kegiatan_id: row.master_kegiatan_id,
    regulasi_versi_id: row.regulasi_versi_id,
    input_mode: row.input_mode,
  };
}

function jsonSnapshotProgram(row) {
  if (!row) return null;
  return {
    id: row.id,
    kode_program: row.kode_program,
    nama_program: row.nama_program,
    master_program_id: row.master_program_id,
    regulasi_versi_id: row.regulasi_versi_id,
    input_mode: row.input_mode,
  };
}

function masterSnapshotSub(m) {
  if (!m) return null;
  return {
    id: m.id,
    master_kegiatan_id: m.master_kegiatan_id,
    kode_sub_kegiatan_full: m.kode_sub_kegiatan_full,
    kode_sub_kegiatan: m.kode_sub_kegiatan,
    nama_sub_kegiatan: m.nama_sub_kegiatan,
    dataset_key: m.dataset_key,
    regulasi_versi_id: m.regulasi_versi_id,
  };
}

function masterSnapshotKeg(m) {
  if (!m) return null;
  return {
    id: m.id,
    master_program_id: m.master_program_id,
    kode_kegiatan_full: m.kode_kegiatan_full,
    kode_kegiatan: m.kode_kegiatan,
    nama_kegiatan: m.nama_kegiatan,
    dataset_key: m.dataset_key,
    regulasi_versi_id: m.regulasi_versi_id,
  };
}

function masterSnapshotProgram(m) {
  if (!m) return null;
  return {
    id: m.id,
    kode_program_full: m.kode_program_full,
    kode_program: m.kode_program,
    nama_program: m.nama_program,
    dataset_key: m.dataset_key,
    regulasi_versi_id: m.regulasi_versi_id,
  };
}

function kodeKegMatch(keg, m) {
  const ks = normKode(keg.kode_kegiatan);
  return (
    ks === normKode(m.kode_kegiatan_full) || ks === normKode(m.kode_kegiatan)
  );
}

function kodeProgramMatch(prog, m) {
  const kp = normKode(prog.kode_program);
  return kp === normKode(m.kode_program_full) || kp === normKode(m.kode_program);
}

/**
 * @returns {{ candidates: any[], risks: string[] }}
 */
async function findMatchingMasterSubs(sub, keg, datasetKey) {
  if (!keg || !keg.master_kegiatan_id) {
    return {
      candidates: [],
      risks: [
        "Kegiatan induk belum memiliki master_kegiatan_id — map kegiatan ke master terlebih dahulu.",
      ],
    };
  }
  const rows = await MasterSubKegiatan.findAll({
    where: {
      dataset_key: datasetKey,
      is_active: true,
      master_kegiatan_id: keg.master_kegiatan_id,
    },
  });
  const matches = rows.filter((m) => {
    const kodeS = normKode(sub.kode_sub_kegiatan);
    const kodeOk =
      kodeS === normKode(m.kode_sub_kegiatan_full) ||
      kodeS === normKode(m.kode_sub_kegiatan);
    const namaOk =
      normNama(sub.nama_sub_kegiatan) === normNama(m.nama_sub_kegiatan);
    return kodeOk && namaOk;
  });
  return { candidates: matches, risks: [] };
}

async function computeSubPreview(sub, keg, datasetKey, targetMasterId) {
  const current = {
    entity_type: ENTITY.SUB_KEGIATAN,
    entity_id: sub.id,
    row: jsonSnapshotSub(sub),
  };

  if (sub.master_sub_kegiatan_id != null) {
    const mid = Number(sub.master_sub_kegiatan_id);
    if (targetMasterId != null && Number(targetMasterId) === mid) {
      const existingMaster = await MasterSubKegiatan.findByPk(mid);
      return {
        current,
        candidate_master: existingMaster
          ? masterSnapshotSub(existingMaster)
          : null,
        candidates: [],
        match_reasons: ["Sudah termapping ke master ini."],
        risks: [],
        safe_to_execute: false,
        ambiguous: false,
        evaluation: null,
        required_target_master_id: mid,
        noop: true,
      };
    }
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: [
        `Sudah terhubung ke master_sub lain (id ${sub.master_sub_kegiatan_id}). Backfill menimpa mapping tidak diizinkan lewat endpoint ini.`,
      ],
      safe_to_execute: false,
      ambiguous: false,
      blocked: true,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  if (!keg) {
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: ["Sub tidak memiliki kegiatan induk."],
      safe_to_execute: false,
      ambiguous: false,
      blocked: true,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  const { candidates: pool0, risks: parentRisks } = await findMatchingMasterSubs(
    sub,
    keg,
    datasetKey,
  );
  if (parentRisks.length) {
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: parentRisks,
      safe_to_execute: false,
      ambiguous: false,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  let pool = pool0;
  if (targetMasterId != null) {
    const narrowed = pool.filter((c) => Number(c.id) === Number(targetMasterId));
    if (narrowed.length) {
      pool = narrowed;
    } else {
      const forced = await MasterSubKegiatan.findOne({
        where: {
          id: targetMasterId,
          dataset_key: datasetKey,
          is_active: true,
        },
      });
      if (!forced) {
        return {
          err: "target_master_id tidak ditemukan atau tidak aktif pada dataset_key ini.",
        };
      }
      if (Number(forced.master_kegiatan_id) !== Number(keg.master_kegiatan_id)) {
        return {
          err:
            "Master sub tidak selaras dengan master_kegiatan_id kegiatan transaksi induk.",
        };
      }
      pool = [forced];
    }
  }

  if (pool.length === 0) {
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: [
        "Tidak ada baris master sub yang cocok (kode + nama + induk kegiatan master).",
      ],
      safe_to_execute: false,
      ambiguous: false,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  if (pool.length > 1 && targetMasterId == null) {
    return {
      current,
      candidate_master: null,
      candidates: pool.map(masterSnapshotSub),
      match_reasons: [
        "Beberapa master sub memiliki kode dan nama identik pada induk yang sama.",
      ],
      risks: ["Ambigu — kirim target_master_id pada preview/execute setelah verifikasi manual."],
      safe_to_execute: false,
      ambiguous: true,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  const chosen = pool[0];
  const ev = evaluateSubBackfillCandidate({
    existingSub: sub,
    targetMasterSubId: chosen.id,
    targetKodeSub: chosen.kode_sub_kegiatan_full || chosen.kode_sub_kegiatan,
    targetNamaSub: chosen.nama_sub_kegiatan,
    targetMasterKegiatanId: keg.master_kegiatan_id,
  });

  const risks = ev.safe
    ? []
    : ev.checklist.filter((x) => !x.ok).map((x) => x.item);

  return {
    current,
    candidate_master: masterSnapshotSub(chosen),
    candidates: [],
    match_reasons: [
      "Kode dan nama cocok dengan master pada master_kegiatan induk yang sama dengan transaksi.",
      "Kegiatan transaksi sudah memiliki master_kegiatan_id.",
    ],
    risks,
    safe_to_execute: ev.safe,
    ambiguous: false,
    evaluation: ev,
    required_target_master_id: chosen.id,
    noop: false,
  };
}

async function computeKegPreview(keg, prog, datasetKey, targetMasterId) {
  const current = {
    entity_type: ENTITY.KEGIATAN,
    entity_id: keg.id,
    row: jsonSnapshotKeg(keg),
  };

  if (keg.master_kegiatan_id != null) {
    const mid = Number(keg.master_kegiatan_id);
    if (targetMasterId != null && Number(targetMasterId) === mid) {
      const existingMaster = await MasterKegiatan.findByPk(mid);
      return {
        current,
        candidate_master: existingMaster
          ? masterSnapshotKeg(existingMaster)
          : null,
        candidates: [],
        match_reasons: ["Sudah termapping ke master ini."],
        risks: [],
        safe_to_execute: false,
        ambiguous: false,
        evaluation: null,
        required_target_master_id: mid,
        noop: true,
      };
    }
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: [
        `Sudah terhubung ke master_kegiatan lain (id ${keg.master_kegiatan_id}).`,
      ],
      safe_to_execute: false,
      ambiguous: false,
      blocked: true,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  if (!prog || !prog.master_program_id) {
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: ["Program induk belum memiliki master_program_id."],
      safe_to_execute: false,
      ambiguous: false,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  const rows = await MasterKegiatan.findAll({
    where: {
      dataset_key: datasetKey,
      is_active: true,
      master_program_id: prog.master_program_id,
    },
  });

  let pool = rows.filter(
    (m) =>
      kodeKegMatch(keg, m) &&
      normNama(keg.nama_kegiatan) === normNama(m.nama_kegiatan),
  );

  if (targetMasterId != null) {
    const narrowed = pool.filter((c) => Number(c.id) === Number(targetMasterId));
    if (narrowed.length) {
      pool = narrowed;
    } else {
      const forced = await MasterKegiatan.findOne({
        where: {
          id: targetMasterId,
          dataset_key: datasetKey,
          is_active: true,
        },
      });
      if (!forced) {
        return { err: "target_master_id tidak ditemukan atau tidak aktif." };
      }
      if (Number(forced.master_program_id) !== Number(prog.master_program_id)) {
        return {
          err:
            "Master kegiatan tidak selaras dengan master_program_id program transaksi induk.",
        };
      }
      pool = [forced];
    }
  }

  if (pool.length === 0) {
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: ["Tidak ada master kegiatan yang cocok (kode + nama + induk program master)."],
      safe_to_execute: false,
      ambiguous: false,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  if (pool.length > 1 && targetMasterId == null) {
    return {
      current,
      candidate_master: null,
      candidates: pool.map(masterSnapshotKeg),
      match_reasons: ["Beberapa master kegiatan identik pada program master yang sama."],
      risks: ["Ambigu — kirim target_master_id setelah verifikasi manual."],
      safe_to_execute: false,
      ambiguous: true,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  const chosen = pool[0];
  const kodeOk = kodeKegMatch(keg, chosen);
  const namaOk =
    normNama(keg.nama_kegiatan) === normNama(chosen.nama_kegiatan);
  const hint = evaluateKegiatanBackfillHint({
    existingKegiatan: keg,
    targetMasterKegiatanId: chosen.id,
  });
  const extraRisks = [];
  if (!kodeOk) extraRisks.push("Kode kegiatan transaksi tidak sama dengan master target.");
  if (!namaOk) extraRisks.push("Nama kegiatan berbeda setelah normalisasi.");
  const risks = [
    ...extraRisks,
    ...(hint.safe ? [] : hint.checklist.filter((x) => !x.ok).map((x) => x.item)),
  ];
  const safe = hint.safe && kodeOk && namaOk;

  return {
    current,
    candidate_master: masterSnapshotKeg(chosen),
    candidates: [],
    match_reasons: [
      "Kode dan nama cocok dengan tepat satu master kegiatan pada program master induk.",
    ],
    risks,
    safe_to_execute: safe,
    ambiguous: false,
    evaluation: { kegiatan_hint: hint, kode_ok: kodeOk, nama_ok: namaOk },
    required_target_master_id: chosen.id,
    noop: false,
  };
}

async function computeProgramPreview(prog, datasetKey, targetMasterId) {
  const current = {
    entity_type: ENTITY.PROGRAM,
    entity_id: prog.id,
    row: jsonSnapshotProgram(prog),
  };

  if (prog.master_program_id != null) {
    const mid = Number(prog.master_program_id);
    if (targetMasterId != null && Number(targetMasterId) === mid) {
      const existingMaster = await MasterProgram.findByPk(mid);
      return {
        current,
        candidate_master: existingMaster
          ? masterSnapshotProgram(existingMaster)
          : null,
        candidates: [],
        match_reasons: ["Sudah termapping ke master ini."],
        risks: [],
        safe_to_execute: false,
        ambiguous: false,
        evaluation: null,
        required_target_master_id: mid,
        noop: true,
      };
    }
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: [
        `Sudah terhubung ke master_program lain (id ${prog.master_program_id}).`,
      ],
      safe_to_execute: false,
      ambiguous: false,
      blocked: true,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  const rows = await MasterProgram.findAll({
    where: { dataset_key: datasetKey, is_active: true },
  });

  let pool = rows.filter(
    (m) =>
      kodeProgramMatch(prog, m) &&
      normNama(prog.nama_program) === normNama(m.nama_program),
  );

  if (targetMasterId != null) {
    const narrowed = pool.filter((c) => Number(c.id) === Number(targetMasterId));
    if (narrowed.length) {
      pool = narrowed;
    } else {
      const forced = await MasterProgram.findOne({
        where: { id: targetMasterId, dataset_key: datasetKey, is_active: true },
      });
      if (!forced) {
        return { err: "target_master_id tidak ditemukan atau tidak aktif." };
      }
      pool = [forced];
    }
  }

  if (pool.length === 0) {
    return {
      current,
      candidate_master: null,
      candidates: [],
      match_reasons: [],
      risks: ["Tidak ada master program yang cocok (kode + nama)."],
      safe_to_execute: false,
      ambiguous: false,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  if (pool.length > 1 && targetMasterId == null) {
    return {
      current,
      candidate_master: null,
      candidates: pool.map(masterSnapshotProgram),
      match_reasons: ["Beberapa master program memiliki kode dan nama identik."],
      risks: ["Ambigu — kirim target_master_id setelah verifikasi manual."],
      safe_to_execute: false,
      ambiguous: true,
      evaluation: null,
      required_target_master_id: null,
      noop: false,
    };
  }

  const chosen = pool[0];
  const kodeOk = kodeProgramMatch(prog, chosen);
  const namaOk =
    normNama(prog.nama_program) === normNama(chosen.nama_program);
  const safe = kodeOk && namaOk;

  return {
    current,
    candidate_master: masterSnapshotProgram(chosen),
    candidates: [],
    match_reasons: ["Kode dan nama program cocok dengan satu master pada dataset."],
    risks: safe
      ? []
      : ["Kode atau nama tidak lolos pengecekan ketat — verifikasi manual."],
    safe_to_execute: safe,
    ambiguous: false,
    evaluation: { kode_ok: kodeOk, nama_ok: namaOk },
    required_target_master_id: chosen.id,
    noop: false,
  };
}

async function previewPayload(entityType, entityId, datasetKey, targetMasterId) {
  const dk = datasetOrDefault(datasetKey);

  if (entityType === ENTITY.SUB_KEGIATAN) {
    const sub = await SubKegiatan.unscoped().findByPk(entityId, {
      include: [{ model: Kegiatan, as: "kegiatan", required: false }],
    });
    if (!sub) return { ok: false, error: "Sub kegiatan tidak ditemukan." };
    const out = await computeSubPreview(sub, sub.kegiatan, dk, targetMasterId);
    if (out.err) return { ok: false, error: out.err };
    return { ok: true, data: out };
  }

  if (entityType === ENTITY.KEGIATAN) {
    const keg = await Kegiatan.unscoped().findByPk(entityId, {
      include: [{ model: Program, as: "program", required: false }],
    });
    if (!keg) return { ok: false, error: "Kegiatan tidak ditemukan." };
    const out = await computeKegPreview(keg, keg.program, dk, targetMasterId);
    if (out.err) return { ok: false, error: out.err };
    return { ok: true, data: out };
  }

  if (entityType === ENTITY.PROGRAM) {
    const prog = await Program.unscoped().findByPk(entityId);
    if (!prog) return { ok: false, error: "Program tidak ditemukan." };
    const out = await computeProgramPreview(prog, dk, targetMasterId);
    if (out.err) return { ok: false, error: out.err };
    return { ok: true, data: out };
  }

  return { ok: false, error: "entity_type tidak dikenal." };
}

async function preview({ entity_type, entity_id, dataset_key, target_master_id }) {
  const et = String(entity_type || "").trim().toUpperCase();
  const eid = parseInt(entity_id, 10);
  if (!Number.isInteger(eid) || eid < 1) {
    return { ok: false, error: "entity_id tidak valid." };
  }
  const tid =
    target_master_id != null && String(target_master_id).trim() !== ""
      ? parseInt(target_master_id, 10)
      : null;
  if (
    target_master_id != null &&
    String(target_master_id).trim() !== "" &&
    (!Number.isInteger(tid) || tid < 1)
  ) {
    return { ok: false, error: "target_master_id tidak valid." };
  }

  const r = await previewPayload(et, eid, dataset_key, tid);
  return r;
}

async function execute({
  entity_type,
  entity_id,
  target_master_id,
  dataset_key,
}) {
  const et = String(entity_type || "").trim().toUpperCase();
  const eid = parseInt(entity_id, 10);
  const tid = parseInt(target_master_id, 10);
  if (!Number.isInteger(eid) || eid < 1) {
    return { ok: false, error: "entity_id tidak valid." };
  }
  if (!Number.isInteger(tid) || tid < 1) {
    return { ok: false, error: "target_master_id wajib dan harus valid." };
  }

  const dk = datasetOrDefault(dataset_key);

  const result = await sequelize.transaction(async (t) => {
    if (et === ENTITY.SUB_KEGIATAN) {
      const sub = await SubKegiatan.unscoped().findByPk(eid, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        include: [{ model: Kegiatan, as: "kegiatan", required: false }],
      });
      if (!sub) return { err: "Sub kegiatan tidak ditemukan." };
      const oldState = jsonSnapshotSub(sub);
      const pv = await computeSubPreview(sub, sub.kegiatan, dk, tid);
      if (pv.err) return { err: pv.err };
      if (pv.blocked) {
        return { err: pv.risks[0] || "Backfill diblokir." };
      }
      if (pv.noop && Number(pv.required_target_master_id) === tid) {
        return { old_state: oldState, new_state: oldState, noop: true };
      }
      if (!pv.safe_to_execute) {
        return {
          err:
            pv.ambiguous
              ? "Masih ambigu atau belum aman — selesaikan preview dengan target yang terverifikasi."
              : (pv.risks[0] || "Kondisi tidak aman untuk eksekusi."),
        };
      }
      if (Number(pv.required_target_master_id) !== tid) {
        return { err: "target_master_id tidak cocok dengan kandidat preview terbaru." };
      }
      const master = await MasterSubKegiatan.findByPk(tid, { transaction: t });
      if (!master) return { err: "Master sub tidak ditemukan." };
      const nextReg =
        sub.regulasi_versi_id != null
          ? sub.regulasi_versi_id
          : master.regulasi_versi_id;
      await sub.update(
        {
          master_sub_kegiatan_id: tid,
          input_mode: "MASTER",
          regulasi_versi_id: nextReg,
        },
        { transaction: t },
      );
      await sub.reload({ transaction: t });
      return { old_state: oldState, new_state: jsonSnapshotSub(sub), noop: false };
    }

    if (et === ENTITY.KEGIATAN) {
      const keg = await Kegiatan.unscoped().findByPk(eid, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        include: [{ model: Program, as: "program", required: false }],
      });
      if (!keg) return { err: "Kegiatan tidak ditemukan." };
      const oldState = jsonSnapshotKeg(keg);
      const pv = await computeKegPreview(keg, keg.program, dk, tid);
      if (pv.err) return { err: pv.err };
      if (pv.blocked) return { err: pv.risks[0] || "Backfill diblokir." };
      if (pv.noop && Number(pv.required_target_master_id) === tid) {
        return { old_state: oldState, new_state: oldState, noop: true };
      }
      if (!pv.safe_to_execute) {
        return {
          err:
            pv.ambiguous
              ? "Masih ambigu — tentukan target_master_id setelah verifikasi."
              : (pv.risks[0] || "Kondisi tidak aman untuk eksekusi."),
        };
      }
      if (Number(pv.required_target_master_id) !== tid) {
        return { err: "target_master_id tidak cocok dengan kandidat preview terbaru." };
      }
      const master = await MasterKegiatan.findByPk(tid, { transaction: t });
      if (!master) return { err: "Master kegiatan tidak ditemukan." };
      const nextReg =
        keg.regulasi_versi_id != null
          ? keg.regulasi_versi_id
          : master.regulasi_versi_id;
      await keg.update(
        {
          master_kegiatan_id: tid,
          input_mode: "MASTER",
          regulasi_versi_id: nextReg,
        },
        { transaction: t },
      );
      await keg.reload({ transaction: t });
      return { old_state: oldState, new_state: jsonSnapshotKeg(keg), noop: false };
    }

    if (et === ENTITY.PROGRAM) {
      const prog = await Program.unscoped().findByPk(eid, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!prog) return { err: "Program tidak ditemukan." };
      const oldState = jsonSnapshotProgram(prog);
      const pv = await computeProgramPreview(prog, dk, tid);
      if (pv.err) return { err: pv.err };
      if (pv.blocked) return { err: pv.risks[0] || "Backfill diblokir." };
      if (pv.noop && Number(pv.required_target_master_id) === tid) {
        return { old_state: oldState, new_state: oldState, noop: true };
      }
      if (!pv.safe_to_execute) {
        return {
          err:
            pv.ambiguous
              ? "Masih ambigu — tentukan target_master_id setelah verifikasi."
              : (pv.risks[0] || "Kondisi tidak aman untuk eksekusi."),
        };
      }
      if (Number(pv.required_target_master_id) !== tid) {
        return { err: "target_master_id tidak cocok dengan kandidat preview terbaru." };
      }
      const master = await MasterProgram.findByPk(tid, { transaction: t });
      if (!master) return { err: "Master program tidak ditemukan." };
      const nextReg =
        prog.regulasi_versi_id != null
          ? prog.regulasi_versi_id
          : master.regulasi_versi_id;
      await prog.update(
        {
          master_program_id: tid,
          input_mode: "MASTER",
          regulasi_versi_id: nextReg,
        },
        { transaction: t },
      );
      await prog.reload({ transaction: t });
      return {
        old_state: oldState,
        new_state: jsonSnapshotProgram(prog),
        noop: false,
      };
    }

    return { err: "entity_type tidak dikenal." };
  });

  if (result.err) return { ok: false, error: result.err };
  return {
    ok: true,
    old_state: result.old_state,
    new_state: result.new_state,
    noop: Boolean(result.noop),
  };
}

module.exports = {
  preview,
  execute,
  ENTITY_TYPES: Object.freeze(Object.values(ENTITY)),
  DEFAULT_DATASET_KEY,
};
