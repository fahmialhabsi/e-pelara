import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { derivePerkadaAutofill } from "./InovasiPerkadaSection";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "InovasiPerkadaSection.jsx"), "utf8");

describe("derivePerkadaAutofill (Corrective ProSN Semester-II Readiness — B.1.4 Field-Level Perkada Autofill §13)", () => {
  const doc = { nomor_dokumen: "PERGUB/UJI/2025", tanggal_dokumen: "2025-06-30", document_type: "peraturan_gubernur" };

  it("P1 — form kosong (status_perkada default belum_ada) -> nomor/tanggal/jenis Perkada diisi, status_perkada jadi ditetapkan", () => {
    const patch = derivePerkadaAutofill(doc, { status_perkada: "belum_ada" });
    expect(patch.nomor_perkada).toBe("PERGUB/UJI/2025");
    expect(patch.tanggal_perkada).toBe("2025-06-30");
    expect(patch.jenis_perkada).toBe("Peraturan Gubernur");
    expect(patch.status_perkada).toBe("ditetapkan");
  });

  it("P2 — status_perkada yang SUDAH eksplisit dipilih user (mis. proses_penyusunan) TIDAK PERNAH ditimpa", () => {
    const patch = derivePerkadaAutofill(doc, { status_perkada: "proses_penyusunan" });
    expect(patch.status_perkada).toBeUndefined();
  });

  it("P3 — field nomor/tanggal/jenis yang sudah diisi user tidak ditimpa", () => {
    const patch = derivePerkadaAutofill(doc, { nomor_perkada: "sudah diisi user", status_perkada: "belum_ada" });
    expect(patch.nomor_perkada).toBeUndefined();
    expect(patch.tanggal_perkada).toBe("2025-06-30");
  });

  it("P4 — dokumen null -> patch kosong", () => {
    expect(derivePerkadaAutofill(null, {})).toEqual({});
  });
});

/**
 * Corrective "B.1.4 Tambah Inovasi Modal — Footer Accessibility Fix" — sama
 * pola verifikasi struktural dgn KoordinasiForkopimdaSection.test.js (test
 * environment "node", tanpa jsdom/RTL — lihat vite.config.js).
 */
describe("InovasiPerkadaSection — modal Tambah Inovasi footer accessibility (Corrective B.1.4)", () => {
  function modalBlock() {
    const start = SOURCE.indexOf("<Modal show={showModal}");
    expect(start).toBeGreaterThan(-1);
    return SOURCE.slice(start);
  }

  it("modal tetap memakai prop scrollable milik react-bootstrap (bukan hardcoded height)", () => {
    const modalOpenTag = modalBlock().split("\n")[0];
    expect(modalOpenTag).toContain("scrollable");
    expect(modalOpenTag).not.toMatch(/height\s*:/);
  });

  it("Modal.Header, Modal.Body, dan Modal.Footer adalah flex child LANGSUNG dari <Modal> (TIDAK dibungkus <Form>)", () => {
    const block = modalBlock();
    const headerIdx = block.indexOf("<Modal.Header");
    const bodyIdx = block.indexOf("<Modal.Body");
    const footerIdx = block.indexOf("<Modal.Footer");
    const formOpenIdx = block.indexOf("<Form id=\"formTambahInovasi\"");
    const formCloseIdx = block.indexOf("</Form>");
    expect(headerIdx).toBeGreaterThan(-1);
    expect(bodyIdx).toBeGreaterThan(headerIdx);
    expect(formOpenIdx).toBeGreaterThan(bodyIdx);
    expect(formCloseIdx).toBeGreaterThan(formOpenIdx);
    expect(footerIdx).toBeGreaterThan(formCloseIdx);
  });

  it("tombol Batal ada di Modal.Footer, onClick HANYA menutup modal (tidak memanggil create/update/save)", () => {
    const footerBlock = modalBlock().slice(modalBlock().indexOf("<Modal.Footer"), modalBlock().indexOf("</Modal.Footer>"));
    expect(footerBlock).toContain(">Batal<");
    const batalLine = footerBlock.split("\n").find((l) => l.includes(">Batal<"));
    expect(batalLine).toContain("onClick={() => setShowModal(false)}");
    expect(batalLine).not.toMatch(/createProsnInovasi|updateProsnInovasi|submit/);
  });

  it("tombol Simpan ada di Modal.Footer, terhubung ke form via atribut form= (native HTML), punya disabled/loading state", () => {
    const footerBlock = modalBlock().slice(modalBlock().indexOf("<Modal.Footer"), modalBlock().indexOf("</Modal.Footer>"));
    expect(footerBlock).toContain('type="submit"');
    expect(footerBlock).toContain('form="formTambahInovasi"');
    expect(footerBlock).toContain("disabled={saving}");
    expect(footerBlock).toContain("Menyimpan…");
  });

  it("id form pada <Form> dan atribut form= pada tombol Simpan HARUS cocok persis", () => {
    const formIdMatch = SOURCE.match(/<Form id="([^"]+)" onSubmit=\{submit\}>/);
    const buttonFormMatch = SOURCE.match(/type="submit" form="([^"]+)"/);
    expect(formIdMatch).toBeTruthy();
    expect(buttonFormMatch).toBeTruthy();
    expect(buttonFormMatch[1]).toBe(formIdMatch[1]);
  });

  it("flow submit existing (create/update) TIDAK berubah — submit() tetap memanggil createProsnInovasi/updateProsnInovasi apa adanya", () => {
    // Corrective "B.1.4 Field-Level Perkada Autofill" (mandat §13) menambah
    // `record =` (menangkap hasil create/update utk auto-bind dokumen Perkada
    // terpilih) — pemanggilan create/update ITU SENDIRI TIDAK berubah.
    expect(SOURCE).toContain("record = await updateProsnInovasi(editing.id, form);");
    expect(SOURCE).toContain("record = await createProsnInovasi(pengisian.id, form);");
  });
});
