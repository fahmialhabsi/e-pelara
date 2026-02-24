// Import model yang diperlukan
const {
  Rpjmd,
  Opd,
  Misi,
  Tujuan,
  Sasaran,
  Program,
  Kegiatan,
  SubKegiatan,
  Indikator,
  RealisasiBulanan,
  Evaluasi,
  Op,
} = require("../models");

// Fungsi controller dengan async
const getLaporanRpjmd = async (req, res) => {
  try {
    // Ambil metadata RPJMD beserta OPD
    const rpjmd = await Rpjmd.findOne({
      where: { opd_id: req.params.opdId, tahun_penetapan: req.params.tahun },
      include: [{ model: Opd, as: "opd" }],
    });

    if (!rpjmd) {
      return res.status(404).json({ message: "RPJMD tidak ditemukan" });
    }

    // Ambil hirarki Misi -> Tujuan -> Sasaran
    const misiList = await Misi.findAll({
      where: { rpjmd_id: rpjmd.id },
      include: [
        {
          model: Tujuan,
          as: "tujuan",
          include: [{ model: Sasaran, as: "sasaran" }],
        },
      ],
    });

    // Format misi dengan tujuan dan sasaran
    const misi = misiList.map((m) => ({
      id: m.id,
      isi_misi: m.isi_misi,
      tujuan: m.tujuan.map((t) => ({
        id: t.id,
        isi_tujuan: t.isi_tujuan,
        sasaran: t.sasaran.map((s) => ({
          id: s.id,
          isi_sasaran: s.isi_sasaran,
        })),
      })),
    }));

    // Ambil program beserta hirarki indikator, realisasi, evaluasi
    const programs = await Program.findAll({
      where: { opd_id: req.params.opdId },
      include: [
        {
          model: Kegiatan,
          as: "kegiatan",
          include: [
            {
              model: SubKegiatan,
              as: "sub_kegiatan",
              include: [
                {
                  model: Indikator,
                  as: "indikator",
                  include: [
                    {
                      model: RealisasiBulanan,
                      as: "realisasi_bulanan",
                      where: { tahun: req.params.tahun },
                      required: false,
                    },
                    {
                      model: Evaluasi,
                      as: "evaluasi",
                      where: {
                        tanggal_evaluasi: {
                          [Op.between]: [
                            `${req.params.tahun}-01-01`,
                            `${req.params.tahun}-12-31`,
                          ],
                        },
                      },
                      required: false,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    // Bentuk response
    const response = {
      tahun_penetapan: rpjmd.tahun_penetapan,
      opd: {
        id: rpjmd.opd.id,
        nama: rpjmd.opd.nama,
        akronim: rpjmd.opd.akronim,
      },
      visi: rpjmd.visi,
      misi,
      programs: programs.map((prg) => ({
        id: prg.id,
        kode_program: prg.kode_program,
        nama_program: prg.nama_program,
        kegiatan: prg.kegiatan.map((keg) => ({
          id: keg.id,
          kode_kegiatan: keg.kode_kegiatan,
          nama_kegiatan: keg.nama_kegiatan,
          sub_kegiatan: keg.sub_kegiatan.map((sub) => ({
            id: sub.id,
            kode_sub: sub.kode_sub_kegiatan,
            nama_sub_kegiatan: sub.nama_sub_kegiatan,
            indikator: sub.indikator.map((ind) => ({
              id: ind.id,
              kode_indikator: ind.kode_indikator,
              nama_indikator: ind.nama_indikator,
              definisi_operasional: ind.definisi_operasional,
              satuan: ind.satuan,
              baseline: ind.baseline,
              target: ind.target[req.params.tahun] || null,
              realisasi_bulanan: ind.realisasi_bulanan.map((rb) => ({
                bulan: rb.bulan.toString().padStart(2, "0"),
                nilai: rb.realisasi,
              })),
              realisasi_terbaru: ind.realisasi_bulanan.reduce(
                (last, rb) => (rb.bulan > last.bulan ? rb : last),
                { bulan: 0, realisasi: 0 }
              ).realisasi,
              evaluasi:
                ind.evaluasi.length > 0
                  ? {
                      tanggal: ind.evaluasi[0].tanggal_evaluasi,
                      status: ind.evaluasi[0].status,
                      catatan: ind.evaluasi[0].catatan,
                      rekomendasi: ind.evaluasi[0].rekomendasi,
                    }
                  : null,
            })),
          })),
        })),
      })),
    };

    // Kirim response
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

module.exports = {
  getLaporanRpjmd,
};
