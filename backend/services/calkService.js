"use strict";

const { populateDataOtomatis } = require("./calkDataProvider");

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const VARIABEL_DEFAULT = {
  "[NAMA_OPD]": "Dinas Pangan Provinsi Maluku Utara",
  "[NAMA_PROVINSI]": "Maluku Utara",
  "[TAHUN]": "",
  "[KEPALA_OPD]": "Dheni Tjan, SH., M.Si",
  "[NAMA_KEPALA_OPD]": "Dheni Tjan, SH., M.Si",
  "[NIP_KEPALA_OPD]": "19750730 200112 1 001",
  "[JABATAN_KEPALA_OPD]": "Kepala Dinas Pangan Provinsi Maluku Utara",
  "[KOTA]": "Sofifi",
  "[NOMOR_REKENING]": "",
  "[TUPOKSI_OPD]": "Pembinaan dan pengelolaan ketahanan pangan daerah",
  "[BULAN_TAHUN]": "",
  "[ISI_JIKA_ADA]": "(Belum diisi — tambahkan jika ada temuan BPK)",
};

function substitusi(teks, variabel) {
  let out = teks || "";
  for (const [key, val] of Object.entries(variabel)) {
    if (val == null) continue;
    const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    out = out.replace(re, String(val));
  }
  return out;
}

function buildVariabel(tahunAnggaran) {
  const d = new Date();
  const bulanTahun = `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
  const base = {
    ...VARIABEL_DEFAULT,
    "[TAHUN]": String(tahunAnggaran),
    "[BULAN_TAHUN]": bulanTahun,
  };
  base["[NAMA_KEPALA_OPD]"] = base["[KEPALA_OPD]"];
  return base;
}

async function generateSemuaKontenCalk(sequelize, models, tahunAnggaran) {
  const { CalkTemplate, CalkKonten } = models;
  const templates = await CalkTemplate.findAll({ order: [["urutan", "ASC"]] });
  const variabel = buildVariabel(tahunAnggaran);
  let diisi = 0;
  let dilewati = 0;

  for (const tmpl of templates) {
    const existing = await CalkKonten.findOne({
      where: { tahun_anggaran: tahunAnggaran, template_id: tmpl.id },
    });
    if (existing && existing.status === "FINAL") {
      dilewati++;
      continue;
    }

    const dataOtomatis = await populateDataOtomatis(
      sequelize,
      models,
      tmpl.sumber_data,
      tahunAnggaran,
    );

    let konten = substitusi(tmpl.konten_default || "", variabel);
    if (tmpl.tipe === "TABEL_AUTO" && dataOtomatis) {
      konten += `\n\n<!-- data_otomatis -->\n<pre>${JSON.stringify(dataOtomatis, null, 2)}</pre>`;
    }

    const payload = {
      tahun_anggaran: tahunAnggaran,
      template_id: tmpl.id,
      konten,
      data_otomatis: dataOtomatis,
      variabel,
      status: "DRAFT",
      terakhir_diedit: new Date(),
    };

    const [row, created] = await CalkKonten.findOrCreate({
      where: { tahun_anggaran: tahunAnggaran, template_id: tmpl.id },
      defaults: { ...payload, diedit_oleh: null },
    });
    if (!created) {
      if (row.status === "FINAL") {
        dilewati++;
        continue;
      }
      await row.update(payload);
    }
    diisi++;
  }

  return { total_template: templates.length, diisi, dilewati_final: dilewati };
}

async function statusCalk(models, tahunAnggaran) {
  const { CalkTemplate, CalkKonten } = models;
  const templates = await CalkTemplate.findAll();
  const konten = await CalkKonten.findAll({ where: { tahun_anggaran: tahunAnggaran } });
  const map = new Map(konten.map((k) => [k.template_id, k]));
  let finalC = 0;
  let draftC = 0;
  let kosong = 0;
  for (const t of templates) {
    const k = map.get(t.id);
    if (!k) kosong++;
    else if (k.status === "FINAL") finalC++;
    else draftC++;
  }
  const wajib = templates.filter((x) => x.wajib).length;
  const wajibFinal = templates.filter((x) => {
    if (!x.wajib) return false;
    const k = map.get(x.id);
    return k && k.status === "FINAL";
  }).length;

  return {
    total_bab: templates.length,
    final: finalC,
    draft: draftC,
    belum_diisi: kosong,
    persen_final: templates.length ? Math.round((finalC / templates.length) * 1000) / 10 : 0,
    wajib_total: wajib,
    wajib_final: wajibFinal,
  };
}

async function previewHtml(models, tahunAnggaran) {
  const { CalkTemplate, CalkKonten } = models;
  const templates = await CalkTemplate.findAll({ order: [["urutan", "ASC"]] });
  const konten = await CalkKonten.findAll({ where: { tahun_anggaran: tahunAnggaran } });
  const map = new Map(konten.map((k) => [k.template_id, k]));

  const parts = [];
  parts.push(`<article class="calk-preview"><h1>CALK ${tahunAnggaran}</h1>`);
  for (const t of templates) {
    const k = map.get(t.id);
    const sub = t.sub_bab ? `${t.bab}.${t.sub_bab}` : String(t.bab);
    parts.push(`<section><h2>BAB ${sub} — ${escapeHtml(t.judul)}</h2>`);
    if (k && k.konten) {
      parts.push(`<div class="isi">${k.konten}</div>`);
    } else {
      parts.push("<p><em>Belum diisi</em></p>");
    }
    parts.push("</section>");
  }
  parts.push("</article>");
  return { html: parts.join("\n"), tahun_anggaran: tahunAnggaran };
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  generateSemuaKontenCalk,
  statusCalk,
  previewHtml,
  VARIABEL_DEFAULT,
  buildVariabel,
  substitusi,
};
