"use strict";

function deriveProgramIdFromItem(item = {}, renstraProgram = null) {
  if (item.program_id) return Number(item.program_id);
  if (renstraProgram?.rpjmd_program_id) return Number(renstraProgram.rpjmd_program_id);
  return null;
}

function resolvePolicyConflict(candidates = [], context = {}) {
  const unique = (candidates || []).filter(Boolean);
  if (!unique.length) {
    return {
      conflict_detected: false,
      selected_arah_kebijakan_id: null,
      selected_strategi_id: null,
      resolution_mode: "manual_required",
      conflict_reason: "Tidak ada kandidat arah kebijakan.",
    };
  }

  if (unique.length === 1) {
    return {
      conflict_detected: false,
      selected_arah_kebijakan_id: Number(unique[0].arah_kebijakan_id),
      selected_strategi_id: unique[0].strategi_id ? Number(unique[0].strategi_id) : null,
      resolution_mode: "auto_selected",
      conflict_reason: "Hanya satu arah kebijakan aktif.",
    };
  }

  const expectedStrategiId = context.expected_strategi_id ? Number(context.expected_strategi_id) : null;
  if (expectedStrategiId) {
    const byStrategi = unique.find((x) => Number(x.strategi_id || 0) === expectedStrategiId);
    if (byStrategi) {
      return {
        conflict_detected: true,
        selected_arah_kebijakan_id: Number(byStrategi.arah_kebijakan_id),
        selected_strategi_id: Number(byStrategi.strategi_id || expectedStrategiId),
        resolution_mode: "auto_selected",
        conflict_reason: "Dipilih otomatis berdasarkan strategi chain sumber.",
      };
    }
  }

  return {
    conflict_detected: true,
    selected_arah_kebijakan_id: null,
    selected_strategi_id: null,
    resolution_mode: "manual_required",
    conflict_reason: "Multi arah kebijakan ambigu dan butuh keputusan operator.",
  };
}

module.exports = {
  deriveProgramIdFromItem,
  resolvePolicyConflict,
};

