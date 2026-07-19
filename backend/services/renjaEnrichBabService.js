'use strict';

/**
 * renjaEnrichBabService.js
 * Enrich narasi BAB Renja menggunakan Groq API (llama-3.1-8b-instant)
 * Fallback ke Ollama jika Groq gagal.
 */

const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

// ── Helper: pisahkan tabel markdown dari narasi agar tidak ikut diproses AI ──
function extractMarkdownTables(text) {
  const lines = String(text || '').split('\n');
  const narrativeLines = [];
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isTableTitle = /^Tabel\s+\d/.test(line.trim());
    const isPipeRow = line.trim().startsWith('|');
    if (isPipeRow || isTableTitle) {
      const block = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('|') ||
          /^Tabel\s+\d/.test(lines[i].trim()) ||
          lines[i].trim() === '')
      ) {
        block.push(lines[i]);
        i += 1;
        if (
          lines[i] !== undefined &&
          lines[i].trim() === '' &&
          (lines[i + 1] === undefined || !lines[i + 1].trim().startsWith('|'))
        ) {
          break;
        }
      }
      tables.push(block.join('\n').trim());
    } else {
      narrativeLines.push(line);
      i += 1;
    }
  }
  return { narrativeOnly: narrativeLines.join('\n').trim(), tables };
}

// ── Helper: panggil Groq API ─────────────────────────────────────────────────
async function callGroq(systemPrompt, userPrompt) {
  const res = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
  );
  return res.data?.choices?.[0]?.message?.content ?? '';
}

// ── Helper: panggil Ollama (fallback) ────────────────────────────────────────
async function callOllama(systemPrompt, userPrompt) {
  const res = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0.1, num_predict: 600 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    { timeout: 120000 },
  );
  return res.data?.message?.content ?? '';
}

