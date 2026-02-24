import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Card, Spinner, Alert, Button } from "react-bootstrap";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export default function CascadingDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const ref = useRef();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/cascading/${id}`);
        setData(res.data);
      } catch (err) {
        setError("Gagal memuat data cascading");
      }
    };
    fetch();
  }, [id]);

  const exportPDF = async () => {
    const canvas = await html2canvas(ref.current);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(img);
    const width = pdf.internal.pageSize.getWidth();
    const height = (imgProps.height * width) / imgProps.width;
    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save("detail-cascading.pdf");
  };

  const exportExcel = () => {
    const row = {
      Misi: `${data?.misi?.no_misi} - ${data?.misi?.isi_misi}`,
      Tujuan: `${data?.tujuan?.no_tujuan} - ${data?.tujuan?.isi_tujuan}`,
      Sasaran: `${data?.sasaran?.nomor} - ${data?.sasaran?.isi_sasaran}`,
      Strategi: data?.strategis
        ?.map((s) => `${s.kode_strategi} - ${s.deskripsi}`)
        .join(", "),
      ArahKebijakan: data?.arahKebijakans
        ?.map((a) => `${a.kode_arah} - ${a.deskripsi || a.nama_arah}`)
        .join(", "),
      Program: `${data?.program?.kode_program} - ${data?.program?.nama_program}`,
      Kegiatan: `${data?.kegiatan?.kode_kegiatan} - ${data?.kegiatan?.nama_kegiatan}`,
      Tahun: data?.tahun,
      jenis_dokumen: data?.jenis_dokumen,
    };

    const ws = XLSX.utils.json_to_sheet([row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detail Cascading");
    XLSX.writeFile(wb, "detail-cascading.xlsx");
  };

  if (!data) {
    return (
      <div className="text-center my-5">
        {error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <>
            <Spinner animation="border" />
            <div>Memuat data cascading...</div>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="d-flex justify-content-between mb-3">
        <h4>Detail Cascading</h4>
        <div>
          <Button
            variant="outline-primary"
            onClick={() => navigate(-1)}
            className="me-2"
          >
            Kembali
          </Button>
          <Button variant="success" className="me-2" onClick={exportPDF}>
            Export PDF
          </Button>
          <Button variant="warning" onClick={exportExcel}>
            Export Excel
          </Button>
        </div>
      </div>

      <div ref={ref}>
        <p>
          <strong>Misi:</strong> {data.misi?.isi_misi}
        </p>
        <p>
          <strong>Tujuan:</strong> {data.tujuan?.isi_tujuan}
        </p>
        <p>
          <strong>Sasaran:</strong> {data.sasaran?.isi_sasaran}
        </p>
        <p>
          <strong>Strategi:</strong>
        </p>
        <ul>
          {data.strategis?.map((s) => (
            <li key={s.id}>
              <strong>{s.kode_strategi}</strong> - {s.deskripsi}
            </li>
          ))}
        </ul>
        <p>
          <strong>Arah Kebijakan:</strong>
        </p>
        <ul>
          {data.arahKebijakans?.map((a) => (
            <li key={a.id}>
              <strong>{a.kode_arah}</strong> - {a.deskripsi || a.nama_arah}
            </li>
          ))}
        </ul>
        <p>
          <strong>Program:</strong> {data.program?.nama_program}
        </p>
        <p>
          <strong>Kegiatan:</strong> {data.kegiatan?.nama_kegiatan}
        </p>
        <p>
          <strong>Jenis Dokumen:</strong> {data.jenis_dokumen}
        </p>
        <p>
          <strong>Tahun:</strong> {data.tahun}
        </p>
      </div>
    </Card>
  );
}
