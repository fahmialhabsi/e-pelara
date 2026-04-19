// src/shared/components/IndikatorKhususNestedView.jsx
import React, { useEffect } from "react";
import { Accordion, Table, Button } from "react-bootstrap";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const exportToExcel = (rows, title) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Indikator");
  XLSX.writeFile(wb, `${title}.xlsx`);
};

const exportToPDF = (rows, title) => {
  const doc = new jsPDF();
  const head = [
    [
      "Uraian Indikator",
      "Capaian Tahun I",
      "II",
      "III",
      "IV",
      "V",
      "Target Tahun I",
      "II",
      "III",
      "IV",
      "V",
    ],
  ];
  const body = rows.map((row) => [
    `${row.kode_indikator} - ${row.nama_indikator}`,
    row.capaian_tahun_1 ?? "-",
    row.capaian_tahun_2 ?? "-",
    row.capaian_tahun_3 ?? "-",
    row.capaian_tahun_4 ?? "-",
    row.capaian_tahun_5 ?? "-",
    row.target_tahun_1 ?? "-",
    row.target_tahun_2 ?? "-",
    row.target_tahun_3 ?? "-",
    row.target_tahun_4 ?? "-",
    row.target_tahun_5 ?? "-",
  ]);
  autoTable(doc, { head, body });
  doc.save(`${title}.pdf`);
};

export default function IndikatorKhususNestedView({ data = {} }) {
  useEffect(() => {
    console.log("✅ NestedView menerima data:", data);
  }, [data]);

  const renderTable = (title, rows = []) => (
    <div className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="fw-bold text-secondary">{title}</h6>
        {rows.length > 0 && (
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="outline-success"
              onClick={() => exportToExcel(rows, title)}
            >
              Export Excel
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => exportToPDF(rows, title)}
            >
              Export PDF
            </Button>
          </div>
        )}
      </div>
      <Table bordered size="sm" responsive className="text-nowrap">
        <thead>
          <tr>
            <th rowSpan={2}>Uraian Indikator</th>
            <th colSpan={5} className="text-center">
              Capaian Tahun Ke
            </th>
            <th colSpan={5} className="text-center">
              Target/Proyeksi Tahun Ke
            </th>
          </tr>
          <tr>
            <th>I</th>
            <th>II</th>
            <th>III</th>
            <th>IV</th>
            <th>V</th>
            <th>I</th>
            <th>II</th>
            <th>III</th>
            <th>IV</th>
            <th>V</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, idx) => (
              <React.Fragment key={`indikator-${row.kode_indikator || idx}`}>
                <tr>
                  <td>{`${row.kode_indikator} - ${row.nama_indikator}`}</td>
                  <td>{row.capaian_tahun_1 ?? "-"}</td>
                  <td>{row.capaian_tahun_2 ?? "-"}</td>
                  <td>{row.capaian_tahun_3 ?? "-"}</td>
                  <td>{row.capaian_tahun_4 ?? "-"}</td>
                  <td>{row.capaian_tahun_5 ?? "-"}</td>
                  <td>{row.target_tahun_1 ?? "-"}</td>
                  <td>{row.target_tahun_2 ?? "-"}</td>
                  <td>{row.target_tahun_3 ?? "-"}</td>
                  <td>{row.target_tahun_4 ?? "-"}</td>
                  <td>{row.target_tahun_5 ?? "-"}</td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Outcome:</strong> {row.indikator_kinerja || row.jenis || '-'}
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Indikator Kinerja Utama:</strong>{" "}
                    {row.tolok_ukur_kinerja ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Jenis Indikator:</strong>{" "}
                    {row.jenis_indikator ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Target Kinerja:</strong> {row.target_kinerja ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Satuan:</strong> {row.satuan ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Baseline:</strong> {row.baseline ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Sumber Data:</strong>{" "}
                    <div
                      style={{
                        maxWidth: "500px",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "break-word",
                      }}
                    >
                      {row.sumber_data ?? "-"}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>Rekomendasi:</strong>{" "}
                    <div
                      style={{
                        maxWidth: "500px",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "break-word",
                      }}
                    >
                      {row.rekomendasi_ai ?? "-"}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={11}>
                    <strong>OPD Penanggung Jawab:</strong>{" "}
                    {row.opdPenanggungJawab?.nama_opd ??
                      row.penanggung_jawab ??
                      "-"}
                  </td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan={11} className="text-center text-muted">
                Tidak ada data.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );

  return (
    <Accordion defaultActiveKey="0" alwaysOpen>
      {Object.entries(data).map(([key, rows], idx) => (
        <Accordion.Item eventKey={String(idx)} key={key}>
          <Accordion.Header>Indikator {key}</Accordion.Header>
          <Accordion.Body>
            {renderTable(`Indikator ${key}`, rows)}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
