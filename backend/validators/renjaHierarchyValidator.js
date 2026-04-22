"use strict";

async function validateHierarchy(db, { dokumen, item }) {
  const {
    Program,
    Kegiatan,
    SubKegiatan,
    RenstraProgram,
    RenstraKegiatan,
    RenstraSubkegiatan,
    RkpdItem,
  } = db;

  const results = [];

  const push = (code, message, isBlocking = true, extra = {}) => {
    results.push({
      severity: isBlocking ? "error" : "warning",
      mismatch_scope: "item",
      source_type: "INTERNAL",
      mismatch_code: code,
      mismatch_label: code,
      message,
      recommendation: "Perbaiki referensi hirarki sebelum menyimpan.",
      is_blocking: isBlocking,
      ...extra,
    });
  };

  if (item.program_id) {
    const program = await Program.findByPk(item.program_id);
    if (!program) {
      push("PROGRAM_NOT_FOUND", "program_id tidak ditemukan pada master.", true, {
        field_name: "program_id",
      });
    }
  }

  if (item.kegiatan_id) {
    const kegiatan = await Kegiatan.findByPk(item.kegiatan_id);
    if (!kegiatan) {
      push("KEGIATAN_NOT_FOUND", "kegiatan_id tidak ditemukan pada master.", true, {
        field_name: "kegiatan_id",
      });
    } else if (item.program_id && Number(kegiatan.program_id) !== Number(item.program_id)) {
      push("INVALID_PARENT_CHILD", "kegiatan_id bukan child dari program_id.", true, {
        field_name: "kegiatan_id",
      });
    }
  }

  if (item.sub_kegiatan_id) {
    const sub = await SubKegiatan.findByPk(item.sub_kegiatan_id);
    if (!sub) {
      push("SUB_KEGIATAN_NOT_FOUND", "sub_kegiatan_id tidak ditemukan pada master.", true, {
        field_name: "sub_kegiatan_id",
      });
    } else if (item.kegiatan_id && Number(sub.kegiatan_id) !== Number(item.kegiatan_id)) {
      push("INVALID_PARENT_CHILD", "sub_kegiatan_id bukan child dari kegiatan_id.", true, {
        field_name: "sub_kegiatan_id",
      });
    }
  }

  if (item.source_renstra_program_id) {
    const p = await RenstraProgram.findByPk(item.source_renstra_program_id);
    if (!p) {
      push("RENSTRA_PROGRAM_NOT_FOUND", "source_renstra_program_id tidak valid.", true, {
        source_type: "RENSTRA",
        field_name: "source_renstra_program_id",
      });
    }
  }
  if (item.source_renstra_kegiatan_id) {
    const k = await RenstraKegiatan.findByPk(item.source_renstra_kegiatan_id);
    if (!k) {
      push("RENSTRA_KEGIATAN_NOT_FOUND", "source_renstra_kegiatan_id tidak valid.", true, {
        source_type: "RENSTRA",
        field_name: "source_renstra_kegiatan_id",
      });
    } else if (
      item.source_renstra_program_id &&
      Number(k.program_id) !== Number(item.source_renstra_program_id)
    ) {
      push("INVALID_PARENT_CHILD", "source_renstra_kegiatan_id bukan child source_renstra_program_id.", true, {
        source_type: "RENSTRA",
      });
    }
  }
  if (item.source_renstra_subkegiatan_id) {
    const s = await RenstraSubkegiatan.findByPk(item.source_renstra_subkegiatan_id);
    if (!s) {
      push("RENSTRA_SUBKEGIATAN_NOT_FOUND", "source_renstra_subkegiatan_id tidak valid.", true, {
        source_type: "RENSTRA",
      });
    } else if (
      item.source_renstra_kegiatan_id &&
      Number(s.kegiatan_id) !== Number(item.source_renstra_kegiatan_id)
    ) {
      push("INVALID_PARENT_CHILD", "source_renstra_subkegiatan_id bukan child source_renstra_kegiatan_id.", true, {
        source_type: "RENSTRA",
      });
    }
  }

  if (item.source_rkpd_item_id) {
    const rkpdItem = await RkpdItem.findByPk(item.source_rkpd_item_id);
    if (!rkpdItem) {
      push("RKPD_ITEM_NOT_FOUND", "source_rkpd_item_id tidak valid.", true, {
        source_type: "RKPD",
        field_name: "source_rkpd_item_id",
      });
    } else if (dokumen?.rkpd_dokumen_id && Number(rkpdItem.rkpd_dokumen_id) !== Number(dokumen.rkpd_dokumen_id)) {
      push("RKPD_ITEM_WRONG_DOCUMENT", "source_rkpd_item_id tidak berada pada dokumen RKPD sumber.", true, {
        source_type: "RKPD",
      });
    }
  }

  const sourceMode = String(item.source_mode || "MANUAL").toUpperCase();
  if (sourceMode === "RENSTRA") {
    if (!item.source_renstra_program_id || !item.source_renstra_kegiatan_id || !item.source_renstra_subkegiatan_id) {
      push("RENSTRA_SOURCE_INCOMPLETE", "source_mode=RENSTRA mewajibkan referensi RENSTRA lengkap.", true, {
        source_type: "RENSTRA",
      });
    }
  }
  if (sourceMode === "RKPD") {
    if (!item.source_rkpd_item_id) {
      push("RKPD_SOURCE_REQUIRED", "source_mode=RKPD mewajibkan source_rkpd_item_id.", true, {
        source_type: "RKPD",
      });
    }
  }
  if (sourceMode === "IRISAN") {
    if (!item.source_rkpd_item_id || !item.source_renstra_subkegiatan_id) {
      push("IRISAN_SOURCE_INCOMPLETE", "source_mode=IRISAN mewajibkan referensi RENSTRA dan RKPD.", true, {
        source_type: "IRISAN",
      });
    }
  }

  if (Number(item.target_numerik) < 0) {
    push("TARGET_NEGATIVE", "target_numerik tidak boleh negatif.", true, {
      field_name: "target_numerik",
    });
  }
  if (item.target_numerik != null && !Number.isFinite(Number(item.target_numerik))) {
    push("TARGET_INVALID", "target_numerik harus angka valid.", true, {
      field_name: "target_numerik",
    });
  }
  if (Number(item.pagu_indikatif) < 0) {
    push("PAGU_NEGATIVE", "pagu_indikatif tidak boleh negatif.", true, {
      field_name: "pagu_indikatif",
    });
  }

  return results;
}

module.exports = {
  validateHierarchy,
};
