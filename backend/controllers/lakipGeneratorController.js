/**
 * lakipGeneratorController.js
 * Generator dokumen LAKIP/LKj untuk ePeLARA.
 *
 * Endpoint:
 *   GET /api/lakip-generator/data?tahun=2025&periode_id=1
 *   GET /api/lakip-generator/preview?tahun=2025&periode_id=1   → HTML print-ready
 *   GET /api/lakip-generator/export-pdf?tahun=2025&periode_id=1 → PDF (Tahap 2)
 */

const { sequelize } = require('../models');

// ── Nama OPD dinas ──────────────────────────────────────────────────────────
const OPD_CONFIG = {
  nama_opd: 'Dinas Ketahanan Pangan',
  nama_provinsi: 'Maluku Utara',
  kepala_opd: 'Kepala Dinas Ketahanan Pangan',
  nip_kepala: 'NIP. —',
  tahun_anggaran: new Date().getFullYear(),
};

// ── Ambil semua data sumber LAKIP ─────────────────────────────────────────────
async function collectLakipData(tahun, periode_id) {
  // 1. Identitas periode RPJMD
  const [[periode]] = await sequelize.query(
    `SELECT id, nama, tahun_awal, tahun_akhir FROM periode_rpjmds WHERE id = :id LIMIT 1`,
    { replacements: { id: periode_id || 1 } },
  );

  // 1b. OPD aktif (Renstra) — Indikator Kinerja hanya diambil untuk OPD ini,
  // jangan lintas OPD (tabel legacy `indikator` tidak punya kolom penghubung OPD).
  const [[renstraAktif]] = await sequelize.query(
    `SELECT id, tahun_mulai FROM renstra_opd WHERE is_aktif = 1 LIMIT 1`,
  );

  // 2. Visi
  const [[visi]] = await sequelize.query(
    `SELECT v.isi_visi FROM visi v
     LEFT JOIN periode_rpjmds p ON v.rpjmd_id = p.id
     LIMIT 1`,
  );

  // 3. Misi
  const [misiList] = await sequelize.query(
    `SELECT id, no_misi, isi_misi FROM misi ORDER BY no_misi ASC LIMIT 10`,
  );

  // 4. Tujuan (Renstra OPD aktif)
  const [tujuanList] = renstraAktif
    ? await sequelize.query(
        `SELECT id, misi_id, no_tujuan, isi_tujuan FROM renstra_tujuan
         WHERE renstra_id = :renstraId ORDER BY id ASC`,
        { replacements: { renstraId: renstraAktif.id } },
      )
    : [[]];

  // 5. Sasaran (Renstra OPD aktif)
  const [sasaranList] = renstraAktif
    ? await sequelize.query(
        `SELECT id, tujuan_id, nomor, isi_sasaran FROM renstra_sasaran
         WHERE renstra_id = :renstraId ORDER BY nomor ASC`,
        { replacements: { renstraId: renstraAktif.id } },
      )
    : [[]];

  // 5b. Strategi/Kebijakan/Program/Kegiatan (Renstra OPD aktif) — dipakai untuk
  // merunut indikator ke rantai Tujuan->Sasaran->Program->Kegiatan, karena Program
  // terhubung ke Sasaran lewat kebijakan_id->strategi_id->sasaran_id (tidak langsung).
  const [strategiList, kebijakanList, programList, kegiatanList] = renstraAktif
    ? await Promise.all([
        sequelize
          .query(`SELECT id, sasaran_id FROM renstra_strategi WHERE renstra_id = :renstraId`, {
            replacements: { renstraId: renstraAktif.id },
          })
          .then(([r]) => r),
        sequelize
          .query(`SELECT id, strategi_id FROM renstra_kebijakan WHERE renstra_id = :renstraId`, {
            replacements: { renstraId: renstraAktif.id },
          })
          .then(([r]) => r),
        sequelize
          .query(
            `SELECT id, kebijakan_id, nama_program FROM renstra_program WHERE renstra_id = :renstraId`,
            { replacements: { renstraId: renstraAktif.id } },
          )
          .then(([r]) => r),
        sequelize
          .query(
            `SELECT id, program_id, nama_kegiatan FROM renstra_kegiatan WHERE renstra_id = :renstraId`,
            { replacements: { renstraId: renstraAktif.id } },
          )
          .then(([r]) => r),
      ])
    : [[], [], [], []];

  const strategiById = new Map(strategiList.map((s) => [s.id, s]));
  const kebijakanById = new Map(kebijakanList.map((k) => [k.id, k]));
  const programById = new Map(programList.map((p) => [p.id, p]));
  const kegiatanById = new Map(kegiatanList.map((k) => [k.id, k]));
  const sasaranById = new Map(sasaranList.map((s) => [s.id, s]));

  function resolveSasaranIdFromProgram(programId) {
    const program = programById.get(programId);
    const kebijakan = program ? kebijakanById.get(program.kebijakan_id) : null;
    const strategi = kebijakan ? strategiById.get(kebijakan.strategi_id) : null;
    return strategi?.sasaran_id || null;
  }

  function resolveAncestry(stage, refId) {
    let sasaranId = null;
    let programId = null;
    let kegiatanId = null;

    if (stage === 'sasaran') {
      sasaranId = refId;
    } else if (stage === 'program') {
      programId = refId;
      sasaranId = resolveSasaranIdFromProgram(programId);
    } else if (stage === 'kegiatan') {
      kegiatanId = refId;
      programId = kegiatanById.get(kegiatanId)?.program_id || null;
      sasaranId = resolveSasaranIdFromProgram(programId);
    }

    const tujuanId = sasaranId ? sasaranById.get(sasaranId)?.tujuan_id || null : null;
    return { tujuanId, sasaranId, programId, kegiatanId };
  }

  // 6. Indikator Kinerja Renstra OPD aktif (sasaran/program/kegiatan)
  const [indikatorList] = renstraAktif
    ? await sequelize.query(
        `SELECT id, ref_id, stage, nama_indikator, satuan, jenis_indikator, kode_indikator,
                penanggung_jawab,
                target_tahun_1, target_tahun_2, target_tahun_3,
                target_tahun_4, target_tahun_5, target_tahun_6
         FROM indikator_renstra
         WHERE stage IN ('sasaran','program','kegiatan') AND renstra_id = :renstraId
         ORDER BY id ASC`,
        { replacements: { renstraId: renstraAktif.id } },
      )
    : [[]];

  // 7. Realisasi tahun berjalan per indikator (dari Renstra OPD aktif)
  const indikatorIds = indikatorList.map((i) => i.id);
  let realisasiMap = {};
  if (indikatorIds.length > 0 && tahun) {
    const [realisasiRows] = await sequelize.query(
      `SELECT indikator_renstra_id, nilai_realisasi
       FROM realisasi_indikator_renstra
       WHERE indikator_renstra_id IN (:ids) AND tahun = :tahun`,
      { replacements: { ids: indikatorIds, tahun } },
    );
    for (const r of realisasiRows) {
      realisasiMap[r.indikator_renstra_id] = r;
    }
  }

  // 8. Data lakip entries (program/kegiatan dengan target-realisasi langsung)
  const [lakipEntries] = await sequelize.query(
    `SELECT id, tahun, program, kegiatan, indikator_kinerja, target, realisasi,
            evaluasi, rekomendasi, jenis_dokumen, approval_status
     FROM lakip
     ${tahun ? 'WHERE tahun = :tahun' : ''}
     ORDER BY tahun DESC, program ASC`,
    tahun ? { replacements: { tahun } } : undefined,
  );

  // 9. Agregasi anggaran — pagu dari DPA, realisasi dari Penatausahaan (OCR SIPD),
  // konsisten dengan sumber yang dipakai renstraRealisasiAnggaranSyncService.js.
  const dpaWhere = tahun ? 'd.tahun = :tahun AND' : '';
  const [anggaranRows] = await sequelize.query(
    `SELECT
       (SELECT SUM(d.anggaran) FROM dpa d WHERE ${dpaWhere} d.is_active_version = 1) as total_pagu,
       (SELECT SUM(p.jumlah) FROM penatausahaan p
          INNER JOIN dpa d ON d.id = p.dpa_id
          WHERE ${dpaWhere} d.is_active_version = 1) as total_realisasi`,
    tahun ? { replacements: { tahun } } : undefined,
  );

  // 9b. Gambaran Umum (Tusi) & Isu Strategis dari modul Renstra (BAB II & III)
  const [renstraBabRows] = renstraAktif
    ? await sequelize.query(
        `SELECT bab, judul_bab, isi FROM renstra_bab WHERE tahun = :tahunRenstra AND bab IN ('II','III')`,
        { replacements: { tahunRenstra: renstraAktif.tahun_mulai } },
      )
    : [[]];
  let gambaranUmumItem = null;
  let isuStrategisItem = null;
  for (const row of renstraBabRows) {
    let items = [];
    try {
      items = JSON.parse(row.isi);
    } catch (e) {
      items = [];
    }
    if (row.bab === 'II') {
      gambaranUmumItem =
        items.find((it) => String(it.judul || '').startsWith('2.1')) || items[0] || null;
    } else if (row.bab === 'III') {
      isuStrategisItem =
        items.find((it) => String(it.judul || '').startsWith('3.5')) ||
        items[items.length - 1] ||
        null;
    }
  }

  // 10. Flatten indikator + resolusi ancestry, lalu susun jadi nested tree
  // Tujuan -> Sasaran -> Program -> Kegiatan supaya jelas indikator itu milik siapa.
  const indikatorFlat = indikatorList.map((ind) => {
    const offset =
      renstraAktif && tahun
        ? Math.min(Math.max(Number(tahun) - Number(renstraAktif.tahun_mulai) + 1, 1), 6)
        : 1;
    const target = parseFloat(ind[`target_tahun_${offset}`]) || 0;
    const real = realisasiMap[ind.id];
    const realisasi = real ? parseFloat(real.nilai_realisasi) : 0;
    const pct = target > 0 ? Math.round((realisasi / target) * 100) : 0;
    const statusCapaian =
      pct >= 100 ? 'Tercapai' : pct >= 75 ? 'Hampir Tercapai' : 'Belum Tercapai';
    const ancestry = resolveAncestry(ind.stage, ind.ref_id);
    return {
      id: ind.id,
      stage: ind.stage,
      nama_indikator: ind.nama_indikator,
      satuan: ind.satuan,
      kode_indikator: ind.kode_indikator,
      penanggung_jawab: ind.penanggung_jawab,
      target,
      realisasi,
      pct_capaian: pct,
      status_capaian: statusCapaian,
      narasi: generateNarasi(ind.nama_indikator, target, realisasi, pct, ind.satuan),
      ...ancestry,
    };
  });

  const placedIndikatorIds = new Set();
  const indikatorTree = tujuanList.map((t) => {
    const sasaranAnak = sasaranList.filter((s) => s.tujuan_id === t.id);
    return {
      id: t.id,
      no_tujuan: t.no_tujuan,
      isi_tujuan: t.isi_tujuan,
      sasaran: sasaranAnak.map((s) => {
        const indikatorSasaran = indikatorFlat.filter(
          (i) => i.stage === 'sasaran' && i.sasaranId === s.id,
        );
        indikatorSasaran.forEach((i) => placedIndikatorIds.add(i.id));

        const programAnak = programList.filter((p) => resolveSasaranIdFromProgram(p.id) === s.id);

        return {
          id: s.id,
          nomor: s.nomor,
          isi_sasaran: s.isi_sasaran,
          indikator: indikatorSasaran,
          program: programAnak.map((p) => {
            const indikatorProgram = indikatorFlat.filter(
              (i) => i.stage === 'program' && i.programId === p.id,
            );
            indikatorProgram.forEach((i) => placedIndikatorIds.add(i.id));

            const kegiatanAnak = kegiatanList.filter((k) => k.program_id === p.id);

            return {
              id: p.id,
              nama_program: p.nama_program,
              indikator: indikatorProgram,
              kegiatan: kegiatanAnak.map((k) => {
                const indikatorKegiatan = indikatorFlat.filter(
                  (i) => i.stage === 'kegiatan' && i.kegiatanId === k.id,
                );
                indikatorKegiatan.forEach((i) => placedIndikatorIds.add(i.id));
                return {
                  id: k.id,
                  nama_kegiatan: k.nama_kegiatan,
                  indikator: indikatorKegiatan,
                };
              }),
            };
          }),
        };
      }),
    };
  });

  // Indikator yang rantai ancestry-nya tidak lengkap (mis. program belum
  // tersambung kebijakan/strategi) — jangan hilang diam-diam, tampilkan terpisah.
  const indikatorOrphan = indikatorFlat.filter((i) => !placedIndikatorIds.has(i.id));

  return {
    meta: {
      opd: OPD_CONFIG,
      tahun: tahun || String(new Date().getFullYear()),
      periode,
      generated_at: new Date().toISOString(),
    },
    visi: visi?.isi_visi || 'Visi Dinas Ketahanan Pangan Maluku Utara',
    misi: misiList,
    tujuan: tujuanList,
    sasaran: sasaranList,
    indikator: indikatorFlat,
    indikatorTree,
    indikatorOrphan,
    lakipEntries,
    gambaranUmumItem,
    isuStrategisItem,
    anggaran: {
      total_pagu: parseFloat(anggaranRows[0]?.total_pagu) || 0,
      total_realisasi: parseFloat(anggaranRows[0]?.total_realisasi) || 0,
      pct:
        anggaranRows[0]?.total_pagu > 0
          ? Math.round((anggaranRows[0]?.total_realisasi / anggaranRows[0]?.total_pagu) * 100)
          : 0,
    },
  };
}

