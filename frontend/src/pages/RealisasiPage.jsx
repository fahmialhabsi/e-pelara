import React, { useState, useEffect } from "react";
import { Container, Table, Spinner } from "react-bootstrap";
import api from "../../services/api";
import RealisasiForm from "../../features/monev/components/RealisasiForm";

export default function RealisasiPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    api
      .get("/realisasi-indikator")
      .then((res) => setList(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  return (
    <Container className="my-4">
      <RealisasiForm onSaved={fetchData} />
      <hr />
      <h5>Daftar Realisasi</h5>
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped bordered>
          <thead>
            <tr>
              <th>#</th>
              <th>Indikator</th>
              <th>Periode</th>
              <th>Nilai</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.indikator_id}</td>{" "}
                {/* bisa expand ke nama via include */}
                <td>{r.periode}</td>
                <td>{r.nilai_realisasi}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
