// routes/rekomendasiAIRoutes.js
const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
require("dotenv").config();

const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  async (req, res) => {
    const { indikatorList } = req.body;

    if (!Array.isArray(indikatorList) || indikatorList.length === 0) {
      return res.status(400).json({ error: "Data indikator tidak valid." });
    }

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
      const detail =
        err?.error?.message || err.message || "Terjadi kesalahan internal.";
      res.status(500).json({
        error: "Gagal menghasilkan rekomendasi.",
        detail,
      });
    }
  },
);

module.exports = router;
