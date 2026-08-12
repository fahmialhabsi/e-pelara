import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "InovasiPerkadaSection.jsx"), "utf8");

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
    expect(SOURCE).toContain("if (editing) await updateProsnInovasi(editing.id, form);");
    expect(SOURCE).toContain("else await createProsnInovasi(pengisian.id, form);");
  });
});
