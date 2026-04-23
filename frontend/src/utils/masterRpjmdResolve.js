/**
 * Cocokkan baris RPJMD (program/kegiatan/sub) dengan baris master impor Sheet2.
 */

import { normalizeProgramKodeForDisplay } from "./programDisplayLabel.js";

function norm(s) {
  return String(s ?? "").trim();
}

export function findMasterProgramRow(masterPrograms, rpjmdProgram) {
  if (!rpjmdProgram || !Array.isArray(masterPrograms) || !masterPrograms.length) {
    return null;
  }
  const k = normalizeProgramKodeForDisplay(rpjmdProgram.kode_program);
  if (!k) return null;
  return (
    masterPrograms.find((m) => {
      const mf = normalizeProgramKodeForDisplay(m.kode_program_full);
      const mp = normalizeProgramKodeForDisplay(m.kode_program);
      return mf === k || mp === k;
    }) ?? null
  );
}

export function findMasterKegiatanRow(masterKegiatans, rpjmdKegiatan) {
  if (!rpjmdKegiatan || !Array.isArray(masterKegiatans) || !masterKegiatans.length) {
    return null;
  }
  const k = norm(rpjmdKegiatan.kode_kegiatan);
  if (!k) return null;
  return (
    masterKegiatans.find((m) => {
      const mf = norm(m.kode_kegiatan_full);
      const mp = norm(m.kode_kegiatan);
      return mf === k || mp === k;
    }) ?? null
  );
}

/** Pasangan transaksi RPJMD untuk satu baris master program (cocokkan kode). */
export function findRpjmdProgramRowForMaster(programList, masterProgramRow) {
  if (!masterProgramRow || !Array.isArray(programList) || !programList.length) {
    return null;
  }
  const mk = normalizeProgramKodeForDisplay(
    masterProgramRow.kode_program_full ?? masterProgramRow.kode_program,
  );
  if (!mk) return null;
  return (
    programList.find(
      (p) => normalizeProgramKodeForDisplay(p.kode_program) === mk,
    ) ?? null
  );
}

/** Pasangan transaksi RPJMD untuk satu baris master kegiatan. */
export function findRpjmdKegiatanRowForMaster(kegiatanList, masterKegiatanRow) {
  if (!masterKegiatanRow || !Array.isArray(kegiatanList) || !kegiatanList.length) {
    return null;
  }
  const mk = norm(
    masterKegiatanRow.kode_kegiatan_full ?? masterKegiatanRow.kode_kegiatan,
  );
  if (!mk) return null;
  return (
    kegiatanList.find((k) => norm(k.kode_kegiatan) === mk) ?? null
  );
}
