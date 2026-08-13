import { describe, expect, it } from "vitest";
import { deriveRegulationAutofill, isRegulationFormValid } from "./FoodOpsRegulationForm";

describe("deriveRegulationAutofill (Corrective ProSN Semester-II Readiness — Regulation Recall-First Autofill §9)", () => {
  const doc = { judul: "Peraturan Gubernur Uji", nomor_dokumen: "PERGUB/001/2025", tanggal_dokumen: "2025-01-01", penerbit: "Biro Hukum" };

  it("R1 — form kosong -> semua field aman diisi dari dokumen", () => {
    const patch = deriveRegulationAutofill(doc, {});
    expect(patch).toEqual({ judul_resmi: "Peraturan Gubernur Uji", nomor: "PERGUB/001/2025", tanggal_penetapan: "2025-01-01", instansi_penerbit: "Biro Hukum" });
  });

  it("R2 — field yang SUDAH diisi user TIDAK PERNAH ditimpa", () => {
    const patch = deriveRegulationAutofill(doc, { judul_resmi: "Judul custom user", nomor: "", tanggal_penetapan: "", instansi_penerbit: "" });
    expect(patch.judul_resmi).toBeUndefined();
    expect(patch.nomor).toBe("PERGUB/001/2025");
  });

  it("R3 — dokumen null -> patch kosong (tidak melempar)", () => {
    expect(deriveRegulationAutofill(null, {})).toEqual({});
  });

  it("R4 — field yang TIDAK ADA di dokumen (mis. jenis_produk_hukum/tanggal_berlaku/status_berlaku) TIDAK PERNAH ditebak — hanya field yg eksplisit dipetakan", () => {
    const patch = deriveRegulationAutofill(doc, {});
    expect(patch.jenis_produk_hukum).toBeUndefined();
    expect(patch.tanggal_berlaku).toBeUndefined();
    expect(patch.status_berlaku).toBeUndefined();
  });
});

describe("isRegulationFormValid (existing, unchanged)", () => {
  it("tetap valid seperti sebelumnya", () => {
    expect(isRegulationFormValid({ jenis_produk_hukum: "pergub", document_id: "1" }, false)).toBe(true);
  });
});
