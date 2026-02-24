// src/features/renstra/pages/DynamicBabPage.js
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardBody, Button, Form, Table } from "react-bootstrap";
import api from "../../../services/api";
import DynamicTableWithImport from "../components/DynamicTableWithImport";
import FormCascadingRenstra from "../components/FormCascadingRenstra";
import {
  isCascadingComplete,
  validateCascadingCompletion,
  cascadingLabels as cascadingLabelsMap,
} from "../utils/cascadingUtils";

import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../../../App.css";

const babList = [
  { nomor: "I", title: "Pendahuluan" },
  { nomor: "II", title: "Gambaran Umum Dinas Pangan" },
  { nomor: "III", title: "Permasalahan & Isu Strategis" },
  { nomor: "IV", title: "Tujuan & Sasaran" },
  { nomor: "V", title: "Strategi & Kebijakan" },
  { nomor: "VI", title: "Program & Kegiatan" },
  { nomor: "VII", title: "Indikator Kinerja" },
  { nomor: "VIII", title: "Penutup" },
];

function getNextSubbabNomor(subbabs) {
  return (subbabs.length + 1).toString();
}

function getNextTableNomor(tabels) {
  return (tabels?.length || 0) + 1;
}

export default function DynamicBabPage({ tahun }) {
  const { babId } = useParams();
  const [loading, setLoading] = useState(false);
  const [subbabs, setSubbabs] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const babInfo = babList.find((b) => b.nomor === babId);
  const [signatureImg, setSignatureImg] = useState(null);

  const printRef = useRef();

  useEffect(() => {
    setLoading(true);
    api
      .get(`/renstra/${tahun}/bab/${babId}`)
      .then((res) => {
        setSubbabs(res.data.subbabList || []);
      })
      .catch(() => setSubbabs([]))
      .finally(() => setLoading(false));
  }, [babId, tahun]);

  const handleTambahSubbab = () => {
    setSubbabs((prev) => [
      ...prev,
      {
        nomor: getNextSubbabNomor(prev),
        judul: "",
        isi: "",
        tipe: "textarea",
        tables: [],
      },
    ]);
    setEditingIndex(subbabs.length);
  };

  const handleUpdateSubbab = (idx, updated) => {
    setSubbabs((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...updated } : s))
    );
  };

  const handleHapusSubbab = (idx) => {
    setSubbabs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleTambahTabel = (sbIdx) => {
    setSubbabs((prev) =>
      prev.map((s, i) =>
        i === sbIdx
          ? {
              ...s,
              tables: [
                ...s.tables,
                {
                  nomor: `${s.nomor}.${getNextTableNomor(s.tables)}`,
                  judul: "",
                  columns: ["Kolom1", "Kolom2"],
                  tabel: [],
                  sumber: "",
                  analisa: "",
                },
              ],
            }
          : s
      )
    );
  };

  const handleUpdateTabel = (sbIdx, tblIdx, val) => {
    setSubbabs((prev) =>
      prev.map((s, i) =>
        i === sbIdx
          ? {
              ...s,
              tables: s.tables.map((t, j) =>
                j === tblIdx ? { ...t, ...val } : t
              ),
            }
          : s
      )
    );
  };

  const handleSimpanSubbab = async (sbIdx) => {
    const sb = subbabs[sbIdx];

    if (
      ["IV", "V", "VI"].includes(babId) &&
      !isCascadingComplete(sb.cascading || {})
    ) {
      alert(
        "❌ Cascading RPJMD belum lengkap. Harap lengkapi sebelum menyimpan."
      );
      return;
    }

    setLoading(true);
    try {
      const updatedSubbabs = [...subbabs];
      updatedSubbabs[sbIdx] = sb;

      await api.put(`/renstra/${tahun}/bab/${babId}`, {
        judul_bab: babInfo.title,
        subbabList: updatedSubbabs,
      });

      setSubbabs(updatedSubbabs); // sinkronisasi
      setEditingIndex(null);
      alert("✅ Subbab berhasil disimpan");
    } catch {
      alert("❌ Gagal menyimpan subbab");
    }
    setLoading(false);
  };

  const handleExportToPDF = ({
    mode = "paginatedWithFooter",
    fileName = `Bab_${babId}_${tahun}.pdf`,
    watermarkText = "RAHASIA - RENSTRA",
    includeSignature = true,
  }) => {
    // Jangan validasi signatureImg — hanya tambahkan jika memang ada
    if (includeSignature && signatureImg) {
      // Tambahkan tanda tangan gambar ke PDF
    }

    const input = printRef.current;
    if (!input) {
      alert("Elemen tidak ditemukan.");
      return;
    }

    // SEMBUNYIKAN elemen tombol interaktif
    const interactiveElements = input.querySelectorAll(".hide-on-export");
    interactiveElements.forEach((el) => el.classList.add("hide-on-export"));

    if (
      ["IV", "V", "VI"].includes(babId) &&
      subbabs.some((sb) => !isCascadingComplete(sb.cascading || {}))
    ) {
      alert(
        "❌ Masih ada subbab dengan cascading yang belum lengkap. Harap lengkapi sebelum ekspor."
      );
      return;
    }

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const margin = 40;
      let heightLeft = imgHeight;
      let position = margin;

      if (mode === "simple") {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
      } else {
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          position,
          pdfWidth - margin * 2,
          imgHeight
        );
        heightLeft -= pdfHeight - margin * 2;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(
            imgData,
            "PNG",
            margin,
            position,
            pdfWidth - margin * 2,
            imgHeight
          );
          heightLeft -= pdfHeight - margin * 2;
        }
      }

      const totalPages = pdf.internal.getNumberOfPages();

      // Tambahkan Watermark
      if (watermarkText) {
        const gState = pdf.GState({ opacity: 0.1 });
        pdf.setGState(gState);
        pdf.setFontSize(60);
        pdf.setTextColor(150);
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.text(watermarkText, pdfWidth / 2, pdfHeight / 2, {
            align: "center",
            angle: 45,
          });
        }
        pdf.setGState(new pdf.GState({ opacity: 1 }));
      }

      // Tambahkan Header + Footer
      if (mode === "paginatedWithFooter") {
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(12);
          pdf.text("Laporan RENSTRA", pdfWidth / 2, 20, { align: "center" });
          pdf.setFontSize(10);
          pdf.text(
            `Halaman ${i} dari ${totalPages}`,
            pdfWidth / 2,
            pdfHeight - 10,
            { align: "center" }
          );
        }
      }

      // Tambahkan Gambar Tanda Tangan (jika diaktifkan)
      if (includeSignature && signatureImg) {
        const sigWidth = 120;
        const sigHeight = 60;
        const x = pdfWidth - sigWidth - 40;
        const y = pdfHeight - sigHeight - 60;

        pdf.setPage(totalPages);
        pdf.setFontSize(10);
        pdf.text("Tanda Tangan:", x, y - 10);
        pdf.addImage(signatureImg, "PNG", x, y, sigWidth, sigHeight);

        pdf.save(fileName);
      } else {
        pdf.save(fileName);
      }
      // Kembalikan elemen tombol ke tampilan normal
      interactiveElements.forEach((el) =>
        el.classList.remove("hide-on-export")
      );
    });
  };

  const handleExportToWord = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Bab ${babId}. ${babInfo?.title}`,
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            ...subbabs
              .filter(
                (sb) =>
                  !["IV", "V", "VI"].includes(babId) ||
                  isCascadingComplete(sb.cascading || {})
              )
              .map((sb) => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${sb.nomor}. ${sb.judul}`,
                      bold: true,
                      size: 24,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [new TextRun(sb.isi)],
                }),
                ...(sb.tables || []).map(
                  (tbl) =>
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Tabel ${tbl.nomor}: ${tbl.judul}`,
                          italics: true,
                        }),
                      ],
                    })
                ),
              ])
              .flat(),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Bab_${babId}_${tahun}.docx`);
  };

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    subbabs
      .filter(
        (sb) =>
          !["IV", "V", "VI"].includes(babId) ||
          isCascadingComplete(sb.cascading || {})
      )
      .forEach((sb) => {
        const wsData = [
          ["Nomor", sb.nomor],
          ["Judul", sb.judul],
          ["Isi", sb.isi],
        ];
        if (sb.tables && sb.tables.length > 0) {
          sb.tables.forEach((tbl) => {
            wsData.push([]);
            wsData.push([`Tabel ${tbl.nomor}: ${tbl.judul}`]);
            wsData.push(tbl.columns);
            tbl.tabel.forEach((row) => {
              wsData.push(row);
            });
            wsData.push(["Sumber", tbl.sumber]);
            wsData.push(["Analisa", tbl.analisa]);
          });
        }
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, `Subbab ${sb.nomor}`);
      });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, `Bab_${babId}_${tahun}.xlsx`);
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      alert("Silakan pilih file PDF terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", pdfFile);

    try {
      const response = await api.post("/signpdf", formData, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      saveAs(blob, "signed-renstra.pdf");

      alert("✅ Berhasil! File telah ditandatangani dan diunduh.");
    } catch (error) {
      console.error("Gagal upload PDF:", error);
      alert(
        "❌ Gagal menandatangani PDF. Pastikan server berjalan dan file valid."
      );
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureImg(reader.result);
      localStorage.setItem("signatureImage", reader.result); // optional: simpan agar tidak hilang setelah reload
    };
    reader.readAsDataURL(file);
  };

  // optional: load dari localStorage saat komponen mount
  useEffect(() => {
    const savedSignature = localStorage.getItem("signatureImage");
    if (savedSignature) {
      setSignatureImg(savedSignature);
    }
  }, []);

  return (
    <div>
      {signatureImg && (
        <div className="mt-2">
          <div className="mb-1 hide-on-print">Pratinjau:</div>
          <img src={signatureImg} alt="Tanda Tangan" height={80} />
        </div>
      )}

      <Button
        variant="secondary"
        className="mb-3 hide-on-print"
        onClick={() => window.print()}
      >
        🖨️ Cetak Dokumen
      </Button>

      <Card className="mb-4 p-3 shadow-sm bg-light hide-on-print">
        <h5>🖼️ Tanda Tangan Visual (opsional)</h5>
        <Form.Group
          controlId="signatureUpload"
          className="mb-2 hide-on-export hide-on-print "
        >
          <Form.Label>Unggah gambar tanda tangan (PNG/JPG)</Form.Label>
          <Form.Control
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleSignatureUpload}
          />
          {signatureImg && (
            <div className="mt-2">
              <div className="mb-1">Pratinjau:</div>
              <img src={signatureImg} alt="Tanda Tangan" height={60} />
              <Button
                variant="outline-danger"
                size="sm"
                className="ms-2"
                onClick={() => {
                  setSignatureImg(null);
                  localStorage.removeItem("signatureImage");
                }}
              >
                Hapus Tanda Tangan
              </Button>
            </div>
          )}
        </Form.Group>
        <div className="small text-muted">
          Tanda tangan ini akan disisipkan ke file saat Anda klik "Export ke
          PDF".
        </div>
      </Card>

      <Card className="mb-4 p-3 shadow-sm bg-light hide-on-print">
        <h5>🔐 Tanda Tangan Digital</h5>
        <Form.Group controlId="pdfUpload">
          <Form.Label>
            Unggah file PDF hasil export untuk ditandatangani digital
          </Form.Label>
          <Form.Control
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
          />
        </Form.Group>
        <Button className="mt-2" variant="primary" onClick={handlePdfUpload}>
          Kirim & Tandatangani PDF
        </Button>
        <div className="small text-muted mt-2">
          PDF ini akan diproses di server dan ditandatangani menggunakan
          sertifikat resmi (.p12).
        </div>
      </Card>

      {loading && (
        <div className="text-center my-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      <div ref={printRef} className="print-area">
        <h3 className="fw-bold mb-4">
          Bab {babId}. {babInfo?.title}
        </h3>

        <Form.Group controlId="signatureUpload" className="mb-4 hide-on-export">
          <Form.Label>Unggah Tanda Tangan (PNG/JPG)</Form.Label>
          <Form.Control
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleSignatureUpload}
          />
        </Form.Group>

        {subbabs.map((sb, sbIdx) => (
          <Card className="mb-4 shadow-sm" key={sbIdx}>
            <CardBody>
              {editingIndex === sbIdx ? (
                <>
                  <Form.Control
                    type="text"
                    className="mb-2"
                    value={sb.judul}
                    placeholder="Judul Subbab"
                    onChange={(e) =>
                      handleUpdateSubbab(sbIdx, { judul: e.target.value })
                    }
                  />
                  <Form.Control
                    as="textarea"
                    rows={5}
                    className="mb-3"
                    value={sb.isi}
                    placeholder="Tulis narasi..."
                    onChange={(e) =>
                      handleUpdateSubbab(sbIdx, { isi: e.target.value })
                    }
                  />
                  {/* Jika bab IV–VI, tambahkan input cascading */}
                  {["IV", "V", "VI"].includes(babId) && (
                    <div className="mb-3">
                      <Form.Label>Integrasi RPJMD (Cascading)</Form.Label>
                      <FormCascadingRenstra
                        value={sb.cascading || {}}
                        onChange={(val) =>
                          handleUpdateSubbab(sbIdx, { cascading: val })
                        }
                      />
                    </div>
                  )}

                  {/* Tabel */}
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleTambahTabel(sbIdx)}
                    className="mb-3"
                  >
                    + Tambah Tabel pada Subbab ini
                  </Button>

                  {/* Tabel Loop */}
                  {(sb.tables || []).map((tbl, tblIdx) => (
                    <div className="mb-3" key={tblIdx}>
                      <Form.Control
                        type="text"
                        value={tbl.judul}
                        className="mb-2"
                        onChange={(e) =>
                          handleUpdateTabel(sbIdx, tblIdx, {
                            judul: e.target.value,
                          })
                        }
                        placeholder="Judul Tabel"
                      />
                      <DynamicTableWithImport
                        label=""
                        value={tbl}
                        onChange={(val) =>
                          handleUpdateTabel(sbIdx, tblIdx, val)
                        }
                        expectedColumns={tbl.columns}
                      />
                    </div>
                  ))}

                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleSimpanSubbab(sbIdx)}
                      disabled={
                        ["IV", "V", "VI"].includes(babId) &&
                        !isCascadingComplete(sb.cascading || {})
                      }
                    >
                      Simpan
                    </Button>
                    {["IV", "V", "VI"].includes(babId) &&
                      !isCascadingComplete(sb.cascading || {}) && (
                        <div className="text-danger small mt-1">
                          Belum lengkap:{" "}
                          {validateCascadingCompletion(sb.cascading || {})
                            .map((k) => cascadingLabelsMap[k])
                            .join(", ")}
                        </div>
                      )}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingIndex(null)}
                    >
                      Batal
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="fw-semibold mb-1">
                    {sb.nomor}. {sb.judul || <i>(Belum ada judul)</i>}{" "}
                    {["IV", "V", "VI"].includes(babId) &&
                      !isCascadingComplete(sb.cascading || {}) && (
                        <span
                          className="text-warning ms-2"
                          title="Cascading belum lengkap"
                        >
                          ⚠️
                        </span>
                      )}
                  </div>
                  <div className="mb-2 text-muted">
                    {sb.isi || <i>(Belum ada narasi)</i>}
                  </div>

                  {["IV", "V", "VI"].includes(babId) && sb.cascading && (
                    <div className="small text-muted">
                      <strong>Cascading RPJMD:</strong>
                      <ul className="mb-2">
                        {Object.entries(sb.cascading).map(([key, val]) => (
                          <li key={key}>
                            <code>{key}</code>: {val || <i>(kosong)</i>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tabel */}
                  {(sb.tables || []).map((tbl, tblIdx) => (
                    <div className="mb-3" key={tblIdx}>
                      <div className="fw-semibold mb-1">
                        Tabel {tbl.nomor}: {tbl.judul}
                      </div>
                      <Table bordered size="sm">
                        <thead>
                          <tr>
                            {tbl.columns.map((col, i) => (
                              <th key={i}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tbl.tabel.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {tbl.columns.map((col, cellIdx) => (
                                <td key={cellIdx}>{row[col]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <div className="small text-muted">
                        <strong>Sumber:</strong> {tbl.sumber || "-"}
                        <br />
                        <strong>Analisa:</strong> {tbl.analisa || "-"}
                      </div>
                    </div>
                  ))}

                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setEditingIndex(sbIdx)}
                      className="hide-on-export"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleHapusSubbab(sbIdx)}
                      className="hide-on-export"
                    >
                      Hapus Subbab
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        setSignatureImg(null);
                        localStorage.removeItem("signatureImage");
                      }}
                      className="hide-on-export"
                    >
                      Hapus Tanda Tangan
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="d-flex justify-content-end gap-2 mt-3">
        <Button variant="success" onClick={handleTambahSubbab}>
          + Tambah Subbab
        </Button>
        <Button variant="secondary" onClick={handleExportToWord}>
          Export ke Word
        </Button>
        <Button variant="success" onClick={handleExportToExcel}>
          Export ke Excel
        </Button>
        <Button variant="danger" onClick={() => handleExportToPDF({})}>
          Export ke PDF
        </Button>
      </div>
    </div>
  );
}
