// File: controllers/rkaController.js
const { Rka, RkaRincianBelanja, PeriodeRpjmd, RPJMD } = require('../models');
const { splitPlanningBody } = require('../helpers/planningDocumentMutation');
const {
  writePlanningAudit,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require('../services/planningDocumentAuditService');
const { assertEffectiveRpjmdId } = require('../helpers/rpjmdBaseline');
const budgetCascadeValidator = require('../services/budgetCascadeValidator');

// Import modul modular yang baru kita bangun
const rkaCalculationHelper = require('../helpers/rkaCalculationHelper');
const rkaValidationService = require('../services/rkaValidationService');
const rkaRevisiService = require('../services/rkaRevisiService');

module.exports = {
  /**
   * Mengambil semua dokumen RKA berdasarkan filter
   */
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program, tahapan } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;
      if (tahapan) where.tahapan = tahapan; // Tambahan filter tahapan anggaran

      const data = await Rka.findAll({
        where,
        include: [{ model: PeriodeRpjmd, as: 'periode' }],
        order: [
          ['tahun', 'DESC'],
          ['created_at', 'DESC'],
        ],
      });

      return res.json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Mengambil detail RKA berdasarkan ID (Beserta Rincian Belanja Multi-Volume)
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await Rka.findByPk(id, {
        include: [{ model: RkaRincianBelanja, as: 'rincianBelanja' }],
        order: [[{ model: RkaRincianBelanja, as: 'rincianBelanja' }, 'urutan', 'ASC']],
      });

      if (!data)
        return res.status(404).json({ success: false, error: 'Dokumen RKA tidak ditemukan.' });

      const json = data.toJSON();

      // Deserialisasi data string JSON koefisien_array dari DB kembali menjadi array Object untuk frontend
      json.rincian_belanja = (json.rincianBelanja || []).map((item) => ({
        ...item,
        koefisien_array:
          typeof item.koefisien_array === 'string'
            ? JSON.parse(item.koefisien_array)
            : item.koefisien_array,
      }));
      delete json.rincianBelanja;

      return res.json({ success: true, data: json });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Membuat dokumen RKA Baru (APBD Induk / Tahapan Awal)
   */
  async create(req, res) {
    try {
      const { payload, change_reason_text, change_reason_file, rpjmd_id } = splitPlanningBody(
        req.body,
      );

      // 1. Validasi Skema Objek via Service
      const validatedValue = rkaValidationService.validatePayload(payload, false);
      const { rincian_belanja = [], ...rkaPayload } = validatedValue;

      // 2. Kalkulasi Multi-Volume & Total Anggaran via Helper
      const { processedRincian, totalAnggaranSubKegiatan } =
        rkaCalculationHelper.processRincianBelanja(rincian_belanja);

      // 3. Validasi Batasan Pagu Renja
      await rkaValidationService.validatePaguRenja(
        validatedValue.renja_id,
        totalAnggaranSubKegiatan,
      );

      // 4. Validasi Baseline RPJMD
      const rp = await assertEffectiveRpjmdId(RPJMD, rpjmd_id, null);
      if (!rp.ok) return res.status(400).json({ success: false, error: rp.msg });

      // Injeksi nilai kalkulasi bersih server-side ke payload utama
      rkaPayload.anggaran = totalAnggaranSubKegiatan;
      rkaPayload.rpjmd_id = rp.id;
      rkaPayload.kode_unik_sub_kegiatan = `${rkaPayload.tahun}-${rkaPayload.opd_id}-${rkaPayload.sub_kegiatan}-${rkaPayload.tahapan || 'APBD_INDUK'}`;

      // Validasi konsistensi cascading bawaan sistem
      await budgetCascadeValidator.validateFullChain({
        payload: { ...rkaPayload, rincian_belanja: processedRincian, rpjmd_id: rp.id },
      });

      // 5. Eksekusi Penyimpanan Database Parent
      const created = await Rka.create({
        ...rkaPayload,
        version: 1,
        is_active_version: true,
        approval_status: 'DRAFT',
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      });

      // 6. Bulk Create Item Anak Rincian Belanja
      if (processedRincian.length) {
        await RkaRincianBelanja.bulkCreate(
          processedRincian.map((item) => ({ ...item, rka_id: created.id })),
        );
      }

      // 7. Audit Log Trail Creation
      const uid = req.user?.id ?? req.user?.userId ?? null;
      const { old_value, new_value } = auditValuesFromRows(null, created);
      await writePlanningAudit({
        module_name: 'rka',
        table_name: 'rka',
        record_id: created.id,
        action_type: 'CREATE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        changed_by: uid,
        version_before: null,
        version_after: 1,
      });

      return res
        .status(201)
        .json({ success: true, message: 'RKA Berhasil dibuat.', id: created.id });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        error: error.message,
        details: error.details || undefined,
      });
    }
  },

  /**
   * Mengubah data rincian RKA pada tahapan berjalan
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { payload, change_reason_text, change_reason_file, rpjmd_id } = splitPlanningBody(
        req.body,
      );

      const validatedValue = rkaValidationService.validatePayload(payload, true);
      const oldRow = await Rka.findByPk(id);
      if (!oldRow)
        return res.status(404).json({ success: false, error: 'Dokumen RKA tidak ditemukan.' });

      await budgetCascadeValidator.enforceBudgetLocking(id, req);

      const hasRincianBelanja = Object.prototype.hasOwnProperty.call(
        validatedValue,
        'rincian_belanja',
      );
      const { rincian_belanja, ...rkaPayload } = validatedValue;

      let processedRincian = [];
      if (hasRincianBelanja) {
        // Jika client mengirim rincian baru, hitung ulang total anggaran di server
        const { processedRincian: pr, totalAnggaranSubKegiatan } =
          rkaCalculationHelper.processRincianBelanja(rincian_belanja);
        processedRincian = pr;
        rkaPayload.anggaran = totalAnggaranSubKegiatan;

        // Cek kembali pagu Renja dengan total kalkulasi yang baru
        await rkaValidationService.validatePaguRenja(oldRow.renja_id, totalAnggaranSubKegiatan);
      }

      const version_before = Number(oldRow.version) || 1;
      const version_after = version_before + 1;
      const uid = req.user?.id ?? req.user?.userId ?? null;

      // Update Parent Record
      const patch = {
        ...rkaPayload,
        version: version_after,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      };
      await Rka.update(patch, { where: { id } });

      // Sinkronisasi Data Rincian Anak jika dikirim
      if (hasRincianBelanja) {
        await RkaRincianBelanja.destroy({ where: { rka_id: id } });
        if (processedRincian.length) {
          await RkaRincianBelanja.bulkCreate(
            processedRincian.map((item) => ({ ...item, rka_id: id })),
          );
        }
      }

      // Audit Trail Log Update
      const updatedRow = await Rka.findByPk(id);
      const { old_value, new_value } = auditValuesFromRows(oldRow, updatedRow);
      await writePlanningAudit({
        module_name: 'rka',
        table_name: 'rka',
        record_id: Number(id),
        action_type: 'UPDATE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        changed_by: uid,
        version_before,
        version_after,
      });

      return res.json({ success: true, message: 'Dokumen RKA berhasil diperbarui.' });
    } catch (error) {
      return res
        .status(error.status || 500)
        .json({ success: false, error: error.message, details: error.details });
    }
  },

  /**
   * FITUR UNGGULAN: Memicu proses kloning revisi (Pergeseran / Perubahan Anggaran)
   * POST /api/rka/:id/revisi
   */
  async pemicuRevisi(req, res) {
    try {
      const { id } = req.params;
      const { tahapan_tujuan } = req.body; // Contoh: 'PERGESERAN_1' atau 'APBD_PERUBAHAN'
      const uid = req.user?.id ?? req.user?.userId ?? null;

      if (!tahapan_tujuan) {
        return res
          .status(400)
          .json({ success: false, error: 'Tahapan tujuan revisi wajib ditentukan.' });
      }

      const result = await rkaRevisiService.cloneRkaToNextTahapan({
        rkaId: Number(id),
        tahapanTujuan: tahapan_tujuan,
        userId: uid,
      });

      return res.status(201).json(result);
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, error: error.message });
    }
  },

  /**
   * Menghapus Dokumen RKA beserta komponen anak (Cascading onDelete)
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const oldRow = await Rka.findByPk(id);
      if (!oldRow) return res.status(404).json({ success: false, error: 'Data tidak ditemukan.' });

      const uid = req.user?.id ?? req.user?.userId ?? null;
      const { old_value } = auditValuesFromRows(oldRow, null);

      await writePlanningAudit({
        module_name: 'rka',
        table_name: 'rka',
        record_id: Number(id),
        action_type: 'DELETE',
        old_value,
        new_value: null,
        change_reason_text: 'Penghapusan Dokumen RKA',
        change_reason_file: null,
        changed_by: uid,
        version_before: oldRow.version,
        version_after: null,
      });

      // Hapus Parent (Anak otomatis terhapus karena aturan CASCADE pada model database)
      await Rka.destroy({ where: { id } });

      return res.json({ success: true, message: 'Dokumen RKA berhasil dihapus secara permanen.' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // Mengembalikan data log audit trail
  async getAudit(req, res) {
    try {
      const { id } = req.params;
      const rows = await require('../models').PlanningAuditEvent.findAll({
        where: { table_name: 'rka', record_id: Number(id) },
        order: [['changed_at', 'DESC']],
        limit: 100,
      });
      return res.json({ success: true, data: enrichPlanningAuditRows(rows) });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
