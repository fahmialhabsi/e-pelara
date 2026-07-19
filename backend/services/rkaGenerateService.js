'use strict';
const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

async function callGroq(sys, usr) {
  const res = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      max_tokens: 512,
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
    },
    {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    },
  );
  return res.data?.choices?.[0]?.message?.content ?? '';
}

async function callOllama(sys, usr) {
  const res = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0.1, num_predict: 400 },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
    },
    { timeout: 120000 },
  );
  return res.data?.message?.content ?? '';
}

async function callLLM(sys, usr) {
  if (GROQ_API_KEY) {
    try {
      return await callGroq(sys, usr);
    } catch (e) {
      console.warn('[rkaGenerate] Groq gagal, fallback Ollama:', e.message);
    }
  }
  return callOllama(sys, usr);
}

const SYSTEM_PROMPT = `Kamu adalah asisten penyusunan dokumen RKA pemerintah daerah Indonesia sesuai Permendagri 77/2020.
Kembalikan HANYA JSON valid tanpa markdown dan tanpa penjelasan tambahan.`;

async function generateIndikatorRka(ctx) {
  const {
    program = '',
    kegiatan = '',
    sub_kegiatan = '',
    keluaran = '',
    target_keluaran = '',
    satuan_keluaran = '',
    opd_nama = 'OPD',
  } = ctx;
  const userPrompt = `
Buatkan indikator dan tolok ukur kinerja untuk RKA berikut:
OPD          : ${opd_nama}
Program      : ${program}
Kegiatan     : ${kegiatan}
Sub Kegiatan : ${sub_kegiatan}
Keluaran     : ${keluaran}
Target       : ${target_keluaran} ${satuan_keluaran}

Kembalikan JSON format PERSIS ini:
{
  "capaian_program": "kalimat deskriptif outcome program, contoh: Persentase pemenuhan kebutuhan pangan masyarakat meningkat",
  "target_capaian": "angka target saja tanpa satuan, contoh: 92",
  "satuan_capaian": "satuan saja, contoh: %",
  "masukan": "Dana yang dibutuhkan untuk melaksanakan sub kegiatan ini",
  "keluaran": "kalimat output konkret sub kegiatan, contoh: Jumlah dokumen perencanaan yang tersusun",
  "target_keluaran": "angka target saja, contoh: 7",
  "satuan_keluaran": "satuan saja, contoh: Dokumen",
  "hasil": "kalimat dampak/manfaat kegiatan terhadap kinerja OPD, BERBEDA dari keluaran, contoh: Meningkatnya kualitas perencanaan perangkat daerah",
  "target_hasil": "angka persentase dampak, contoh: 85",
  "satuan_hasil": "%",
  "alasan": "1 kalimat formal alasan pencatatan RKA"
}

ATURAN WAJIB:
- "masukan" SELALU diisi "Dana yang dibutuhkan untuk [nama sub kegiatan]"
- "keluaran" HARUS berupa output fisik/dokumen yang dihasilkan (BUKAN persentase)
- "hasil" HARUS berupa dampak/manfaat (BUKAN output fisik, BERBEDA dari keluaran)
- Semua angka target tanpa satuan (satuan ada di field satuan_xxx)`;

  const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM tidak mengembalikan JSON valid');
  return JSON.parse(jsonMatch[0]);
}

module.exports = { generateIndikatorRka };
