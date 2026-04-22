// src/shared/components/GlobalDokumenTahunPickerModal.jsx
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useDokumen } from "../../hooks/useDokumen";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { extractListData } from "../../utils/apiResponse";
import {
  isDokumenLevelPeriode,
  pickAnchorPeriodeFromList,
} from "../../utils/planningDokumenUtils";

const jenisToPath = {
  rpjmd: "/dashboard-rpjmd",
  renstra: "/dashboard-renstra",
  rkpd: "/dashboard-rkpd",
  renja: "/dashboard-renja",
  rka: "/dashboard-rka",
  dpa: "/dashboard-dpa",
  pengkeg: "/dashboard-pengelolaan",
  monev: "/dashboard-monev",
  "lpk-dispang": "/dashboard-lpk",
  "lk-dispang": "/dashboard-lk",
  lakip: "/dashboard-lakip",
  clonedata: "/clone-periode",
};

const tahunList = ["2025", "2026", "2027", "2028", "2029"];

export default function GlobalDokumenTahunPickerModal({ forceOpen }) {
  const { dokumen, tahun, setDokumen, setTahun } = useDokumen();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localDok, setLocalDok] = useState("");
  const [localThn, setLocalThn] = useState("");
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const dokLower = (dokumen || user?.jenis_dokumen || "").toLowerCase();
    const periodeLevel = isDokumenLevelPeriode(dokLower);
    const needsYear = dokLower && !periodeLevel;
    const initialShow =
      forceOpen || !dokumen || (needsYear && !tahun);

    // auto-set kalau sudah ada di user
    if (!dokumen && user?.jenis_dokumen) {
      setDokumen(user.jenis_dokumen.toLowerCase());
    }
    if (!tahun && user?.tahun && !periodeLevel) {
      setTahun(String(user.tahun));
    }

    setLocalDok(dokumen || user?.jenis_dokumen?.toLowerCase() || "");
    setLocalThn(tahun || String(user?.tahun || ""));
    setShow(initialShow);
  }, [dokumen, tahun, forceOpen, user, setDokumen, setTahun]);

  useEffect(() => {
    if (!user?.token) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/dokumen-options", {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data");
        return res.json();
      })
      .then((data) => {
        const parsedOptions = Array.isArray(data)
          ? data.map((item) =>
              typeof item === "string"
                ? { value: item.toLowerCase(), label: item }
                : item
            )
          : [];
        setOptions(parsedOptions);
      })
      .catch((err) => {
        console.error("❌ Gagal mengambil dokumen-options:", err);
        setOptions([]);
      })
      .finally(() => setLoading(false));
  }, [user?.token]);

  useEffect(() => {
    const dok = dokumen?.toLowerCase();
    const thn = tahun;
    const path = jenisToPath[dok] || "/";

    if (shouldRedirect && dok === localDok && thn === localThn) {
      navigate(path, { replace: true });
      setShow(false);
      setShouldRedirect(false);
    }
  }, [dokumen, tahun, shouldRedirect, localDok, localThn]);

  return (
    <Modal
      show={show}
      onHide={() => !forceOpen && setShow(false)}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Form
        onSubmit={async (e) => {
          e.preventDefault();

          const cleanedDok = (localDok || "").trim().toLowerCase();
          const periodeLevel = isDokumenLevelPeriode(cleanedDok);
          let thn = localThn;

          if (periodeLevel) {
            try {
              const res = await api.get("/periode-rpjmd");
              const list = extractListData(res.data);
              const pick = pickAnchorPeriodeFromList(list, user);
              if (pick?.tahun_awal != null) {
                thn = String(pick.tahun_awal);
              }
            } catch (err) {
              console.error("Gagal mengambil periode RPJMD:", err);
            }
            if (!thn) return;
          }

          setDokumen(cleanedDok);
          setTahun(thn);

          const path = jenisToPath[cleanedDok] || "/";
          navigate(path, { replace: true });

          setShow(false);
        }}
      >
        <Modal.Header closeButton={!forceOpen}>
          <Modal.Title>
            {isDokumenLevelPeriode(localDok)
              ? "Pilih Dokumen"
              : "Pilih dokumen & konteks waktu"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Jenis Dokumen</Form.Label>
                <Form.Select
                  value={localDok}
                  onChange={(e) => setLocalDok(e.target.value)}
                  required
                >
                  <option value="">Pilih Dokumen...</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              {isDokumenLevelPeriode(localDok) ? (
                <p className="text-muted small mb-0">
                  RPJMD dan Renstra berlaku untuk satu periode berjalan. Parameter internal
                  mengikuti rentang periode aktif Anda — tidak ada pemilihan angka terpisah di
                  luar periode.
                </p>
              ) : (
                <Form.Group className="mb-2">
                  <Form.Label>Konteks waktu</Form.Label>
                  <Form.Select
                    value={localThn}
                    onChange={(e) => setLocalThn(e.target.value)}
                    required
                  >
                    <option value="">Pilih konteks waktu…</option>
                    {tahunList.map((th) => (
                      <option key={th} value={th}>
                        {th}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!forceOpen && (
            <Button variant="secondary" onClick={() => setShow(false)}>
              Batal
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={
              loading ||
              !localDok ||
              (!isDokumenLevelPeriode(localDok) && !localThn)
            }
          >
            Simpan
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
