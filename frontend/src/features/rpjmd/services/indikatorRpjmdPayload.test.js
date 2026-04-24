import { describe, it, expect } from "vitest";
import {
  buildKegiatanIndikatorPayload,
  validateKegiatanWizardForSubmit,
} from "./indikatorRpjmdPayload";

describe("indikatorRpjmdPayload", () => {
  describe("validateKegiatanWizardForSubmit", () => {
    it("menolak jika daftar kegiatan kosong", () => {
      const r = validateKegiatanWizardForSubmit({
        kegiatan: [],
        misi_id: 1,
        tujuan_id: 2,
        sasaran_id: 3,
      });
      expect(r.ok).toBe(false);
    });

    it("menolak jika item tanpa indikator_id", () => {
      const r = validateKegiatanWizardForSubmit({
        kegiatan: [{ nama: "x" }],
        misi_id: 1,
        tujuan_id: 2,
        sasaran_id: 3,
      });
      expect(r.ok).toBe(false);
    });

    it("menolak jika misi/tujuan/sasaran kosong", () => {
      const r = validateKegiatanWizardForSubmit({
        kegiatan: [{ indikator_id: "a" }],
        misi_id: "",
        tujuan_id: 2,
        sasaran_id: 3,
      });
      expect(r.ok).toBe(false);
    });

    it("lolos dengan payload minimal valid", () => {
      const r = validateKegiatanWizardForSubmit({
        kegiatan: [{ indikator_id: "x" }],
        misi_id: 1,
        tujuan_id: 2,
        sasaran_id: 3,
      });
      expect(r.ok).toBe(true);
    });

    it("lolos jika baris punya id server tanpa indikator_id", () => {
      const r = validateKegiatanWizardForSubmit({
        kegiatan: [{ id: "42" }],
        misi_id: 1,
        tujuan_id: 2,
        sasaran_id: 3,
      });
      expect(r.ok).toBe(true);
    });
  });

  describe("buildKegiatanIndikatorPayload", () => {
    it("menyuntikkan id hierarki & dokumen ke setiap item", () => {
      const rows = buildKegiatanIndikatorPayload({
        kegiatan: [{ indikator_id: "i1", foo: 1 }],
        kegiatan_id: "k10",
        program_id: "p9",
        indikator_program_id: "ip8",
        sasaran_id: "s7",
        tujuan_id: "t6",
        misi_id: "m5",
        jenis_dokumen: "RPJMD",
        tahun: 2026,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        indikator_id: "i1",
        kegiatan_id: "k10",
        program_id: "p9",
        indikator_program_id: "ip8",
        sasaran_id: "s7",
        tujuan_id: "t6",
        misi_id: "m5",
        jenis_dokumen: "RPJMD",
        tahun: 2026,
      });
    });

    it("mengembalikan array kosong jika kegiatan bukan array", () => {
      expect(buildKegiatanIndikatorPayload({ kegiatan: null })).toEqual([]);
    });
  });
});
