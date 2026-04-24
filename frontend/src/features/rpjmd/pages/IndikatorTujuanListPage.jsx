import React, { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useDokumen } from "@/hooks/useDokumen";
import IndikatorTujuanNestedView from "./IndikatorTujuanNestedView";
import { Form } from "react-bootstrap";
import { fetchIndikatorRpjmdList } from "@/features/rpjmd/services/indikatorRpjmdApi";

const IndikatorTujuanListPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMisiId, setSelectedMisiId] = useState("");
  const [refetchToken, setRefetchToken] = useState(0);
  const { dokumen, tahun } = useDokumen();

  useEffect(() => {
    const fetchData = async () => {
      if (!dokumen || !tahun) return;

      setLoading(true);
      try {
        const { data } = await fetchIndikatorRpjmdList("indikator-tujuans", {
          jenis_dokumen: dokumen.toUpperCase(),
          tahun,
          misi_id: selectedMisiId,
        });

        setData(data);
      } catch (err) {
        console.error("Gagal memuat data indikator tujuan:", err);
        if (err.response) {
          console.error("Detail Error Response:", err.response.data);
        }
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dokumen, tahun, selectedMisiId, refetchToken]);

  const misiOptions = Array.from(new Set(data.map((item) => item.misi_id))).filter(
    Boolean
  );

  const filteredData = selectedMisiId
    ? data.filter((item) => String(item.misi_id) === selectedMisiId)
    : data;

  return (
    <>
      <Toaster position="top-right" />
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

      <IndikatorTujuanNestedView
        data={filteredData}
        loading={loading}
        onDeleted={() => setRefetchToken((t) => t + 1)}
      />
    </>
  );
};

export default IndikatorTujuanListPage;
