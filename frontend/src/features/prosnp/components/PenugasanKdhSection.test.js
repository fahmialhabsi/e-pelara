import { describe, expect, it } from "vitest";
import { deriveSuratAutofill } from "./PenugasanKdhSection";

describe("deriveSuratAutofill (Corrective ProSN Semester-II Readiness — B.1.1 Recall-First Autofill §11)", () => {
  const doc = { nomor_dokumen: "SRT/001/2025", tanggal_dokumen: "2025-01-05" };

  it("S1 — form kosong -> nomor_surat/tanggal_surat diisi dari dokumen", () => {
    expect(deriveSuratAutofill(doc, {})).toEqual({ nomor_surat: "SRT/001/2025", tanggal_surat: "2025-01-05" });
  });

  it("S2 — field yang sudah diisi user tidak ditimpa", () => {
    const patch = deriveSuratAutofill(doc, { nomor_surat: "sudah diisi user" });
    expect(patch.nomor_surat).toBeUndefined();
    expect(patch.tanggal_surat).toBe("2025-01-05");
  });

  it("S3 — pejabat_penandatangan TIDAK PERNAH diisi otomatis (mandat: never invent a person's identity)", () => {
    const patch = deriveSuratAutofill(doc, {});
    expect(patch.pejabat_penandatangan).toBeUndefined();
  });

  it("S4 — dokumen null -> patch kosong", () => {
    expect(deriveSuratAutofill(null, {})).toEqual({});
  });
});
