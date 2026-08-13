'use strict';

/**
 * Corrective "ProSN Semester-II Readiness — Sumber Data Authoritative
 * Auto-Sync" (mandat §19/Req N).
 *
 * Masalah arsitektur: `prosnp_pengisian.sumber_data` adalah SATU field TEXT
 * yang harus memenuhi DUA syarat yang saling tegang — (A) selalu
 * mencerminkan fakta terkini secara otomatis, DAN (B) tidak pernah menimpa
 * teks yang sudah diedit manual oleh user secara diam-diam. Satu field TEXT
 * saja tidak bisa membedakan "ini masih murni hasil generate sistem" dari
 * "ini sudah disunting manusia" — dibuktikan tidak cukup pada corrective pass
 * sebelumnya (yang hanya menambah peringatan staleness, belum solusi
 * arsitektural).
 *
 * Solusi: satu kolom BOOLEAN tambahan `sumber_data_is_auto` — TRUE berarti
 * nilai `sumber_data` saat ini PERSIS SAMA dengan saran sistem paling akhir
 * (server yang menghitung & membandingkan saat save, lihat
 * prosnpController.updatePengisian — TIDAK dipercaya dari client, anti-spoof
 * sesuai konvensi proyek ini), sehingga AMAN disegarkan otomatis di frontend
 * tanpa risiko menimpa teks user. FALSE berarti user pernah menyimpan teks
 * yang BERBEDA dari saran sistem — frontend TIDAK PERNAH menyegarkan otomatis
 * lagi, hanya menampilkan peringatan staleness (perilaku existing).
 *
 * Default FALSE utk seluruh baris lama (termasuk baris yang sumber_data-nya
 * kosong) — TIDAK PERNAH diam-diam mulai auto-sync data yang sudah ada tanpa
 * user pernah memilih "Isi Otomatis" sejak kolom ini ada. Idempotent — skip
 * jika kolom sudah ada. Additive murni, tidak mengubah/menghapus kolom lain,
 * tidak menyentuh data.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('prosnp_pengisian').catch(() => null);
    if (!desc) {
      console.log('[migration] ⚠️  Tabel prosnp_pengisian tidak ditemukan, skip');
      return;
    }
    if (desc.sumber_data_is_auto) {
      console.log('[migration] ⏭️  sumber_data_is_auto sudah ada di prosnp_pengisian, skip');
      return;
    }
    await queryInterface.addColumn('prosnp_pengisian', 'sumber_data_is_auto', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    console.log('[migration] ✅ Kolom sumber_data_is_auto ditambah ke prosnp_pengisian');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('prosnp_pengisian', 'sumber_data_is_auto').catch(() => {});
  },
};
