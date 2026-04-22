import React, { useEffect, useState } from "react";
import { useDokumen } from "../../hooks/useDokumen";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Form, Button, Spinner } from "react-bootstrap";
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
  "lpk-dispang": "/dashboard-lpk-dispang",
  "lk-dispang": "/dashboard-lk-dispang",
  lakip: "/dashboard-lakip",
  clonedata: "/clone-periode",
};

export default function GlobalDokumenTahunPicker() {
  const { dokumen, tahun, setDokumen, setTahun } = useDokumen();
  const { user } = useAuth();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localDok, setLocalDok] = useState(dokumen || "");
  const [localThn, setLocalThn] = useState(tahun || "");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.token) return;
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
      .then((data) => setOptions(Array.isArray(data) ? data : []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [user?.token]);

  async function handleSubmit(e) {
    e.preventDefault();
    const dok = localDok.toLowerCase();
    const periodeLevel = isDokumenLevelPeriode(dok);
    let thn = localThn;
    if (!dok) return;
    if (periodeLevel) {
      try {
        const res = await api.get("/periode-rpjmd");
        const list = extractListData(res.data);
        const pick = pickAnchorPeriodeFromList(list, user);
        if (pick?.tahun_awal != null) thn = String(pick.tahun_awal);
      } catch {
        /* handled below */
      }
      if (!thn) return;
    } else if (!thn) return;

    setDokumen(dok);
    setTahun(thn);

    const path = jenisToPath[dok] || "/";
    navigate(path, { replace: true });
  }

  useEffect(() => {
    const dok = localDok.toLowerCase();
    const thn = localThn;
    const path = jenisToPath[dok] || "/";

    if (submitting && dokumen?.toLowerCase() === dok && tahun === thn) {
      navigate(path, { replace: true });
      setSubmitting(false);
    }
  }, [dokumen, tahun, submitting, localDok, localThn, navigate]);

  return (
    <Form
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 8,
      }}
      onSubmit={handleSubmit}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <>
          <Form.Select
            size="sm"
            value={localDok}
            onChange={(e) => setLocalDok(e.target.value)}
            style={{ maxWidth: 160 }}
          >
            <option value="">Pilih Dokumen</option>
            {options.map((o) => (
              <option key={o.value} value={o.value.toLowerCase()}>
                {o.label}
              </option>
            ))}
          </Form.Select>
          {!isDokumenLevelPeriode(localDok) ? (
            <Form.Select
              size="sm"
              value={localThn}
              onChange={(e) => setLocalThn(e.target.value)}
              style={{ maxWidth: 110 }}
            >
              <option value="">Konteks waktu</option>
              {[2025, 2026, 2027, 2028, 2029].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Form.Select>
          ) : null}
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={
              submitting ||
              loading ||
              !localDok ||
              (!isDokumenLevelPeriode(localDok) && !localThn)
            }
          >
            {submitting ? <Spinner size="sm" /> : "Masuk"}
          </Button>
        </>
      )}
    </Form>
  );
}
