// controllers/wizardController.js
// Bootstrap context: traverse hierarki ke atas dari entry point tertentu
const {
  Misi, Tujuan, Sasaran, Strategi, ArahKebijakan, Program, Kegiatan,
} = require("../models");

/* ── GET /api/wizard/bootstrap-context
   Query params:
     from            : "tujuan" | "sasaran" | "strategi" | "arah_kebijakan" |
                       "program" | "kegiatan" | "sub_kegiatan"
     misi_id / tujuan_id / sasaran_id / strategi_id /
     arah_kebijakan_id / program_id / kegiatan_id  : ID parent yg relevan
     tahun, jenis_dokumen                           : opsional
──────────────────────────────────────────────────── */
exports.bootstrapContext = async (req, res) => {
  try {
    const { from, tahun, jenis_dokumen, ...ids } = req.query;

    const VALID = ["tujuan","sasaran","strategi","arah_kebijakan","program","kegiatan","sub_kegiatan"];
    if (!from || !VALID.includes(from)) {
      return res.status(400).json({ message: `'from' tidak valid. Pilihan: ${VALID.join(", ")}` });
    }

    const ctx = {};
    const set = (k, v) => { if (v != null) ctx[k] = v; };

    /* ── 1. TUJUAN: butuh misi_id ── */
    if (from === "tujuan") {
      const m = await Misi.findByPk(ids.misi_id);
      if (!m) return res.status(404).json({ message: `Misi ${ids.misi_id} tidak ditemukan` });
      set("misi_id", m.id); set("no_misi", m.no_misi); set("isi_misi", m.isi_misi);
    }

    /* ── 2. SASARAN: butuh tujuan_id ── */
    if (from === "sasaran") {
      const t = await Tujuan.findByPk(ids.tujuan_id, { include: [{ model: Misi, as: "Misi" }] });
      if (!t) return res.status(404).json({ message: `Tujuan ${ids.tujuan_id} tidak ditemukan` });
      set("tujuan_id", t.id);
      set("tujuan_label", `${t.no_tujuan} ${t.isi_tujuan}`);
      set("misi_id", t.misi_id);
      if (t.Misi) { set("no_misi", t.Misi.no_misi); set("isi_misi", t.Misi.isi_misi); }
    }

    /* ── 3. STRATEGI: butuh sasaran_id ── */
    if (from === "strategi") {
      const s = await Sasaran.findByPk(ids.sasaran_id, {
        include: [{ model: Tujuan, as: "Tujuan", include: [{ model: Misi, as: "Misi" }] }],
      });
      if (!s) return res.status(404).json({ message: `Sasaran ${ids.sasaran_id} tidak ditemukan` });
      set("sasaran_id", s.id); set("sasaran_label", s.isi_sasaran);
      set("tujuan_id", s.tujuan_id);
      if (s.Tujuan) {
        set("tujuan_label", `${s.Tujuan.no_tujuan} ${s.Tujuan.isi_tujuan}`);
        set("misi_id", s.Tujuan.misi_id);
        if (s.Tujuan.Misi) { set("no_misi", s.Tujuan.Misi.no_misi); set("isi_misi", s.Tujuan.Misi.isi_misi); }
      }
    }

    /* ── 4. ARAH KEBIJAKAN: butuh strategi_id ── */
    if (from === "arah_kebijakan") {
      const st = await Strategi.findByPk(ids.strategi_id, {
        include: [{
          model: Sasaran, as: "Sasaran",
          include: [{ model: Tujuan, as: "Tujuan", include: [{ model: Misi, as: "Misi" }] }],
        }],
      });
      if (!st) return res.status(404).json({ message: `Strategi ${ids.strategi_id} tidak ditemukan` });
      set("strategi_id", st.id);
      set("strategi_label", `${st.kode_strategi} - ${st.deskripsi}`);
      set("sasaran_id", st.sasaran_id);
      if (st.Sasaran) {
        set("sasaran_label", st.Sasaran.isi_sasaran);
        set("tujuan_id", st.Sasaran.tujuan_id);
        if (st.Sasaran.Tujuan) {
          set("tujuan_label", `${st.Sasaran.Tujuan.no_tujuan} ${st.Sasaran.Tujuan.isi_tujuan}`);
          set("misi_id", st.Sasaran.Tujuan.misi_id);
          if (st.Sasaran.Tujuan.Misi) {
            set("no_misi", st.Sasaran.Tujuan.Misi.no_misi);
            set("isi_misi", st.Sasaran.Tujuan.Misi.isi_misi);
          }
        }
      }
    }

    /* ── 5. PROGRAM: butuh sasaran_id (atau arah_kebijakan_id nanti) ── */
    if (from === "program") {
      const s = await Sasaran.findByPk(ids.sasaran_id, {
        include: [{ model: Tujuan, as: "Tujuan", include: [{ model: Misi, as: "Misi" }] }],
      });
      if (!s) return res.status(404).json({ message: `Sasaran ${ids.sasaran_id} tidak ditemukan` });
      set("sasaran_id", s.id); set("sasaran_label", s.isi_sasaran);
      set("tujuan_id", s.tujuan_id);
      if (s.Tujuan) {
        set("tujuan_label", `${s.Tujuan.no_tujuan} ${s.Tujuan.isi_tujuan}`);
        set("misi_id", s.Tujuan.misi_id);
        if (s.Tujuan.Misi) { set("no_misi", s.Tujuan.Misi.no_misi); set("isi_misi", s.Tujuan.Misi.isi_misi); }
      }
    }

    /* ── 6. KEGIATAN: butuh program_id ── */
    if (from === "kegiatan") {
      const p = await Program.findByPk(ids.program_id, {
        include: [{
          model: Sasaran, as: "sasaran",
          include: [{ model: Tujuan, as: "Tujuan", include: [{ model: Misi, as: "Misi" }] }],
        }],
      });
      if (!p) return res.status(404).json({ message: `Program ${ids.program_id} tidak ditemukan` });
      set("program_id", p.id);
      set("program_label", `${p.kode_program} - ${p.nama_program}`);
      set("sasaran_id", p.sasaran_id);
      if (p.sasaran) {
        set("sasaran_label", p.sasaran.isi_sasaran);
        set("tujuan_id", p.sasaran.tujuan_id);
        if (p.sasaran.Tujuan) {
          set("tujuan_label", `${p.sasaran.Tujuan.no_tujuan} ${p.sasaran.Tujuan.isi_tujuan}`);
          set("misi_id", p.sasaran.Tujuan.misi_id);
          if (p.sasaran.Tujuan.Misi) {
            set("no_misi", p.sasaran.Tujuan.Misi.no_misi);
            set("isi_misi", p.sasaran.Tujuan.Misi.isi_misi);
          }
        }
      }
    }

    /* ── 7. SUB KEGIATAN: butuh kegiatan_id ── */
    if (from === "sub_kegiatan") {
      const k = await Kegiatan.findByPk(ids.kegiatan_id, {
        include: [{
          model: Program, as: "program",
          include: [{
            model: Sasaran, as: "sasaran",
            include: [{ model: Tujuan, as: "Tujuan", include: [{ model: Misi, as: "Misi" }] }],
          }],
        }],
      });
      if (!k) return res.status(404).json({ message: `Kegiatan ${ids.kegiatan_id} tidak ditemukan` });
      set("kegiatan_id", k.id);
      set("kegiatan_label", `${k.kode_kegiatan} - ${k.nama_kegiatan}`);
      set("program_id", k.program_id);
      if (k.program) {
        set("program_label", `${k.program.kode_program} - ${k.program.nama_program}`);
        set("sasaran_id", k.program.sasaran_id);
        if (k.program.sasaran) {
          set("sasaran_label", k.program.sasaran.isi_sasaran);
          set("tujuan_id", k.program.sasaran.tujuan_id);
          if (k.program.sasaran.Tujuan) {
            set("tujuan_label", `${k.program.sasaran.Tujuan.no_tujuan} ${k.program.sasaran.Tujuan.isi_tujuan}`);
            set("misi_id", k.program.sasaran.Tujuan.misi_id);
            if (k.program.sasaran.Tujuan.Misi) {
              set("no_misi", k.program.sasaran.Tujuan.Misi.no_misi);
              set("isi_misi", k.program.sasaran.Tujuan.Misi.isi_misi);
            }
          }
        }
      }
    }

    return res.json({
      status: "success",
      from,
      context: { ...ctx, tahun: tahun || null, jenis_dokumen: jenis_dokumen || null },
    });
  } catch (err) {
    console.error("[wizardController.bootstrapContext]", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
