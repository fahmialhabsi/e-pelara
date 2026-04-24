import React, { useEffect, useState } from "react";
import { fetchIndikatorRpjmdList } from "@/features/rpjmd/services/indikatorRpjmdApi";
import { useNavigate } from "react-router-dom";
import { useDokumen } from "@/hooks/useDokumen";
import IndikatorKegiatanNestedView from "./IndikatorKegiatanNestedView"; // sesuaikan path
import { Form } from "react-bootstrap";

const IndikatorKegiatanListPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const navigate = useNavigate();

  const { dokumen, tahun } = useDokumen();

  const fetchData = async () => {
    if (!dokumen || !tahun) return;

    setLoading(true);
    try {
      const { data } = await fetchIndikatorRpjmdList("indikator-kegiatan", {
        jenis_dokumen: dokumen.toUpperCase(),
        tahun,
        program_id: selectedProgramId,
      });
      setData(data);
    } catch (err) {
      console.error("❌ Gagal memuat data indikator kegiatan:", err);
      if (err.response) {
        console.error("🧾 Detail Error Response:", err.response.data);
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("📤 Fetching indikator kegiatan dengan filter:", {
      dokumen,
      tahun,
      selectedProgramId,
    });
    fetchData();
  }, [dokumen, tahun, selectedProgramId]);

  // Ambil semua program_id unik
  const programOptions = Array.from(
    new Set(data.map((d) => d.program_id))
  ).filter(Boolean);

  const filteredData = selectedProgramId
    ? data.filter((d) => String(d.program_id) === selectedProgramId)
    : data;

  return (
    <>
      {/* Dropdown Filter */}
      <Form.Group className="my-3" controlId="filterProgram">
        <Form.Label>Filter Berdasarkan Program</Form.Label>
        <Form.Select
          value={selectedProgramId}
          onChange={(e) => setSelectedProgramId(e.target.value)}
        >
          <option value="">Semua Program</option>
          {programOptions.map((programId) => (
            <option key={programId} value={programId}>
              Program ID: {programId}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {/* Komponen Nested View */}
      <IndikatorKegiatanNestedView
        data={filteredData}
        loading={loading}
        refetch={fetchData}
      />
    </>
  );
};

export default IndikatorKegiatanListPage;
