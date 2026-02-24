import React, { useState, useEffect, useCallback } from "react";
import {
  Accordion,
  Button,
  Card,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Container,
  Modal,
  Alert,
} from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../services/api";
import { usePeriode } from "@/contexts/PeriodeContext";
import KegiatanForm from "./KegiatanForm";
import KegiatanNestedView from "./KegiatanNestedView";

export default function KegiatanList() {
  const { id: periodeId, loading: periodeLoading, tahun_awal } = usePeriode();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selData, setSelData] = useState(null);
  const [delId, setDelId] = useState(null);
  const [showDel, setShowDel] = useState(false);

  const fetchData = useCallback(async () => {
    if (!periodeId || !tahun_awal) return;
    setLoading(true);
    try {
      const res = await api.get("/kegiatan", {
        params: {
          periode_id: periodeId,
          tahun: tahun_awal,
          jenis_dokumen: "rpjmd",
        },
      });
      setData(res.data.data || []);
      setError("");
    } catch {
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [periodeId, tahun_awal]);

  useEffect(() => {
    if (!periodeLoading) fetchData();
  }, [fetchData, periodeLoading]);

  useEffect(() => {
    const handler = setTimeout(() => setSearch(searchInput), 700);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const confirmDelete = (id) => {
    setDelId(id);
    setShowDel(true);
  };

  const doDelete = async () => {
    try {
      await api.delete(`/kegiatan/${delId}`);
      setShowDel(false);
      fetchData();
      toast.success("✅ Kegiatan berhasil dihapus.");
    } catch {
      toast.error("❌ Gagal menghapus kegiatan.");
    }
  };

  const openForm = (item = null) => {
    setSelData(item);
    setShowForm(true);
  };

  const groupByNested = () => {
    const grouped = {};
    for (const item of data) {
      const tujuan = item.program?.sasaran?.Tujuan;
      const sasaran = item.program?.sasaran;
      const program = item.program;

      if (!tujuan) continue;

      if (!grouped[tujuan.id]) {
        grouped[tujuan.id] = {
          ...tujuan,
          sasarans: {},
        };
      }

      if (sasaran && !grouped[tujuan.id].sasarans[sasaran.id]) {
        grouped[tujuan.id].sasarans[sasaran.id] = {
          ...sasaran,
          programs: {},
        };
      }

      if (
        program &&
        sasaran &&
        !grouped[tujuan.id].sasarans[sasaran.id].programs[program.id]
      ) {
        grouped[tujuan.id].sasarans[sasaran.id].programs[program.id] = {
          ...program,
          kegiatans: [],
        };
      }

      if (
        program &&
        sasaran &&
        grouped[tujuan.id].sasarans[sasaran.id].programs[program.id]
      ) {
        grouped[tujuan.id].sasarans[sasaran.id].programs[
          program.id
        ].kegiatans.push(item);
      }
    }
    return grouped;
  };

  if (periodeLoading || loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const nestedData = groupByNested();
  const filteredData = data.filter((k) =>
    k.nama_kegiatan?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container className="mt-4">
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => window.history.back()}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Kegiatan</Breadcrumb.Item>
      </Breadcrumb>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      <Card.Body>
        <Card.Title className="mb-3">Daftar Kegiatan (Nested)</Card.Title>

        <div className="d-flex flex-wrap align-items-center mb-3">
          <InputGroup style={{ maxWidth: 300 }} className="me-2">
            <Form.Control
              placeholder="Cari nama kegiatan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <Button variant="outline-dark" onClick={() => setSearchInput("")}>
                ×
              </Button>
            )}
          </InputGroup>
          <Button variant="primary" className="me-2" onClick={() => openForm()}>
            <FaPlus className="me-1" /> Tambah
          </Button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <KegiatanNestedView
          data={filteredData}
          onEdit={(item) => openForm(item)}
          onDelete={(id) => confirmDelete(id)}
        />
      </Card.Body>

      {/* Modal Tambah/Edit */}
      <Modal
        show={showForm}
        onHide={() => setShowForm(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selData ? "Edit Kegiatan" : "Tambah Kegiatan"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <KegiatanForm
            existingData={selData}
            onSubmitSuccess={() => {
              setShowForm(false);
              fetchData();
            }}
          />
        </Modal.Body>
      </Modal>

      {/* Modal Hapus */}
      <Modal show={showDel} onHide={() => setShowDel(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Hapus Data</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>Yakin ingin menghapus kegiatan ini?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDel(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={doDelete}>
            <FaTrash className="me-1" /> Hapus
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