// ── Helper: panggil LLM dengan fallback ─────────────────────────────────────
async function callLLM(systemPrompt, userPrompt) {
  if (GROQ_API_KEY) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await callGroq(systemPrompt, userPrompt);
      } catch (e) {
        const status = e.response?.status;
        const msg = e.response?.data?.error?.message || '';
        console.warn(
          '[enrichBab] Groq gagal. Status:',
          status,
          'Data:',
          JSON.stringify(e.response?.data),
          'Message:',
          e.message,
        );
        if (status === 429 && attempt === 0) {
          const match = msg.match(/try again in ([\d.]+)s/);
          const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 5000;
          console.warn(`[enrichBab] Tunggu ${waitMs}ms lalu retry Groq...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        break;
      }
    }
    console.warn('[enrichBab] Groq tetap gagal setelah retry, fallback ke Ollama.');
  }
  return callOllama(systemPrompt, userPrompt);
}

// ── System prompt dasar ──────────────────────────────────────────────────────
const SYSTEM_BASE = `Kamu adalah asisten penyusunan dokumen perencanaan pemerintah daerah Indonesia.

Tugas kamu adalah memperkaya (enrich) narasi BAB dokumen Renja (Rencana Kerja) OPD dengan bahasa Indonesia formal sesuai dokumen pemerintah.

PRINSIP UTAMA:
- Gunakan hanya data yang diberikan.
- Jangan membuat angka, target, prediksi, persentase, atau fakta baru tanpa sumber.
- Jika informasi sektoral tidak diberikan, gunakan narasi umum dan jangan mengarang.
- Pertahankan substansi dokumen awal.

ATURAN DATA:
- Data BPS digunakan untuk memperkuat analisis kondisi daerah.
- Hubungkan data ekonomi, sosial, dan pembangunan dengan tugas fungsi OPD secara relevan.
- Jangan mengganti fakta program/kegiatan/anggaran yang sudah ada.

ATURAN TABEL:
- Jika input memiliki tabel, tabel tersebut adalah DATA RESMI.
- Jangan mengubah, menghapus, meringkas, membuat ulang, atau menambahkan tabel.
- Jangan membuat format markdown tabel baru.
- Output hanya berupa narasi sebelum tabel.

Kembalikan HANYA teks narasi, tanpa heading tambahan, tanpa markdown, tanpa penjelasan proses.`;

// ────────────────────────────────────────────────────────────────────────────
// ENRICH PER BAB
// ────────────────────────────────────────────────────────────────────────────

async function enrichBab1(namaOpd, tahun, bpsData, narasiAwal) {
  const prompt = `Perkaya narasi BAB I (Pendahuluan) dokumen Renja ${namaOpd} Tahun ${tahun} berikut dengan data BPS terbaru.

DATA BPS MALUKU UTARA TERBARU:
- PDRB: Laju pertumbuhan ${bpsData.pdrb?.nilai ?? '-'}% (${bpsData.pdrb?.tahun ?? '-'})
- Kemiskinan: ${bpsData.kemiskinan?.nilai ?? '-'}% penduduk miskin (${bpsData.kemiskinan?.tahun ?? '-'})
- IPM: ${bpsData.ipm?.nilai ?? '-'} (${bpsData.ipm?.tahun ?? '-'})
- Inflasi: ${bpsData.inflasi?.nilai ?? '-'}% (${bpsData.inflasi?.tahun ?? '-'})

NARASI AWAL:
${narasiAwal}

Tugas: Perkaya narasi di atas dengan menyisipkan data BPS secara natural. Pertahankan struktur asli, tambahkan konteks kondisi ekonomi dan sosial Maluku Utara. Maksimal 5 paragraf.`;

  return callLLM(SYSTEM_BASE, prompt);
}

async function enrichBab2(namaOpd, tahun, bpsData, narasiAwal, renjaItems) {
  const { narrativeOnly, tables } = extractMarkdownTables(narasiAwal);
  const totalPagu = renjaItems.reduce((s, r) => s + (Number(r.pagu) || 0), 0);
  const prompt = `Perkaya narasi BAB II (Evaluasi Pelaksanaan Renja Tahun Lalu) dokumen Renja ${namaOpd} Tahun ${tahun}.

DATA BPS MALUKU UTARA TERBARU:
- PDRB: ${bpsData.pdrb?.nilai ?? '-'}% (${bpsData.pdrb?.tahun ?? '-'})
- Kemiskinan: ${bpsData.kemiskinan?.nilai ?? '-'}% (${bpsData.kemiskinan?.tahun ?? '-'})
- IPM: ${bpsData.ipm?.nilai ?? '-'} (${bpsData.ipm?.tahun ?? '-'})

KONTEKS PROGRAM:
- Jumlah program/kegiatan: ${renjaItems.length}
- Total pagu anggaran: Rp ${totalPagu.toLocaleString('id-ID')}

NARASI AWAL (tanpa tabel):
${narrativeOnly}

Tugas: Perkaya narasi evaluasi dengan mengaitkan capaian program ketahanan pangan terhadap kondisi kemiskinan dan IPM Maluku Utara. Maksimal 4 paragraf. JANGAN membuat atau menyertakan tabel apapun dalam jawaban.`;

  const enrichedNarrative = await callLLM(SYSTEM_BASE, prompt);
  if (!tables.length) return enrichedNarrative;
  return `${enrichedNarrative}\n\n${tables.join('\n\n')}`;
}

async function enrichBab3(namaOpd, tahun, bpsData, narasiAwal) {
  const { narrativeOnly, tables } = extractMarkdownTables(narasiAwal);
  const prompt = `Perkaya narasi BAB III (Tujuan dan Sasaran) dokumen Renja ${namaOpd} Tahun ${tahun}.
DATA BPS MALUKU UTARA TERBARU:
- Kemiskinan: ${bpsData.kemiskinan?.nilai ?? '-'}% (${bpsData.kemiskinan?.tahun ?? '-'})
- IPM: ${bpsData.ipm?.nilai ?? '-'} (${bpsData.ipm?.tahun ?? '-'})
- PDRB: ${bpsData.pdrb?.nilai ?? '-'}% (${bpsData.pdrb?.tahun ?? '-'})
NARASI AWAL (tanpa tabel):
${narrativeOnly}
Tugas: Perkaya narasi tujuan dan sasaran dengan mengaitkan target Dinas Pangan terhadap kondisi riil kemiskinan dan ketahanan pangan Maluku Utara. Maksimal 4 paragraf. JANGAN membuat atau menyertakan tabel apapun dalam jawaban.`;
  const enrichedNarrative = await callLLM(SYSTEM_BASE, prompt);
  if (!tables.length) return enrichedNarrative;
  return `${enrichedNarrative}\n\n${tables.join('\n\n')}`;
}

async function enrichBab4(namaOpd, tahun, bpsData, narasiAwal, renjaItems) {
  const { narrativeOnly, tables } = extractMarkdownTables(narasiAwal);
  const totalPagu = renjaItems.reduce((s, r) => s + (Number(r.pagu) || 0), 0);
  const topProgram = renjaItems
    .slice(0, 3)
    .map(
      (r) =>
        `- ${r.nama_kegiatan ?? r.uraian ?? 'Program'}: Rp ${Number(r.pagu || 0).toLocaleString('id-ID')}`,
    )
    .join('\n');

  const prompt = `Perkaya narasi BAB IV (Rencana Kerja dan Pendanaan) dokumen Renja ${namaOpd} Tahun ${tahun}.

DATA BPS MALUKU UTARA:
- Inflasi: ${bpsData.inflasi?.nilai ?? '-'}% (${bpsData.inflasi?.tahun ?? '-'})
- Kemiskinan: ${bpsData.kemiskinan?.nilai ?? '-'}% (${bpsData.kemiskinan?.tahun ?? '-'})

PROGRAM PRIORITAS (3 teratas dari ${renjaItems.length} program):
${topProgram}
Total Pagu: Rp ${totalPagu.toLocaleString('id-ID')}

NARASI AWAL (tanpa tabel):
${narrativeOnly}

Tugas: Perkaya narasi rencana kerja dengan mengaitkan alokasi anggaran terhadap prioritas penanganan ketahanan pangan dan kemiskinan di Maluku Utara. Maksimal 4 paragraf. JANGAN membuat atau menyertakan tabel apapun dalam jawaban.`;

  const enrichedNarrative = await callLLM(SYSTEM_BASE, prompt);
  if (!tables.length) return enrichedNarrative;
  return `${enrichedNarrative}\n\n${tables.join('\n\n')}`;
}

async function enrichBab5(namaOpd, tahun, bpsData, narasiAwal) {
  const prompt = `Perkaya narasi BAB V (Penutup) dokumen Renja ${namaOpd} Tahun ${tahun}.

DATA BPS MALUKU UTARA TERBARU:
- PDRB: ${bpsData.pdrb?.nilai ?? '-'}% (${bpsData.pdrb?.tahun ?? '-'})
- Kemiskinan: ${bpsData.kemiskinan?.nilai ?? '-'}% (${bpsData.kemiskinan?.tahun ?? '-'})
- IPM: ${bpsData.ipm?.nilai ?? '-'} (${bpsData.ipm?.tahun ?? '-'})
- Inflasi: ${bpsData.inflasi?.nilai ?? '-'}% (${bpsData.inflasi?.tahun ?? '-'})

NARASI AWAL:
${narasiAwal}

Tugas: Perkaya narasi penutup dengan menegaskan komitmen ${namaOpd} berdasarkan kondisi riil Maluku Utara yang tercermin dalam data BPS. Maksimal 3 paragraf.`;

  return callLLM(SYSTEM_BASE, prompt);
}

// ── MAIN: enrich semua BAB paralel ───────────────────────────────────────────
async function enrichAllBab({ namaOpd, tahun, bpsData, dokumen, renjaItems }) {
  const tasks = [
    () => enrichBab1(namaOpd, tahun, bpsData, dokumen.text_bab1 ?? ''),
    () => enrichBab2(namaOpd, tahun, bpsData, dokumen.text_bab2 ?? '', renjaItems),
    () => enrichBab3(namaOpd, tahun, bpsData, dokumen.text_bab3 ?? ''),
    () => enrichBab4(namaOpd, tahun, bpsData, dokumen.text_bab4 ?? '', renjaItems),
    () => enrichBab5(namaOpd, tahun, bpsData, dokumen.text_bab5 ?? ''),
  ];
  const results = [];
  for (const task of tasks) {
    results.push(await Promise.allSettled([task()]).then((r) => r[0]));
  }
  const [bab1, bab2, bab3, bab4, bab5] = results;

  return {
    bab1: bab1.status === 'fulfilled' ? bab1.value : null,
    bab2: bab2.status === 'fulfilled' ? bab2.value : null,
    bab3: bab3.status === 'fulfilled' ? bab3.value : null,
    bab4: bab4.status === 'fulfilled' ? bab4.value : null,
    bab5: bab5.status === 'fulfilled' ? bab5.value : null,
    errors: {
      bab1: bab1.status === 'rejected' ? bab1.reason?.message : null,
      bab2: bab2.status === 'rejected' ? bab2.reason?.message : null,
      bab3: bab3.status === 'rejected' ? bab3.reason?.message : null,
      bab4: bab4.status === 'rejected' ? bab4.reason?.message : null,
      bab5: bab5.status === 'rejected' ? bab5.reason?.message : null,
    },
  };
}

module.exports = { enrichAllBab, enrichBab1, enrichBab2, enrichBab3, enrichBab4, enrichBab5 };
