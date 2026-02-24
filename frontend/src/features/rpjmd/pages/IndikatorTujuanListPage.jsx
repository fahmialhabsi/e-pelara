import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";
import ListPageComponent from "@/features/rpjmd/hooks/ListPageComponent";
import { useDokumen } from "@/hooks/useDokumen";
import IndikatorTujuanNestedView from "./IndikatorTujuanNestedView"; // sesuaikan path
import { Form } from "react-bootstrap"; // pastikan react-bootstrap sudah diinstall

const IndikatorTujuanListPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMisiId, setSelectedMisiId] = useState(""); // ✅ filter
  const navigate = useNavigate();

  const { dokumen, tahun } = useDokumen();

  const fetchData = async () => {
    if (!dokumen || !tahun) return;

    setLoading(true);
    try {
      const res = await api.get("/indikator-tujuans", {
        params: {
          jenis_dokumen: dokumen.toUpperCase(),
          tahun,
          misi_id: selectedMisiId,
        },
      });

      console.log("✅ Response indikator:", res.data);
      const safeData = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];

      setData(safeData);
    } catch (err) {
      console.error("❌ Gagal memuat data indikator tujuan:", err);
      if (err.response) {
        console.error("🧾 Detail Error Response:", err.response.data);
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("📤 Fetching indikator dengan filter:", {
      dokumen,
      tahun,
      selectedMisiId,
    });
    fetchData();
  }, [dokumen, tahun, selectedMisiId]);

  // ✅ Ambil semua misi_id unik
  const misiOptions = Array.from(new Set(data.map((d) => d.misi_id))).filter(
    Boolean
  );

  // ✅ Filter data sesuai pilihan
  const filteredData = selectedMisiId
    ? data.filter((d) => String(d.misi_id) === selectedMisiId)
    : data;

  return (
    <>
      {/* ✅ Filter Dropdown Misi */}
      <Form.Group className="my-3" controlId="filterMisi">
        <Form.Label>Filter Berdasarkan Misi</Form.Label>
        <Form.Select
          value={selectedMisiId}
          onChange={(e) => setSelectedMisiId(e.target.value)}
        >
          <option value="">Semua Misi</option>
          {misiOptions.map((misiId) => (
            <option key={misiId} value={misiId}>
              Misi ID: {misiId}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {/* ✅ Nested View sesuai filter */}
      <IndikatorTujuanNestedView data={filteredData} />
    </>
  );
};

export default IndikatorTujuanListPage;