// ── Auto-generate narasi analisis capaian ──────────────────────────────────
function generateNarasi(namaIndikator, target, realisasi, pct, satuan) {
  const sat = satuan || '';
  if (pct === 0 && realisasi === 0 && target === 0) {
    return `Indikator "${namaIndikator}" belum memiliki data target dan realisasi. Pengisian data realisasi diperlukan untuk evaluasi kinerja.`;
  }
  if (pct >= 100) {
    return `Indikator "${namaIndikator}" berhasil mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Kinerja dinyatakan sangat baik dan sesuai perencanaan.`;
  }
  if (pct >= 75) {
    const selisih = (target - realisasi).toFixed(2);
    return `Indikator "${namaIndikator}" hampir mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Terdapat kekurangan sebesar ${selisih} ${sat}. Diperlukan upaya lebih intensif pada periode berikutnya.`;
  }
  return `Indikator "${namaIndikator}" belum mencapai target dengan capaian ${pct}% (Realisasi: ${realisasi} ${sat} dari Target: ${target} ${sat}). Perlu evaluasi mendalam terhadap faktor penghambat dan penyesuaian strategi pelaksanaan.`;
}

// ── Rupiah formatter ──────────────────────────────────────────────────────
function formatRp(n) {
  if (!n || isNaN(n)) return 'Rp 0';
  return 'Rp ' + parseFloat(n).toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

// ── HTML Template Generator ───────────────────────────────────────────────
function buildHtml(data) {
  const {
    meta,
    visi,
    misi,
    tujuan,
    sasaran,
    indikator,
    indikatorTree,
    indikatorOrphan,
    lakipEntries,
    gambaranUmumItem,
    isuStrategisItem,
    anggaran,
  } = data;
  const tahun = meta.tahun;
  const opd = meta.opd;

  // Header warna sesuai status capaian
  const pctColor = (pct) => (pct >= 100 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626');

  // Baris + tabel indikator, dipakai berulang di tiap level (Sasaran/Program/Kegiatan)
  const indikatorRowsHtml = (items) =>
    items.length
      ? items
          .map(
            (ind) => `
          <tr>
            <td>${escH(ind.nama_indikator)}</td>
            <td class="center">${escH(ind.satuan || '-')}</td>
            <td class="center">${ind.target || '-'}</td>
            <td class="center">${ind.realisasi || '-'}</td>
            <td class="center" style="color:${pctColor(ind.pct_capaian)}; font-weight:bold">${ind.pct_capaian}%</td>
            <td class="center"><span class="badge badge-${ind.pct_capaian >= 100 ? 'green' : ind.pct_capaian >= 75 ? 'yellow' : 'red'}">${ind.status_capaian}</span></td>
          </tr>
          <tr class="narasi-row">
            <td colspan="6"><em>Analisis: ${escH(ind.narasi)}</em></td>
          </tr>`,
          )
          .join('')
      : `<tr><td colspan="6" class="center text-muted">Belum ada indikator</td></tr>`;

  // Tabel Perjanjian Kinerja: Sasaran + Indikator level sasaran + Target tahun berjalan
  const perjanjianKinerjaRows = () => {
    let no = 0;
    const rows = [];
    (indikatorTree || []).forEach((t) => {
      t.sasaran.forEach((s) => {
        (s.indikator || []).forEach((ind) => {
          no++;
          rows.push(`
            <tr>
              <td class="center">${no}</td>
              <td>${escH(s.isi_sasaran || '-')}</td>
              <td>${escH(ind.nama_indikator)}</td>
              <td class="center">${escH(ind.satuan || '-')}</td>
              <td class="center">${ind.target || '-'}</td>
            </tr>`);
        });
      });
    });
    return (
      rows.join('') ||
      `<tr><td colspan="5" class="center text-muted">Belum ada data sasaran/indikator level sasaran</td></tr>`
    );
  };

  const indikatorTableHtml = (items) => `
    <table>
      <thead>
        <tr>
          <th style="width:32%">Indikator Kinerja</th>
          <th style="width:10%">Satuan</th>
          <th style="width:12%">Target</th>
          <th style="width:12%">Realisasi</th>
          <th style="width:12%">Capaian</th>
          <th style="width:22%">Status</th>
        </tr>
      </thead>
      <tbody>${indikatorRowsHtml(items)}</tbody>
    </table>`;

  // Nested Tujuan -> Sasaran -> Program -> Kegiatan, supaya jelas indikator milik siapa.
  const indikatorHierarkiHtml =
    indikatorTree && indikatorTree.length
      ? indikatorTree
          .map(
            (t) => `
        <div class="tujuan-block">
          <h4 class="hierarchy-title tujuan-title">Tujuan ${escH(t.no_tujuan || '')}: ${escH(t.isi_tujuan || '-')}</h4>
          ${t.sasaran
            .map(
              (s) => `
            <div class="sasaran-block">
              <h5 class="hierarchy-title sasaran-title">Sasaran ${escH(s.nomor || '')}: ${escH(s.isi_sasaran || '-')}</h5>
              ${indikatorTableHtml(s.indikator)}
              ${s.program
                .map(
                  (p) => `
                <div class="program-block">
                  <h6 class="hierarchy-title program-title">Program: ${escH(p.nama_program || '-')}</h6>
                  ${indikatorTableHtml(p.indikator)}
                  ${p.kegiatan
                    .map(
                      (k) => `
                    <div class="kegiatan-block">
                      <h6 class="hierarchy-title kegiatan-title">Kegiatan: ${escH(k.nama_kegiatan || '-')}</h6>
                      ${indikatorTableHtml(k.indikator)}
                    </div>`,
                    )
                    .join('')}
                </div>`,
                )
                .join('')}
            </div>`,
            )
            .join('')}
        </div>`,
          )
          .join('')
      : `<p class="text-muted">Belum ada data Tujuan/Sasaran/Program/Kegiatan untuk OPD aktif.</p>`;

  const indikatorOrphanHtml =
    indikatorOrphan && indikatorOrphan.length
      ? `<div class="orphan-block">
         <h4 class="hierarchy-title">Indikator Belum Terhubung ke Hierarki Renstra</h4>
         ${indikatorTableHtml(indikatorOrphan)}
       </div>`
      : '';

  // Baris LAKIP entries (program/kegiatan)
  const lakipRows = lakipEntries.length
    ? lakipEntries
        .map(
          (l, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${escH(l.program || '-')}</td>
          <td>${escH(l.kegiatan || '-')}</td>
          <td>${escH(l.indikator_kinerja || '-')}</td>
          <td class="center">${escH(l.target || '-')}</td>
          <td class="center">${escH(l.realisasi || '-')}</td>
          <td>${escH(l.evaluasi || '—')}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="7" class="center text-muted">Belum ada entri program/kegiatan LAKIP untuk tahun ${tahun}</td></tr>`;

  // Misi list
  const misiHtml = misi.length
    ? misi.map((m) => `<li>Misi ${m.no_misi}: ${escH(m.isi_misi)}</li>`).join('')
    : '<li>Belum ada data misi</li>';

  // Sasaran grouped
  const sasaranHtml = sasaran.length
    ? sasaran
        .map(
          (s) => `
        <div class="sasaran-item">
          <strong>Sasaran ${escH(s.nomor || '')}</strong>: ${escH(s.isi_sasaran)}
          ${
            tujuan.find((t) => t.id === s.tujuan_id)
              ? `<div class="text-muted small">Tujuan: ${escH(tujuan.find((t) => t.id === s.tujuan_id)?.isi_tujuan || '')}</div>`
              : ''
          }
        </div>`,
        )
        .join('')
    : "<p class='text-muted'>Belum ada data sasaran strategis</p>";

  const pctRealisasiAnggaranColor = pctColor(anggaran.pct);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>LAKIP ${tahun} — ${opd.nama_opd}</title>
  <style>
    /* ── Base ── */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    a { color: inherit; text-decoration: none; }

    /* ── Halaman ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 25mm 20mm 20mm 25mm;
    }

    /* ── Cover ── */
    .cover {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 297mm;
      text-align: center;
      border: 3px double #1e40af;
      padding: 40px;
    }
    .cover .logo-area {
      width: 100px; height: 100px;
      border: 2px solid #1e40af;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 36pt;
      margin-bottom: 24px;
      background: #eff6ff;
      color: #1e40af;
    }
    .cover h1 {
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 2px;
      color: #1e3a8a;
      margin: 16px 0 8px;
    }
    .cover h2 {
      font-size: 16pt;
      font-weight: normal;
      color: #374151;
      margin: 0 0 24px;
    }
    .cover .instansi-box {
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 8px;
      padding: 16px 32px;
      margin: 16px 0;
    }
    .cover .instansi-box p { margin: 4px 0; }
    .cover .tahun-badge {
      font-size: 20pt;
      font-weight: bold;
      color: #fff;
      background: #1e40af;
      padding: 8px 32px;
      border-radius: 6px;
      margin-top: 24px;
    }

    /* ── Section titles ── */
    h2.section-title {
      font-size: 14pt;
      color: #1e3a8a;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 6px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    h3.sub-title {
      font-size: 12pt;
      color: #374151;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    /* ── Tabel ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    th {
      background: #1e40af;
      color: #fff;
      padding: 8px 6px;
      text-align: center;
      border: 1px solid #93c5fd;
    }
    td {
      padding: 6px;
      border: 1px solid #d1d5db;
      vertical-align: top;
    }
    tr:nth-child(4n+1) td { background: #f8faff; }
    .narasi-row td {
      background: #f0f9ff !important;
      font-size: 9pt;
      color: #374151;
      padding: 4px 8px;
      border-top: none;
    }
    td.center, th.center { text-align: center; }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: bold;
    }
    .badge-green  { background: #dcfce7; color: #15803d; }
    .badge-yellow { background: #fef9c3; color: #a16207; }
    .badge-red    { background: #fee2e2; color: #b91c1c; }

    /* ── KPI boxes ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-box {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      background: #eff6ff;
    }
    .kpi-box .kpi-val {
      font-size: 20pt;
      font-weight: bold;
    }
    .kpi-box .kpi-lbl {
      font-size: 9pt;
      color: #374151;
      margin-top: 4px;
    }

    /* ── Anggaran bar ── */
    .budget-bar-wrap {
      background: #e5e7eb;
      border-radius: 6px;
      height: 20px;
      margin: 6px 0;
      overflow: hidden;
    }
    .budget-bar-fill {
      height: 100%;
      border-radius: 6px;
      background: linear-gradient(90deg, #1d4ed8, #3b82f6);
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px;
      color: #fff;
      font-size: 8pt;
      font-weight: bold;
    }

    /* ── Misc ── */
    .text-muted { color: #6b7280; }
    .small { font-size: 9pt; }
    .sasaran-item {
      padding: 8px;
      border-left: 3px solid #1e40af;
      margin-bottom: 8px;
      background: #f0f9ff;
    }

    /* ── Hierarki Indikator (Tujuan > Sasaran > Program > Kegiatan) ── */
    .hierarchy-title { margin: 10px 0 6px; color: #1e3a8a; }
    h4.hierarchy-title { font-size: 11.5pt; }
    h5.hierarchy-title { font-size: 11pt; color: #1d4ed8; }
    h6.hierarchy-title { font-size: 10.5pt; color: #2563eb; }
    .tujuan-block { margin-bottom: 20px; }
    .sasaran-block {
      margin: 8px 0 14px 12px;
      padding-left: 10px;
      border-left: 2px solid #93c5fd;
    }
    .program-block {
      margin: 6px 0 10px 16px;
      padding-left: 10px;
      border-left: 2px dashed #bfdbfe;
    }
    .kegiatan-block {
      margin: 6px 0 10px 16px;
      padding-left: 10px;
      border-left: 2px dotted #dbeafe;
    }
    .orphan-block { margin-top: 20px; }
    .renstra-subtable { margin: 6px 0 14px; }
    .renstra-subtable td { border: 1px solid #d1d5db; }
    .renstra-table-block { margin: 10px 0 16px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    .exec-summary {
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      font-size: 11pt;
      line-height: 1.7;
    }
    .ttd-area {
      margin-top: 40px;
      display: flex;
      justify-content: flex-end;
    }
    .ttd-box {
      text-align: center;
      width: 220px;
    }
    .ttd-box .ttd-name {
      font-weight: bold;
      text-decoration: underline;
      margin-top: 60px;
    }

    /* ── Print ── */
    @media print {
      body { font-size: 11pt; }
      .no-print { display: none !important; }
      .page { padding: 15mm 15mm 15mm 20mm; }
      .page-break { page-break-before: always; }
    }

    /* ── Toolbar ── */
    .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #1e40af;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .toolbar .doc-title { flex: 1; font-size: 11pt; font-weight: bold; }
    .toolbar button {
      background: #fff;
      color: #1e40af;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 10pt;
    }
    .toolbar button:hover { background: #dbeafe; }
    .content-wrapper { margin-top: 48px; }
  </style>
</head>
<body>
  <!-- Toolbar print/export -->
  <div class="toolbar no-print">
    <span class="doc-title">📄 LAKIP/LKj ${tahun} — ${opd.nama_opd}</span>
    <button onclick="window.print()">🖨️ Cetak / Print</button>
    <button onclick="window.close()">✕ Tutup</button>
  </div>

  <div class="content-wrapper">

    <!-- ═══════════════ COVER ═══════════════ -->
    <div class="page page-break">
      <div class="cover">
        <div class="logo-area">🌾</div>
        <h1>LAPORAN AKUNTABILITAS KINERJA<br>INSTANSI PEMERINTAH</h1>
        <h2>(LAKIP / LKj)</h2>
        <div class="instansi-box">
          <p><strong>${escH(opd.nama_opd)}</strong></p>
          <p>Provinsi ${escH(opd.nama_provinsi)}</p>
        </div>
        <div class="tahun-badge">TAHUN ${escH(tahun)}</div>
        <p class="text-muted" style="margin-top:24px; font-size:10pt">
          Diterbitkan: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>

    <!-- ═══════════════ BAB I — PENDAHULUAN ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB I — PENDAHULUAN</h2>
      <h3 class="sub-title">A. Dasar Hukum</h3>
      <p>
        Laporan Kinerja Instansi Pemerintah (LKj) ${escH(opd.nama_opd)} Tahun ${escH(tahun)} disusun
        berdasarkan Peraturan Presiden Nomor 29 Tahun 2014 tentang Sistem Akuntabilitas Kinerja
        Instansi Pemerintah, dan Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi
        Birokrasi Nomor 53 Tahun 2014 tentang Petunjuk Teknis Penyusunan Perjanjian Kinerja,
        Pelaporan Kinerja, dan Tata Cara Reviu atas Laporan Kinerja Instansi Pemerintah.
      </p>
      <h3 class="sub-title">B. Maksud dan Tujuan</h3>
      <p>
        Laporan ini disusun sebagai bentuk pertanggungjawaban atas pelaksanaan program dan kegiatan
        ${escH(opd.nama_opd)} Provinsi ${escH(opd.nama_provinsi)} dalam mencapai tujuan dan sasaran
        yang telah ditetapkan dalam Rencana Strategis Tahun ${escH(tahun)}.
      </p>

      <h3 class="sub-title">C. Gambaran Umum Organisasi</h3>
      ${
        gambaranUmumItem
          ? `
        ${renderRenstraTeks(gambaranUmumItem.isi)}
        ${renderRenstraTabel(gambaranUmumItem.tables)}
      `
          : `<p class="text-muted">Data gambaran umum organisasi belum tersedia pada modul Renstra.</p>`
      }

      <h3 class="sub-title">D. Isu Strategis</h3>
      ${
        isuStrategisItem
          ? `
        ${renderRenstraTeks(isuStrategisItem.isi)}
        ${renderRenstraTabel(isuStrategisItem.tables)}
      `
          : `<p class="text-muted">Data isu strategis belum tersedia pada modul Renstra.</p>`
      }
    </div>

    <!-- ═══════════════ RINGKASAN EKSEKUTIF ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">RINGKASAN EKSEKUTIF</h2>
      <div class="exec-summary">
        <p>
          ${escH(opd.nama_opd)} Provinsi ${escH(opd.nama_provinsi)} menyusun Laporan Akuntabilitas
          Kinerja Instansi Pemerintah (LAKIP) Tahun ${escH(tahun)} sebagai bentuk pertanggungjawaban
          atas pelaksanaan program dan kegiatan dalam rangka pencapaian tujuan dan sasaran yang telah
          ditetapkan dalam Rencana Strategis.
        </p>
        ${
          anggaran.total_pagu > 0
            ? `
        <p>
          Pada Tahun ${escH(tahun)}, ${escH(opd.nama_opd)} mendapatkan alokasi anggaran sebesar
          <strong>${formatRp(anggaran.total_pagu)}</strong> dengan realisasi anggaran sebesar
          <strong>${formatRp(anggaran.total_realisasi)}</strong>
          atau <strong style="color:${pctRealisasiAnggaranColor}">${anggaran.pct}%</strong>
          dari total pagu anggaran.
        </p>`
            : ''
        }
      </div>

      <!-- KPI Boxes -->
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-val" style="color:#1e40af">${indikator.length}</div>
          <div class="kpi-lbl">Indikator Kinerja</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val" style="color:#15803d">${indikator.filter((i) => i.pct_capaian >= 100).length}</div>
          <div class="kpi-lbl">Indikator Tercapai</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val" style="color:#b91c1c">${indikator.filter((i) => i.pct_capaian < 100).length}</div>
          <div class="kpi-lbl">Perlu Perhatian</div>
        </div>
      </div>

      ${
        anggaran.total_pagu > 0
          ? `
      <h3 class="sub-title">Realisasi Anggaran</h3>
      <table>
        <thead><tr>
          <th>Uraian</th><th>Pagu (Rp)</th><th>Realisasi (Rp)</th><th>%</th>
        </tr></thead>
        <tbody><tr>
          <td>${escH(opd.nama_opd)}</td>
          <td class="center">${formatRp(anggaran.total_pagu)}</td>
          <td class="center">${formatRp(anggaran.total_realisasi)}</td>
          <td class="center" style="color:${pctRealisasiAnggaranColor}; font-weight:bold">${anggaran.pct}%</td>
        </tr></tbody>
      </table>
      <div class="budget-bar-wrap">
        <div class="budget-bar-fill" style="width:${Math.min(anggaran.pct, 100)}%">
          ${anggaran.pct}%
        </div>
      </div>`
          : ''
      }

      <h3 class="sub-title">Visi</h3>
      <p><em>"${escH(visi)}"</em></p>

      <h3 class="sub-title">Misi</h3>
      <ul>${misiHtml}</ul>
    </div>

    <!-- ═══════════════ BAB II — PERENCANAAN KINERJA ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB II — PERENCANAAN KINERJA</h2>
      <p class="text-muted small">
        Perencanaan kinerja ${escH(opd.nama_opd)} Tahun ${escH(tahun)} mengacu pada Visi, Misi,
        Tujuan, dan Sasaran Strategis sebagaimana tercantum dalam Rencana Strategis (Renstra) OPD.
      </p>
      <h3 class="sub-title">Perjanjian Kinerja Tahun ${escH(tahun)}</h3>
      <table>
        <thead>
          <tr>
            <th style="width:5%">No</th>
            <th style="width:28%">Sasaran Strategis</th>
            <th style="width:32%">Indikator Kinerja</th>
            <th style="width:12%">Satuan</th>
            <th style="width:12%">Target</th>
          </tr>
        </thead>
        <tbody>${perjanjianKinerjaRows()}</tbody>
      </table>
    </div>

    <!-- ═══════════════ SASARAN STRATEGIS ═══════════════ -->
    <div class="page page-break">
      <h2 class="section-title">BAB III — AKUNTABILITAS KINERJA</h2>
      <h3 class="sub-title">A. Capaian Kinerja Organisasi</h3>
      <h3 class="sub-title">Sasaran Strategis</h3>
      ${sasaranHtml}

      <h3 class="sub-title">Capaian Indikator Kinerja Tahun ${escH(tahun)}</h3>
      <p class="text-muted small">
        Indikator dikelompokkan mengikuti hierarki Renstra OPD aktif: Tujuan → Sasaran → Program → Kegiatan.
      </p>
      ${indikatorHierarkiHtml}
      ${indikatorOrphanHtml}
    </div>

    <!-- ═══════════════ PROGRAM / KEGIATAN ═══════════════ -->
    <div class="page page-break">
      <h3 class="sub-title">B. Rincian Realisasi Program dan Kegiatan</h3>
      <p class="text-muted small">
        Data program dan kegiatan bersumber dari entri LAKIP Tahun ${escH(tahun)}.
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:4%">No</th>
            <th style="width:18%">Program</th>
            <th style="width:18%">Kegiatan</th>
            <th style="width:18%">Indikator</th>
            <th style="width:8%">Target</th>
            <th style="width:8%">Realisasi</th>
            <th style="width:26%">Evaluasi</th>
          </tr>
        </thead>
        <tbody>${lakipRows}</tbody>
      </table>
    </div>

    <!-- ═══════════════ PENUTUP + TTD ═══════════════ -->
    <div class="page">
      <h2 class="section-title">BAB IV — PENUTUP</h2>
      <div class="exec-summary">
        <p>
          Berdasarkan hasil evaluasi kinerja Tahun ${escH(tahun)}, ${escH(opd.nama_opd)} telah
          melaksanakan program dan kegiatan sesuai dengan tugas pokok dan fungsinya dalam mendukung
          ketahanan pangan Provinsi ${escH(opd.nama_provinsi)}.
        </p>
        <p>
          Meski demikian, terdapat beberapa indikator yang belum mencapai target yang ditetapkan.
          Hal ini disebabkan oleh berbagai faktor baik internal maupun eksternal yang memerlukan
          perhatian dan tindak lanjut pada periode berikutnya.
        </p>
        <p><strong>Rekomendasi:</strong></p>
        <ul>
          <li>Peningkatan koordinasi lintas bidang dalam pelaksanaan program ketahanan pangan.</li>
          <li>Optimalisasi anggaran yang tersedia untuk mencapai target indikator kinerja.</li>
          <li>Penguatan monitoring dan evaluasi berkala terhadap capaian indikator kinerja.</li>
          <li>Pengembangan kapasitas SDM dalam pengelolaan program ketahanan pangan.</li>
        </ul>
      </div>

      <div class="ttd-area">
        <div class="ttd-box">
          <p>${escH(meta.opd.nama_provinsi)},
          ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p>${escH(opd.kepala_opd)}</p>
          <div class="ttd-name">
            (......................................)
          </div>
          <p class="text-muted small">${escH(opd.nip_kepala)}</p>
        </div>
      </div>
    </div>

  </div><!-- end content-wrapper -->
</body>
</html>`;
}

// ── HTML escape helper ─────────────────────────────────────────────────────
function escH(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render subbab Renstra (teks biasa + baris ber-tab jadi tabel sederhana) ──
function renderRenstraTeks(isiText) {
  if (!isiText) return '';
  const lines = String(isiText).split('\n');
  let html = '';
  let tableBuffer = [];
  const flushTable = () => {
    if (!tableBuffer.length) return;
    html += `<table class="renstra-subtable"><tbody>${tableBuffer
      .map(
        (line) =>
          `<tr>${line
            .split('\t')
            .map((c) => `<td>${escH(c)}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody></table>`;
    tableBuffer = [];
  };
  for (const line of lines) {
    if (line.includes('\t')) {
      tableBuffer.push(line);
    } else {
      flushTable();
      const t = line.trim();
      if (t) html += `<p>${escH(t)}</p>`;
    }
  }
  flushTable();
  return html;
}

function renderRenstraTabel(tables) {
  if (!tables || !tables.length) return '';
  return tables
    .map(
      (t) => `
    <div class="renstra-table-block">
      <p class="small"><strong>Tabel ${escH(t.nomor || '')} ${escH(t.judul || '')}</strong></p>
      <table>
        <thead><tr>${(t.columns || []).map((c) => `<th>${escH(c)}</th>`).join('')}</tr></thead>
        <tbody>${(t.tabel || [])
          .map(
            (row) =>
              `<tr>${(t.columns || []).map((c) => `<td>${escH(row[c] ?? '-')}</td>`).join('')}</tr>`,
          )
          .join('')}</tbody>
      </table>
      ${t.sumber ? `<p class="text-muted small">Sumber: ${escH(t.sumber)}</p>` : ''}
      ${t.analisa ? `<p class="small"><em>${escH(t.analisa)}</em></p>` : ''}
    </div>`,
    )
    .join('');
}

// ═══════════════ CONTROLLER EXPORTS ═══════════════════════════════════════

/**
 * GET /api/lakip-generator/data
 * JSON data untuk LAKIP (dipakai frontend atau PDF generator)
 */
exports.getData = async (req, res) => {
  try {
    const { tahun, periode_id } = req.query;
    const data = await collectLakipData(tahun, parseInt(periode_id) || 1);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[lakipGenerator] getData:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Gagal mengambil data LAKIP: ' + err.message });
  }
};

/**
 * GET /api/lakip-generator/preview
 * HTML print-ready — buka langsung di browser
 */
exports.preview = async (req, res) => {
  try {
    const { tahun, periode_id } = req.query;
    const data = await collectLakipData(tahun, parseInt(periode_id) || 1);
    const html = buildHtml(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (err) {
    console.error('[lakipGenerator] preview:', err);
    return res.status(500).send(`<h2>Gagal generate preview LAKIP</h2><pre>${err.message}</pre>`);
  }
};
