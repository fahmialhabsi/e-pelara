// src/shared/components/SasaranList.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  Button,
  Card,
  Alert,
  Tooltip,
  OverlayTrigger,
  Modal,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Pagination,
  Container,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { CSVLink } from "react-csv";

import { BsInfoCircle } from "react-icons/bs";
import api from "@/services/api";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useAuth } from "@/hooks/useAuth";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import SasaranForm from "./SasaranForm";
import {
  generateExportDataFromGroupedList,
  exportToExcel,
  exportToPDF,
  exportToCSV,
  groupDataForCSV,
  generateExportDataForCSV,
} from "@/shared/components/utils/exportHelpers";
import { getInstansiNama } from "@/shared/components/utils/getInstansiNama";
import ExportDropdown from "@/shared/components/ExportDropdown";
import {
  extractListData,
  extractListMeta,
  normalizeListItems,
} from "@/utils/apiResponse";

const highlightText = (text, keyword) => {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <span
        key={i}
        style={{ backgroundColor: "lightgreen", fontWeight: "bold" }}
      >
        {part}
      </span>
    ) : (
      part
    )
  );
};

export default function SasaranList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dokumen, tahun } = usePeriodeAktif();
  const [darkMode, setDarkMode] = useDarkMode();
  const matchRefs = useRef([]);

  const [sasaranList, setSasaranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [periodeIdValid, setPeriodeIdValid] = useState(null);
  const [periodeList, setPeriodeList] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const tahunJudul = tahun || dokumen?.tahun || new Date().getFullYear();

  const extractors = {
    groupKey: (item) => item.Tujuan?.id ?? "NO_TUJUAN_ID",
    groupValue: (item) => ({
      kode: item.Tujuan?.no_tujuan ?? "NO_KODE_TUJUAN",
      isi: item.Tujuan?.isi_tujuan ?? "NO_ISI_TUJUAN",
    }),
    itemValue: (item) => ({
      kode: item.nomor ?? "NO_KODE_SASARAN",
      isi: item.isi_sasaran ?? "NO_ISI_SASARAN",
    }),
  };

  const flatData = generateExportDataFromGroupedList(sasaranList, extractors);
  const groupedData = groupDataForCSV(sasaranList, extractors);
  const csvData = generateExportDataForCSV(groupedData);

  // Group dan flatten data untuk CSV
  const handleExportCSV = () => {
    const grouped = groupDataForCSV(sasaranList, {
      groupKey: (item) => item.Tujuan.id,
      groupValue: (item) => ({
        kode: item.Tujuan.no_tujuan,
        isi: item.Tujuan.isi_tujuan,
      }),
      itemValue: (item) => ({
        kode: item.nomor,
        isi: item.isi_sasaran,
      }),
    });

    const flatData = generateExportDataForCSV(grouped);

    exportToCSV({
      data: flatData,
      filename: `sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}.csv`,
      judul,
      subjudul,
      pembuat,
    });
  };

  const instansiNama = getInstansiNama(user);
  const dibuatOleh = user?.username?.toUpperCase() || "-";
  const jenis_dokumen = dokumen?.jenis?.toUpperCase() || "RPJMD";

  const judul = `DAFTAR SASARAN RPJMD TAHUN ${tahunJudul}`;
  const subjudul = `Nama Instansi : ${instansiNama}`;
  const pembuat = dibuatOleh;

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const fetchPeriode = async () => {
      try {
        const res = await api.get("/periode-rpjmd");
        const periodeData = extractListData(res.data);
        setPeriodeList(periodeData);
        const valid = periodeData.some(
          (p) =>
            Number(user?.tahun) >= Number(p.tahun_awal) &&
            Number(user?.tahun) <= Number(p.tahun_akhir)
        );
        setPeriodeIdValid(valid);
      } catch (err) {
        console.error("Periode fetch error:", err);
        setPeriodeIdValid(false);
      }
    };
    if (user?.tahun) fetchPeriode();
  }, [user]);

  const fetchSasaran = useCallback(async () => {
    setLoading(true);
    try {
      console.log("👤 user:", user);
      console.log("📦 dokumen:", dokumen);

      const res = await api.get("/sasaran", {
        params: {
          page,
          limit,
          search: searchQuery,
          jenis_dokumen: dokumen,
          tahun,
        },
      });

      console.log("📄 Respons /sasaran:", res.data);

      const list = normalizeListItems(res.data);
      const meta = extractListMeta(res.data);

      const keyword = searchQuery.toLowerCase().trim();
      const matched = [];
      const others = [];

      list.forEach((item) => {
        const isi = item.isi_sasaran?.toLowerCase() || "";
        if (keyword && isi.includes(keyword)) {
          matched.push(item);
        } else {
          others.push(item);
        }
      });

      const sortedList = [...matched, ...others];
      setSasaranList(sortedList);
      setTotalPages(meta.totalPages || 1);

      if (keyword && matched.length === 0) {
        setErrorMsg("Tidak ada yang cocok dengan pencarian.");
      } else {
        setErrorMsg("");
      }

      return sortedList;
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMsg("Gagal memuat data Sasaran.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, dokumen, tahun]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    matchRefs.current = [];
    fetchSasaran().then((data) => {
      const keyword = searchQuery.toLowerCase().trim();
      const targetRef = matchRefs.current.find((ref) =>
        ref?.text?.toLowerCase().includes(keyword)
      );
      if (targetRef?.element) {
        targetRef.element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      // Tambahkan debug log di sini
      const grouped = groupDataForCSV(data, extractors);
      console.log("✅ Grouped for rendering:", grouped);
    });
  }, [fetchSasaran]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAdd = () => {
    setSelected(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setSelected(item);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus data ini?")) return;
    try {
      await api.delete(`/sasaran/${id}`);
      fetchSasaran();
    } catch (err) {
      alert("Gagal menghapus data.");
    }
  };

  const handleSave = () => {
    setShowModal(false);
    fetchSasaran();
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: flatData,
      filename: `sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}.xlsx`,
      judul,
      subjudul,
      pembuat,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      data: flatData,
      filename: `sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}.pdf`,
      judul,
      subjudul,
      pembuat,
    });
  };

  if (periodeIdValid === false) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          Tahun login tidak sesuai periode RPJMD. Silakan login ulang atau
          hubungi admin.
        </Alert>
      </Container>
    );
  }

  if (periodeIdValid === null || loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className={darkMode ? "dark-mode" : ""}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Sasaran RPJMD</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-2 mb-4">
        <Card.Body>
          <Card.Title>Daftar Sasaran RPJMD</Card.Title>

          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <InputGroup style={{ maxWidth: 300 }}>
              <Form.Control
                placeholder="Cari isi sasaran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPage(1)}
              />
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setPage(1);
                  fetchSasaran();
                }}
              >
                Cari
              </Button>
            </InputGroup>

            <Button variant="success" onClick={handleAdd}>
              Tambah Sasaran
            </Button>

            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Tambah atau ubah sasaran RPJMD</Tooltip>}
            >
              <Button variant="info">
                <BsInfoCircle />
              </Button>
            </OverlayTrigger>

            <ExportDropdown
              rawData={sasaranList}
              extractors={extractors}
              judul={judul}
              subjudul={subjudul}
              pembuat={pembuat}
              filename={`sasaran_${jenis_dokumen.toLowerCase()}_${tahunJudul}`}
            />

            <Button
              variant={darkMode ? "dark" : "light"}
              onClick={() => setDarkMode((d) => !d)}
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>

          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Kode</th>
                <th>Uraian Tujuan/Sasaran</th>
              </tr>
            </thead>
            <tbody>
              {sasaranList.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center text-danger">
                    {searchQuery
                      ? "Tidak ada yang cocok dengan pencarian."
                      : "Tidak ada data sasaran."}
                  </td>
                </tr>
              ) : (
                flatData.map(
                  (item, index) => {
                    let level = 0;
                    if (item.kode.startsWith("T")) level = 1;
                    if (item.kode.startsWith("ST")) level = 2;

                    const indent = {
                      paddingLeft: `${level * 16}px`,
                      fontWeight:
                        level === 0 ? "bold" : level === 1 ? "600" : "normal",
                    };

                    // Cek jika ini Sasaran, maka cari item aslinya
                    const isSasaran = level === 2;
                    const s = isSasaran
                      ? sasaranList.find((d) => d.nomor === item.kode)
                      : null;

                    const isi = item.isi?.toLowerCase?.() ?? "";
                    const keyword = searchQuery.toLowerCase();
                    const match = keyword && isi.includes(keyword);

                    return (
                      <tr
                        key={`${item.kode}-${index}`}
                        ref={(el) => {
                          if (match && isSasaran && s) {
                            matchRefs.current.push({
                              element: el,
                              text: item.isi,
                            });
                          }
                        }}
                      >
                        <td>{item.kode}</td>
                        <td style={indent}>
                          {highlightText(item.isi, searchQuery)}

                          {/* Jika ini baris Sasaran, tampilkan tombol */}
                          {isSasaran && s && (
                            <div className="mt-2">
                              <Button
                                size="sm"
                                className="me-2"
                                onClick={() => handleEdit(s)}
                              >
                                Ubah
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDelete(s.id)}
                              >
                                Hapus
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </Table>

          <Pagination className="justify-content-center">
            <Pagination.First
              disabled={page === 1}
              onClick={() => setPage(1)}
            />
            <Pagination.Prev
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            />
            {Array.from({ length: totalPages }, (_, i) => (
              <Pagination.Item
                key={i + 1}
                active={page === i + 1}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            />
            <Pagination.Last
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            />
          </Pagination>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selected ? "Edit Sasaran" : "Tambah Sasaran"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SasaranForm
            key={formKey}
            existingData={selected}
            onSubmitSuccess={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
}
