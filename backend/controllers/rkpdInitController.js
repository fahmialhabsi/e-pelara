// controllers/rkpdInitController.js
const {
  Misi,
  Tujuan,
  Sasaran,
  Strategi,
  Program,
  Kegiatan,
  SubKegiatan,
} = require("../models");

const { getPeriodeIdFromTahun } = require("../utils/periodeHelper");

const {
  autoCloneIndikatorIfNeeded,
} = require("../utils/autoCloneIndikatorIfNeeded");
const { autoCloneTujuanIfNeeded } = require("../utils/autoCloneTujuanIfNeeded");
const {
  autoCloneSasaranIfNeeded,
} = require("../utils/autoCloneSasaranIfNeeded");
const {
  autoCloneStrategiIfNeeded,
} = require("../utils/autoCloneStrategiIfNeeded");
const {
  autoCloneProgramsIfNeeded,
} = require("../utils/autoCloneProgramsIfNeeded");
const {
  autoCloneKegiatanIfNeeded,
} = require("../utils/autoCloneKegiatanIfNeeded");
const {
  autoCloneSubKegiatanIfNeeded,
} = require("../utils/autoCloneSubKegiatanIfNeeded");
const {
  autoCloneArahKebijakanIfNeeded,
} = require("../utils/autoCloneArahKebijakanIfNeeded");
const {
  autoClonePrioritasNasionalIfNeeded,
} = require("../utils/autoClonePrioritasNasionalIfNeeded");
const {
  autoClonePrioritasDaerahIfNeeded,
} = require("../utils/autoClonePrioritasDaerahIfNeeded");
const {
  autoClonePrioritasKepalaDaerahIfNeeded,
} = require("../utils/autoClonePrioritasKepalaDaerahIfNeeded");

// ✅ autoCloneMisi pakai jenis_dokumen agar konsisten
async function autoCloneMisi({ tahun, periode_id, jenis_dokumen }) {
  console.log("🔁 Cloning Misi...");

  const existing = await Misi.count({
    where: { tahun, periode_id, jenis_dokumen },
  });

  if (existing > 0) return console.log("✅ Misi sudah ada, skip clone.");

  const misiRpjmd = await Misi.findAll({
    where: { jenis_dokumen: "rpjmd", tahun, periode_id },
  });

  const data = misiRpjmd.map((m) => ({
    no_misi: m.no_misi,
    isi_misi: m.isi_misi,
    visi_id: m.visi_id,
    jenis_dokumen,
    tahun,
    periode_id,
    created_at: new Date(),
    updated_at: new Date(),
  }));

  await Misi.bulkCreate(data);
  console.log(`✅ Misi cloned: ${data.length}`);
}

const initController = {
  async initAll(req, res) {
    try {
      const { tahun } = req.body;
      const jenisDokumen = req.body.jenisDokumen || req.body.jenis_dokumen;

      if (!tahun) {
        return res.status(400).json({ message: "Tahun wajib diisi." });
      }
      if (!jenisDokumen) {
        return res.status(400).json({ message: "Jenis dokumen wajib diisi." });
      }

      const periode_id = await getPeriodeIdFromTahun(tahun);
      if (!periode_id) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }

      // ✅ Mapping agar konsisten dengan modul-modul lain
      const jenis_dokumen = jenisDokumen;

      // ✅ Argument konsisten
      const args = { tahun, periode_id, jenis_dokumen };

      await autoCloneMisi(args);
      await autoCloneTujuanIfNeeded(args);
      await autoCloneSasaranIfNeeded(args);
      await autoCloneStrategiIfNeeded(args);
      await autoCloneProgramsIfNeeded(args);
      await autoCloneKegiatanIfNeeded(args);
      await autoCloneSubKegiatanIfNeeded(args);
      await autoCloneArahKebijakanIfNeeded(args);
      await autoClonePrioritasNasionalIfNeeded(args);
      await autoClonePrioritasDaerahIfNeeded(args);
      await autoClonePrioritasKepalaDaerahIfNeeded(args);
      await autoCloneIndikatorIfNeeded(args);

      return res.status(200).json({
        message: `✅ Inisialisasi ${jenisDokumen.toUpperCase()} tahun ${tahun} selesai.`,
      });
    } catch (err) {
      console.error("❌ Error init dokumen:", err);
      res.status(500).json({
        message: "Gagal inisialisasi dokumen",
        error: err.message,
      });
    }
  },
};

module.exports = initController;
