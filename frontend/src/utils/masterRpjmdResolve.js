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
