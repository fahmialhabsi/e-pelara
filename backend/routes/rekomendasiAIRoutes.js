// routes/rekomendasiAIRoutes.js
const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
require("dotenv").config();

const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const AI_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

/** Status fitur tanpa memanggil OpenAI (hemat biaya / jelas untuk UI). */
function getRekomendasiAiStatus() {
  const forcedOff =
    process.env.REKOMENDASI_AI_ENABLED === "0" ||
    process.env.REKOMENDASI_AI_ENABLED === "false";
  if (forcedOff) {
    return {
      available: false,
      code: "DISABLED_BY_CONFIG",
      hint:
        "Rekomendasi otomatis dimatikan di server (tanpa biaya OpenAI). Isi teks rekomendasi secara manual di bawah atau di dokumen RPJMD Anda.",
    };
  }

  const hasKey = Boolean((process.env.OPENAI_API_KEY || "").trim());
  if (!hasKey) {
    return {
      available: false,
      code: "NO_API_KEY",
      hint:
        "Belum ada OPENAI_API_KEY — rekomendasi otomatis tidak tersedia. Anda tetap bisa mengisi rekomendasi manual. Nanti jika ada anggaran, tambahkan kunci di backend/.env dan set REKOMENDASI_AI_ENABLED=true.",
    };
  }

  return {
    available: true,
    code: null,
    hint: null,
  };
}

function sanitizeOpenAiError(err) {
  const status = err?.status;
  const code = err?.code || err?.error?.code;
  const errType = err?.type || err?.error?.type;

  if (
    code === "insufficient_quota" ||
    errType === "insufficient_quota" ||
    status === 429
  ) {
    return {
      code: "OPENAI_QUOTA_EXCEEDED",
      detail:
        "Kuota atau saldo OpenAI habis. Nonaktifkan sementara dengan REKOMENDASI_AI_ENABLED=false di backend/.env, atau tambah saldo di https://platform.openai.com/account/billing — atau gunakan OPENAI_MODEL=gpt-4o-mini.",
    };
  }

  if (
    code === "invalid_api_key" ||
    status === 401 ||
    String(err?.message || "").includes("Incorrect API key")
  ) {
    return {
      code: "OPENAI_INVALID_KEY",
      detail:
        "Kunci API OpenAI tidak valid atau kedaluwarsa. Perbarui OPENAI_API_KEY di file .env backend (lihat https://platform.openai.com/account/api-keys).",
    };
  }
  const raw = err?.error?.message || err?.message || "";
  if (/sk-[a-z0-9._-]{8,}/i.test(raw)) {
    return {
      code: "OPENAI_ERROR",
      detail: "Gagal autentikasi ke layanan OpenAI. Periksa OPENAI_API_KEY.",
    };
  }
  return {
    code: "OPENAI_ERROR",
    detail: raw || "Terjadi kesalahan saat memanggil layanan AI.",
  };
}

router.get("/status", verifyToken, allowRoles(AI_ROLES), (req, res) => {
  const s = getRekomendasiAiStatus();
  res.json({
    available: s.available,
    code: s.code,
    hint: s.hint,
  });
});

router.post("/", verifyToken, allowRoles(AI_ROLES), async (req, res) => {
  const { indikatorList } = req.body;

  if (!Array.isArray(indikatorList) || indikatorList.length === 0) {
    return res.status(400).json({ error: "Data indikator tidak valid." });
  }

  const pre = getRekomendasiAiStatus();
  if (!pre.available) {
    const status = 503;
    if (pre.code === "DISABLED_BY_CONFIG") {
      return res.status(status).json({
        error: "Fitur rekomendasi AI dinonaktifkan.",
        code: "REKOMENDASI_AI_DISABLED",
        detail: pre.hint,
      });
    }
    return res.status(status).json({
      error: "Fitur rekomendasi AI belum dikonfigurasi.",
      code: "OPENAI_NOT_CONFIGURED",
      detail: pre.hint,
    });
  }

  const apiKey = (process.env.OPENAI_API_KEY || "").trim();

  console.log(
    `✳️ Rekomendasi AI diminta oleh user: ${req.user?.email || "UNKNOWN"}`,
  );

  const indikatorText = indikatorList
    .map((item, i) => {
      const target = [1, 2, 3, 4, 5]
        .map((t) => item[`target_tahun_${t}`] || "-")
        .join(", ");
      return `#${i + 1}
- Kode: ${item.kode_indikator || "-"}
- Nama: ${item.nama_indikator || "-"}
- Baseline: ${item.baseline || "-"}
- Target: ${target}
- Keterangan: ${item.keterangan || "-"}
- Penanggung Jawab: ${item.penanggung_jawab_label || "-"}`;
    })
    .join("\n\n");

  const prompt = `
Berikut adalah daftar indikator RPJMD:

${indikatorText}

Buatkan ringkasan rekomendasi kebijakan berbasis indikator tersebut. Fokus pada:
- Tren target (naik, stagnan, menurun)
- Relevansi baseline
- Saran kebijakan yang bisa diambil
- Pertimbangan terhadap penanggung jawab

Gunakan nada profesional dan berbobot.
`;

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const hasil = completion.choices[0]?.message?.content?.trim();
    res.status(200).json({ rekomendasi: hasil });
  } catch (err) {
    console.error("OpenAI error:", err);
    const { code, detail } = sanitizeOpenAiError(err);
    let httpStatus = 503;
    if (code === "OPENAI_INVALID_KEY") httpStatus = 502;
    if (code === "OPENAI_QUOTA_EXCEEDED") httpStatus = 429;
    res.status(httpStatus).json({
      error: "Gagal menghasilkan rekomendasi.",
      code,
      detail,
    });
  }
});

module.exports = router;
