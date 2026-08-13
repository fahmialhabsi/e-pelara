import { describe, expect, it } from "vitest";
import { classifyFieldProvenance } from "./FieldProvenanceBadge";

describe("classifyFieldProvenance (FINAL CLOSURE MANDATE — Req #9 Cross-Module Metadata Consistency / Explicit Override Marker)", () => {
  it("P1 — baseline undefined (field belum pernah diisi otomatis) -> MANUAL", () => {
    expect(classifyFieldProvenance(undefined, "apa saja")).toBe("MANUAL");
    expect(classifyFieldProvenance(undefined, "")).toBe("MANUAL");
  });

  it("P2 — baseline null -> MANUAL", () => {
    expect(classifyFieldProvenance(null, "apa saja")).toBe("MANUAL");
  });

  it("P3 — baseline string kosong -> MANUAL", () => {
    expect(classifyFieldProvenance("", "apa saja")).toBe("MANUAL");
  });

  it("P4 — currentValue persis sama dengan baseline -> SOURCE (Dari Evidence)", () => {
    expect(classifyFieldProvenance("SRT/001/2025", "SRT/001/2025")).toBe("SOURCE");
  });

  it("P5 — currentValue berbeda dari baseline -> OVERRIDE (Override Pengguna)", () => {
    expect(classifyFieldProvenance("SRT/001/2025", "SRT/999/2025 diedit manual")).toBe("OVERRIDE");
  });

  it("P6 — whitespace di sekitar nilai tidak dianggap override (trim sebelum dibandingkan)", () => {
    expect(classifyFieldProvenance("SRT/001/2025", "  SRT/001/2025  ")).toBe("SOURCE");
  });

  it("P7 — currentValue dikosongkan user setelah autofill -> OVERRIDE, bukan SOURCE", () => {
    expect(classifyFieldProvenance("SRT/001/2025", "")).toBe("OVERRIDE");
  });

  it("P8 — currentValue undefined/null setelah baseline terisi -> OVERRIDE (dianggap string kosong, beda dari baseline)", () => {
    expect(classifyFieldProvenance("SRT/001/2025", undefined)).toBe("OVERRIDE");
    expect(classifyFieldProvenance("SRT/001/2025", null)).toBe("OVERRIDE");
  });

  it("P9 — nilai tanggal (format string) dibandingkan sebagai string, bukan Date object (murni fungsi, tidak parsing tanggal)", () => {
    expect(classifyFieldProvenance("2025-01-05", "2025-01-05")).toBe("SOURCE");
    expect(classifyFieldProvenance("2025-01-05", "2025-01-06")).toBe("OVERRIDE");
  });

  it("P10 — canonical source (baseline) tidak pernah dimutasi oleh klasifikasi ini — murni fungsi tanpa efek samping, dipanggil berulang dengan input sama menghasilkan output sama (idempotent)", () => {
    const baseline = "SRT/001/2025";
    const first = classifyFieldProvenance(baseline, "diedit user");
    const second = classifyFieldProvenance(baseline, "diedit user");
    expect(first).toBe(second);
    expect(baseline).toBe("SRT/001/2025");
  });
});
