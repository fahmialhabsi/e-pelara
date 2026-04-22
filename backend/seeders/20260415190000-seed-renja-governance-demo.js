"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [periodeRows] = await queryInterface.sequelize.query("SHOW TABLES LIKE '%periode%'");
    const periodeTable =
      (periodeRows || [])
        .map((x) => Object.values(x)[0])
        .find((t) => ["periode_rpjmds", "rpjmd_periode", "periode_rpjmd"].includes(String(t))) || null;
    if (!periodeTable) return;
    const [[periode]] = await queryInterface.sequelize.query(
      `SELECT id FROM ${periodeTable} ORDER BY id DESC LIMIT 1`,
    );
    const [[pd]] = await queryInterface.sequelize.query(
      "SELECT id FROM perangkat_daerah ORDER BY id ASC LIMIT 1",
    );
    const [[renstra]] = await queryInterface.sequelize.query(
      "SELECT id, perangkat_daerah_id FROM renstra_pd_dokumen ORDER BY id DESC LIMIT 1",
    );
    const [[rkpd]] = await queryInterface.sequelize.query(
      "SELECT id, tahun FROM rkpd_dokumen ORDER BY id DESC LIMIT 1",
    );
    if (!periode || !pd || !renstra) return;

    const perangkatDaerahId = renstra.perangkat_daerah_id || pd.id;
    const tahun = rkpd?.tahun || now.getFullYear();

    await queryInterface.bulkInsert("renja_dokumen", [
      {
        periode_id: periode.id,
        tahun,
        perangkat_daerah_id: perangkatDaerahId,
        renstra_pd_dokumen_id: renstra.id,
        rkpd_dokumen_id: rkpd?.id || null,
        judul: `RENJA Demo ${tahun}`,
        nomor_dokumen: `DEMO/RENJA/${tahun}/001`,
        nama_dokumen: `RENJA DEMO ${tahun}`,
        status: "draft",
        workflow_status: "draft",
        document_phase: "rancangan_awal",
        document_kind: "renja_awal",
        versi: 1,
        is_final_active: false,
        is_perubahan: false,
        is_test: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    const [[doc]] = await queryInterface.sequelize.query(
      "SELECT id FROM renja_dokumen WHERE is_test = 1 ORDER BY id DESC LIMIT 1",
    );
    if (!doc) return;

    await queryInterface.bulkInsert("renja_dokumen_section", [
      {
        renja_dokumen_id: doc.id,
        section_key: "pendahuluan",
        section_title: "BAB I Pendahuluan",
        content: "Contoh pendahuluan RENJA demo.",
        completion_pct: 40,
        is_locked: false,
        source_mode: "MANUAL",
        created_at: now,
        updated_at: now,
      },
      {
        renja_dokumen_id: doc.id,
        section_key: "evaluasi",
        section_title: "BAB II Evaluasi RENJA Tahun Lalu",
        content: "Contoh evaluasi RENJA demo.",
        completion_pct: 25,
        is_locked: false,
        source_mode: "MANUAL",
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert("renja_item", [
      {
        renja_dokumen_id: doc.id,
        urutan: 1,
        program: "Program Demo",
        kegiatan: "Kegiatan Demo",
        sub_kegiatan: "Sub Kegiatan Demo",
        indikator: "Persentase capaian demo",
        target_numerik: 90,
        satuan: "%",
        pagu_indikatif: 100000000,
        source_mode: "MANUAL",
        mismatch_status: "matched",
        status_baris: "draft",
        created_at: now,
        updated_at: now,
      },
      {
        renja_dokumen_id: doc.id,
        urutan: 2,
        program: "Program Sinkronisasi RKPD",
        kegiatan: "Kegiatan Belum Match",
        sub_kegiatan: "Sub Kegiatan Belum Match",
        indikator: "Jumlah item mismatch",
        target_numerik: 1,
        satuan: "item",
        pagu_indikatif: 25000000,
        source_mode: "RKPD",
        mismatch_status: "rkpd_only",
        status_baris: "draft",
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM renja_dokumen WHERE is_test = 1 AND judul LIKE 'RENJA Demo %'",
    );
    const ids = rows.map((r) => r.id);
    if (!ids.length) return;
    await queryInterface.bulkDelete("renja_item", { renja_dokumen_id: ids });
    await queryInterface.bulkDelete("renja_dokumen_section", { renja_dokumen_id: ids });
    await queryInterface.bulkDelete("renja_dokumen", { id: ids });
  },
};
