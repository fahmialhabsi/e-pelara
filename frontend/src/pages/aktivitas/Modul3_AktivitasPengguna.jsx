// src/modules/Modul3_AktivitasPengguna.js
import React, { useEffect, useState } from "react";
import { Table, Spinner } from "react-bootstrap";
import api from "../../services/api";
import AktivitasFilter from "../../features/rpjmd/components/AktivitasFilter";

export default function AktivitasPengguna() {
  const [filters, setFilters] = useState({
    role: "",
    periodType: "bulan",
    period: "",
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filters.role || !filters.period) return;
    setLoading(true);
    api.get("/api/activities", { params: filters }).then((res) => {
      setLogs(res.data.data);
      setLoading(false);
    });
  }, [filters]);

  return (
    <>
      <AktivitasFilter filters={filters} setFilters={setFilters} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped hover>
          <thead>
            <tr>
              <th>No</th>
              <th>Waktu</th>
              <th>Role</th>
              <th>Deskripsi</th>
              <th>Sumber Data</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id}>
                <td>{i + 1}</td>
                <td>{log.timestamp}</td>
                <td>{log.role}</td>
                <td>{log.taskName}</td>
                <td>{log.sourceData}</td>
                <td>{log.correctionNote}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
