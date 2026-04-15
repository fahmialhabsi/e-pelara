// File: src/shared/components/IndikatorKhususListPage.jsx
import React, { useEffect, useState } from "react";
import { Form, Spinner, Container } from "react-bootstrap";
import {
  fetchIndikatorKhususBundleByMisi,
  fetchMisi,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { useDokumen } from "@/hooks/useDokumen";
import IndikatorKhususNestedView from "./IndikatorKhususNestedView";
import { normalizeListItems } from "@/utils/apiResponse";

/**
 * Saring baris per misi jika kolom misi_id terisi di data; jika tidak ada satupun misi_id,
 * anggap respons belum menormalisasi FK — tampilkan semua (sesuai tahun/dokumen dari API).
 */
function filterIndikatorRowsByMisi(rows, misiId) {
  if (!misiId) return [];
  const list = rows || [];
  const mid = String(misiId);
  const hasAnyMisi = list.some(
    (r) => r.misi_id != null && String(r.misi_id).trim() !== ""
  );
  if (!hasAnyMisi) return list;
  return list.filter((r) => String(r.misi_id ?? "") === mid);
}

const PILIH_INDIKATOR_LABEL = {
  tujuan: "Indikator Tujuan",
  sasaran: "Indikator Sasaran",
  strategi: "Indikator Strategi",
  arah_kebijakan: "Indikator Arah Kebijakan",
  program: "Indikator Program",
  kegiatan: "Indikator Kegiatan",
  sub_kegiatan: "Indikator Sub Kegiatan",
};

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
    fetchMisi({})
      .then((res) => setMisi(normalizeListItems(res.data)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedMisi) {
        setIndikatorData({});
        setIndikatorList([]);
        setSelectedIndikatorId("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setIndikatorData({});
      setIndikatorList([]);
      setSelectedIndikatorId("");
      try {
        const bundle = await fetchIndikatorKhususBundleByMisi({
          misi_id: selectedMisi,
          tahun,
          jenis_dokumen: dokumen,
        });

        const tujuanList = normalizeListItems(bundle.tujuan.data);
        const sasaranList = normalizeListItems(bundle.sasaran.data);
        const programList = normalizeListItems(bundle.program.data);
        const kegiatanList = normalizeListItems(bundle.kegiatan.data);
        const strategiList = filterIndikatorRowsByMisi(
          normalizeListItems(bundle.strategi.data),
          selectedMisi
        );
        const arahList = filterIndikatorRowsByMisi(
          normalizeListItems(bundle.arahKebijakan.data),
          selectedMisi
        );
        const subKegiatanList = filterIndikatorRowsByMisi(
          normalizeListItems(bundle.subKegiatan.data),
          selectedMisi
        );

        setIndikatorData({
          tujuan: tujuanList,
          sasaran: sasaranList,
          strategi: strategiList,
          arah_kebijakan: arahList,
          program: programList,
          kegiatan: kegiatanList,
          sub_kegiatan: subKegiatanList,
        });
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
            <option value="strategi">Indikator Strategi</option>
            <option value="arah_kebijakan">Indikator Arah Kebijakan</option>
            <option value="program">Indikator Program</option>
            <option value="kegiatan">Indikator Kegiatan</option>
            <option value="sub_kegiatan">Indikator Sub Kegiatan</option>
          </Form.Select>

          <Form.Select
            className="my-2"
            value={selectedIndikatorId}
            onChange={(e) => setSelectedIndikatorId(e.target.value)}
            disabled={loading || indikatorList.length === 0}
          >
            <option value="">
              {indikatorList.length === 0
                ? `-- Tidak ada ${PILIH_INDIKATOR_LABEL[kategori] || kategori} untuk misi ini --`
                : `-- Pilih ${PILIH_INDIKATOR_LABEL[kategori] || kategori} --`}
            </option>
            {indikatorList.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Form.Select>
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
