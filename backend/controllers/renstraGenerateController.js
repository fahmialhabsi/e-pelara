/**
 * renstraGenerateController.js
 * Auto-generate Dokumen Renstra OPD (Permendagri 86/2017)
 * Output: DOCX (html-to-docx) dan PDF (puppeteer)
 */

"use strict";

const HTMLtoDOCX = require("html-to-docx");
const puppeteer = require("puppeteer");

const {
  RenstraOPD,
  RenstraTujuan,
  RenstraSasaran,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  RenstraStrategi,
  RenstraKebijakan,
  IndikatorRenstra,
  OpdPenanggungJawab,
  RenstraBab,
  RenstraTabelStrategiKebijakan,
  RenstraTabelPrioritas,
} = require("../models");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: safe string
// ─────────────────────────────────────────────────────────────────────────────
const s = (v, fallback = "-") => (v ? String(v).trim() : fallback);
const n = (v, fallback = "0") => (v !== null && v !== undefined ? String(v) : fallback);
const fmt = (v) =>
  v !== null && v !== undefined && !isNaN(Number(v))
    ? Number(v).toLocaleString("id-ID")
    : "-";

// ─────────────────────────────────────────────────────────────────────────────
// Gather all Renstra data for a given renstra_id
// ─────────────────────────────────────────────────────────────────────────────
async function gatherData(renstraId) {
  const renstra = await RenstraOPD.findByPk(renstraId, {
    include: [{ model: OpdPenanggungJawab, as: "opd", required: false }],
  });
  if (!renstra) throw new Error(`Renstra OPD id=${renstraId} tidak ditemukan`);

  // Tujuan → Sasaran (flat, indikator di-fetch terpisah)
  const tujuans = await RenstraTujuan.findAll({
    where: { renstra_id: renstraId },
    order: [["no_tujuan", "ASC"]],
  });

  const sasarans = await RenstraSasaran.findAll({
    where: { renstra_id: renstraId },
    order: [["nomor", "ASC"]],
  });

  // Program
  const programs = await RenstraProgram.findAll({
    where: { renstra_id: renstraId },
    order: [["kode_program", "ASC"]],
  });

  // Kegiatan
  const kegiatans = await RenstraKegiatan.findAll({
    where: { renstra_id: renstraId },
    order: [["kode_kegiatan", "ASC"]],
  }).catch(() => []);

  // Sub-Kegiatan: filter by renstra_program_id (tidak ada renstra_id di tabel ini)
  const programIds = programs.map((p) => p.id);
  const subkegiatans = programIds.length > 0
    ? await RenstraSubkegiatan.findAll({
        where: { renstra_program_id: programIds },
        order: [["kode_sub_kegiatan", "ASC"]],
      }).catch(() => [])
    : [];

  // Strategi
  const strategis = await RenstraStrategi.findAll({
    where: { renstra_id: renstraId },
  }).catch(() => []);

  // Kebijakan: filter by strategi_ids yang ada di renstra ini
  const strategiIds = strategis.map((st) => st.id);
  const kebijakans = strategiIds.length > 0
    ? await RenstraKebijakan.findAll({
        where: { strategi_id: strategiIds },
      }).catch(() => [])
    : await RenstraKebijakan.findAll({
        where: { renstra_id: renstraId },
      }).catch(() => []);

  // Indikator (semua stage sekaligus)
  const indikators = await IndikatorRenstra.findAll({
    where: { renstra_id: renstraId },
  }).catch(() => []);

  // Fetch BAB content (I-VIII) dari tabel renstra_bab, di-key-kan oleh tahun_mulai Renstra
  const tahunRenstra = renstra.tahun_mulai;
  const babNomors = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  const babEntries = await RenstraBab.findAll({
    where: { tahun: tahunRenstra, bab: babNomors },
  }).catch(() => []);
  const babs = {};
  babEntries.forEach((b) => {
    const rec = b.toJSON();
    babs[rec.bab] = rec;
  });

  // Tabel Strategi & Kebijakan
  const tabelStrategiKebijakans = RenstraTabelStrategiKebijakan
    ? await RenstraTabelStrategiKebijakan.findAll({
        where: { renstra_id: renstraId },
        order: [["id", "ASC"]],
      }).catch(() => [])
    : [];

  // Tabel Prioritas (Nasional, Daerah, Gubernur)
  const tabelPrioritas = RenstraTabelPrioritas
    ? await RenstraTabelPrioritas.findAll({
        where: { renstra_id: renstraId },
        order: [["jenis_prioritas", "ASC"], ["id", "ASC"]],
      }).catch(() => [])
    : [];

  return {
    renstra: renstra.toJSON(),
    tujuans: tujuans.map((t) => t.toJSON()),
    sasarans: sasarans.map((s) => s.toJSON()),
    programs: programs.map((p) => p.toJSON()),
    kegiatans: kegiatans.map((k) => k.toJSON()),
    subkegiatans: subkegiatans.map((sk) => sk.toJSON()),
    strategis: strategis.map((st) => st.toJSON()),
    kebijakans: kebijakans.map((kb) => kb.toJSON()),
    indikators: indikators.map((i) => i.toJSON()),
    tabelStrategiKebijakans: tabelStrategiKebijakans.map((r) => r.toJSON()),
    tabelPrioritas: tabelPrioritas.map((r) => r.toJSON()),
    babs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build target columns header + cells from IndikatorRenstra
// ─────────────────────────────────────────────────────────────────────────────
function buildTargetRow(ind, tahunMulai) {
  const start = tahunMulai ? Number(tahunMulai) : 0;
  return [1, 2, 3, 4, 5]
    .map((i) => {
      const yr = start ? start + i - 1 : `T${i}`;
      const val = ind ? s(ind[`target_tahun_${i}`], "-") : "-";
      return `<td style="text-align:center">${val}<br/><small style="color:#555">${yr}</small></td>`;
    })
    .join("");
}

function targetHeaderCols(tahunMulai) {
  const start = tahunMulai ? Number(tahunMulai) : 0;
  return [1, 2, 3, 4, 5]
    .map((i) => {
      const yr = start ? start + i - 1 : `T${i}`;
      return `<th style="text-align:center">Target<br/>${yr}</th>`;
    })
    .join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// BAB IV: Tujuan & Sasaran table
// ─────────────────────────────────────────────────────────────────────────────
function buildBab4(data) {
  const { tujuans, sasarans, indikators, renstra } = data;
  const indByRefStage = {};
  indikators.forEach((ind) => {
    const key = `${ind.stage}_${ind.ref_id}`;
    if (!indByRefStage[key]) indByRefStage[key] = [];
    indByRefStage[key].push(ind);
  });

  const tahunMulai = renstra.tahun_mulai;

  let rows = "";
  let no = 1;
  tujuans.forEach((t) => {
    const tujIndikators = indByRefStage[`tujuan_${t.id}`] || [];
    const tSasarans = sasarans.filter((s) => s.tujuan_id === t.id);

    const tujRowspan = Math.max(
      tujIndikators.length || 1,
      tSasarans.reduce((acc, sas) => {
        const sInd = indByRefStage[`sasaran_${sas.id}`] || [];
        return acc + Math.max(sInd.length, 1);
      }, 0) || 1
    );

    let firstTujuan = true;
    if (tSasarans.length === 0) {
      // Tujuan tanpa sasaran
      const ind = tujIndikators[0] || null;
      rows += `
        <tr>
          <td rowspan="${Math.max(tujIndikators.length, 1)}">${no++}</td>
          <td rowspan="${Math.max(tujIndikators.length, 1)}" style="font-weight:bold">${s(t.no_tujuan)} ${s(t.isi_tujuan)}</td>
          <td>${ind ? s(ind.nama_indikator) : "-"}</td>
          <td>${ind ? s(ind.satuan) : "-"}</td>
          ${buildTargetRow(ind, tahunMulai)}
          <td rowspan="${Math.max(tujIndikators.length, 1)}">-</td>
          <td rowspan="${Math.max(tujIndikators.length, 1)}">-</td>
          <td rowspan="${Math.max(tujIndikators.length, 1)}">-</td>
          <td rowspan="${Math.max(tujIndikators.length, 1)}">-</td>
        </tr>`;
      tujIndikators.slice(1).forEach((ind2) => {
        rows += `<tr><td>${s(ind2.nama_indikator)}</td><td>${s(ind2.satuan)}</td>${buildTargetRow(ind2, tahunMulai)}</tr>`;
      });
    } else {
      tSasarans.forEach((sas, si) => {
        const sasInd = indByRefStage[`sasaran_${sas.id}`] || [];
        const sasRowspan = Math.max(sasInd.length, 1);

        let firstSasaran = true;
        const renderSasaranRow = (ind, isFirst) => {
          let cells = "";
          if (firstTujuan) {
            cells += `<td rowspan="${tujRowspan}">${no++}</td>
                      <td rowspan="${tujRowspan}" style="font-weight:bold">${s(t.no_tujuan)} ${s(t.isi_tujuan)}</td>`;
            const tInd = tujIndikators[0];
            cells += `<td rowspan="${tujRowspan}">${tInd ? s(tInd.nama_indikator) : "-"}</td>
                      <td rowspan="${tujRowspan}">${tInd ? s(tInd.satuan) : "-"}</td>`;
            cells += `<td rowspan="${tujRowspan}" style="text-align:center">${tInd ? s(tInd.target_tahun_1) : "-"}</td>
                      <td rowspan="${tujRowspan}" style="text-align:center">${tInd ? s(tInd.target_tahun_2) : "-"}</td>
                      <td rowspan="${tujRowspan}" style="text-align:center">${tInd ? s(tInd.target_tahun_3) : "-"}</td>
                      <td rowspan="${tujRowspan}" style="text-align:center">${tInd ? s(tInd.target_tahun_4) : "-"}</td>
                      <td rowspan="${tujRowspan}" style="text-align:center">${tInd ? s(tInd.target_tahun_5) : "-"}</td>`;
            firstTujuan = false;
          }
          if (firstSasaran) {
            cells += `<td rowspan="${sasRowspan}">${s(sas.nomor)} ${s(sas.isi_sasaran)}</td>`;
            firstSasaran = false;
          }
          cells += `<td>${ind ? s(ind.nama_indikator) : "-"}</td>
                    <td>${ind ? s(ind.satuan) : "-"}</td>
                    ${buildTargetRow(ind, tahunMulai)}`;
          return `<tr>${cells}</tr>`;
        };

        if (sasInd.length === 0) {
          rows += renderSasaranRow(null, true);
        } else {
          sasInd.forEach((ind, ii) => {
            rows += renderSasaranRow(ind, ii === 0);
          });
        }
      });
    }
  });

  if (!rows) {
    rows = `<tr><td colspan="14" style="text-align:center;color:#888;font-style:italic">Belum ada data Tujuan dan Sasaran Renstra</td></tr>`;
  }

  const tahunHeader = [1, 2, 3, 4, 5].map((i) => {
    const yr = tahunMulai ? Number(tahunMulai) + i - 1 : `T${i}`;
    return `<th>T${i}<br/>(${yr})</th>`;
  }).join("");

  return `
<h2>BAB IV<br/>TUJUAN DAN SASARAN</h2>
<h3>4.1 Tujuan dan Sasaran Jangka Menengah Perangkat Daerah</h3>
<p>Tujuan dan sasaran jangka menengah Perangkat Daerah adalah kondisi yang ingin diwujudkan selama lima tahun ke depan. Tabel berikut menyajikan tujuan, sasaran, beserta indikator kinerja dan target per tahun.</p>

<div style="overflow-x:auto">
<table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:11px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Tujuan</th>
      <th rowspan="2">Indikator Tujuan</th>
      <th rowspan="2">Satuan</th>
      ${tahunHeader}
      <th rowspan="2">Sasaran</th>
      <th rowspan="2">Indikator Sasaran</th>
      <th rowspan="2">Satuan</th>
      ${tahunHeader}
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BAB V: Strategi & Arah Kebijakan
// ─────────────────────────────────────────────────────────────────────────────
function buildBab5(data) {
  const { tujuans, sasarans, strategis, kebijakans } = data;

  let rows = "";
  if (strategis.length === 0 && kebijakans.length === 0) {
    rows = `<tr><td colspan="5" style="text-align:center;color:#888;font-style:italic">Belum ada data Strategi dan Arah Kebijakan</td></tr>`;
  } else {
    const stByTujuan = {};
    strategis.forEach((st) => {
      const key = st.tujuan_id || st.sasaran_id || "umum";
      if (!stByTujuan[key]) stByTujuan[key] = [];
      stByTujuan[key].push(st);
    });
    const kbBySasaran = {};
    kebijakans.forEach((kb) => {
      const key = kb.sasaran_id || kb.strategi_id || "umum";
      if (!kbBySasaran[key]) kbBySasaran[key] = [];
      kbBySasaran[key].push(kb);
    });

    let no = 1;
    if (strategis.length > 0) {
      strategis.forEach((st) => {
        const tujuan = tujuans.find((t) => t.id === st.tujuan_id);
        const sasaran = sasarans.find((s) => s.id === st.sasaran_id);
        const relKbs = kebijakans.filter((kb) => kb.strategi_id === st.id);
        rows += `<tr>
          <td>${no++}</td>
          <td>${tujuan ? `${s(tujuan.no_tujuan)} ${s(tujuan.isi_tujuan)}` : "-"}</td>
          <td>${sasaran ? `${s(sasaran.nomor)} ${s(sasaran.isi_sasaran)}` : "-"}</td>
          <td>${s(st.kode_strategi, "")} ${s(st.deskripsi)}</td>
          <td>${relKbs.length > 0 ? relKbs.map((kb) => s(kb.isi_arah_rpjmd || kb.deskripsi || kb.kode_kebjkn)).join("<br/>") : "-"}</td>
        </tr>`;
      });
    } else {
      kebijakans.forEach((kb) => {
        rows += `<tr>
          <td>${no++}</td>
          <td>-</td><td>-</td><td>-</td>
          <td>${s(kb.isi_kebijakan || kb.deskripsi || kb.kode_kebijakan)}</td>
        </tr>`;
      });
    }
  }

  return `
<h2>BAB V<br/>STRATEGI DAN ARAH KEBIJAKAN</h2>
<p>Strategi dan arah kebijakan merupakan cara untuk mencapai tujuan dan sasaran yang ditetapkan. Berikut adalah strategi dan arah kebijakan ${s(data.renstra.nama_opd)} periode ${s(data.renstra.tahun_mulai)}–${s(data.renstra.tahun_akhir)}.</p>
<table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:11px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th>No</th>
      <th>Tujuan</th>
      <th>Sasaran</th>
      <th>Strategi</th>
      <th>Arah Kebijakan</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BAB VI: Rencana Program dan Kegiatan
// ─────────────────────────────────────────────────────────────────────────────
function buildBab6(data) {
  const { programs, kegiatans, subkegiatans, indikators } = data;

  const indByRefStage = {};
  indikators.forEach((ind) => {
    const key = `${ind.stage}_${ind.ref_id}`;
    if (!indByRefStage[key]) indByRefStage[key] = [];
    indByRefStage[key].push(ind);
  });

  let rows = "";
  if (programs.length === 0) {
    rows = `<tr><td colspan="9" style="text-align:center;color:#888;font-style:italic">Belum ada data Program dan Kegiatan</td></tr>`;
  } else {
    let no = 1;
    programs.forEach((prog) => {
      const progInd = (indByRefStage[`program_${prog.id}`] || [])[0];
      rows += `<tr style="background:#d6eaf8;font-weight:bold">
        <td>${no++}</td>
        <td colspan="1">${s(prog.kode_program)}</td>
        <td colspan="3">${s(prog.nama_program)}</td>
        <td>${progInd ? s(progInd.satuan) : "-"}</td>
        <td>${progInd ? s(progInd.target_tahun_1) : "-"} / ${progInd ? s(progInd.target_tahun_2) : "-"} / ${progInd ? s(progInd.target_tahun_3) : "-"} / ${progInd ? s(progInd.target_tahun_4) : "-"} / ${progInd ? s(progInd.target_tahun_5) : "-"}</td>
        <td>${s(prog.opd_penanggung_jawab)}</td>
        <td>${s(prog.bidang_opd_penanggung_jawab)}</td>
      </tr>`;

      const progKegiatan = kegiatans.filter((k) => k.program_id === prog.id);
      progKegiatan.forEach((keg) => {
        const kegInd = (indByRefStage[`kegiatan_${keg.id}`] || [])[0];
        rows += `<tr style="background:#eaf4fb">
          <td></td>
          <td>${s(keg.kode_kegiatan)}</td>
          <td colspan="2">${s(keg.nama_kegiatan)}</td>
          <td></td>
          <td>${kegInd ? s(kegInd.satuan) : "-"}</td>
          <td>${kegInd ? [1,2,3,4,5].map(i=>s(kegInd[`target_tahun_${i}`])).join(" / ") : "-"}</td>
          <td colspan="2">${s(keg.bidang_opd)}</td>
        </tr>`;

        // RenstraSubkegiatan uses renstra_program_id + kegiatan_id
        const kegSub = subkegiatans.filter((sk) => sk.kegiatan_id === keg.id);
        kegSub.forEach((sub) => {
          const subInd = (indByRefStage[`sub_kegiatan_${sub.id}`] || [])[0];
          rows += `<tr>
            <td></td>
            <td></td>
            <td>${s(sub.kode_sub_kegiatan || sub.kode_subkegiatan)}</td>
            <td>${s(sub.nama_sub_kegiatan || sub.nama_subkegiatan)}</td>
            <td>${subInd ? s(subInd.nama_indikator) : "-"}</td>
            <td>${subInd ? s(subInd.satuan) : "-"}</td>
            <td>${subInd ? [1,2,3,4,5].map(i=>s(subInd[`target_tahun_${i}`])).join(" / ") : "-"}</td>
            <td colspan="2">-</td>
          </tr>`;
        });
      });
    });
  }

  const tahunMulai = data.renstra.tahun_mulai;
  const tahunAkhir = data.renstra.tahun_akhir;

  return `
<h2>BAB VI<br/>RENCANA PROGRAM DAN KEGIATAN SERTA PENDANAAN</h2>
<p>Rencana program dan kegiatan berikut merupakan penjabaran dari strategi dan arah kebijakan ${s(data.renstra.nama_opd)} dalam rangka pencapaian tujuan dan sasaran Renstra Periode ${s(tahunMulai)}–${s(tahunAkhir)}.</p>
<table border="1" cellspacing="0" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th>No</th>
      <th>Kode</th>
      <th>Program / Kegiatan</th>
      <th>Sub-Kegiatan</th>
      <th>Indikator Kinerja</th>
      <th>Satuan</th>
      <th>Target (T1/T2/T3/T4/T5)</th>
      <th>OPD PJ</th>
      <th>Bidang</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BAB VII: Kinerja Penyelenggaraan Bidang Urusan
// ─────────────────────────────────────────────────────────────────────────────
function buildBab7(data) {
  const { indikators, tujuans, sasarans, renstra } = data;

  const kinerjaInds = indikators.filter((i) => ["tujuan", "sasaran"].includes(i.stage));
  let rows = "";
  if (kinerjaInds.length === 0) {
    rows = `<tr><td colspan="8" style="text-align:center;color:#888;font-style:italic">Belum ada data Indikator Kinerja</td></tr>`;
  } else {
    kinerjaInds.forEach((ind, idx) => {
      const tujuan = tujuans.find((t) => t.id === ind.ref_id && ind.stage === "tujuan");
      const sasaran = sasarans.find((s) => s.id === ind.ref_id && ind.stage === "sasaran");
      rows += `<tr>
        <td>${idx + 1}</td>
        <td>${s(ind.kode_indikator)}</td>
        <td>${s(ind.nama_indikator)}</td>
        <td>${s(ind.satuan)}</td>
        <td style="text-align:center">${s(ind.baseline)}</td>
        <td style="text-align:center">${s(ind.target_tahun_1)} / ${s(ind.target_tahun_2)} / ${s(ind.target_tahun_3)} / ${s(ind.target_tahun_4)} / ${s(ind.target_tahun_5)}</td>
        <td>${tujuan ? `Tujuan: ${s(tujuan.no_tujuan)}` : sasaran ? `Sasaran: ${s(sasaran.nomor)}` : "-"}</td>
        <td>${s(ind.penanggung_jawab)}</td>
      </tr>`;
    });
  }

  return `
<h2>BAB VII<br/>KINERJA PENYELENGGARAAN BIDANG URUSAN</h2>
<p>Indikator kinerja perangkat daerah yang mengacu pada tujuan dan sasaran RPJMD, sebagai dasar evaluasi dan pelaporan kinerja ${s(data.renstra.nama_opd)} periode ${s(data.renstra.tahun_mulai)}–${s(data.renstra.tahun_akhir)}.</p>
<table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:11px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th>No</th>
      <th>Kode</th>
      <th>Indikator Kinerja</th>
      <th>Satuan</th>
      <th>Kondisi Awal (Baseline)</th>
      <th>Target T1/T2/T3/T4/T5</th>
      <th>Referensi RPJMD</th>
      <th>Penanggung Jawab</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Tabel Strategi & Kebijakan (untuk BAB V tambahan)
// ─────────────────────────────────────────────────────────────────────────────
function buildTabelStrategiKebijakan(data) {
  const rows = data.tabelStrategiKebijakans;
  if (!rows || rows.length === 0) return "";

  const tahunMulai = Number(data.renstra.tahun_mulai) || 0;
  const years = [1,2,3,4,5,6].map((i) => tahunMulai ? tahunMulai + i - 1 : `T${i}`);

  const tableRows = rows.map((r, idx) => `<tr>
    <td style="text-align:center">${idx+1}</td>
    <td>${s(r.kode_strategi)}<br/><small>${s(r.deskripsi_strategi)}</small></td>
    <td>${s(r.kode_kebijakan)}<br/><small>${s(r.deskripsi_kebijakan)}</small></td>
    <td>${s(r.indikator)}</td>
    <td style="text-align:center">${s(r.baseline, "0")}</td>
    ${[1,2,3,4,5,6].map((i) => `<td style="text-align:center">${s(r[`target_tahun_${i}`], "0")}</td>`).join("")}
    <td style="text-align:right">${fmt(r.pagu_akhir_renstra)}</td>
  </tr>`).join("");

  return `
<h3>Tabel Rencana Program Strategi dan Arah Kebijakan</h3>
<table border="1" cellspacing="0" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:9px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Strategi</th>
      <th rowspan="2">Arah Kebijakan</th>
      <th rowspan="2">Indikator</th>
      <th rowspan="2">Baseline</th>
      <th colspan="6">Target Tahun Ke-</th>
      <th rowspan="2">Pagu Akhir (Rp)</th>
    </tr>
    <tr>
      ${years.map((yr) => `<th>${yr}</th>`).join("")}
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Tabel Prioritas (Nasional / Daerah / Gubernur) untuk BAB VI tambahan
// ─────────────────────────────────────────────────────────────────────────────
function buildTabelPrioritas(data) {
  const rows = data.tabelPrioritas;
  if (!rows || rows.length === 0) return "";

  const grouped = { nasional: [], daerah: [], gubernur: [] };
  rows.forEach((r) => {
    if (grouped[r.jenis_prioritas]) grouped[r.jenis_prioritas].push(r);
  });

  const LABEL = { nasional: "Prioritas Nasional", daerah: "Prioritas Daerah", gubernur: "Prioritas Gubernur" };
  const tahunMulai = Number(data.renstra.tahun_mulai) || 0;
  const years = [1,2,3,4,5,6].map((i) => tahunMulai ? tahunMulai + i - 1 : `T${i}`);

  let html = "";
  ["nasional", "daerah", "gubernur"].forEach((jenis) => {
    const jRows = grouped[jenis];
    if (!jRows || jRows.length === 0) return;

    const tableRows = jRows.map((r, idx) => `<tr>
      <td style="text-align:center">${idx+1}</td>
      <td>${s(r.kode_prioritas, "-")}</td>
      <td>${s(r.nama_prioritas)}</td>
      <td>${s(r.indikator)}</td>
      <td style="text-align:center">${s(r.baseline, "0")}</td>
      ${[1,2,3,4,5,6].map((i) => `<td style="text-align:center">${s(r[`target_tahun_${i}`], "0")}</td>`).join("")}
      <td style="text-align:right">${fmt(r.pagu_akhir_renstra)}</td>
      <td>${s(r.program_terkait, "-")}</td>
    </tr>`).join("");

    html += `
<h3>Tabel ${LABEL[jenis]}</h3>
<table border="1" cellspacing="0" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:9px">
  <thead style="background:#1a5276;color:white">
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Kode</th>
      <th rowspan="2">Nama ${LABEL[jenis]}</th>
      <th rowspan="2">Indikator</th>
      <th rowspan="2">Baseline</th>
      <th colspan="6">Target Tahun Ke-</th>
      <th rowspan="2">Pagu Akhir (Rp)</th>
      <th rowspan="2">Program Terkait</th>
    </tr>
    <tr>
      ${years.map((yr) => `<th>${yr}</th>`).join("")}
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>`;
  });

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Render subbab list from renstra_bab.isi into HTML
// ─────────────────────────────────────────────────────────────────────────────
function renderSubbabsFromDB(babEntry) {
  const subbabList = babEntry?.isi;
  if (!subbabList || !Array.isArray(subbabList) || subbabList.length === 0) return null;

  return subbabList
    .map((sub) => {
      let html = "";
      const nomor = sub.nomor ? String(sub.nomor).trim() : "";
      const judul = sub.judul ? String(sub.judul).trim() : "";
      if (judul) {
        html += `<h3>${nomor ? nomor + " " : ""}${judul}</h3>`;
      }
      if (sub.isi && String(sub.isi).trim()) {
        const isiText = String(sub.isi)
          .trim()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n\n/g, "</p><p>")
          .replace(/\n/g, "<br/>");
        html += `<p>${isiText}</p>`;
      } else if (judul) {
        html += `<div class="placeholder">📝 <strong>[Belum diisi]</strong> ${nomor ? nomor + " " : ""}${judul}</div>`;
      }
      // Render tables if any
      if (sub.tables && Array.isArray(sub.tables)) {
        sub.tables.forEach((tbl) => {
          if (tbl && Array.isArray(tbl.headers) && Array.isArray(tbl.rows)) {
            const headerRow = tbl.headers.map((h) => `<th>${s(h)}</th>`).join("");
            const bodyRows = tbl.rows
              .map((row) => {
                const cells = Array.isArray(row) ? row : Object.values(row);
                return `<tr>${cells.map((c) => `<td>${s(c)}</td>`).join("")}</tr>`;
              })
              .join("");
            html += `<table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10pt;margin:12px 0">
              <thead style="background:#1a5276;color:white"><tr>${headerRow}</tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>`;
          }
        });
      }
      return html;
    })
    .join("\n");
}

/**
 * Mengembalikan konten BAB dari DB jika tersedia,
 * jika tidak, mengembalikan fallbackHtml (template statis dengan placeholder).
 */
function babSection(babEntry, fallbackHtml) {
  const fromDB = renderSubbabsFromDB(babEntry);
  return fromDB || fallbackHtml;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full HTML Document generator
// ─────────────────────────────────────────────────────────────────────────────
function generateHTML(data) {
  const { renstra } = data;
  const namaOpd   = s(renstra.nama_opd, "OPD");
  const bidang    = s(renstra.bidang_opd, "");
  const subBidang = s(renstra.sub_bidang_opd, "");
  const periode   = `${s(renstra.tahun_mulai)} – ${s(renstra.tahun_akhir)}`;
  const tglGen    = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  const bab4 = buildBab4(data);
  // BAB V: strategi+kebijakan + tabel strategi kebijakan (jika ada)
  const bab5 = buildBab5(data) + buildTabelStrategiKebijakan(data);
  // BAB VI: program+kegiatan + tabel prioritas (jika ada)
  const bab6 = buildBab6(data) + buildTabelPrioritas(data);
  const bab7 = buildBab7(data);

  // BAB I-III & VIII: gunakan konten dari DB jika sudah diisi, fallback ke template statis
  const bab1Content = babSection(data.babs?.["I"], `
<h3>1.1 Latar Belakang</h3>
<p>Rencana Strategis (Renstra) ${namaOpd} Periode ${periode} merupakan dokumen perencanaan pembangunan jangka menengah yang disusun berdasarkan Undang-Undang Nomor 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional dan Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah.</p>
<p>Renstra ini merupakan penjabaran dari visi, misi, dan program Kepala Daerah yang memuat tujuan, sasaran, strategi, kebijakan, dan program, serta kegiatan pembangunan dalam rangka pelaksanaan tugas pokok dan fungsi ${namaOpd}.</p>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Tambahkan narasi latar belakang yang mencakup kondisi daerah, kebijakan nasional/daerah yang mempengaruhi bidang urusan ini, dan konteks penyusunan Renstra OPD. — <em>Atau isi melalui menu <strong>Renstra → BAB I</strong> pada aplikasi, lalu generate ulang.</em></div>

<h3>1.2 Landasan Hukum</h3>
<p>Landasan hukum penyusunan Renstra ${namaOpd} Periode ${periode} antara lain:</p>
<ol>
  <li>Undang-Undang Nomor 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional</li>
  <li>Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah</li>
  <li>Peraturan Pemerintah Nomor 18 Tahun 2016 tentang Perangkat Daerah</li>
  <li>Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017 tentang Tata Cara Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah</li>
  <li>Peraturan Daerah tentang RPJMD Periode ${periode}</li>
</ol>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Tambahkan peraturan daerah setempat, peraturan gubernur/bupati/walikota, dan peraturan lain yang relevan. — <em>Isi melalui menu <strong>Renstra → BAB I</strong> lalu generate ulang.</em></div>

<h3>1.3 Maksud dan Tujuan</h3>
<p>Renstra ${namaOpd} disusun dengan maksud untuk:</p>
<ol>
  <li>Memberikan arah dan pedoman bagi seluruh aparatur ${namaOpd} dalam melaksanakan tugas pokok dan fungsinya.</li>
  <li>Menjadi acuan dalam penyusunan Rencana Kerja (Renja) tahunan ${namaOpd}.</li>
  <li>Menjadi tolok ukur evaluasi kinerja ${namaOpd} dalam periode ${periode}.</li>
</ol>
<p>Tujuan penyusunan Renstra ini adalah tersedianya dokumen perencanaan strategis ${namaOpd} yang terintegrasi dengan RPJMD Daerah periode ${periode}.</p>

<h3>1.4 Sistematika Penulisan</h3>
<p>Renstra ${namaOpd} Periode ${periode} disusun dengan sistematika sebagai berikut:</p>
<ul>
  <li><strong>BAB I: Pendahuluan</strong> — latar belakang, landasan hukum, maksud dan tujuan, serta sistematika penulisan.</li>
  <li><strong>BAB II: Gambaran Pelayanan Perangkat Daerah</strong> — tugas, fungsi, struktur organisasi, sumber daya, dan kinerja pelayanan.</li>
  <li><strong>BAB III: Permasalahan dan Isu-isu Strategis</strong> — identifikasi permasalahan dan isu strategis.</li>
  <li><strong>BAB IV: Tujuan dan Sasaran</strong> — tujuan dan sasaran jangka menengah beserta indikator kinerja.</li>
  <li><strong>BAB V: Strategi dan Arah Kebijakan</strong> — strategi dan arah kebijakan dalam mencapai tujuan dan sasaran.</li>
  <li><strong>BAB VI: Rencana Program dan Kegiatan</strong> — program, kegiatan, dan sub-kegiatan beserta pendanaan indikatif.</li>
  <li><strong>BAB VII: Kinerja Penyelenggaraan Bidang Urusan</strong> — indikator kinerja yang mengacu pada tujuan dan sasaran RPJMD.</li>
  <li><strong>BAB VIII: Penutup</strong> — kesimpulan dan harapan.</li>
</ul>
`);

  const bab2Content = babSection(data.babs?.["II"], `
<h3>2.1 Tugas, Fungsi, dan Struktur Organisasi</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Uraikan tugas pokok dan fungsi ${namaOpd} berdasarkan Peraturan Daerah/Peraturan Kepala Daerah tentang pembentukan dan susunan perangkat daerah. Sertakan bagan struktur organisasi. — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>

<h3>2.2 Sumber Daya ${namaOpd}</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Deskripsikan sumber daya manusia (jumlah, kualifikasi, dan distribusi pegawai), serta sumber daya aset/anggaran yang dimiliki ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>

<h3>2.3 Kinerja Pelayanan ${namaOpd}</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Sajikan data capaian kinerja pelayanan ${namaOpd} pada periode Renstra sebelumnya menggunakan tabel capaian indikator kinerja dan analisis pencapaiannya. — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>

<h3>2.4 Tantangan dan Peluang Pengembangan Pelayanan</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Identifikasi tantangan dan peluang berdasarkan analisis SWOT (kekuatan, kelemahan, peluang, ancaman). — <em>Isi melalui menu <strong>Renstra → BAB II</strong> lalu generate ulang.</em></div>
`);

  const bab3Content = babSection(data.babs?.["III"], `
<h3>3.1 Identifikasi Permasalahan Berdasarkan Tugas dan Fungsi Pelayanan</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Identifikasi permasalahan utama yang dihadapi ${namaOpd} dalam melaksanakan tugas dan fungsinya. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.2 Telaahan Visi, Misi, dan Program Kepala Daerah</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Uraikan keterkaitan visi dan misi Kepala Daerah dengan tugas dan fungsi ${namaOpd}, beserta faktor pendorong dan penghambat. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.3 Telaahan Renstra K/L dan Renstra Provinsi/Kabupaten/Kota</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Telaah sasaran jangka menengah Renstra K/L dan Renstra OPD yang terkait dengan tugas dan fungsi ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.4 Telaahan Rencana Tata Ruang Wilayah dan KLHS</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Uraikan implikasi RTRW dan KLHS terhadap tugas dan fungsi pelayanan ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>

<h3>3.5 Penentuan Isu-isu Strategis</h3>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Berdasarkan telaahan di atas, tentukan isu-isu strategis yang menjadi dasar penentuan tujuan, sasaran, strategi, dan kebijakan Renstra ${namaOpd}. — <em>Isi melalui menu <strong>Renstra → BAB III</strong> lalu generate ulang.</em></div>
`);

  const bab8Content = babSection(data.babs?.["VIII"], `
<p>Rencana Strategis ${namaOpd} Periode ${periode} merupakan dokumen perencanaan yang menjadi acuan dalam pelaksanaan tugas pokok dan fungsi ${namaOpd} selama lima tahun ke depan. Dokumen ini disusun dengan mengacu pada RPJMD Daerah dan peraturan perundang-undangan yang berlaku.</p>
<p>Keberhasilan pelaksanaan Renstra ini sangat ditentukan oleh komitmen seluruh aparatur ${namaOpd}, dukungan pemangku kepentingan (stakeholders), serta konsistensi dalam mengimplementasikan program dan kegiatan yang telah direncanakan.</p>
<div class="placeholder">📝 <strong>[Isi manual]</strong> Tambahkan narasi penutup yang mencakup: harapan capaian, mekanisme pemantauan dan evaluasi, serta pernyataan komitmen. — <em>Isi melalui menu <strong>Renstra → BAB VIII</strong> lalu generate ulang.</em></div>
`);

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Renstra ${namaOpd} ${periode}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 0; padding: 0; color: #000; }
  .cover { text-align: center; padding: 60px 40px; page-break-after: always; }
  .cover h1 { font-size: 18pt; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .cover h2 { font-size: 15pt; margin-bottom: 4px; }
  .cover .subtitle { font-size: 13pt; color: #333; margin: 4px 0; }
  .cover .logo-area { font-size: 60px; margin: 32px 0; }
  .cover .footer-info { margin-top: 40px; font-size: 12pt; }
  .toc { page-break-after: always; padding: 32px; }
  .toc h2 { text-align: center; text-transform: uppercase; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 4px 0; border-bottom: 1px dotted #aaa; display: flex; justify-content: space-between; }
  .section { padding: 24px 32px; }
  h1, h2, h3, h4 { font-family: 'Times New Roman', serif; }
  h2 { text-transform: uppercase; text-align: center; font-size: 14pt; margin-top: 24px; margin-bottom: 16px; }
  h3 { font-size: 12pt; margin-top: 16px; }
  p { text-align: justify; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 10pt; }
  table th { background: #1a5276; color: white; padding: 6px 8px; text-align: center; }
  table td { padding: 5px 8px; vertical-align: top; border: 1px solid #bbb; }
  table tr:nth-child(even) { background: #f5f5f5; }
  .placeholder { background: #fffbcc; border: 1px dashed #ccaa00; padding: 12px 16px; border-radius: 4px; margin: 12px 0; font-style: italic; color: #665500; }
  .pagebreak { page-break-before: always; }
  .signed { margin-top: 48px; text-align: right; padding-right: 60px; }
  .signed-left { margin-top: 48px; display: flex; justify-content: space-between; }
  .signed-block { text-align: center; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="logo-area">🏛️</div>
  <h1>Rencana Strategis (Renstra)</h1>
  <h2>${namaOpd}</h2>
  ${bidang ? `<p class="subtitle">${bidang}${subBidang ? " / " + subBidang : ""}</p>` : ""}
  <p class="subtitle" style="font-size:16pt;font-weight:bold">Periode ${periode}</p>
  <div class="footer-info">
    <p>Dokumen ini dibuat sesuai<br/>Peraturan Menteri Dalam Negeri Nomor 86 Tahun 2017</p>
    <p style="color:#666;font-size:10pt">Digenerate otomatis pada ${tglGen}</p>
  </div>
</div>

<!-- DAFTAR ISI -->
<div class="toc pagebreak">
  <h2>Daftar Isi</h2>
  <ul>
    <li><span>BAB I &nbsp; PENDAHULUAN</span><span>3</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.1 Latar Belakang</span><span>3</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.2 Landasan Hukum</span><span>4</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.3 Maksud dan Tujuan</span><span>5</span></li>
    <li><span>&nbsp;&nbsp;&nbsp;1.4 Sistematika Penulisan</span><span>5</span></li>
    <li><span>BAB II &nbsp; GAMBARAN PELAYANAN PERANGKAT DAERAH</span><span>6</span></li>
    <li><span>BAB III &nbsp; PERMASALAHAN DAN ISU-ISU STRATEGIS</span><span>10</span></li>
    <li><span>BAB IV &nbsp; TUJUAN DAN SASARAN</span><span>15</span></li>
    <li><span>BAB V &nbsp; STRATEGI DAN ARAH KEBIJAKAN</span><span>18</span></li>
    <li><span>BAB VI &nbsp; RENCANA PROGRAM DAN KEGIATAN</span><span>20</span></li>
    <li><span>BAB VII &nbsp; KINERJA PENYELENGGARAAN BIDANG URUSAN</span><span>25</span></li>
    <li><span>BAB VIII &nbsp; PENUTUP</span><span>28</span></li>
  </ul>
</div>

<!-- BAB I: PENDAHULUAN -->
<div class="section pagebreak">
<h2>BAB I<br/>PENDAHULUAN</h2>
${bab1Content}
</div>

<!-- BAB II: GAMBARAN PELAYANAN -->
<div class="section pagebreak">
<h2>BAB II<br/>GAMBARAN PELAYANAN PERANGKAT DAERAH</h2>
${bab2Content}
</div>

<!-- BAB III: PERMASALAHAN DAN ISU STRATEGIS -->
<div class="section pagebreak">
<h2>BAB III<br/>PERMASALAHAN DAN ISU-ISU STRATEGIS PERANGKAT DAERAH</h2>
${bab3Content}
</div>

<!-- BAB IV: TUJUAN DAN SASARAN (AUTO-POPULATED) -->
<div class="section pagebreak">
${bab4}
</div>

<!-- BAB V: STRATEGI DAN ARAH KEBIJAKAN (AUTO-POPULATED) -->
<div class="section pagebreak">
${bab5}
</div>

<!-- BAB VI: PROGRAM DAN KEGIATAN (AUTO-POPULATED) -->
<div class="section pagebreak">
${bab6}
</div>

<!-- BAB VII: KINERJA BIDANG URUSAN (AUTO-POPULATED) -->
<div class="section pagebreak">
${bab7}
</div>

<!-- BAB VIII: PENUTUP -->
<div class="section pagebreak">
<h2>BAB VIII<br/>PENUTUP</h2>
${bab8Content}

<div class="signed">
  <p>${s(renstra.kota_penetapan, "[KOTA]")}, ${tglGen}</p>
  <br/><br/>
  <p><strong>Kepala ${namaOpd}</strong></p>
  <br/><br/><br/>
  <p>_________________________________</p>
  <div class="placeholder">📝 <strong>[Isi manual]</strong> Nama, NIP, dan tanda tangan pejabat yang menandatangani dokumen ini.</div>
</div>
</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Generate DOCX
// ─────────────────────────────────────────────────────────────────────────────
exports.generateDocx = async (req, res) => {
  try {
    const renstraId = req.params.id;
    if (!renstraId) return res.status(400).json({ error: "renstra_id diperlukan" });

    const data = await gatherData(renstraId);
    const html = generateHTML(data);

    const namaOpd  = s(data.renstra.nama_opd, "OPD").replace(/\s+/g, "_");
    const periode  = `${s(data.renstra.tahun_mulai)}-${s(data.renstra.tahun_akhir)}`;
    const filename = `Renstra_${namaOpd}_${periode}.docx`;

    const docxBuffer = await HTMLtoDOCX(html, null, {
      title: `Renstra ${s(data.renstra.nama_opd)} ${periode}`,
      subject: "Rencana Strategis OPD",
      creator: "Sistem Perencanaan Daerah",
      description: `Renstra OPD sesuai Permendagri 86/2017`,
      orientation: "portrait",
      margins: { top: 1440, right: 1080, bottom: 1440, left: 1800 }, // 1.25 cm left margin
      pageSize: { width: 12240, height: 15840 }, // A4
      font: "Times New Roman",
      fontSize: 24, // 12pt
      lineSpacing: 276, // 1.5 spasi
      table: { row: { cantSplit: true } },
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Content-Length", docxBuffer.length);
    return res.end(docxBuffer);
  } catch (err) {
    console.error("❌ generateDocx error:", err);
    return res.status(500).json({ error: "Gagal generate dokumen DOCX", detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Generate PDF (via Puppeteer)
// ─────────────────────────────────────────────────────────────────────────────
exports.generatePdf = async (req, res) => {
  let browser;
  try {
    const renstraId = req.params.id;
    if (!renstraId) return res.status(400).json({ error: "renstra_id diperlukan" });

    const data = await gatherData(renstraId);
    const html = generateHTML(data);

    const namaOpd  = s(data.renstra.nama_opd, "OPD").replace(/\s+/g, "_");
    const periode  = `${s(data.renstra.tahun_mulai)}-${s(data.renstra.tahun_akhir)}`;
    const filename = `Renstra_${namaOpd}_${periode}.pdf`;

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "2.5cm", right: "2cm", bottom: "2.5cm", left: "3cm" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ generatePdf error:", err);
    return res.status(500).json({ error: "Gagal generate dokumen PDF", detail: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: Preview HTML (for debugging/preview in browser)
// ─────────────────────────────────────────────────────────────────────────────
exports.previewHtml = async (req, res) => {
  try {
    const renstraId = req.params.id;
    if (!renstraId) return res.status(400).json({ error: "renstra_id diperlukan" });
    const data = await gatherData(renstraId);
    const html = generateHTML(data);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (err) {
    console.error("❌ previewHtml error:", err);
    return res.status(500).json({ error: "Gagal generate preview HTML", detail: err.message });
  }
};
