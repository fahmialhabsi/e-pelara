import { describe, expect, it } from "vitest";
import { deriveEventAutofill, isEventFormValid } from "./FoodOpsEventForm";

describe("deriveEventAutofill (Corrective ProSN Semester-II Readiness — Kegiatan Recall-First Autofill §10)", () => {
  const doc = { judul: "Surat Permintaan Uji", tanggal_dokumen: "2025-04-01", penerbit: "Dinas Pangan" };

  it("K1 — form kosong -> nama_kegiatan/tanggal_mulai/penanggung_jawab diisi dari dokumen", () => {
    const patch = deriveEventAutofill(doc, {});
    expect(patch).toEqual({ nama_kegiatan: "Surat Permintaan Uji", tanggal_mulai: "2025-04-01", penanggung_jawab: "Dinas Pangan" });
  });

  it("K2 — field yang sudah diisi user tidak ditimpa", () => {
    const patch = deriveEventAutofill(doc, { nama_kegiatan: "Nama custom" });
    expect(patch.nama_kegiatan).toBeUndefined();
    expect(patch.tanggal_mulai).toBe("2025-04-01");
  });

  it("K3 — field tanpa padanan aman (lokasi/pimpinan/hasil/tindak_lanjut) TIDAK PERNAH difabrikasi", () => {
    const patch = deriveEventAutofill(doc, {});
    expect(patch.lokasi).toBeUndefined();
    expect(patch.pimpinan).toBeUndefined();
    expect(patch.hasil).toBeUndefined();
    expect(patch.tindak_lanjut).toBeUndefined();
  });

  it("K4 — dokumen null -> patch kosong", () => {
    expect(deriveEventAutofill(null, {})).toEqual({});
  });
});

describe("isEventFormValid (existing, unchanged)", () => {
  it("tetap valid seperti sebelumnya", () => {
    expect(isEventFormValid({ event_type: "RAPAT", tahun: "2025", tanggal_mulai: "2025-01-01", nama_kegiatan: "X" })).toBe(true);
  });
});
