import { describe, expect, it } from "vitest";
import { classifyScoreGap } from "./explainableScore";

describe("classifyScoreGap (Corrective ProSN Semester-II Readiness — Explainable Compliance §21-26)", () => {
  it("EC1 — skor null/undefined -> null (belum dihitung, tidak ada gap utk ditampilkan)", () => {
    expect(classifyScoreGap({ tipeForm: "penugasan_kdh", skor: null, bobotMaksimal: 2, detail: {} })).toBeNull();
  });

  it("EC2 — skor sudah maksimal -> gapType null", () => {
    const result = classifyScoreGap({ tipeForm: "penugasan_kdh", skor: 2, bobotMaksimal: 2, detail: { jumlah_surat_sah: 5, jumlah_surat_dikeluarkan: 5, bulan_kosong: [] } });
    expect(result.gapType).toBeNull();
  });

  it("EC3 — tipe_form tidak didukung (mis. B.1.3 cadangan_pangan_beras — FROZEN) -> null, tidak ada diagnosis dibuat", () => {
    expect(classifyScoreGap({ tipeForm: "cadangan_pangan_beras", skor: 0.25, bobotMaksimal: 2.5, detail: { saldo_akhir: 40 } })).toBeNull();
  });

  it("EC4 — tipe_form MBG (protected) -> null", () => {
    expect(classifyScoreGap({ tipeForm: "status_bertingkat_evidence", skor: 0.5, bobotMaksimal: 1, detail: {} })).toBeNull();
  });

  it("EC5 — B.1.2 kasus UAT nyata: 1 rapat sah / 6 bulan evaluasi -> REQUIREMENT_GAP (frekuensi), BUKAN EVIDENCE_GAP (mandat §22 contoh eksplisit)", () => {
    const result = classifyScoreGap({
      tipeForm: "koordinasi_forkopimda", skor: 0, bobotMaksimal: 2,
      detail: { jumlah_rapat_sah: 1, jumlah_bulan_evaluasi: 6, frekuensi_rata_rata_bulanan: 0.17, rapat_tidak_sah: [] },
    });
    expect(result.gapType).toBe("REQUIREMENT_GAP");
    expect(result.summary).toContain("FREKUENSI");
    expect(result.summary).toContain("evidence pada rapat yang SAH sudah lengkap");
  });

  it("EC6 — B.1.2: rapat tidak sah krn evidence belum lengkap -> EVIDENCE_GAP, dgn exclusions per rapat", () => {
    const result = classifyScoreGap({
      tipeForm: "koordinasi_forkopimda", skor: 0, bobotMaksimal: 2,
      detail: {
        jumlah_rapat_sah: 0, jumlah_bulan_evaluasi: 6, frekuensi_rata_rata_bulanan: 0,
        rapat_tidak_sah: [{ id: 1, nama_forum: "Rapat Uji", alasan: ["Bukti belum lengkap terikat langsung ke rapat ini: notulen"] }],
      },
    });
    expect(result.gapType).toBe("EVIDENCE_GAP");
    expect(result.exclusions).toHaveLength(1);
    expect(result.exclusions[0].label).toBe("Rapat Uji");
    expect(result.exclusions[0].reason).toContain("notulen");
  });

  it("EC7 — B.1.1: belum ada surat -> REQUIREMENT_GAP", () => {
    const result = classifyScoreGap({ tipeForm: "penugasan_kdh", skor: 0, bobotMaksimal: 2, detail: { jumlah_surat_sah: 0, jumlah_surat_dikeluarkan: 0, bulan_kosong: [], surat_ditolak: [] } });
    expect(result.gapType).toBe("REQUIREMENT_GAP");
  });

  it("EC8 — B.1.1: surat tercatat tapi belum ada yg sah (evidence) -> EVIDENCE_GAP", () => {
    const result = classifyScoreGap({ tipeForm: "penugasan_kdh", skor: 0, bobotMaksimal: 2, detail: { jumlah_surat_sah: 0, jumlah_surat_dikeluarkan: 2, bulan_kosong: [], surat_ditolak: [{ id: 1, nomor_surat: "001", alasan: ["Bukti belum lengkap"] }] } });
    expect(result.gapType).toBe("EVIDENCE_GAP");
    expect(result.exclusions[0].label).toBe("001");
  });

  it("EC9 — B.1.4: inovasi ada tapi Perkada belum tersedia -> EVIDENCE_GAP, reason menyebut Perkada", () => {
    const result = classifyScoreGap({
      tipeForm: "inovasi_dan_perkada", skor: 1, bobotMaksimal: 2,
      detail: { inovasi: [{ id: 1, nama_inovasi: "Inovasi A", kelengkapan_internal: { bukti_implementasi_ada: true, dokumen_perkada_ada: false } }] },
    });
    expect(result.gapType).toBe("EVIDENCE_GAP");
    expect(result.exclusions[0].reason).toContain("Perkada");
  });

  it("EC10 — B.1.4: belum ada inovasi -> REQUIREMENT_GAP", () => {
    const result = classifyScoreGap({ tipeForm: "inovasi_dan_perkada", skor: 0, bobotMaksimal: 2, detail: { inovasi: [] } });
    expect(result.gapType).toBe("REQUIREMENT_GAP");
  });

  it("EC11 — detail null/undefined -> null (tidak crash)", () => {
    expect(classifyScoreGap({ tipeForm: "penugasan_kdh", skor: 0, bobotMaksimal: 2, detail: null })).toBeNull();
  });
});
