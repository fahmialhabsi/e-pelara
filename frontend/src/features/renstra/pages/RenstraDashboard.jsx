// src/features/renstra/pages/RenstraDashboard.jsx
import { useEffect, useState } from "react";
import { Card, CardBody, Row, Col, Spinner } from "react-bootstrap";
import { useAuth } from "../../../hooks/useAuth";
import { useDokumen } from "../../../hooks/useDokumen";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import GenerateRenstraButton from "../components/GenerateRenstraButton";

/** Kartu & akses cepat — path mengarah ke daftar yang dipakai pengguna (tabel vs hierarki). */
const STAT_CONFIG = [
  { key: "tujuan",          label: "Tujuan",           color: "primary",   icon: "🎯", path: "/renstra/tabel/tujuan" },
  { key: "sasaran",         label: "Sasaran",          color: "success",   icon: "📌", path: "/renstra/tabel/sasaran" },
  { key: "strategi",        label: "Strategi",         color: "danger",    icon: "🗺️", path: "/renstra/strategi" },
  { key: "arah_kebijakan",  label: "Arah Kebijakan",   color: "dark",      icon: "🧭", path: "/renstra/kebijakan" },
  { key: "program",         label: "Program",          color: "info",      icon: "📋", path: "/renstra/tabel/program" },
  { key: "kegiatan",        label: "Kegiatan",         color: "warning",   icon: "⚙️", path: "/renstra/tabel/kegiatan" },
  { key: "sub_kegiatan",    label: "Sub Kegiatan",     color: "secondary", icon: "📎", path: "/renstra/tabel/subkegiatan" },
];

const formatRupiah = (val) => {
  const n = Number(val) || 0;
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(2)} jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

