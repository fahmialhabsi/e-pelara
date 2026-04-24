"use strict";

const fs = require("fs");
const path = require("path");

const TPL_DIR = path.join(__dirname, "..", "templates", "lk");

function readTpl(name) {
  return fs.readFileSync(path.join(TPL_DIR, name), "utf8");
}

function applyVars(template, vars) {
  let s = template;
  for (const [k, val] of Object.entries(vars)) {
    const token = `{{${k}}}`;
    while (s.includes(token)) {
      s = s.replace(token, val == null ? "" : String(val));
    }
  }
  return s;
}

function formatRp(n) {
  const v = Math.abs(parseFloat(n) || 0);
  return v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRpSigned(n) {
  const x = parseFloat(n) || 0;
  const body = Math.abs(x).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (x < 0) return `(${body})`;
  return body;
}

function formatPct(n) {
  return `${(parseFloat(n) || 0).toFixed(2)} %`;
}

const KELOMPOK_LRA = {
  PENDAPATAN: "PENDAPATAN",
  BELANJA: "BELANJA",
  PEMBIAYAAN: "PEMBIAYAAN",
  null: "LAINNYA",
};

function renderLraRows(lraRows) {
  let last = null;
  let html = "";
  for (const row of lraRows) {
    const g = row.kelompok || "null";
    if (g !== last) {
      last = g;
      const label = KELOMPOK_LRA[g] || g;
      html += `<tr class="kelompok-row"><td colspan="5">${label}</td></tr>`;
    }
    const af =
      parseFloat(row.anggaran_perubahan) > 0
        ? parseFloat(row.anggaran_perubahan)
        : parseFloat(row.anggaran_murni) || 0;
    html += `<tr>
      <td>${row.kode_akun || ""} — ${row.nama_akun || ""}</td>
      <td class="rupiah">${formatRp(af)}</td>
      <td class="rupiah">${formatRp(row.realisasi)}</td>
      <td class="persen">${formatPct(row.persen)}</td>
      <td class="rupiah">${formatRp(row.realisasi_tahun_lalu)}</td>
    </tr>`;
  }
  return html;
}

function renderNeracaRows(rows) {
  let html = "";
  let lastK = null;
  for (const row of rows) {
    if (row.kelompok !== lastK) {
      lastK = row.kelompok;
      html += `<tr class="kelompok-row"><td colspan="3">${row.kelompok}</td></tr>`;
    }
    html += `<tr>
      <td>${row.kode_akun} — ${row.nama_akun || ""}</td>
      <td class="rupiah">${formatRp(row.nilai_tahun_ini)}</td>
      <td class="rupiah">${formatRp(row.nilai_tahun_lalu)}</td>
    </tr>`;
  }
  return html;
}

function renderLoRows(rows) {
  let html = "";
  const byK = {};
  for (const r of rows) {
    const k = r.kelompok || "OTHER";
    if (!byK[k]) byK[k] = [];
    byK[k].push(r);
  }
  const order = ["PENDAPATAN_LO", "BEBAN_LO"];
  for (const k of order) {
    const list = byK[k];
    if (!list?.length) continue;
    html += `<tr class="kelompok-row"><td colspan="2">${k.replace(/_/g, " ")}</td></tr>`;
    for (const r of list.sort((a, b) => (a.urutan || 0) - (b.urutan || 0))) {
      html += `<tr><td>${r.kode_akun} — ${r.nama_akun || ""}</td><td class="rupiah">${formatRpSigned(r.nilai_tahun_ini)}</td></tr>`;
    }
  }
  return html;
}

function renderLpeRows(rows) {
  return rows
    .map(
      (r) => `<tr>
      <td>${String(r.komponen || "").replace(/_/g, " ")}</td>
      <td class="rupiah">${formatRpSigned(r.nilai_tahun_ini)}</td>
      <td class="rupiah">${formatRpSigned(r.nilai_tahun_lalu)}</td>
    </tr>`,
    )
    .join("");
}

function renderLakRows(rows) {
  return rows
    .map(
      (r) => `<tr>
      <td>${r.uraian || r.komponen || ""}</td>
      <td class="rupiah">${formatRpSigned(r.nilai_tahun_ini)}</td>
      <td class="rupiah">${formatRpSigned(r.nilai_tahun_lalu)}</td>
    </tr>`,
    )
    .join("");
}

function renderIndeksCalkRows(templates) {
  let i = 1;
  return templates
    .map(
      (t) => `<tr>
      <td class="text-center">${i++}</td>
      <td>${t.bab}${t.sub_bab ? `.${t.sub_bab}` : ""}</td>
      <td>${escapeHtml(t.judul)}</td>
    </tr>`,
    )
    .join("");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRingkasanRows(vSum) {
  const rows = [
    ["Total Pendapatan LRA (realisasi)", vSum.pendapatan],
    ["Total Belanja LRA (realisasi)", vSum.belanja],
    ["Total Aset (Neraca)", vSum.aset],
    ["Total Kewajiban (Neraca)", vSum.kewajiban],
    ["Ekuitas (Neraca)", vSum.ekuitas],
    ["Surplus/(Defisit) LO", vSum.surplus_lo],
  ];
  return rows
    .map(
      ([u, n]) => `<tr><td>${u}</td><td class="rupiah">${formatRpSigned(n)}</td></tr>`,
    )
    .join("");
}

function renderCalkSections(templatesWithKonten) {
  return templatesWithKonten
    .map((x) => {
      const t = x.template;
      const k = x.konten;
      const sub = t.sub_bab ? `BAB ${t.bab}.${t.sub_bab}` : `BAB ${t.bab}`;
      const body = k?.konten || t.konten_default || "";
      return `<div style="margin-bottom:24px;">
        <h3 style="font-size:12pt;">${escapeHtml(sub)} — ${escapeHtml(t.judul)}</h3>
        <div class="calk-isi">${body}</div>
      </div>`;
    })
    .join("");
}

function buildLogoHtml() {
  const url = process.env.LK_LOGO_URL || "";
  if (!url) return "";
  return `<div class="text-center" style="margin-bottom:16px;"><img src="${escapeHtml(url)}" style="max-width:100px; max-height:100px;" alt="Logo" /></div>`;
}

function buildDocumentHtml(data, variabel) {
  const v = { ...variabel, LOGO_HTML: buildLogoHtml() };

  const parts = [];

  parts.push(applyVars(readTpl("halaman-judul.html"), v));
  parts.push('<div class="page-break"></div>');
  parts.push(applyVars(readTpl("kata-pengantar.html"), v));
  parts.push('<div class="page-break"></div>');
  parts.push(applyVars(readTpl("daftar-isi.html"), v));
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("indeks-calk.html"), {
      ...v,
      INDEKS_CALK_ROWS: renderIndeksCalkRows(data.calkTemplates),
    }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(applyVars(readTpl("pernyataan-tj.html"), v));
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("ringkasan.html"), {
      ...v,
      RINGKASAN_ROWS: renderRingkasanRows(data.ringkasan),
    }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("lra.html"), { ...v, LRA_ROWS: renderLraRows(data.lraRows) }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("neraca.html"), {
      ...v,
      NERACA_ROWS: renderNeracaRows(data.neracaRows),
    }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("lo.html"), { ...v, LO_ROWS: renderLoRows(data.loRows) }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("lpe.html"), { ...v, LPE_ROWS: renderLpeRows(data.lpeRows) }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("lak.html"), { ...v, LAK_ROWS: renderLakRows(data.lakRows) }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(
    applyVars(readTpl("calk-shell.html"), {
      ...v,
      CALK_SECTIONS: renderCalkSections(data.calkBab),
    }),
  );
  parts.push('<div class="page-break"></div>');
  parts.push(applyVars(readTpl("daftar-lampiran.html"), v));

  const layout = readTpl("layout.html");
  return applyVars(layout, { CONTENT: parts.join("\n") });
}

module.exports = {
  buildDocumentHtml,
  readTpl,
  applyVars,
};
