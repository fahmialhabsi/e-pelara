import React, { useEffect, useState } from "react";
import { fetchIndikatorRpjmdList } from "@/features/rpjmd/services/indikatorRpjmdApi";
import { useNavigate } from "react-router-dom";
import { useDokumen } from "@/hooks/useDokumen";
import IndikatorSasaranNestedView from "./IndikatorSasaranNestedView"; // sesuaikan path
import { Form } from "react-bootstrap";

const IndikatorSasaranListPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTujuanId, setSelectedTujuanId] = useState(""); // ✅ filter berdasarkan tujuan
  const navigate = useNavigate();

  const { dokumen, tahun } = useDokumen();

  const fetchData = async () => {
    if (!dokumen || !tahun) return;

    setLoading(true);
    try {
      const { data } = await fetchIndikatorRpjmdList("indikator-sasaran", {
        jenis_dokumen: dokumen.toUpperCase(),
        tahun,
        tujuan_id: selectedTujuanId,
      });

      setData(data);
    } catch (err) {
      console.error("❌ Gagal memuat data indikator sasaran:", err);
      if (err.response) {
        console.error("🧾 Detail Error Response:", err.response.data);
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("📤 Fetching indikator sasaran dengan filter:", {
      dokumen,
      tahun,
      selectedTujuanId,
    });
    fetchData();
  }, [dokumen, tahun, selectedTujuanId]);

  // ✅ Ambil semua tujuan_id unik
  const tujuanOptions = Array.from(
    new Set(data.map((d) => d.tujuan_id))
  ).filter(Boolean);

  // ✅ Filter data sesuai pilihan
  const filteredData = selectedTujuanId
    ? data.filter((d) => String(d.tujuan_id) === selectedTujuanId)
    : data;

  return (
    <>
      {/* ✅ Filter Dropdown Tujuan */}
      <Form.Group className="my-3" controlId="filterTujuan">
        <Form.Label>Filter Berdasarkan Tujuan</Form.Label>
        <Form.Select
          value={selectedTujuanId}
          onChange={(e) => setSelectedTujuanId(e.target.value)}
        >
          <option value="">Semua Tujuan</option>
          {tujuanOptions.map((tujuanId) => (
            <option key={tujuanId} value={tujuanId}>
              Tujuan ID: {tujuanId}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {/* ✅ Tampilkan data nested sesuai filter */}
      <IndikatorSasaranNestedView data={filteredData} />
    </>
  );
};

export default IndikatorSasaranListPage;
