'use strict';

/**
 * Perbaikan data: 3 baris `mr_planning_temuan` (id 27, 28, 33) berstatus
 * `risk_escalation_status='risk_created'` dan menunjuk `mr_planning_risk_id`
 * (4, 5, 6) yang SUDAH TIDAK ADA di tabel `mr_planning_risk` (ditemukan saat
 * membangun fitur recall TLHP->MR Risk, 2026-08-02).
 *
 * Riwayat (`mr_planning_risk_history`) mengonfirmasi Risk id 4/5/6 memang
 * pernah dibuat via eskalasi (create, timestamp sama dgn history "sync" di
 * mr_planning_temuan_history), lalu DIHAPUS ~1.5-2 jam kemudian (before_json
 * terisi, after_json NULL = pola delete) — bukan bug fitur recall ini,
 * kejadian lama tak terkait.
 *
 * Perbaikan: reset penanda eskalasi Temuan ke "none" (nilai default valid di
 * ENUM) supaya Temuan bisa dieskalasi ulang secara normal lewat UI (membuat
 * Risk baru yang valid, lengkap dengan matrix/validasi), BUKAN mencoba
 * merekonstruksi baris Risk lama dari snapshot JSON (berisiko menghasilkan
 * data yang tidak lolos validasi service layer). Cross-system-link yang
 * sudah putus ditandai `link_status='broken'` (nilai ENUM yang memang
 * disediakan untuk kasus ini), bukan dihapus — supaya jejak audit tetap ada.
 * Ditambahkan baris riwayat baru di mr_planning_temuan_history (action_type
 * "sync") supaya perubahan ini tercatat, konsisten dgn pola riwayat eskalasi
 * yang sudah ada.
 *
 * Pakai:
 *   node scripts/fixOrphanedRiskEscalation.js --uji
 *   node scripts/fixOrphanedRiskEscalation.js
 */

const db = require('../models');

const TEMUAN_IDS = [27, 28, 33];

async function main() {
  const ujiSaja = process.argv.includes('--uji');
  const { sequelize, MrPlanningTemuan, MrPlanningTemuanHistory, MrCrossSystemLink } = db;

  const temuanRows = await MrPlanningTemuan.findAll({
    where: { id: TEMUAN_IDS },
    attributes: ['id', 'kode_temuan', 'risk_escalation_status', 'mr_planning_risk_id', 'cross_system_link_id', 'context_id', 'versi'],
  });

  console.log(`[rencana] ${temuanRows.length} Temuan akan direset penanda eskalasinya:`);
  for (const t of temuanRows) {
    console.log(
      `  - #${t.id} (${t.kode_temuan}): risk_escalation_status ${t.risk_escalation_status} -> none, ` +
        `mr_planning_risk_id ${t.mr_planning_risk_id} -> NULL`,
    );
  }

  const links = await MrCrossSystemLink.findAll({
    where: {
      source_module: 'mr_planning_temuan',
      source_id: TEMUAN_IDS,
      link_type: 'risk_mapping',
    },
    attributes: ['id', 'source_id', 'target_id', 'link_status'],
  });
  console.log(`[rencana] ${links.length} baris mr_cross_system_link akan ditandai link_status='broken'.`);

  if (ujiSaja) {
    console.log('[uji] Tidak ada perubahan ditulis (--uji).');
    return;
  }

  await sequelize.transaction(async (t) => {
    for (const temuan of temuanRows) {
      const beforeJson = temuan.get({ plain: true });

      await temuan.update(
        {
          risk_escalation_status: 'none',
          mr_planning_risk_id: null,
          cross_system_link_id: null,
        },
        { transaction: t },
      );

      await MrPlanningTemuanHistory.create(
        {
          mr_planning_temuan_id: temuan.id,
          context_id: temuan.context_id,
          versi_sebelum: temuan.versi,
          versi_sesudah: temuan.versi,
          before_json: beforeJson,
          after_json: temuan.get({ plain: true }),
          alasan_revisi:
            'Perbaikan data: Risk hasil eskalasi sebelumnya sudah terhapus (dangling FK) — ' +
            'penanda eskalasi direset ke "none" supaya bisa dieskalasi ulang secara normal.',
          status_revisi: temuan.status_revisi,
          action_type: 'sync',
          source_module: 'fix_orphaned_risk_escalation',
          dibuat_pada: new Date(),
        },
        { transaction: t },
      );

      console.log(`[reset] Temuan #${temuan.id} (${temuan.kode_temuan}) — siap dieskalasi ulang.`);
    }

    for (const link of links) {
      await link.update({ link_status: 'broken' }, { transaction: t });
      console.log(`[link] mr_cross_system_link #${link.id} (target Risk #${link.target_id}) -> broken.`);
    }
  });

  console.log('[selesai] Perbaikan diterapkan.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[gagal]', err);
    process.exit(1);
  });
