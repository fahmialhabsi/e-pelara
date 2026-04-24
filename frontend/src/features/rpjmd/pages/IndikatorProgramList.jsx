import React, { useEffect, useState } from "react";
import { fetchIndikatorRpjmdList } from "@/features/rpjmd/services/indikatorRpjmdApi";
import { useNavigate } from "react-router-dom";
import { useDokumen } from "@/hooks/useDokumen";
import IndikatorProgramNestedView from "./IndikatorProgramNestedView"; // sesuaikan path
import { Form } from "react-bootstrap";

const IndikatorProgramListPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSasaranId, setSelectedSasaranId] = useState(""); // ✅ filter berdasarkan sasaran
  const navigate = useNavigate();

  const { dokumen, tahun } = useDokumen();

  const fetchData = async () => {
    if (!dokumen || !tahun) return;

    setLoading(true);
    try {
      const { data } = await fetchIndikatorRpjmdList("indikator-program", {
        jenis_dokumen: dokumen.toUpperCase(),
        tahun,
        sasaran_id: selectedSasaranId,
      });

      setData(data);
    } catch (err) {
      console.error("❌ Gagal memuat data indikator program:", err);
      if (err.response) {
        console.error("🧾 Detail Error Response:", err.response.data);
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("📤 Fetching indikator program dengan filter:", {
      dokumen,
      tahun,
      selectedSasaranId,
    });
    fetchData();
  }, [dokumen, tahun, selectedSasaranId]);

  // ✅ Ambil semua sasaran_id unik
  const sasaranOptions = Array.from(
    new Set(data.map((d) => d.sasaran_id))
  ).filter(Boolean);

  // ✅ Filter data sesuai pilihan
  const filteredData = selectedSasaranId
    ? data.filter((d) => String(d.sasaran_id) === selectedSasaranId)
    : data;

  return (
    <>
      {/* ✅ Filter Dropdown Sasaran */}
      <Form.Group className="my-3" controlId="filterSasaran">
        <Form.Label>Filter Berdasarkan Sasaran</Form.Label>
        <Form.Select
          value={selectedSasaranId}
          onChange={(e) => setSelectedSasaranId(e.target.value)}
        >
          <option value="">Semua Sasaran</option>
          {sasaranOptions.map((sasaranId) => (
            <option key={sasaranId} value={sasaranId}>
              Sasaran ID: {sasaranId}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {/* ✅ Tampilkan nested view indikator program */}
      <IndikatorProgramNestedView
        data={filteredData}
        loading={loading}
        refetch={fetchData}
      />
    </>
  );
};

export default IndikatorProgramListPage;
