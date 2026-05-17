// backend/services/renstraIndicatorHierarchyValidationService.js
"use strict";

const {
  IndikatorRenstra,
  RenstraTujuan,
  RenstraSasaran,
  RenstraStrategi,
  RenstraKebijakan,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
} = require("../models");

const STAGES = [
  "tujuan",
  "sasaran",
  "strategi",
  "kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
];

function addIssue(issues, severity, stage, refId, message, meta = {}) {
  issues.push({ severity, stage, ref_id: refId, message, ...meta });
}

async function hasIndicator(stage, refId, renstraId) {
  if (!refId) return false;
  const count = await IndikatorRenstra.count({
    where: { stage, ref_id: refId, renstra_id: renstraId },
  });
  return count > 0;
}

async function validateRenstraIndicatorHierarchy(renstraId) {
  const issues = [];
  const summary = {};

  for (const stage of STAGES) {
    summary[stage] = await IndikatorRenstra.count({ where: { renstra_id: renstraId, stage } });
  }

  const [tujuans, sasarans, strategis, kebijakans, programs, kegiatans, subs] =
    await Promise.all([
      IndikatorRenstra.findAll({ where: { renstra_id: renstraId, stage: "tujuan" }, raw: true }),
      IndikatorRenstra.findAll({ where: { renstra_id: renstraId, stage: "sasaran" }, raw: true }),
      IndikatorRenstra.findAll({ where: { renstra_id: renstraId, stage: "strategi" }, raw: true }),
      IndikatorRenstra.findAll({ where: { renstra_id: renstraId, stage: "kebijakan" }, raw: true }),
      IndikatorRenstra.findAll({ where: { renstra_id: renstraId, stage: "program" }, raw: true }),
      IndikatorRenstra.findAll({ where: { renstra_id: renstraId, stage: "kegiatan" }, raw: true }),
      IndikatorRenstra.findAll({ where: { renstra_id: renstraId, stage: "sub_kegiatan" }, raw: true }),
    ]);

  for (const item of tujuans) {
    const parent = await RenstraTujuan.findOne({ where: { id: item.ref_id, renstra_id: renstraId }, raw: true });
    if (!parent) addIssue(issues, "error", "tujuan", item.ref_id, "Indikator tujuan tidak memiliki parent RenstraTujuan yang valid.", { indikator_id: item.id });
  }

  for (const item of sasarans) {
    const parent = await RenstraSasaran.findOne({ where: { id: item.ref_id, renstra_id: renstraId }, raw: true });
    if (!parent) {
      addIssue(issues, "error", "sasaran", item.ref_id, "Indikator sasaran tidak memiliki parent RenstraSasaran yang valid.", { indikator_id: item.id });
      continue;
    }
    if (!parent.tujuan_id) addIssue(issues, "error", "sasaran", item.ref_id, "RenstraSasaran tidak memiliki tujuan_id.", { indikator_id: item.id });
    else if (!(await hasIndicator("tujuan", parent.tujuan_id, renstraId))) {
      addIssue(issues, "warning", "sasaran", item.ref_id, "Parent tujuan belum memiliki indikator Renstra.", { indikator_id: item.id, parent_stage: "tujuan", parent_ref_id: parent.tujuan_id });
    }
  }

  for (const item of strategis) {
    const parent = await RenstraStrategi.findOne({ where: { id: item.ref_id, renstra_id: renstraId }, raw: true });
    if (!parent) {
      addIssue(issues, "error", "strategi", item.ref_id, "Indikator strategi tidak memiliki parent RenstraStrategi yang valid.", { indikator_id: item.id });
      continue;
    }
    if (!parent.sasaran_id) addIssue(issues, "error", "strategi", item.ref_id, "RenstraStrategi tidak memiliki sasaran_id.", { indikator_id: item.id });
    else if (!(await hasIndicator("sasaran", parent.sasaran_id, renstraId))) {
      addIssue(issues, "warning", "strategi", item.ref_id, "Parent sasaran belum memiliki indikator Renstra.", { indikator_id: item.id, parent_stage: "sasaran", parent_ref_id: parent.sasaran_id });
    }
  }

  for (const item of kebijakans) {
    const parent = await RenstraKebijakan.findOne({ where: { id: item.ref_id, renstra_id: renstraId }, raw: true });
    if (!parent) {
      addIssue(issues, "error", "kebijakan", item.ref_id, "Indikator arah kebijakan tidak memiliki parent RenstraKebijakan yang valid.", { indikator_id: item.id });
      continue;
    }
    if (!parent.strategi_id) addIssue(issues, "error", "kebijakan", item.ref_id, "RenstraKebijakan tidak memiliki strategi_id.", { indikator_id: item.id });
    else if (!(await hasIndicator("strategi", parent.strategi_id, renstraId))) {
      addIssue(issues, "warning", "kebijakan", item.ref_id, "Parent strategi belum memiliki indikator Renstra.", { indikator_id: item.id, parent_stage: "strategi", parent_ref_id: parent.strategi_id });
    }
  }

  for (const item of programs) {
    const parent = await RenstraProgram.findOne({ where: { id: item.ref_id, renstra_id: renstraId }, raw: true });
    if (!parent) addIssue(issues, "error", "program", item.ref_id, "Indikator program tidak memiliki parent RenstraProgram yang valid.", { indikator_id: item.id });
  }

  for (const item of kegiatans) {
    const parent = await RenstraKegiatan.findOne({ where: { id: item.ref_id, renstra_id: renstraId }, raw: true });
    if (!parent) {
      addIssue(issues, "error", "kegiatan", item.ref_id, "Indikator kegiatan tidak memiliki parent RenstraKegiatan yang valid.", { indikator_id: item.id });
      continue;
    }
    if (!parent.program_id) addIssue(issues, "error", "kegiatan", item.ref_id, "RenstraKegiatan tidak memiliki program_id.", { indikator_id: item.id });
    else if (!(await hasIndicator("program", parent.program_id, renstraId))) {
      addIssue(issues, "warning", "kegiatan", item.ref_id, "Parent program belum memiliki indikator Renstra.", { indikator_id: item.id, parent_stage: "program", parent_ref_id: parent.program_id });
    }
  }

  for (const item of subs) {
    const parent = await RenstraSubkegiatan.findOne({ where: { id: item.ref_id }, raw: true });
    if (!parent) {
      addIssue(issues, "error", "sub_kegiatan", item.ref_id, "Indikator sub kegiatan tidak memiliki parent RenstraSubkegiatan yang valid.", { indikator_id: item.id });
      continue;
    }
    if (!parent.kegiatan_id) addIssue(issues, "error", "sub_kegiatan", item.ref_id, "RenstraSubkegiatan tidak memiliki kegiatan_id.", { indikator_id: item.id });
    else if (!(await hasIndicator("kegiatan", parent.kegiatan_id, renstraId))) {
      addIssue(issues, "warning", "sub_kegiatan", item.ref_id, "Parent kegiatan belum memiliki indikator Renstra.", { indikator_id: item.id, parent_stage: "kegiatan", parent_ref_id: parent.kegiatan_id });
    }
  }

  return {
    renstra_id: Number(renstraId),
    valid: !issues.some((issue) => issue.severity === "error"),
    summary,
    issues,
  };
}

module.exports = { validateRenstraIndicatorHierarchy };
