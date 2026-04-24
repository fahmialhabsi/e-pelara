import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Button, Form, Spinner, Alert } from "react-bootstrap";
import { useDokumen } from "../../../hooks/useDokumen";
import { usePeriodeAktif } from "../../rpjmd/hooks/usePeriodeAktif";
import { useAuth } from "../../../hooks/useAuth";
import { canManagePlanningWorkflow } from "../../../utils/roleUtils";
import {
  fetchReferensiBuatDokumenRenja,
  createRenjaDokumenV2,
} from "../services/planningRenjaApi";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";

const RenjaBuatDokumenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tahun } = useDokumen();
  const { periode_id: periodeAktif } = usePeriodeAktif();
  const can = canManagePlanningWorkflow(user?.role);

  const [ref, setRef] = useState(null);
  const [loadingRef, setLoadingRef] = useState(true);
  const [periodeId, setPeriodeId] = useState("");
  const [tahunVal, setTahunVal] = useState(String(tahun || ""));
  const [pdId, setPdId] = useState("");
  const [renstraId, setRenstraId] = useState("");
  const [rkpdId, setRkpdId] = useState("");
  const [judul, setJudul] = useState("");
  const [createReasonText, setCreateReasonText] = useState("");
  const [createReasonFile, setCreateReasonFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoadingRef(true);
      try {
        const data = await fetchReferensiBuatDokumenRenja({
          tahun: tahunVal || undefined,
          periode_id: periodeId || periodeAktif || undefined,
        });
        if (ok) setRef(data);
      } catch (e) {
        if (ok) setErr(e?.response?.data?.message || e.message || "Gagal referensi.");
      } finally {
        if (ok) setLoadingRef(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [tahunVal, periodeId, periodeAktif]);

  useEffect(() => {
    if (periodeAktif && !periodeId) setPeriodeId(String(periodeAktif));
  }, [periodeAktif, periodeId]);

  const renstraFiltered = useMemo(() => {
    const list = ref?.renstraPdDokumen || [];
    if (!pdId) return list;
    return list.filter((r) => String(r.perangkat_daerah_id) === String(pdId));
  }, [ref, pdId]);

  const rkpdFiltered = useMemo(() => {
    const list = ref?.rkpdDokumen || [];
    if (!tahunVal) return list;
    return list.filter((k) => String(k.tahun) === String(tahunVal));
  }, [ref, tahunVal]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!periodeId || !tahunVal || !pdId || !renstraId || !judul.trim()) {
      setErr("Periode, tahun, PD, Renstra PD, dan judul wajib.");
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
      const body = {
        periode_id: Number(periodeId),
        tahun: Number(tahunVal),
        perangkat_daerah_id: Number(pdId),
        renstra_pd_dokumen_id: Number(renstraId),
        rkpd_dokumen_id: rkpdId ? Number(rkpdId) : null,
        judul: judul.trim(),
        status: "draft",
        change_reason_text: rt || undefined,
        change_reason_file: rf || undefined,
      };
      const row = await createRenjaDokumenV2(body);
      const id = row?.id;
      if (!id) throw new Error("Tidak ada id dokumen.");
      navigate(`/dashboard-renja/v2/dokumen/${id}`);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex.message || "Gagal membuat dokumen.");
    } finally {
      setBusy(false);
    }
  };

  if (!can) {
    return (
      <RenjaPlanningDashboardLayout>
        <Alert variant="danger">Tidak ada akses menulis dokumen Renja.</Alert>
      </RenjaPlanningDashboardLayout>
    );
  }

  return (
    <RenjaPlanningDashboardLayout>
      <h4 className="fw-bold text-success mb-2">Buat dokumen Renja (v2)</h4>
      <p className="small text-muted">
        POST <code>/api/renja/dokumen</code> — pilih PD, Renstra PD, dan (opsional) RKPD
        acuan.
      </p>
      <Alert variant="info" className="small">
        <strong>Data yang Anda lihat di sini adalah data operasional dari basis data</strong> ({" "}
        <code>perangkat_daerah</code>, <code>renstra_pd_dokumen</code>, <code>rkpd_dokumen</code>
        ). Baris yang terdeteksi sebagai uji/smoke (mis. kode <code>SMOKE</code>, judul berisi{" "}
        <code>(api test)</code>) <strong>disembunyikan</strong> dari dropdown agar tidak tercampur
        dengan data resmi. Pengembangan dapat memakai query param <code>include_test=1</code> pada
        API referensi.
      </Alert>
      <Alert variant="secondary" className="small">
        <strong>Output yang dihasilkan modul ini</strong> adalah{" "}
        <em>preview data perencanaan internal</em> (metadata + tabel item),{" "}
        <strong>bukan</strong> dokumen Renja OPD resmi sesuai pedoman/bab. Ekspor Word/PDF dari
        halaman dokumen juga berlabel preview internal.
      </Alert>
      {err && <Alert variant="warning">{err}</Alert>}
      <Card>
        <CardBody>
          {loadingRef ? (
            <Spinner />
          ) : (
            <Form onSubmit={submit}>
              <Form.Group className="mb-2">
                <Form.Label>Periode ID</Form.Label>
                <Form.Control
                  value={periodeId}
                  onChange={(e) => setPeriodeId(e.target.value)}
                  placeholder="ID periode RPJMD"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Tahun</Form.Label>
                <Form.Control
                  value={tahunVal}
                  onChange={(e) => setTahunVal(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Perangkat daerah</Form.Label>
                <Form.Select value={pdId} onChange={(e) => setPdId(e.target.value)} required>
                  <option value="">— pilih PD —</option>
                  {(ref?.perangkatDaerah || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kode ? `${p.kode} — ` : ""}
                      {p.nama}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Renstra PD</Form.Label>
                <Form.Select
                  value={renstraId}
                  onChange={(e) => setRenstraId(e.target.value)}
                  required
                >
                  <option value="">— pilih —</option>
                  {renstraFiltered.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id} {r.judul}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>RKPD dokumen (opsional)</Form.Label>
                <Form.Select value={rkpdId} onChange={(e) => setRkpdId(e.target.value)}>
                  <option value="">— tidak ada —</option>
                  {rkpdFiltered.map((k) => (
                    <option key={k.id} value={k.id}>
                      #{k.id} · th {k.tahun} · {k.judul}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Judul</Form.Label>
                <Form.Control
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
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
                {busy ? <Spinner size="sm" /> : "Simpan & kelola item"}
              </Button>
            </Form>
          )}
        </CardBody>
      </Card>
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaBuatDokumenPage;
