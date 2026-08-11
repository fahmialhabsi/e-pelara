import { describe, expect, it } from "vitest";
import { hasValidBuktiEntityIdentity, classifyDiscoveryState } from "./EntityBuktiManager";

describe("hasValidBuktiEntityIdentity (UI Evidence Counter Refresh — Identifier Guard §5)", () => {
  it("valid utk entityType spesifik dengan entityId numerik (B.1.1 SURAT_PENUGASAN)", () => {
    expect(hasValidBuktiEntityIdentity(1, "SURAT_PENUGASAN", 96)).toBe(true);
  });

  it("valid utk entityType PENGISIAN meski entityId sama dgn pengisianId (binding generik)", () => {
    expect(hasValidBuktiEntityIdentity(1, "PENGISIAN", 1)).toBe(true);
  });

  it("tidak valid bila entityId null utk entityType spesifik (mis. target/transaksi belum ada)", () => {
    expect(hasValidBuktiEntityIdentity(1, "CADANGAN_TARGET", null)).toBe(false);
  });

  it("tidak valid bila entityId undefined utk entityType spesifik", () => {
    expect(hasValidBuktiEntityIdentity(1, "STOK_TRANSAKSI", undefined)).toBe(false);
  });

  it("tidak valid bila entityType kosong", () => {
    expect(hasValidBuktiEntityIdentity(1, "", 96)).toBe(false);
  });

  it("tidak valid bila pengisianId kosong", () => {
    expect(hasValidBuktiEntityIdentity(null, "SURAT_PENUGASAN", 96)).toBe(false);
  });

  it("entityId=0 dianggap identitas valid (falsy tapi bukan null/undefined)", () => {
    expect(hasValidBuktiEntityIdentity(1, "INOVASI", 0)).toBe(true);
  });
});

describe("classifyDiscoveryState (Corrective B.1.3 Registry-First Evidence Discovery §9/§12/§13)", () => {
  it("ALREADY_BOUND bila sudah ada bukti terikat, terlepas dari hasil pencarian", () => {
    expect(classifyDiscoveryState({ hasBoundEvidence: true, candidates: [], candidatesReady: false })).toBe("ALREADY_BOUND");
  });

  it("IDLE selama pencarian belum selesai (candidatesReady=false)", () => {
    expect(classifyDiscoveryState({ hasBoundEvidence: false, candidates: [], candidatesReady: false })).toBe("IDLE");
  });

  it("ONE_EXACT bila tepat satu kandidat EXACT/STRONG", () => {
    expect(classifyDiscoveryState({ hasBoundEvidence: false, candidatesReady: true, candidates: [{ relevance: "EXACT" }] })).toBe("ONE_EXACT");
    expect(classifyDiscoveryState({ hasBoundEvidence: false, candidatesReady: true, candidates: [{ relevance: "STRONG" }] })).toBe("ONE_EXACT");
  });

  it("MULTIPLE bila lebih dari satu kandidat EXACT/STRONG gabungan", () => {
    expect(classifyDiscoveryState({ hasBoundEvidence: false, candidatesReady: true, candidates: [{ relevance: "EXACT" }, { relevance: "STRONG" }] })).toBe("MULTIPLE");
  });

  it("POSSIBLE bila hanya ada kandidat POSSIBLE (tidak boleh diam-diam jadi EXACT)", () => {
    expect(classifyDiscoveryState({ hasBoundEvidence: false, candidatesReady: true, candidates: [{ relevance: "POSSIBLE" }] })).toBe("POSSIBLE");
  });

  it("NOT_FOUND bila tidak ada kandidat sama sekali", () => {
    expect(classifyDiscoveryState({ hasBoundEvidence: false, candidatesReady: true, candidates: [] })).toBe("NOT_FOUND");
  });
});
