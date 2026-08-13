import { describe, expect, it } from "vitest";
import { classifyEvidenceState, evidenceStateMessage, EVIDENCE_STATE_LABEL } from "./evidenceState";

describe("classifyEvidenceState (FINAL CLOSURE MANDATE — Req #21 Distinct Evidence State Classification)", () => {
  it("E1 — tidak ada record bukti sama sekali -> MISSING", () => {
    expect(classifyEvidenceState(null)).toBe("MISSING");
    expect(classifyEvidenceState(undefined)).toBe("MISSING");
  });

  it("E2 — status aktif, status_verifikasi='uploaded' (baru diunggah, belum diperiksa) -> PRESENT_NOT_VALID", () => {
    expect(classifyEvidenceState({ status: "aktif", status_verifikasi: "uploaded" })).toBe("PRESENT_NOT_VALID");
  });

  it("E3 — status aktif, status_verifikasi='needs_clarification' -> PRESENT_NOT_VALID", () => {
    expect(classifyEvidenceState({ status: "aktif", status_verifikasi: "needs_clarification" })).toBe("PRESENT_NOT_VALID");
  });

  it("E4 — status_verifikasi='invalid' -> REJECTED", () => {
    expect(classifyEvidenceState({ status: "aktif", status_verifikasi: "invalid" })).toBe("REJECTED");
  });

  it("E5 — status_verifikasi='duplicate' -> REJECTED", () => {
    expect(classifyEvidenceState({ status: "aktif", status_verifikasi: "duplicate" })).toBe("REJECTED");
  });

  it("E6 — status_verifikasi='expired' -> REJECTED", () => {
    expect(classifyEvidenceState({ status: "aktif", status_verifikasi: "expired" })).toBe("REJECTED");
  });

  it("E7 — status='dibatalkan' (dibatalkan eksplisit oleh pengguna) -> REJECTED, apa pun status_verifikasi-nya", () => {
    expect(classifyEvidenceState({ status: "dibatalkan", status_verifikasi: "uploaded" })).toBe("REJECTED");
    expect(classifyEvidenceState({ status: "dibatalkan", status_verifikasi: "valid" })).toBe("REJECTED");
  });

  it("E8 — status='digantikan' (versi lama sudah digantikan versi baru) -> SUPERSEDED, mengalahkan status_verifikasi apa pun", () => {
    expect(classifyEvidenceState({ status: "digantikan", status_verifikasi: "valid" })).toBe("SUPERSEDED");
    expect(classifyEvidenceState({ status: "digantikan", status_verifikasi: "uploaded" })).toBe("SUPERSEDED");
  });

  it("E9 — status_verifikasi='valid' dan status aktif -> null (tidak ada gap, tidak perlu ditampilkan sbg state apa pun)", () => {
    expect(classifyEvidenceState({ status: "aktif", status_verifikasi: "valid" })).toBeNull();
  });

  it("E10 — status='perlu_perbaikan' dgn verifikasi belum valid -> tetap PRESENT_NOT_VALID (aman, tidak pernah diam-diam dianggap OK)", () => {
    expect(classifyEvidenceState({ status: "perlu_perbaikan", status_verifikasi: "uploaded" })).toBe("PRESENT_NOT_VALID");
  });

  it("E11 — prioritas SUPERSEDED > REJECTED: bukti yang sudah digantikan TAPI awalnya invalid tetap diklasifikasi SUPERSEDED (lineage lebih relevan drpd histori verifikasi lama)", () => {
    expect(classifyEvidenceState({ status: "digantikan", status_verifikasi: "invalid" })).toBe("SUPERSEDED");
  });
});

describe("evidenceStateMessage — teks jelas per-state, TIDAK PERNAH generik 'EVIDENCE_GAP'", () => {
  it("M1 — MISSING: teks persis sesuai contoh mandat", () => {
    expect(evidenceStateMessage("MISSING", "Notulen")).toBe("Notulen belum tersedia.");
  });

  it("M2 — PRESENT_NOT_VALID: teks persis sesuai contoh mandat", () => {
    expect(evidenceStateMessage("PRESENT_NOT_VALID", "Notulen")).toBe("Notulen tersedia tetapi belum Valid.");
  });

  it("M3 — REJECTED: teks persis sesuai contoh mandat", () => {
    expect(evidenceStateMessage("REJECTED", "Notulen")).toBe("Notulen ditolak/tidak valid.");
  });

  it("M4 — SUPERSEDED: teks persis sesuai contoh mandat", () => {
    expect(evidenceStateMessage("SUPERSEDED", "Notulen")).toBe("Notulen telah digantikan oleh versi yang lebih baru.");
  });

  it("M5 — state null (tidak ada gap) -> tidak menghasilkan pesan apa pun", () => {
    expect(evidenceStateMessage(null, "Notulen")).toBeNull();
  });

  it("M6 — label tidak diberikan -> fallback 'Bukti' (tetap tidak generik EVIDENCE_GAP)", () => {
    expect(evidenceStateMessage("MISSING")).toBe("Bukti belum tersedia.");
  });

  it("M7 — EVIDENCE_STATE_LABEL mencakup keempat state kanonis mandat, tidak lebih tidak kurang", () => {
    expect(Object.keys(EVIDENCE_STATE_LABEL).sort()).toEqual(["MISSING", "PRESENT_NOT_VALID", "REJECTED", "SUPERSEDED"].sort());
  });
});
