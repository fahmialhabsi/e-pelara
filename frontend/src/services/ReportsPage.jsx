// src/pages/ReportsPage.jsx
import React, { useState } from "react";
import { Button, Form, Table } from "react-bootstrap";
import api from "../services/api";

const ReportsPage = () => {
  const [periode, setPeriode] = useState("");
  const [reports, setReports] = useState([]);

  const generate = async () => {
    await api.post("/api/reports", { periode }); // Tidak perlu menyimpan response di variabel 'res'
    fetchReports();
  };

  const fetchReports = async () => {
    const response = await api.get("/api/reports"); // Anda bisa mengganti 'res' menjadi 'response' jika mau menggunakan hasilnya
    setReports(response.data); // Gunakan 'response' untuk mengambil data
  };

  return (
    <div>
      <h3>Laporan Otomatis</h3>
      <Form
        inline
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
      >
        <Form.Control
          placeholder="YYYY-MM"
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
        />{" "}
        <Button type="submit">Generate</Button>
      </Form>
      <Table>
        <thead>
          <tr>
            <th>Periode</th>
            <th>Jenis</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{r.periode}</td>
              <td>{r.jenis}</td>
              <td>
                <a
                  href={`/reports/${r.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};
export default ReportsPage;
