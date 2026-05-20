const {
  RenstraKebijakan,
  RenstraOPD,
  RenstraStrategi,
  ArahKebijakan,
} = require("../models");

function toInt(v) {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function assertKebijakanConsistency({ strategi_id, rpjmd_arah_id, renstra_id }) {
  const sid = toInt(strategi_id);
  const aid = toInt(rpjmd_arah_id);
  const rid = toInt(renstra_id);
  if (!sid || !aid || !rid) {
    return {
      ok: false,
      code: "PAYLOAD_INVALID",
      message: "strategi_id, rpjmd_arah_id, dan renstra_id wajib diisi (angka).",
    };
  }

  const renstraStrategi = await RenstraStrategi.findByPk(sid, {
    attributes: ["id", "renstra_id", "rpjmd_strategi_id"],
  });
  if (!renstraStrategi) {
    return {
      ok: false,
      code: "RENSTRA_STRATEGI_NOT_FOUND",
      message: "strategi_id tidak valid: RenstraStrategi tidak ditemukan.",
    };
  }
  if (Number(renstraStrategi.renstra_id) !== Number(rid)) {
    return {
      ok: false,
      code: "RENSTRA_SCOPE_MISMATCH",
      message: "strategi_id tidak konsisten dengan renstra_id pada payload.",
      details: {
        renstra_strategi_id: sid,
        expected_renstra_id: Number(renstraStrategi.renstra_id),
        payload_renstra_id: rid,
      },
    };
  }

  const arah = await ArahKebijakan.findByPk(aid, { attributes: ["id", "strategi_id"] });
  if (!arah) {
    return {
      ok: false,
      code: "RPJMD_ARAH_NOT_FOUND",
      message: "rpjmd_arah_id tidak valid: Arah Kebijakan RPJMD tidak ditemukan.",
      details: { rpjmd_arah_id: aid },
    };
  }
  if (
    arah.strategi_id != null &&
    renstraStrategi.rpjmd_strategi_id != null &&
    Number(arah.strategi_id) !== Number(renstraStrategi.rpjmd_strategi_id)
  ) {
    return {
      ok: false,
      code: "CHAIN_MISMATCH",
      message:
        "Arah Kebijakan RPJMD tidak konsisten: arah kebijakan bukan turunan dari Strategi RPJMD yang dipilih pada RenstraStrategi.",
      details: {
        renstra_strategi_id: sid,
        expected_rpjmd_strategi_id: Number(renstraStrategi.rpjmd_strategi_id),
        target_rpjmd_arah_id: aid,
        target_rpjmd_arah_strategi_id: Number(arah.strategi_id),
      },
    };
  }

  return { ok: true };
}

exports.create = async (req, res) => {
  try {
    // Enforce untuk data baru: wajib konsisten parent-child Renstra→RPJMD.
    const chk = await assertKebijakanConsistency(req.body);
    if (!chk.ok) return res.status(400).json({ error: chk.message, code: chk.code, details: chk.details });

    const data = await RenstraKebijakan.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, strategi_id, rpjmd_arah_id } = req.query;

    const where = {};
    if (renstra_id) where.renstra_id = renstra_id;
    if (strategi_id) where.strategi_id = strategi_id;
    if (rpjmd_arah_id) where.rpjmd_arah_id = rpjmd_arah_id;

    const data = await RenstraKebijakan.findAll({
      where,
      attributes: [
        "id",
        "strategi_id",
        "rpjmd_arah_id",
        "kode_kebjkn",
        "deskripsi",
        "prioritas",
        "no_arah_rpjmd",
        "isi_arah_rpjmd",
        "renstra_id",
      ],
      order: [["id", "ASC"]],
      raw: true,
    });

    const result = data.map((row) => ({
      ...row,
      ref_id: row.rpjmd_arah_id,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraKebijakan.findByPk(req.params.id, {
      include: [
        { model: RenstraOPD, as: "renstra" },
        { model: RenstraStrategi, as: "strategi" },
        {
          model: ArahKebijakan,
          as: "arah_kebijakan",
          attributes: ["kode_arah", "deskripsi"],
        }, // Sesuaikan attributes jika perlu
        // RELASI KE RENSTRAKEBIJAKAN DENGAN ALIAS "KEBIJAKAN" DIHAPUS
        // JIKA TIDAK MEMILIKI TUJUAN FUNGSI SESPESIFIK
      ],
    });
    if (!data) return res.status(404).json({ message: "Data not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateKodeKebijakan = async (req, res) => {
  try {
    const { arah_kebijakan_id, renstra_id } = req.query;

    if (!arah_kebijakan_id || !renstra_id) {
      return res.status(400).json({
        message: "Parameter arah_kebijakan_id dan renstra_id diperlukan.",
      });
    }

    // Ambil data arah kebijakan
    const arahKebijakan = await ArahKebijakan.findByPk(arah_kebijakan_id);
    if (!arahKebijakan) {
      return res
        .status(404)
        .json({ message: "Arah Kebijakan tidak ditemukan." });
    }

    const kodeArah = arahKebijakan.kode_arah; // contoh: ASST1-01-01.2.1
    const bagianAkhir = kodeArah.split("-").slice(1).join("-"); // hasil: 01-01.2.1

    // Ambil kode yang sudah ada lalu pakai suffix terbesar + 1.
    // Ini lebih aman daripada count() karena count bisa ikut record lama/duplikat
    // yang tidak merepresentasikan urutan kode terakhir.
    const existingRows = await RenstraKebijakan.findAll({
      where: {
        rpjmd_arah_id: arah_kebijakan_id,
        renstra_id: renstra_id,
      },
      attributes: ["kode_kebjkn"],
      raw: true,
    });

    const suffixes = existingRows
      .map((row) => {
        const kode = String(row.kode_kebjkn || "");
        const match = kode.match(/\.([0-9]{2})$/);
        return match ? Number.parseInt(match[1], 10) : null;
      })
      .filter((n) => Number.isInteger(n) && n > 0);

    const nextNo = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 1;
    const noFormatted = String(nextNo).padStart(2, "0"); // jadi "01", "02", dst.

    const generatedKode = `AKR-${bagianAkhir}.${noFormatted}`;

    return res.status(200).json({ kode_otomatis: generatedKode });
  } catch (error) {
    console.error("Error generate kode kebijakan:", error);
    res.status(500).json({ message: "Gagal menghasilkan kode kebijakan." });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    const updateData = {};

    if (req.body.kode_kebjkn !== undefined) {
      updateData.kode_kebjkn = req.body.kode_kebjkn;
    }
    if (req.body.no_arah_rpjmd !== undefined) {
      updateData.no_arah_rpjmd = req.body.no_arah_rpjmd;
    }
    if (req.body.strategi_id !== undefined)
      updateData.strategi_id = req.body.strategi_id;
    if (req.body.rpjmd_arah_id !== undefined)
      updateData.rpjmd_arah_id = req.body.rpjmd_arah_id;
    if (req.body.deskripsi !== undefined)
      updateData.deskripsi = req.body.deskripsi;
    if (req.body.prioritas !== undefined)
      updateData.prioritas = req.body.prioritas;
    if (req.body.isi_arah_rpjmd !== undefined)
      updateData.isi_arah_rpjmd = req.body.isi_arah_rpjmd;
    if (req.body.jenisDokumen !== undefined)
      updateData.jenisDokumen = req.body.jenisDokumen;
    if (req.body.tahun !== undefined) updateData.tahun = req.body.tahun;
    if (req.body.renstra_id !== undefined)
      updateData.renstra_id = req.body.renstra_id;

    // Validasi konsistensi bila field kunci dikirim (aman untuk data existing: hanya enforce saat ada payload kunci).
    if (
      Object.prototype.hasOwnProperty.call(updateData, "strategi_id") ||
      Object.prototype.hasOwnProperty.call(updateData, "rpjmd_arah_id") ||
      Object.prototype.hasOwnProperty.call(updateData, "renstra_id")
    ) {
      // Safe: bila sebagian field kunci tidak dikirim saat update, ambil dari data existing.
      const existing = await RenstraKebijakan.findByPk(id, {
        attributes: ["id", "strategi_id", "rpjmd_arah_id", "renstra_id"],
      });
      if (!existing) return res.status(404).json({ message: "Data not found" });

      const chk = await assertKebijakanConsistency({
        strategi_id: updateData.strategi_id ?? existing.strategi_id,
        rpjmd_arah_id: updateData.rpjmd_arah_id ?? existing.rpjmd_arah_id,
        renstra_id: updateData.renstra_id ?? existing.renstra_id,
      });
      if (!chk.ok) return res.status(400).json({ error: chk.message, code: chk.code, details: chk.details });
    }

    const [updated] = await RenstraKebijakan.update(updateData, {
      where: { id },
    });

    if (!updated) return res.status(404).json({ message: "Data not found" });

    const updatedData = await RenstraKebijakan.findByPk(id, {
      include: [
        { model: RenstraOPD, as: "renstra" },
        { model: RenstraStrategi, as: "strategi" },
        {
          model: ArahKebijakan,
          as: "arah_kebijakan",
          attributes: ["kode_arah", "deskripsi"],
        }, // Sesuaikan attributes jika perlu
        // RELASI KE RENSTRAKEBIJAKAN DENGAN ALIAS "KEBIJAKAN" DIHAPUS
      ],
    });
    res.json(updatedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RenstraKebijakan.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
