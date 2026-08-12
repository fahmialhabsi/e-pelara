import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "KoordinasiForkopimdaSection.jsx"), "utf8");

/**
 * Corrective "B.1.2 Tambah Rapat Modal — Footer Accessibility Fix" — modal
 * ini tidak punya infrastruktur render interaktif (test environment "node",
 * tanpa jsdom/RTL — lihat vite.config.js) dan komponennya bergantung pada
 * beberapa child (EntityBuktiManager/ProsnAutofillModal/ProsnSkorIndikatifCard)
 * yang memanggil API — jadi verifikasi di sini bersifat STRUKTURAL (murni
 * pembuktian JSX/DOM-tree, konsisten dgn pola existing CadanganPanganBerasSection.test.js),
 * BUKAN interaction test. Verifikasi klik sungguhan direkomendasikan sbg
 * manual UAT Owner di browser nyata.
 */
describe("KoordinasiForkopimdaSection — modal Tambah Rapat footer accessibility (Corrective B.1.2)", () => {
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
    const formOpenIdx = block.indexOf("<Form id=\"formRapatForkopimda\"");
    const formCloseIdx = block.indexOf("</Form>");
    expect(headerIdx).toBeGreaterThan(-1);
    expect(bodyIdx).toBeGreaterThan(headerIdx);
    // <Form> harus dimulai SETELAH Modal.Body dibuka, dan ditutup SEBELUM Modal.Footer —
    // artinya Form sepenuhnya di dalam Modal.Body, tidak membungkus Header/Footer
    // (root cause defect: Form membungkus ketiganya, merusak flex layout scrollable).
    expect(formOpenIdx).toBeGreaterThan(bodyIdx);
    expect(formCloseIdx).toBeGreaterThan(formOpenIdx);
    expect(footerIdx).toBeGreaterThan(formCloseIdx);
  });

  it("tombol Batal ada di Modal.Footer, onClick HANYA menutup modal (tidak memanggil create/update/save)", () => {
    const footerBlock = modalBlock().slice(modalBlock().indexOf("<Modal.Footer"), modalBlock().indexOf("</Modal.Footer>"));
    expect(footerBlock).toContain(">Batal<");
    const batalLine = footerBlock.split("\n").find((l) => l.includes(">Batal<"));
    expect(batalLine).toContain("onClick={() => setShowModal(false)}");
    expect(batalLine).not.toMatch(/createProsnRapatForkopimda|updateProsnRapatForkopimda|submit/);
  });

  it("tombol Simpan ada di Modal.Footer, terhubung ke form via atribut form= (native HTML), punya disabled/loading state", () => {
    const footerBlock = modalBlock().slice(modalBlock().indexOf("<Modal.Footer"), modalBlock().indexOf("</Modal.Footer>"));
    expect(footerBlock).toContain('type="submit"');
    expect(footerBlock).toContain('form="formRapatForkopimda"');
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

  it("flow submit existing (create/update) TIDAK berubah — submit() tetap memanggil createProsnRapatForkopimda/updateProsnRapatForkopimda apa adanya", () => {
    expect(SOURCE).toContain("if (editing) await updateProsnRapatForkopimda(editing.id, form);");
    expect(SOURCE).toContain("else await createProsnRapatForkopimda(pengisian.id, form);");
  });
});