const RenstraDashboard = () => {
  const { dokumen, tahun } = useDokumen();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [renstraAktif, setRenstraAktif] = useState(null);
  const [stats, setStats] = useState({
    tujuan: null,
    sasaran: null,
    strategi: null,
    arah_kebijakan: null,
    program: null,
    kegiatan: null,
    sub_kegiatan: null,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [paguSummary, setPaguSummary] = useState(null);
  const [loadingPagu, setLoadingPagu] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      try {
        setLoadingStats(true);
        setErrorMsg("");

        // Ambil daftar Renstra OPD dan cari yang aktif
        const opdRes = await api.get("/renstra-opd");
        if (cancelled) return;

        const opdList = Array.isArray(opdRes.data?.data) ? opdRes.data.data : [];
        const aktif = opdList.find((r) => r.is_aktif) || null;
        setRenstraAktif(aktif);

        if (!aktif?.id) {
          setStats({
            tujuan: 0,
            sasaran: 0,
            strategi: 0,
            arah_kebijakan: 0,
            program: 0,
            kegiatan: 0,
            sub_kegiatan: 0,
          });
          setLoadingStats(false);
          return;
        }

        const renstraId = aktif.id;

        /** Normalisasi bentuk respons ke array baris. */
        const rowsOf = (res) => {
          const d = res?.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.data)) return d.data;
          if (d?.success && Array.isArray(d.data)) return d.data;
          return [];
        };

        const countOf = (res) => rowsOf(res).length;

        // Fetch hitungan paralel (hierarki + tabel tujuan per OPD Renstra)
        const [
          tujuanHierarkiRes,
          tabelTujuanRes,
          sasaranRes,
          programRes,
          kegiatanRes,
          strategiRes,
          kebijakanRes,
          subKegiatanRes,
        ] = await Promise.all([
          api.get("/renstra-tujuan", { params: { renstra_id: renstraId } }),
          api.get("/renstra-tabel-tujuan", { params: { opd_id: renstraId } }),
          api.get("/renstra-sasaran", { params: { renstra_id: renstraId } }),
          api.get("/renstra-program", { params: { renstra_id: renstraId } }),
          api.get("/renstra-kegiatan", { params: { renstra_id: renstraId } }),
          // Daftar halaman /renstra/strategi & /renstra/kebijakan tanpa filter renstra_id — samakan hitungan kartu.
          api.get("/renstra-strategi"),
          api.get("/renstra-kebijakan"),
          api.get("/renstra-subkegiatan", { params: { renstra_id: renstraId } }),
        ]);

        if (cancelled) return;

        const tujuanH = countOf(tujuanHierarkiRes);
        const tujuanTabel = countOf(tabelTujuanRes);
        setStats({
          tujuan: Math.max(tujuanH, tujuanTabel),
          sasaran: countOf(sasaranRes),
          strategi: countOf(strategiRes),
          arah_kebijakan: countOf(kebijakanRes),
          program: countOf(programRes),
          kegiatan: countOf(kegiatanRes),
          sub_kegiatan: countOf(subKegiatanRes),
        });

        // Fetch pagu summary dari Renstra Tabel Program
        setLoadingPagu(true);
        try {
          const tabelProgramRes = await api.get("/renstra-tabel-program", {
            params: { renstra_id: renstraId },
          });
          const rows = Array.isArray(tabelProgramRes.data) ? tabelProgramRes.data : [];
          if (rows.length > 0) {
            const paguPerTahun = [1, 2, 3, 4, 5, 6].map((i) => ({
              tahun: i,
              total: rows.reduce((sum, r) => sum + (Number(r[`pagu_tahun_${i}`]) || 0), 0),
            }));
            const totalAkhir = rows.reduce((sum, r) => sum + (Number(r.pagu_akhir_renstra) || 0), 0);
            setPaguSummary({ paguPerTahun, totalAkhir, count: rows.length });
          }
        } finally {
          setLoadingPagu(false);
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        if (!cancelled) {
          setErrorMsg("Gagal memuat statistik. Silakan refresh halaman.");
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    fetchDashboardData();
    return () => { cancelled = true; };
  }, [dokumen, tahun]);

  if (!dokumen || !tahun) {
    return <Navigate to="/" replace />;
  }

  const namaOpd = renstraAktif?.nama_opd || "OPD";
  const periodeTeks = renstraAktif
    ? `${renstraAktif.tahun_mulai} – ${renstraAktif.tahun_akhir}`
    : tahun || "-";

  return (
    <>
      {/* Header */}
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-primary mb-1">📊 Dashboard Renstra</h2>
          <p className="text-muted mb-0 small">{namaOpd} · Periode {periodeTeks}</p>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {renstraAktif && (
            <span className="badge bg-success fs-6 px-3 py-2">
              ✅ Renstra Aktif
            </span>
          )}
          {renstraAktif?.id && (
            <GenerateRenstraButton
              renstraId={renstraAktif.id}
              namaOpd={namaOpd}
              disabled={loadingStats}
            />
          )}
        </div>
      </div>

      {/* Info pengguna & dokumen */}
      {user && (
        <Card className="mb-3 shadow-sm border-0 border-start border-4 border-primary">
          <CardBody>
            <Row className="gy-1">
              <Col md={6}>
                <div><strong>OPD:</strong> {namaOpd}</div>
                <div><strong>Dokumen Aktif:</strong> {dokumen || "-"}</div>
                <div><strong>Periode Renstra:</strong> {periodeTeks}</div>
              </Col>
              <Col md={6}>
                <div><strong>Pengguna:</strong> {user.nama || user.email}</div>
                <div>
                  <strong>Status Renstra: </strong>
                  {renstraAktif ? (
                    <span className="badge bg-success">Aktif</span>
                  ) : (
                    <span className="badge bg-secondary">Belum dikonfigurasi</span>
                  )}
                </div>
                {renstraAktif?.bidang_opd && (
                  <div><strong>Bidang:</strong> {renstraAktif.bidang_opd}</div>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      )}

      {/* Alert jika tidak ada renstra aktif */}
      {!loadingStats && !renstraAktif && (
        <Card className="mb-3 border-warning shadow-sm">
          <CardBody className="text-center py-4">
            <div className="fs-4 mb-2">⚠️</div>
            <strong>Renstra OPD Belum Dikonfigurasi</strong>
            <p className="text-muted mt-1 mb-3 small">
              Silakan buat dan aktifkan Renstra OPD terlebih dahulu.
            </p>
            <button
              className="btn btn-warning btn-sm"
              onClick={() => navigate("/renstra/opd")}
            >
              Buat Renstra OPD
            </button>
          </CardBody>
        </Card>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="alert alert-danger mb-3" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Statistik */}
      <Row className="mb-4">
        {STAT_CONFIG.map((stat) => (
          <Col key={stat.key} xs={6} sm={6} md={4} lg={3} className="mb-3">
            <Card
              className={`text-center shadow-sm border-top border-4 border-${stat.color} h-100`}
              style={{ cursor: "pointer", transition: "transform .15s" }}
              onClick={() => navigate(stat.path)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              <CardBody className="py-3">
                <div className="fs-3 mb-1">{stat.icon}</div>
                <div className={`fs-2 fw-bold text-${stat.color}`}>
                  {loadingStats ? (
                    <Spinner animation="border" size="sm" variant={stat.color} />
                  ) : (
                    stats[stat.key] ?? 0
                  )}
                </div>
                <div className="text-muted small fw-semibold">{stat.label}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Akses cepat */}
      <Card className="shadow-sm border-0 mb-4">
        <CardBody>
          <h6 className="fw-bold mb-3">Akses Cepat</h6>
          <Row className="g-2">
            {STAT_CONFIG.map((s) => (
              <Col key={s.key} xs={6} sm={4} md={3} lg={3}>
                <button
                  className={`btn btn-outline-${s.color} w-100 btn-sm`}
                  onClick={() => navigate(s.path)}
                >
                  {s.icon} {s.label}
                </button>
              </Col>
            ))}
          </Row>
        </CardBody>
      </Card>

      {/* Pagu Summary */}
      {renstraAktif && (
        <Card className="shadow-sm border-0 mb-4">
          <CardBody>
            <h6 className="fw-bold mb-3">💰 Ringkasan Pagu Renstra ({paguSummary?.count ?? 0} Program)</h6>
            {loadingPagu ? (
              <div className="text-center py-2">
                <Spinner animation="border" size="sm" /> Memuat data pagu...
              </div>
            ) : paguSummary ? (
              <>
                <Row className="g-2 mb-2">
                  {paguSummary.paguPerTahun.map(({ tahun: t, total }) => (
                    <Col key={t} xs={6} sm={4} md={2}>
                      <div className="border rounded p-2 text-center bg-light">
                        <div className="small text-muted fw-semibold">Tahun {t}</div>
                        <div className="fw-bold text-info small">{formatRupiah(total)}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
                <div className="text-end fw-bold text-primary">
                  Total Pagu Renstra: {formatRupiah(paguSummary.totalAkhir)}
                </div>
              </>
            ) : (
              <div className="text-muted small">
                Belum ada data pagu. Tambahkan data melalui{" "}
                <a href="/renstra/tabel/program" className="text-decoration-underline">Tabel Program</a>.
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Info footer */}
      <Card className="shadow-sm border-0 mb-4">
        <CardBody className="bg-light">
          <div className="text-muted small">
            Dashboard Renstra OPD sesuai <strong>Permendagri 86/2017</strong>.
            Data terintegrasi dengan RPJMD melalui modul Cascading.
            {renstraAktif?.keterangan && (
              <><br /><span className="fw-semibold">Keterangan: </span>{renstraAktif.keterangan}</>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default RenstraDashboard;
