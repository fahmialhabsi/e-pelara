// File: src/shared/components/IndikatorKhususListPage.jsx
import React, { useEffect, useState } from "react";
import { Form, Spinner, Container } from "react-bootstrap";
import api from "@/services/api";
import { useDokumen } from "@/hooks/useDokumen";
import IndikatorKhususNestedView from "./IndikatorKhususNestedView";

export default function IndikatorKhususListPage() {
  const { tahun, dokumen } = useDokumen();
  const [misi, setMisi] = useState([]);
  const [indikatorData, setIndikatorData] = useState({});
  const [selectedMisi, setSelectedMisi] = useState("");
  const [kategori, setKategori] = useState("tujuan");
  const [indikatorList, setIndikatorList] = useState([]);
  const [selectedIndikatorId, setSelectedIndikatorId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get("/misi")
      .then((res) => setMisi(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedMisi) return;
      setLoading(true);
      try {
        const [tujuan, sasaran, program, kegiatan] = await Promise.all([
          api.get("/indikator-tujuans", {
            params: { misi_id: selectedMisi, tahun, jenis_dokumen: dokumen },
          }),
          api.get("/indikator-sasaran", {
            params: { misi_id: selectedMisi, tahun, jenis_dokumen: dokumen },
          }),
          api.get("/indikator-program", {
            params: { misi_id: selectedMisi, tahun, jenis_dokumen: dokumen },
          }),
          api.get("/indikator-kegiatan", {
            params: { misi_id: selectedMisi, tahun, jenis_dokumen: dokumen },
          }),
        ]);

        console.log("📥 Semua response indikator:", {
          tujuan: tujuan.data,
          sasaran: sasaran.data,
          program: program.data,
          kegiatan: kegiatan.data,
        });

        setIndikatorData({
          tujuan: tujuan.data?.data || [],
          sasaran: sasaran.data?.data || [],
          program: program.data?.data || [],
          kegiatan: kegiatan.data?.data || [],
        });

        setIndikatorList(
          (tujuan.data?.data || []).map((i) => ({
            id: i.id,
            label: `${i.kode_indikator} - ${i.nama_indikator}`,
          }))
        );

        setSelectedIndikatorId("");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMisi, tahun, dokumen]);

  useEffect(() => {
    if (Array.isArray(indikatorData[kategori])) {
      setIndikatorList(
        indikatorData[kategori].map((i) => ({
          id: i.id,
          label: `${i.kode_indikator} - ${i.nama_indikator}`,
        }))
      );
    } else {
      setIndikatorList([]);
    }
  }, [kategori, indikatorData]);

  const filteredData = selectedIndikatorId
    ? {
        [kategori]:
          indikatorData[kategori]?.filter(
            (i) => String(i.id) === String(selectedIndikatorId)
          ) || [],
      }
    : { [kategori]: indikatorData[kategori] || [] };

  return (
    <Container className="my-4">
      <h4>Indikator Khusus</h4>

      <Form.Select
        className="my-2"
        onChange={(e) => setSelectedMisi(e.target.value)}
        value={selectedMisi}
      >
        <option value="">-- Pilih Misi --</option>
        {misi.map((m) => (
          <option key={m.id} value={m.id}>
            {m.no_misi} - {m.isi_misi?.slice(0, 60)}...
          </option>
        ))}
      </Form.Select>

      {selectedMisi && (
        <>
          <Form.Select
            className="my-2"
            onChange={(e) => setKategori(e.target.value)}
            value={kategori}
          >
            <option value="tujuan">Indikator Tujuan</option>
            <option value="sasaran">Indikator Sasaran</option>
            <option value="program">Indikator Program</option>
            <option value="kegiatan">Indikator Kegiatan</option>
          </Form.Select>

          {indikatorList.length > 0 && (
            <Form.Select
              className="my-2"
              value={selectedIndikatorId}
              onChange={(e) => setSelectedIndikatorId(e.target.value)}
            >
              <option value="">-- Pilih Indikator {kategori} --</option>
              {indikatorList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </Form.Select>
          )}
        </>
      )}

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <IndikatorKhususNestedView data={filteredData} />
      )}
    </Container>
  );
}
