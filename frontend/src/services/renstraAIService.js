'use strict';

const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

async function callGroq(systemPrompt, userPrompt) {
  const res = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      max_tokens: 200,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    },
  );
  return res.data?.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callOllama(systemPrompt, userPrompt) {
  const res = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0.1, num_predict: 200 },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    { timeout: 120000 },
  );
  return res.data?.message?.content?.trim() ?? '';
}

async function callLLM(systemPrompt, userPrompt) {
  if (GROQ_API_KEY) {
    try {
      return await callGroq(systemPrompt, userPrompt);
    } catch (e) {
      console.warn('[renstraAI] Groq gagal, fallback Ollama:', e.message);
    }
  }
  return callOllama(systemPrompt, userPrompt);
}

async function generateTujuanRenstra({ namaOpd, tujuanRpjmd, noTujuanRpjmd, tupoksi }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: menulis TUJUAN Renstra OPD — level tertinggi, paling abstrak, paling singkat.
Aturan ketat:
- Maksimal 7 kata (tidak termasuk "di Provinsi Maluku Utara")
- Format WAJIB: "[Meningkatnya/Terwujudnya/Tercapainya] [1-2 kata substansi inti] [Masyarakat/di] Maluku Utara"
- DILARANG: kata "dan", "yang", "aman", "bergizi", "beragam", "berkelanjutan", "berbasis", "melalui", "untuk"
- Detail substansi masuk Sasaran, BUKAN Tujuan
- Kembalikan HANYA kalimat tujuan, tanpa tanda petik
Contoh BENAR: "Meningkatnya Ketahanan Pangan Masyarakat Maluku Utara"
Contoh SALAH: "Meningkatnya ketersediaan dan aksesibilitas pangan yang aman di Maluku Utara"`;

  const user = `OPD: ${namaOpd}
Tujuan RPJMD (${noTujuanRpjmd}): ${tujuanRpjmd}
Tupoksi OPD: ${tupoksi || 'sesuai nomenklatur OPD'}
Wilayah: Provinsi Maluku Utara
Tulis 1 kalimat tujuan Renstra ${namaOpd} yang merupakan kontribusi spesifik OPD terhadap tujuan RPJMD tersebut.`;

  const raw = await callLLM(system, user);
  const clean = raw
    .split(/[.\n]/)[0]
    .replace(/["']/g, '')
    .replace(/\s+(yang|dan|untuk|melalui|dalam|berbasis|serta|guna|bagi)\s+.*/i, '')
    .replace(/,.*$/, '')
    .trim();
  return clean || raw.split(/[.\n]/)[0].trim();
}

async function generateSasaranRenstra({ namaOpd, sasaranRpjmd, tujuanRenstra }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: menulis SATU kalimat sasaran Renstra OPD yang spesifik, terukur, sesuai tupoksi OPD.
Format: "Meningkatnya/Terwujudnya [substansi terukur] [di/untuk] [target]"
Gunakan bahasa Indonesia formal. Kembalikan HANYA kalimat sasaran, tanpa penjelasan.`;

  const user = `OPD: ${namaOpd}
Tujuan Renstra: ${tujuanRenstra}
Sasaran RPJMD acuan: ${sasaranRpjmd}
Wilayah: Provinsi Maluku Utara
Tulis 1 kalimat sasaran Renstra ${namaOpd} yang operasional dan terukur.`;

  return callLLM(system, user);
}

async function generateStrategiRenstra({ namaOpd, sasaranRenstra, tujuanRenstra }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: menulis STRATEGI Renstra OPD — cara/pendekatan mencapai sasaran.
Aturan ketat:
- Maksimal 7 kata
- Format: "[Kata kerja aktif] [substansi] [OPD/daerah]"
- Kata kerja: Peningkatan / Penguatan / Pengembangan / Pemberdayaan / Optimalisasi
- DILARANG kata "dan", "yang", "melalui", "untuk", "dalam rangka"
- Kembalikan HANYA kalimat strategi, tanpa tanda petik
Contoh BENAR: "Penguatan Sistem Distribusi Pangan Daerah"
Contoh SALAH: "Peningkatan ketersediaan pangan melalui penguatan distribusi dan logistik"`;

  const user = `OPD: ${namaOpd}
Tujuan Renstra: ${tujuanRenstra}
Sasaran Renstra: ${sasaranRenstra}
Wilayah: Provinsi Maluku Utara
Tulis 1 kalimat strategi Renstra yang singkat dan padat.`;

  const raw = await callLLM(system, user);
  const bersih = raw
    .split(/[.\n]/)[0]
    .replace(/['"]/g, '')
    .replace(/^\d+\.\s*/, '')
    .trim();
  return bersih.includes('Maluku') ? bersih : bersih + ' Maluku Utara';
}

async function generateArahKebijakanRenstra({ namaOpd, sasaranRenstra, strategi }) {
  const system = `Kamu adalah ahli perencanaan pemerintah daerah Indonesia.
Tugasmu: menulis ARAH KEBIJAKAN Renstra OPD — prioritas dan fokus pelaksanaan strategi.
Aturan ketat:
- Maksimal 8 kata
- Format: "[Kata kerja] [fokus kebijakan] [OPD/wilayah]"
- Kata kerja: Peningkatan / Penguatan / Pengembangan / Percepatan / Perbaikan
- DILARANG kata "dan", "yang", "melalui", "untuk", "dalam rangka", "serta"
- Kembalikan HANYA kalimat arah kebijakan, tanpa tanda petik
Contoh BENAR: "Peningkatan Cadangan Pangan Strategis Daerah"
Contoh SALAH: "Peningkatan ketersediaan pangan melalui penguatan cadangan pangan daerah"`;

  const user = `OPD: ${namaOpd}
Sasaran Renstra: ${sasaranRenstra}
Strategi: ${strategi}
Wilayah: Provinsi Maluku Utara
Tulis 1 kalimat arah kebijakan yang singkat dan padat.`;

  return callLLM(system, user);
}

module.exports = {
  generateTujuanRenstra,
  generateSasaranRenstra,
  generateStrategiRenstra,
  generateArahKebijakanRenstra,
};
