"use strict";

const {
  sanitizeProviderPayload,
} = require("./providerPayloadSanitizer");

class OllamaNarrativeProviderError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "OllamaNarrativeProviderError";
    this.details = details;
  }
}

const cleanBaseUrl = (value) =>
  String(value || "http://localhost:11434").replace(/\/+$/, "");

const getOllamaConfig = () => {
  const baseUrl = cleanBaseUrl(process.env.OLLAMA_BASE_URL);
  const model = String(process.env.OLLAMA_MODEL || "").trim();

  if (!model) {
    throw new OllamaNarrativeProviderError(
      "OLLAMA_MODEL belum diisi. Set OLLAMA_MODEL pada .env sebelum memakai provider ollama.",
      {
        required_env: ["OLLAMA_BASE_URL", "OLLAMA_MODEL"],
      }
    );
  }

  return {
    baseUrl,
    model,
    timeoutMs: Number(process.env.MR_NARRATIVE_TIMEOUT_MS || 30000),
    numPredict: Number(process.env.OLLAMA_NUM_PREDICT || 700),
    temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.1),
  };
};

const parseJsonStrict = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    throw new OllamaNarrativeProviderError(
      "Ollama tidak mengembalikan teks response."
    );
  }

  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new OllamaNarrativeProviderError(
        "Output Ollama bukan JSON valid.",
        {
          provider_output_preview: trimmed.slice(0, 500),
        }
      );
    }

    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      throw new OllamaNarrativeProviderError(
        "Output Ollama gagal diparse sebagai JSON.",
        {
          provider_output_preview: trimmed.slice(0, 500),
        }
      );
    }
  }
};

const buildOllamaPrompt = ({ sanitizedPayload = {} }) => {
  return `
Anda adalah penyusun draft narasi Manajemen Risiko pemerintah daerah.

Buat output JSON valid saja. Jangan pakai markdown. Jangan menambah penjelasan di luar JSON.

Larangan:
- Jangan membuat fakta baru.
- Jangan membuat angka baru.
- Jangan mengarang tanggal target waktu.
- Jangan menghitung skor risiko.
- Jangan menentukan level risiko.
- Jangan menentukan matrix/appetite.
- Jangan menentukan workflow/status/versi.
- Jangan membuat kode risiko.
- Jangan mengembalikan field teknis.

Aturan isi:
- Bahasa Indonesia formal.
- Ringkas, profesional, dan operasional.
- objek_risiko wajib minimal 4 kata dan menggambarkan objek pengendalian, bukan hanya nama unit.
- Rekomendasi jangan menyalin mentah ringkasan temuan.
- User tetap final reviewer.
- target_waktu boleh kosong.

Wajib balas dengan struktur JSON ini:
{
  "rekomendasi": "1 paragraf rekomendasi tindak lanjut",
  "objek_risiko": "objek pengendalian utama minimal 4 kata, jangan hanya nama unit",
  "nama_risiko": "Risiko ...",
  "uraian_risiko": "uraian risiko dalam 1 paragraf",
  "penyebab_risiko": "- penyebab 1\\n- penyebab 2\\n- penyebab 3",
  "dampak_risiko": "- dampak 1\\n- dampak 2\\n- dampak 3",
  "rencana_tindak_lanjut_awal": "- rencana 1\\n- rencana 2\\n- rencana 3",
  "pic": "unit terkait atau pihak penanggung jawab",
  "target_waktu": "",
  "catatan": "catatan review singkat",
  "confidence": 0.7,
  "needs_user_review": true,
  "basis_ringkasan": ["ringkasan dasar 1", "ringkasan dasar 2"]
}

Input:
${JSON.stringify(sanitizedPayload, null, 2)}
`.trim();
};

const callOllamaGenerate = async ({
  baseUrl,
  model,
  prompt,
  timeoutMs,
  numPredict,
  temperature,
}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature,
          num_predict: numPredict,
          num_ctx: 4096,
        },
      }),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      throw new OllamaNarrativeProviderError(
        `Ollama request gagal dengan status ${response.status}.`,
        {
          status: response.status,
          body_preview: rawBody.slice(0, 500),
        }
      );
    }

    const parsed = JSON.parse(rawBody);

    if (!parsed?.response) {
      throw new OllamaNarrativeProviderError(
        "Ollama response tidak memiliki field response.",
        {
          body_preview: rawBody.slice(0, 500),
        }
      );
    }

    return parsed.response;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new OllamaNarrativeProviderError(
        `Ollama timeout setelah ${timeoutMs} ms.`,
        {
          timeout_ms: timeoutMs,
        }
      );
    }

    if (error instanceof OllamaNarrativeProviderError) {
      throw error;
    }

    throw new OllamaNarrativeProviderError(
      error?.message || "Ollama request gagal.",
      {
        original_error: error?.name || "UnknownError",
      }
    );
  } finally {
    clearTimeout(timeout);
  }
};

const buildOllamaNarrative = async ({ payload = {} } = {}) => {
  const config = getOllamaConfig();

  const { sanitizedPayload } = sanitizeProviderPayload(payload);

  const prompt = buildOllamaPrompt({
    sanitizedPayload,
  });

  const rawText = await callOllamaGenerate({
    baseUrl: config.baseUrl,
    model: config.model,
    prompt,
    timeoutMs: config.timeoutMs,
    numPredict: config.numPredict,
    temperature: config.temperature,
  });

  return parseJsonStrict(rawText);
};

module.exports = {
  providerName: "ollama",
  buildOllamaNarrative,
};