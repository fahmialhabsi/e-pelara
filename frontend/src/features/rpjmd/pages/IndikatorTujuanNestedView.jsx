import React, { useState } from "react";
import { Card, Table, Button, Dropdown, ButtonGroup } from "react-bootstrap";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteIndikatorRpjmd } from "@/features/rpjmd/services/indikatorRpjmdApi";

const IndikatorTujuanNestedView = ({ data = [], onDeleted }) => {
  const [filter, setFilter] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const navigate = useNavigate();

  const filteredData = data.filter((item) => {
    if (!filter) return true;
    return (
      item?.misi_id?.toString() === filter ||
      item?.tujuan_id?.toString() === filter
    );
  });

  const groupedData = filteredData.reduce((acc, item) => {
    const key = `Misi ${item.misi_id} - Tujuan ${item.tujuan_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const toggleExpandRow = (id) => {
    setExpandedRowId((prevId) => (prevId === id ? null : id));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus data ini?")) return;
    try {
      await deleteIndikatorRpjmd("indikator-tujuans", id);
      toast.success("Data berhasil dihapus.");
      onDeleted?.();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus data.");
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IndikatorTujuan");
    XLSX.writeFile(wb, "indikator_tujuan.xlsx");
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [
        ["Uraian", "Target", "Satuan", "Capaian I-V", "Baseline", "Target I-V"],
      ],
      body: filteredData.map((d) => [
        `${d.kode_indikator} - ${d.nama_indikator}`,
        d.target_kinerja,
        d.satuan,
        [1, 2, 3, 4, 5].map((i) => d[`capaian_tahun_${i}`]).join(", "),
        d.baseline,
        [1, 2, 3, 4, 5].map((i) => d[`target_tahun_${i}`]).join(", "),
      ]),
    });
    doc.save("indikator_tujuan.pdf");
  };

  const allFilters = Array.from(new Set(data.map((d) => `${d.misi_id}`)));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Daftar Indikator Tujuan</h5>
        <div className="d-flex gap-2">
          <Dropdown as={ButtonGroup}>
            <Button variant="secondary">Filter</Button>
            <Dropdown.Toggle split variant="secondary" />
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setFilter("")}>Semua</Dropdown.Item>
              {allFilters.map((key) => (
                <Dropdown.Item key={key} onClick={() => setFilter(key)}>
                  Misi {key}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <Button variant="outline-success" onClick={exportExcel}>
            Excel
          </Button>
          <Button variant="outline-danger" onClick={exportPdf}>
            PDF
          </Button>
          <Button variant="outline-primary">
            <CSVLink data={filteredData} filename="indikator_tujuan.csv">
              CSV
            </CSVLink>
          </Button>
        </div>
      </div>

      {Object.entries(groupedData).map(([group, items]) => (
        <Card className="mb-4" key={group}>
          <Card.Header className="fw-bold">{group}</Card.Header>
          <Card.Body>
            <Table bordered responsive size="sm">
              <thead>
                <tr>
                  <th rowSpan="2">Uraian Indikator</th>
                  <th rowSpan="2">Target</th>
                  <th rowSpan="2">Satuan</th>
                  <th colSpan="5" className="text-center">
                    Capaian Tahun Ke
                  </th>
                  <th rowSpan="2">Baseline</th>
                  <th colSpan="5" className="text-center">
                    Target Tahun Ke
                  </th>
                  <th rowSpan="2">Aksi</th>
                </tr>
                <tr>
                  <th>I</th>
                  <th>II</th>
                  <th>III</th>
                  <th>IV</th>
                  <th>V</th>
                  <th>I</th>
                  <th>II</th>
                  <th>III</th>
                  <th>IV</th>
                  <th>V</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td>
                        {item.kode_indikator} - {item.nama_indikator}
                      </td>
                      <td>{item.target_kinerja}</td>
                      <td>{item.satuan}</td>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <td key={`capaian_${i}`}>
                          {item[`capaian_tahun_${i}`]}
                        </td>
                      ))}
                      <td>{item.baseline}</td>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <td key={`target_${i}`}>{item[`target_tahun_${i}`]}</td>
                      ))}
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="info"
                            onClick={() => toggleExpandRow(item.id)}
                          >
                            {expandedRowId === item.id ? "Tutup" : "Detail"}
                          </Button>
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() =>
                              navigate(
                                `/dashboard-rpjmd/indikator-tujuan-edit/${item.id}`
                              )
                            }
                          >
                            Ubah
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(item.id)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {expandedRowId === item.id && (
                      <tr>
                        <td colSpan="15">
                          <div className="bg-light p-3 rounded">
                            <p>
                              <strong>Jenis:</strong> {item.jenis}
                            </p>
                            <p>
                              <strong>Jenis Indikator:</strong>{" "}
                              {item.jenis_indikator}
                            </p>
                            <p>
                              <strong>Tolok Ukur:</strong>{" "}
                              {item.tolok_ukur_kinerja}
                            </p>
                            <p>
                              <strong>Definisi Operasional:</strong>{" "}
                              {item.definisi_operasional}
                            </p>
                            <p>
                              <strong>Metode Penghitungan:</strong>{" "}
                              {item.metode_penghitungan}
                            </p>
                            <p>
                              <strong>Kriteria Kuantitatif:</strong>{" "}
                              {item.kriteria_kuantitatif}
                            </p>
                            <p>
                              <strong>Kriteria Kualitatif:</strong>{" "}
                              {item.kriteria_kualitatif}
                            </p>
                            <p>
                              <strong>Sumber Data:</strong> {item.sumber_data}
                            </p>
                            <p>
                              <strong>Nama OPD:</strong>{" "}
                              {item.opdPenanggungJawab?.nama_opd ||
                                "Tidak tersedia"}
                            </p>
                            <p>
                              <strong>Keterangan:</strong> {item.keterangan}
                            </p>
                            <p>
                              <strong>Rekomendasi:</strong>{" "}
                              {item.rekomendasi_ai}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
};

export default IndikatorTujuanNestedView;
