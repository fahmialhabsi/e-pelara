import { describe, expect, it } from "vitest";
import { isSumberDataStale } from "./ProsnInternalAutofillSuggestion";

describe("isSumberDataStale (Corrective ProSN Semester-II Readiness — Sumber Data Staleness §19/§45)", () => {
  it("SD1 — teks tersimpan identik dgn saran segar -> TIDAK stale", () => {
    expect(isSumberDataStale("Register Surat Penugasan mencakup 1 surat.", "Register Surat Penugasan mencakup 1 surat.")).toBe(false);
  });

  it("SD2 — teks tersimpan berbeda dari saran segar (mis. 1 surat -> 7 surat) -> STALE", () => {
    expect(isSumberDataStale(
      "Register Surat Penugasan Kepala Daerah dan bukti dokumen terverifikasi; mencakup 1 surat pada Semester 1 Tahun 2025 (1 surat dengan bukti valid).",
      "Register Surat Penugasan Kepala Daerah dan bukti dokumen terverifikasi; mencakup 7 surat pada Semester 1 Tahun 2025 (7 surat dengan bukti valid).",
    )).toBe(true);
  });

  it("SD3 — belum pernah diisi (tersimpan kosong) -> TIDAK stale (bukan staleness, cuma belum diisi)", () => {
    expect(isSumberDataStale("", "Register Surat Penugasan mencakup 1 surat.")).toBe(false);
    expect(isSumberDataStale(null, "Register Surat Penugasan mencakup 1 surat.")).toBe(false);
  });

  it("SD4 — saran segar kosong/null (belum dapat diturunkan) -> TIDAK stale (tidak ada dasar pembanding)", () => {
    expect(isSumberDataStale("Register Surat Penugasan mencakup 1 surat.", null)).toBe(false);
    expect(isSumberDataStale("Register Surat Penugasan mencakup 1 surat.", "")).toBe(false);
  });

  it("SD5 — perbedaan murni whitespace di ujung -> TIDAK dianggap stale (trim sebelum bandingkan)", () => {
    expect(isSumberDataStale("Teks sama.  ", "Teks sama.")).toBe(false);
  });

  it("SD6 — kedua-duanya kosong -> TIDAK stale", () => {
    expect(isSumberDataStale("", "")).toBe(false);
    expect(isSumberDataStale(null, null)).toBe(false);
  });
});
