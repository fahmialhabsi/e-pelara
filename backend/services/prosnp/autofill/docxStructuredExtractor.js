'use strict';

/**
 * P1 DOCX STRUCTURED TABLE EXTRACTION — mandat §8-§12.
 *
 * `mammoth.extractRawText` meratakan tabel Word menjadi teks linear dan
 * kehilangan hubungan sel label -> sel nilai. Modul ini membaca
 * `word/document.xml` (dalam kontainer ZIP DOCX) secara langsung untuk
 * merekonstruksi tabel sbg baris/sel terstruktur, TANPA dependency baru —
 * `jszip` dan `@xmldom/xmldom` sudah tersedia sbg bagian subtree dependency
 * `mammoth` yang telah terpasang & diotorisasi sebelumnya.
 *
 * Keamanan: HANYA membaca teks polos dari XML (tidak mengeksekusi macro,
 * tidak mengikuti relationship/link eksternal, tidak mengekstrak embedded
 * object). Tidak ada shell/child_process yang dipanggil.
 */
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

function getParagraphTexts(cellEl) {
  const paras = [];
  for (let i = 0; i < cellEl.childNodes.length; i += 1) {
    const node = cellEl.childNodes[i];
    if (node.nodeType === 1 && node.tagName === 'w:p') {
      const texts = node.getElementsByTagName('w:t');
      let out = '';
      for (let j = 0; j < texts.length; j += 1) out += texts[j].textContent;
      paras.push(out);
    }
  }
  return paras;
}

/** Baca `word/document.xml` dan kembalikan seluruh tabel sbg { rows: [{ cells: [cellText] }] }, `cellText` = paragraf sel digabung "\n" (batas paragraf dipertahankan agar resolver label/value bisa memisahkan multi-pasangan dalam satu sel). */
async function extractDocxTables(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) return { tables: [] };
  const xml = await documentXmlFile.async('string');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const tableEls = doc.getElementsByTagName('w:tbl');
  const tables = [];
  for (let t = 0; t < tableEls.length; t += 1) {
    const rowEls = tableEls[t].getElementsByTagName('w:tr');
    const rows = [];
    for (let r = 0; r < rowEls.length; r += 1) {
      const tr = rowEls[r];
      const cells = [];
      for (let i = 0; i < tr.childNodes.length; i += 1) {
        const node = tr.childNodes[i];
        if (node.nodeType === 1 && node.tagName === 'w:tc') {
          cells.push(getParagraphTexts(node).join('\n'));
        }
      }
      rows.push({ cells });
    }
    tables.push({ rows });
  }
  return { tables };
}

/**
 * §11-§12 mandat — resolusi generic label->value: label di sel PERTAMA,
 * value di sel TERAKHIR (mengabaikan sel pemisah ":" di tengah bila ada).
 * Mendukung SATU baris fisik berisi >1 pasangan label/value yang ter-stack
 * sbg paragraf terpisah dalam sel yang sama (struktur nyata Notulen: label
 * "Pimpinan Rapat"+"Agenda Rapat" dalam satu sel, nilai masing2 diawali ":"
 * pada sel terakhir). Paragraf nilai yang TIDAK diawali ":" dianggap
 * KELANJUTAN nilai sebelumnya (menangani agenda yang line-wrap tanpa colon
 * berulang) — jangan sampai kelanjutan itu dikira pasangan baru.
 */
function resolveLabelValuePairs(table) {
  const pairs = [];
  (table.rows || []).forEach((row) => {
    const cells = row.cells || [];
    if (cells.length < 2) return;
    const labelParas = cells[0].split('\n').map((s) => s.trim()).filter(Boolean);
    if (!labelParas.length) return;
    const valueParas = cells[cells.length - 1].split('\n').map((s) => s.trim()).filter((s) => s !== '');
    const valueGroups = [];
    valueParas.forEach((para) => {
      if (/^:/.test(para) || valueGroups.length === 0) {
        valueGroups.push(para.replace(/^:\s*/, ''));
      } else {
        valueGroups[valueGroups.length - 1] += ` ${para}`;
      }
    });
    labelParas.forEach((label, i) => {
      const value = valueGroups[i] !== undefined ? valueGroups[i].replace(/\s+/g, ' ').trim() : '';
      if (value) pairs.push({ label, value });
    });
  });
  return pairs;
}

/** Cari value berdasar label yang dinormalisasi (lowercase, spasi tunggal, trim) terhadap daftar kandidat label yang juga sudah dinormalisasi. */
function findValueByLabel(pairs, normalizedLabelCandidates) {
  const found = pairs.find((p) => normalizedLabelCandidates.includes(p.label.toLowerCase().replace(/\s+/g, ' ').trim()));
  return found ? found.value : null;
}

module.exports = { extractDocxTables, resolveLabelValuePairs, findValueByLabel };
