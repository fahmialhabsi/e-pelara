// SubKegiatanList.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  Button,
  Card,
  Alert,
  Modal,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Pagination,
  Container,
} from "react-bootstrap";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../services/api";
import { usePeriode } from "@/contexts/PeriodeContext";
import SubKegiatanNestedView from "../components/SubKegiatanNestedView";

export default function SubKegiatanList() {
  const { id: periodeId, loading: periodeLoading, tahun_awal } = usePeriode();
  const [searchParams] = useSearchParams();
  const kegiatanId = searchParams.get("kegiatan_id");

  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const limit = 100;
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const highlightRef = useRef(null);
  const [delId, setDelId] = useState(null);
  const [showDel, setShowDel] = useState(false);
  const location = useLocation();

  const fetchData = useCallback(async () => {
    if (!periodeId || !tahun_awal) return;
    setLoading(true);
    try {
      const res = await api.get("/sub-kegiatan", {
        params: {
          periode_id: periodeId,
          tahun: tahun_awal,
          jenis_dokumen: "rpjmd",
          page,
          limit,
          ...(kegiatanId && { kegiatan_id: kegiatanId }),
        },
      });

      const mapped = res.data.data.data.map((item) => {
        return {
          ...item,
          kode_program: item.kegiatan?.program?.kode_program ?? "-",
          nama_program: item.kegiatan?.program?.nama_program ?? "-",
          opd_penanggung_jawab:
            item.kegiatan?.program?.opd?.nama_opd ||
            item.kegiatan?.opd?.nama_opd ||
            item.nama_opd ||
            "-",
          bidang_opd_penanggung_jawab:
            item.kegiatan?.program?.opd?.nama_bidang_opd ||
            item.kegiatan?.opd?.nama_bidang_opd ||
            item.nama_bidang_opd ||
            "-",
          sub_bidang_opd_penanggung_jawab: item.sub_bidang_opd ?? "-",
          pagu_anggaran: item.pagu_anggaran,
          total_pagu_kegiatan: item.kegiatan?.total_pagu_anggaran ?? 0,
          total_pagu_program: item.kegiatan?.program?.total_pagu_anggaran ?? 0,
        };
      });

      setOriginalData(mapped || []);
      setError("");
    } catch (err) {
      console.error("❌ ERROR FETCHING SUB-KEGIATAN:", err);
      setError("Gagal memuat data sub-kegiatan.");
    } finally {
      setLoading(false);
    }
  }, [periodeId, tahun_awal, page, limit, kegiatanId]);

  useEffect(() => {
    if (!periodeLoading) fetchData();
  }, [fetchData, periodeLoading]);

  useEffect(() => {
    if (location.state?.reload) {
      fetchData();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const highlightText = (text, keyword) => {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, "gi");
    return text?.replace(regex, "<mark class='highlight-mark'>$1</mark>");
  };

  const filteredData =
    search.trim() === ""
      ? originalData
      : originalData
          .map((item) => ({
            ...item,
            isMatch:
              item.nama_sub_kegiatan
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
              item.kode_sub_kegiatan
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
              item.kegiatan?.nama_kegiatan
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
              item.kegiatan?.kode_kegiatan
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
              item.nama_program?.toLowerCase().includes(search.toLowerCase()) ||
              item.kode_program?.toLowerCase().includes(search.toLowerCase()),
          }))
          .filter((item) => item.isMatch);

  useEffect(() => {
    setData(filteredData);
  }, [search, originalData]);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [data]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((d, i) => ({
        No: i + 1 + (page - 1) * limit,
        Kode_Program: d.kode_program,
        Nama_Program: d.nama_program,
        Kode_Kegiatan: d.kegiatan?.kode_kegiatan,
        Nama_Kegiatan: d.kegiatan?.nama_kegiatan,
        Pagu_Anggaran: d.pagu_anggaran
          ? Number(d.pagu_anggaran).toLocaleString("id-ID")
          : "-",
        Total_Pagu_Kegiatan: d.total_pagu_kegiatan?.toLocaleString("id-ID"),
        Total_Pagu_Program: d.total_pagu_program?.toLocaleString("id-ID"),
        Kode_Sub: d.kode_sub_kegiatan,
        Nama_Sub: d.nama_sub_kegiatan,
        OPD: d.opd_penanggung_jawab,
        Bidang: d.bidang_opd_penanggung_jawab,
        Sub_Bidang: d.sub_bidang_opd_penanggung_jawab,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SubKegiatan");
    XLSX.writeFile(wb, "sub_kegiatan.xlsx");
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [
        [
          "#",
          "Kode Rekening",
          "Nama Sub Kegiatan",
          "Pagu",
          "Total Kegiatan",
          "Total Program",
          "Bidang",
        ],
      ],
      body: data.map((d, i) => [
        i + 1 + (page - 1) * limit,
        d.kode_sub_kegiatan,
        d.nama_sub_kegiatan,
        d.pagu_anggaran
          ? `Rp ${Number(d.pagu_anggaran).toLocaleString("id-ID")}`
          : "-",
        `Rp ${Number(d.total_pagu_kegiatan).toLocaleString("id-ID")}`,
        `Rp ${Number(d.total_pagu_program).toLocaleString("id-ID")}`,
        d.sub_bidang_opd_penanggung_jawab || "-",
      ]),
    });
    doc.save("sub_kegiatan.pdf");
  };

  const confirmDelete = (id) => {
    setDelId(id);
    setShowDel(true);
  };

  const doDelete = async () => {
    try {
      await api.delete(`/sub-kegiatan/${delId}`);
      setShowDel(false);
      fetchData();
    } catch {
      setError("Gagal menghapus data.");
    }
  };

  if (periodeLoading || loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="mt-4">
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => window.history.back()}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Sub‑Kegiatan</Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Card.Body>
          <Card.Title>Daftar Sub‑Kegiatan</Card.Title>
          <div className="d-flex flex-wrap align-items-center mb-3">
            <InputGroup style={{ maxWidth: 300 }} className="me-2 mb-2">
              <Form.Control
                placeholder="Cari kode/nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button onClick={() => setSearch("")}>Reset</Button>
            </InputGroup>

            <Button
              as={Link}
              to="/sub-kegiatan"
              variant="success"
              className="mb-2 me-2"
            >
              <FaPlus /> Tambah
            </Button>
            <Button variant="secondary" className="mb-2 me-2">
              <CSVLink data={data} filename="sub_kegiatan.csv">
                CSV
              </CSVLink>
            </Button>
            <Button
              variant="success"
              className="mb-2 me-2"
              onClick={exportExcel}
            >
              Excel
            </Button>
            <Button variant="danger" className="mb-2 me-2" onClick={exportPdf}>
              PDF
            </Button>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <SubKegiatanNestedView
            data={data}
            onEdit={(item) =>
              (window.location.href = `/sub-kegiatan/edit/${item.id}`)
            }
            onDelete={(id) => confirmDelete(id)}
          />

          {totalPages > 1 && (
            <Pagination className="justify-content-center">
              <Pagination.First
                disabled={page === 1}
                onClick={() => setPage(1)}
              />
              <Pagination.Prev
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
              />
              <Pagination.Last
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              />
            </Pagination>
          )}
        </Card.Body>
      </Card>

      <Modal show={showDel} onHide={() => setShowDel(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Hapus Data</Modal.Title>
        </Modal.Header>
        <Modal.Body>Yakin ingin menghapus data ini?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDel(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={doDelete}>
            Hapus
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
