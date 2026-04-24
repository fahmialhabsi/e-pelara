import React, { useEffect, useState } from "react";
import api from "../services/api";
import { extractListData } from "../utils/apiResponse";
import { toast } from "react-toastify";
import { Modal, Button, Form, Spinner, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const ClonePeriodePage = () => {
  const [periodes, setPeriodes] = useState([]);
  const [fromPeriode, setFromPeriode] = useState("");
  const [toPeriode, setToPeriode] = useState("");
  const [includeItems, setIncludeItems] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // const [showModal, setShowModal] = useState(false);

  const items = [
    "tujuan",
    "sasaran",
    "strategi",
    "arah_kebijakan",
    "program",
    "kegiatan",
    "sub_kegiatan",
  ];

  useEffect(() => {
    api
      .get("/periode-rpjmd")
      .then((res) => {
        const rows = extractListData(res.data);
        setPeriodes(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        setPeriodes([]);
        toast.error("Gagal memuat data periode");
      });
  }, []);

  const handleCheckbox = (item) => {
    setIncludeItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleLihatHasil = () => {
    navigate("/clone-periode/hasil");
  };

  const handleClone = async () => {
    if (!fromPeriode || !toPeriode) {
      toast.error("Pilih periode asal dan tujuan");
      return;
    }
    if (String(fromPeriode) === String(toPeriode)) {
      toast.error("Periode asal dan periode tujuan tidak boleh sama");
      return;
    }
    const include = Object.keys(includeItems).filter(
      (key) => includeItems[key]
    );
    if (include.length === 0) {
      toast.error("Pilih minimal satu jenis data untuk dikloning");
      return;
    }

    try {
      setLoading(true);
      await api.post("/clone-periode", {
        from_periode_id: fromPeriode,
        to_periode_id: toPeriode,
        include,
      });
      toast.success("Berhasil mengkloning data antar periode");
      // setShowModal(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Gagal mengkloning data"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 mx-auto" style={{ maxWidth: 800 }}>
      <Card.Body>
        <Card.Title className="mb-4">Clone Data Antar Periode RPJMD</Card.Title>

        <Form.Group className="mb-3">
          <Form.Label>Periode Asal</Form.Label>
          <Form.Select
            value={fromPeriode}
            onChange={(e) => setFromPeriode(e.target.value)}
          >
            <option value="">Pilih Periode Asal</option>
            {(Array.isArray(periodes) ? periodes : []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.tahun_awal} - {p.tahun_akhir})
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Periode Tujuan</Form.Label>
          <Form.Select
            value={toPeriode}
            onChange={(e) => setToPeriode(e.target.value)}
          >
            <option value="">Pilih Periode Tujuan</option>
            {(Array.isArray(periodes) ? periodes : []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.tahun_awal} - {p.tahun_akhir})
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Jenis Data yang Dikloning</Form.Label>
          <div className="row">
            {items.map((item) => (
              <div key={item} className="col-6 mb-2">
                <Form.Check
                  type="checkbox"
                  id={item}
                  label={item.replace(/_/g, " ").toUpperCase()}
                  checked={!!includeItems[item]}
                  onChange={() => handleCheckbox(item)}
                />
              </div>
            ))}
          </div>
        </Form.Group>

        <Button
          variant="primary"
          onClick={handleClone}
          disabled={loading}
          className="w-100"
        >
          {loading ? "Mengkloning..." : "Kloning Periode Sekarang"}
        </Button>

        <Button
          variant="secondary"
          onClick={handleLihatHasil}
          className="w-100 mt-2"
        >
          Lihat Hasil Cloning
        </Button>
      </Card.Body>
    </Card>
  );
};

export default ClonePeriodePage;
