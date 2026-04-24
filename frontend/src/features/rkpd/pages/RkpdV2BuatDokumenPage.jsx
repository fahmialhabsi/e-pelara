import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Button, Form, Spinner, Alert } from "react-bootstrap";
import fetchWithLog from "../../../utils/fetchWithLog";
import { useDokumen } from "../../../hooks/useDokumen";
import { usePeriodeAktif } from "../../rpjmd/hooks/usePeriodeAktif";
import { canManagePlanningWorkflow } from "../../../utils/roleUtils";
import { useAuth } from "../../../hooks/useAuth";
import { createRkpdDokumenV2 } from "../services/planningRkpdV2Api";
import RkpdDashboardLayout from "./RkpdDashboardLayout";

const RkpdV2BuatDokumenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tahun } = useDokumen();
  const { periode_id: periodeAktif } = usePeriodeAktif();
  const can = canManagePlanningWorkflow(user?.role);

  const [periodeList, setPeriodeList] = useState([]);
  const [periodeId, setPeriodeId] = useState("");
  const [tahunVal, setTahunVal] = useState(String(tahun || ""));
  const [judul, setJudul] = useState("");
  const [createReasonText, setCreateReasonText] = useState("");
  const [createReasonFile, setCreateReasonFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchWithLog("/periode-rpjmd", {}, setPeriodeList);
  }, []);

  useEffect(() => {
    if (periodeAktif && !periodeId) {
      setPeriodeId(String(periodeAktif));
    }
  }, [periodeAktif, periodeId]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!periodeId || !tahunVal.trim() || !judul.trim()) {
      setErr("Periode, tahun, dan judul wajib.");
      return;
    }
    const rt = createReasonText.trim();
    const rf = createReasonFile.trim();
    if (!rt && !rf) {
      setErr("Isi alasan pembuatan dokumen (teks) atau referensi berkas.");
      return;
    }
    setBusy(true);
    try {
      const row = await createRkpdDokumenV2({
        periode_id: Number(periodeId),
        tahun: Number(tahunVal),
        judul: judul.trim(),
        status: "draft",
        change_reason_text: rt || undefined,
        change_reason_file: rf || undefined,
      });
      const id = row?.id;
      if (!id) throw new Error("Respons tidak berisi id dokumen.");
      navigate(`/dashboard-rkpd/v2/dokumen/${id}`);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex.message || "Gagal membuat dokumen.");
    } finally {
      setBusy(false);
    }
  };

  if (!can) {
    return (
      <RkpdDashboardLayout>
        <Alert variant="danger">Anda tidak punya akses menulis dokumen RKPD v2.</Alert>
      </RkpdDashboardLayout>
    );
  }

  return (
    <RkpdDashboardLayout>
      <h4 className="fw-bold text-primary mb-3">Buat dokumen RKPD (v2)</h4>
      <p className="small text-muted">
        Domain: <code>rkpd_dokumen</code>. Ini <strong>bukan</strong> entri tabel RKPD legacy di
        accordion dashboard.
      </p>
      {err && <Alert variant="warning">{err}</Alert>}
      <Card className="shadow-sm">
        <CardBody>
          <Form onSubmit={submit}>
            <Form.Group className="mb-3">
              <Form.Label>Periode RPJMD</Form.Label>
              <Form.Select
                value={periodeId}
                onChange={(e) => setPeriodeId(e.target.value)}
                required
              >
                <option value="">— pilih —</option>
                {periodeList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.tahun_awal}–{p.tahun_akhir})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tahun anggaran</Form.Label>
              <Form.Control
                value={tahunVal}
                onChange={(e) => setTahunVal(e.target.value)}
                placeholder="2026"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Judul dokumen</Form.Label>
              <Form.Control
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="RKPD Provinsi …"
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small">Alasan pembuatan dokumen (wajib salah satu)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={createReasonText}
                onChange={(e) => setCreateReasonText(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small">Referensi berkas</Form.Label>
              <Form.Control
                value={createReasonFile}
                onChange={(e) => setCreateReasonFile(e.target.value)}
                placeholder="path / URL / nama berkas"
              />
            </Form.Group>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Spinner size="sm" className="me-1" /> Menyimpan…
                </>
              ) : (
                "Simpan & lanjut isi item"
              )}
            </Button>
          </Form>
        </CardBody>
      </Card>
    </RkpdDashboardLayout>
  );
};

export default RkpdV2BuatDokumenPage;
