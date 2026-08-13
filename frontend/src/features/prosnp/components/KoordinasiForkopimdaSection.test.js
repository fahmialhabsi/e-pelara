import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deriveRapatAutofill } from "./KoordinasiForkopimdaSection";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(__dirname, "KoordinasiForkopimdaSection.jsx"), "utf8");

describe("deriveRapatAutofill (Corrective ProSN Semester-II Readiness — B.1.2 Recall-First Autofill §12)", () => {
  const doc = { judul: "Undangan Rapat Uji", tanggal_dokumen: "2025-06-20" };

  it("RA1 — form kosong -> tanggal_rapat/nama_forum diisi dari dokumen Undangan", () => {
    expect(deriveRapatAutofill(doc, {})).toEqual({ tanggal_rapat: "2025-06-20", nama_forum: "Undangan Rapat Uji" });
  });

  it("RA2 — field yang sudah diisi user tidak ditimpa", () => {
    const patch = deriveRapatAutofill(doc, { nama_forum: "sudah diisi user" });
    expect(patch.nama_forum).toBeUndefined();
    expect(patch.tanggal_rapat).toBe("2025-06-20");
  });

  it("RA3 — is_forkopimda TIDAK PERNAH diisi/diubah otomatis dari kemiripan dokumen (mandat §12.E)", () => {
    const patch = deriveRapatAutofill(doc, {});
    expect(patch.is_forkopimda).toBeUndefined();
  });

  it("RA4 — dokumen null -> patch kosong", () => {
    expect(deriveRapatAutofill(null, {})).toEqual({});
  });
});

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
    // Corrective "B.1.2 Recall-First Autofill" (mandat §12) menambah `record =`
    // (menangkap hasil create/update utk auto-bind evidence sumber terpilih) —
    // pemanggilan create/update ITU SENDIRI (fungsi + argumen) TIDAK berubah.
    expect(SOURCE).toContain("record = await updateProsnRapatForkopimda(editing.id, form);");
    expect(SOURCE).toContain("record = await createProsnRapatForkopimda(pengisian.id, form);");
  });
});
