// src/features/rpjmd/pages/DashboardUtamaRpjmd.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  BsEye,
  BsPeople,
  BsFlag,
  BsBullseye,
  BsMap,
  BsBarChart,
  BsDiagram3,
  BsClipboardCheck,
  BsClipboard,
  BsLayers,
  BsBuildings,
  BsListUl,
  BsFileEarmarkText,
  BsCloudDownload,
} from "react-icons/bs";

import {
  Row,
  Col,
  Card,
  Button,
  Container,
  Badge,
  Spinner,
  ListGroup,
} from "react-bootstrap";

import {
  VisiForm,
  MisiForm,
  TujuanForm,
  TujuanList,
  SasaranForm,
  SasaranList,
  StrategiForm,
  StrategiList,
  ArahKebijakanForm,
  ArahKebijakanList,
  PrioritasNasional,
  PrioritasDaerah,
  PrioritasGubernur,
  ProgramForm,
  ProgramPrioritasList,
  KegiatanForm,
  KegiatanList,
  SubKegiatanForm,
  SubKegiatanList,
  Indikator,
  IndikatorTujuanEdit,
  IndikatorSasaranEdit,
  IndikatorProgramEdit,
  IndikatorKegiatanEdit,
  IndikatorKhususList,
  OpdPenanggungJawabForm,
  CascadingForm,
  IndikatorRPJMD,
} from "@/shared/components/Forms";

import IndikatorTujuanListPage from "@/features/rpjmd/pages/IndikatorTujuanListPage";
import IndikatorSasaranListPage from "./IndikatorSasaranListPage";
import IndikatorProgramList from "./IndikatorProgramList";
import IndikatorKegiatanList from "./IndikatorKegiatanList";
import IndikatorKhususListPage from "@/shared/components/IndikatorKhususListPage";
import CascadingStatistik from "@/pages/CascadingStatistik";
import CascadingDetail from "@/pages/CascadingDetail";

import api from "../../../services/api";
import { useDokumen } from "../../../hooks/useDokumen";
import { Link, Navigate, Outlet } from "react-router-dom";
import SidebarMenu from "@/shared/components/SidebarMenu";
import { checkAuthStatus } from "../../../contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import CascadingNestedView from "@/shared/components/CascadingNestedView";
import IndikatorList from "@/shared/components/IndikatorList";
import RpjmdDokumenImporPanel from "@/features/rpjmd/components/RpjmdDokumenImporPanel";
import RpjmdMonitoringIndikator from "@/features/rpjmd/pages/RpjmdMonitoringIndikator";
import RpjmdMonitoringOPD from "@/features/rpjmd/pages/RpjmdMonitoringOPD";
import RpjmdMonitoringHeatmap from "@/features/rpjmd/pages/RpjmdMonitoringHeatmap";
import RpjmdBulkMasterImportPage from "@/features/rpjmd/pages/RpjmdBulkMasterImportPage";
import {
  extractListData,
  extractListMeta,
  normalizeListItems,
} from "@/utils/apiResponse";
import { hasPlanFeature, PLAN_FEATURE_KEYS } from "@/utils/planFeatures";

function menuItemPlanGate(menuKey) {
  if (menuKey === "monitoring_rpjmd_heatmap") return PLAN_FEATURE_KEYS.heatmap;
  if (menuKey === "monitoring_rpjmd_opd") return PLAN_FEATURE_KEYS.monitoring_opd;
  return null;
}

const groupedMenuList = [
  {
    title: "Menu Input 1",
    items: [
      { key: "visi", icon: <BsEye size={18} />, label: "Visi" },
      { key: "misi", icon: <BsPeople size={18} />, label: "Misi" },
      { key: "tujuan", icon: <BsFlag size={18} />, label: "Tujuan" },
      {
        key: "dokumen_impor_rpjmd",
        icon: <BsFileEarmarkText size={18} />,
        label: "Dokumen impor RPJMD (PDF)",
      },
    ],
  },
  {
    title: "Menu Input 2",
    items: [
      { key: "sasaran", icon: <BsBullseye size={18} />, label: "Sasaran" },
      { key: "strategi", icon: <BsMap size={18} />, label: "Strategi" },
      {
        key: "arah_kebijakan",
        icon: <BsBarChart size={18} />,
        label: "Arah Kebijakan",
      },
    ],
  },
  {
    title: "Menu Input 3",
    items: [
      {
        key: "prioritas_nasional",
        icon: <BsDiagram3 size={18} />,
        label: "Prioritas Nasional",
      },
      {
        key: "prioritas_daerah",
        icon: <BsDiagram3 size={18} />,
        label: "Prioritas Daerah",
      },
      {
        key: "prioritas_gubernur",
        icon: <BsDiagram3 size={18} />,
        label: "Prioritas Gubernur",
      },
    ],
  },
  {
    title: "Menu Input 4",
    items: [
      {
        key: "program",
        icon: <BsClipboardCheck size={18} />,
        label: "Program",
      },
      { key: "kegiatan", icon: <BsClipboard size={18} />, label: "Kegiatan" },
      {
        key: "sub_kegiatan",
        icon: <BsLayers size={18} />,
        label: "Sub Kegiatan",
      },
      {
        key: "bulk_master_import_rpjmd",
        icon: <BsCloudDownload size={18} />,
        label: "Impor massal (master → RPJMD)",
      },
    ],
  },
  {
    title: "Menu Input 5",
    items: [
      {
        key: "opd_penanggung_jawab",
        icon: <BsBuildings size={18} />,
        label: "Penanggung Jawab OPD",
      },
      {
        key: "indikator_rpjmd",
        icon: <BsLayers size={18} />,
        label: "Indikator Spesifik RPJMD",
      },
      {
        key: "indikator_daftar_rpjmd",
        icon: <BsListUl size={18} />,
        label: "Daftar Indikator RPJMD",
      },
      { key: "cascading", icon: <BsLayers size={18} />, label: "Cascading" },
    ],
  },
  {
    title: "Daftar Menu RPJMD",
    items: [
      {
        key: "tujuan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Tujuan",
      },
      {
        key: "sasaran_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Sasaran",
      },
      {
        key: "strategi_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Strategi",
      },
      {
        key: "arah_kebijakan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Arah Kebijakan",
      },
      {
        key: "program_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Program",
      },
      {
        key: "kegiatan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Kegiatan",
      },
      {
        key: "sub_kegiatan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Sub Kegiatan",
      },
      {
        key: "cascading_nested",
        icon: <BsFlag size={18} />,
        label: "Daftar Cascading",
      },
      {
        key: "cascading_statistik",
        icon: <BsFlag size={18} />,
        label: "Daftar Statistik Cascading",
      },
    ],
  },
  {
    title: "Daftar Menu Indikator",
    items: [
      {
        key: "indikator_tujuan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Tujuan",
      },
      {
        key: "indikator_sasaran_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Sasaran",
      },
      {
        key: "indikator_strategi_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Strategi",
      },
      {
        key: "indikator_arah_kebijakan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Arah Kebijakan",
      },
      {
        key: "indikator_program_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Program",
      },
      {
        key: "indikator_kegiatan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Kegiatan",
      },
      {
        key: "indikator_sub_kegiatan_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Sub Kegiatan",
      },
      {
        key: "monitoring_indikator_rpjmd",
        icon: <BsBarChart size={18} />,
        label: "Monitoring Indikator RPJMD",
      },
      {
        key: "monitoring_rpjmd_opd",
        icon: <BsBuildings size={18} />,
        label: "Monitoring capaian per OPD",
      },
      {
        key: "monitoring_rpjmd_heatmap",
        icon: <BsLayers size={18} />,
        label: "Heatmap indikator RPJMD",
      },
      {
        key: "indikator_khusus_list",
        icon: <BsFlag size={18} />,
        label: "Daftar Indikator Khusus",
      },
    ],
  },
];

const roleBasedMenu = {
  SUPER_ADMIN: groupedMenuList.flatMap((g) => g.items),
  ADMINISTRATOR: groupedMenuList.flatMap((g) => g.items),
  PENGAWAS: groupedMenuList
    .flatMap((g) => g.items)
    .filter((m) =>
      [
        "program",
        "kegiatan",
        "sub_kegiatan",
        "indikator",
        "dokumen_impor_rpjmd",
        "monitoring_indikator_rpjmd",
        "monitoring_rpjmd_opd",
        "monitoring_rpjmd_heatmap",
      ].includes(m.key)
    ),
  PELAKSANA: groupedMenuList
    .flatMap((g) => g.items)
    .filter((m) =>
      [
        "program",
        "kegiatan",
        "sub_kegiatan",
        "indikator",
        "dokumen_impor_rpjmd",
        "monitoring_indikator_rpjmd",
        "monitoring_rpjmd_opd",
        "monitoring_rpjmd_heatmap",
      ].includes(m.key)
    ),
};

const entityApiMap = {
  visi: "/visi",
  misi: "/misi",
  tujuan: "/tujuan",
  tujuan_list: "/tujuan",
  sasaran: "/sasaran",
  sasaran_list: "/sasaran",
  strategi: "/strategi",
  arah_kebijakan: "/arah-kebijakan",
  prioritas_nasional: "/prioritas-nasional",
  prioritas_daerah: "/prioritas-daerah",
  prioritas_gubernur: "/prioritas-gubernur",
  program: "/programs",
  program_list: "/programs",
  kegiatan: "/kegiatan",
  kegiatan_list: "/kegiatan",
  sub_kegiatan: "/sub-kegiatan",
  sub_kegiatan_list: "/sub-kegiatan",
  indikator: "/indikator-wizard/count",
  cascading: "/cascading",
  cascading_nested: "/cascading",
};

const indikatorSummaryApiMap = {
  indikator_tujuan: "/indikator-tujuans",
  indikator_sasaran: "/indikator-sasaran",
  indikator_program: "/indikator-program",
  indikator_kegiatan: "/indikator-kegiatan",
  sub_kegiatan_output: "/sub-kegiatan",
};

export default function DashboardUtamaRpjmd() {
  const allowedMenus = groupedMenuList.flatMap((group) =>
    group.items.map((item) => item.key)
  );

  const [selectedMenu, setSelectedMenu] = useState(() => {
    const saved = localStorage.getItem("selectedMenuRPJMD");
    return allowedMenus.includes(saved) ? saved : null;
  });

  // ⬇️ Tambahkan useEffect ini di sini
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const menuFromURL = queryParams.get("menu");

    if (menuFromURL && allowedMenus.includes(menuFromURL)) {
      setSelectedMenu(menuFromURL);
      localStorage.setItem("selectedMenuRPJMD", menuFromURL);
    }
  }, []);

  const { dokumen, tahun } = useDokumen();
  const { user, loading: userLoading } = useAuth();
  const { periode_id, periodeList } = usePeriodeAktif();

  const periodeRentangLabel = useMemo(() => {
    const p = (periodeList || []).find(
      (x) => String(x.id) === String(periode_id),
    );
    if (p?.tahun_awal != null && p?.tahun_akhir != null) {
      return `${p.tahun_awal} – ${p.tahun_akhir}`;
    }
    return null;
  }, [periodeList, periode_id]);
  const navigate = useNavigate();

  const [openedGroup, setOpenedGroup] = useState(() => {
    const saved = localStorage.getItem("openedGroupRPJMD");
    return saved !== null ? Number(saved) : null;
  });

  const [summary, setSummary] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [indikatorSummary, setIndikatorSummary] = useState({
    indikator_tujuan: 0,
    indikator_sasaran: 0,
    indikator_program: 0,
    indikator_kegiatan: 0,
    sub_kegiatan_output: 0,
  });
  const [loadingIndikatorSummary, setLoadingIndikatorSummary] = useState(true);

  const [dataCascading, setDataCascading] = useState([]);
  const [loadingCascading, setLoadingCascading] = useState(true);

  useEffect(() => {
    if (!dokumen || !tahun) return;
    let mounted = true;
    const fetchSummary = async () => {
      setLoadingSummary(true);
      const result = {};
      await Promise.all(
        Object.entries(entityApiMap).map(async ([key, url]) => {
          try {
            const res = await api.get(url, {
              params: {
                limit: 1,
                jenis_dokumen: dokumen,
                tahun,
                periode_id,
              },
            });
            const meta = extractListMeta(res.data);
            const items = extractListData(res.data);
            const count = Number(meta.totalItems ?? meta.total ?? items.length ?? 0);
            result[key] = count;
          } catch {
            result[key] = 0;
          }
        })
      );
      if (mounted) {
        setSummary(result);
        setLoadingSummary(false);
      }
    };
    fetchSummary();
    return () => (mounted = false);
  }, [dokumen, tahun]);

  useEffect(() => {
    if (!dokumen || !tahun) return;
    let mounted = true;
    const fetchIndikatorSummary = async () => {
      setLoadingIndikatorSummary(true);
      const result = {};
      const keys = [
        "indikator_tujuan",
        "indikator_sasaran",
        "indikator_program",
        "indikator_kegiatan",
      ];
      for (let key of keys) {
        try {
          const res = await api.get(indikatorSummaryApiMap[key], {
            params: { jenis_dokumen: dokumen, tahun },
          });
          const meta = extractListMeta(res.data);
          const items = extractListData(res.data);
          result[key] = Number(meta.totalItems ?? meta.total ?? items.length ?? 0);
        } catch {
          result[key] = 0;
        }
      }

      try {
        const res = await api.get(indikatorSummaryApiMap.sub_kegiatan_output, {
          params: { jenis_dokumen: dokumen, tahun },
        });
        result.sub_kegiatan_output = extractListData(res.data).filter(
          (item) => Boolean(item?.output)
        ).length;
      } catch {
        result.sub_kegiatan_output = 0;
      }
      if (mounted) {
        setIndikatorSummary(result);
        setLoadingIndikatorSummary(false);
      }
    };
    fetchIndikatorSummary();
    return () => (mounted = false);
  }, [dokumen, tahun]);

  useEffect(() => {
    if (openedGroup !== null) {
      localStorage.setItem("openedGroupRPJMD", openedGroup);
    } else {
      localStorage.removeItem("openedGroupRPJMD");
    }
  }, [openedGroup]);

  useEffect(() => {
    if (!checkAuthStatus()) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCascadingData = async () => {
      try {
        setLoadingCascading(true);
        const res = await api.get("/cascading", {
          params: {
            jenis_dokumen: dokumen,
            tahun,
            periode_id,
          },
        });
        setDataCascading(normalizeListItems(res.data));
      } catch (err) {
        console.error("Gagal memuat data cascading:", err);
        setDataCascading([]);
      } finally {
        setLoadingCascading(false);
      }
    };

    if (dokumen && tahun && periode_id) {
      fetchCascadingData();
    }
  }, [dokumen, tahun, periode_id]);

  if (userLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: 200 }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!dokumen || !tahun) return <Navigate to="/" replace />;

  const renderMenuContent = () => {
    switch (selectedMenu) {
      case "visi":
        return <VisiForm />;
      case "misi":
        return <MisiForm />;
      case "tujuan":
        return <TujuanForm onGoToList={() => setSelectedMenu("tujuan_list")} />;
      case "tujuan_list":
        return <TujuanList />;
      case "indikator_tujuan_edit":
        return <IndikatorTujuanEdit />;
      case "indikator_tujuan_list":
        return <IndikatorTujuanListPage />;
      case "sasaran":
        return (
          <SasaranForm onGoToList={() => setSelectedMenu("sasaran_list")} />
        );
      case "sasaran_list":
        return <SasaranList />;
      case "indikator_sasaran_edit":
        return <IndikatorSasaranEdit />;
      case "indikator_sasaran_list":
        return <IndikatorSasaranListPage />;
      case "strategi":
        return <StrategiForm />;
      case "strategi_list":
        return <StrategiList />;
      case "arah_kebijakan":
        return <ArahKebijakanForm />;
      case "arah_kebijakan_list":
        return <ArahKebijakanList />;
      case "prioritas_nasional":
        return <PrioritasNasional />;
      case "prioritas_daerah":
        return <PrioritasDaerah />;
      case "prioritas_gubernur":
        return <PrioritasGubernur />;
      case "program":
        return (
          <ProgramForm onGoToList={() => setSelectedMenu("program_list")} />
        );
      case "program_list":
        return <ProgramPrioritasList />;
      case "indikator_program_list":
        return <IndikatorProgramList />;
      case "kegiatan":
        return (
          <KegiatanForm onGoToList={() => setSelectedMenu("kegiatan_list")} />
        );
      case "kegiatan_list":
        return <KegiatanList />;
      case "indikator_kegiatan_list":
        return <IndikatorKegiatanList />;
      case "indikator_strategi_list":
        return <IndikatorList defaultType="strategi" />;
      case "indikator_arah_kebijakan_list":
        return <IndikatorList defaultType="arah_kebijakan" />;
      case "indikator_sub_kegiatan_list":
        return <IndikatorList defaultType="sub_kegiatan_indikator" />;
      case "sub_kegiatan":
        return <SubKegiatanForm />;
      case "sub_kegiatan_list":
        return <SubKegiatanList />;
      case "bulk_master_import_rpjmd":
        return <RpjmdBulkMasterImportPage />;
      case "indikator":
        return <Indikator />;
      case "indikator_khusus_list":
        return <IndikatorKhususListPage />;
      case "opd_penanggung_jawab":
        return <OpdPenanggungJawabForm onSave={() => setSelectedMenu(null)} />;
      case "indikator_rpjmd":
        return <IndikatorRPJMD />;
      case "indikator_daftar_rpjmd":
        return <IndikatorList defaultType="tujuan" />;
      case "cascading":
        return <CascadingForm />;
      case "cascading_nested":
        return loadingCascading ? (
          <div className="text-center my-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <CascadingNestedView data={dataCascading} />
        );
      case "cascading_statistik":
        return <CascadingStatistik />;
      case "cascading_detail":
        return <CascadingDetail />;
      case "dokumen_impor_rpjmd":
        return <RpjmdDokumenImporPanel periodeId={periode_id} />;
      case "monitoring_indikator_rpjmd":
        return <RpjmdMonitoringIndikator />;
      case "monitoring_rpjmd_opd":
        return <RpjmdMonitoringOPD />;
      case "monitoring_rpjmd_heatmap":
        return <RpjmdMonitoringHeatmap />;
      default:
        return null;
    }
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col md={3} lg={2} className="mb-4">
          <Card
            className="h-100 shadow-sm border-0 sticky-top"
            style={{ top: 15 }}
          >
            <Card.Body>
              <h5 className="mb-3 text-primary">Menu-menu RPJMD</h5>
              <ListGroup variant="flush">
                {groupedMenuList.map((group, index) => (
                  <div key={index}>
                    <ListGroup.Item
                      action
                      onClick={() =>
                        setOpenedGroup(openedGroup === index ? null : index)
                      }
                      className="fw-bold text-primary"
                    >
                      {group.title}
                    </ListGroup.Item>
                    {openedGroup === index &&
                      group.items
                        .filter((item) =>
                          (roleBasedMenu[user?.role] || []).some(
                            (m) => m.key === item.key
                          )
                        )
                        .map((menu) => {
                          const gate = menuItemPlanGate(menu.key);
                          const locked =
                            gate != null && !hasPlanFeature(user, gate);
                          return (
                            <ListGroup.Item
                              key={menu.key}
                              action
                              active={selectedMenu === menu.key}
                              disabled={locked}
                              onClick={() => {
                                if (locked) return;
                                setSelectedMenu(menu.key);
                                localStorage.setItem(
                                  "selectedMenuRPJMD",
                                  menu.key
                                );
                              }}
                              className="ps-4 d-flex align-items-center flex-wrap"
                              style={{ cursor: locked ? "not-allowed" : "pointer" }}
                              title={locked ? "Upgrade ke PRO" : undefined}
                            >
                              <span className="me-2">{menu.icon}</span>
                              {menu.label}
                              {locked ? (
                                <span className="ms-1 small">
                                  <Link to={PRICING_PATH} className="text-muted">
                                    (Upgrade ke PRO)
                                  </Link>
                                </span>
                              ) : null}
                            </ListGroup.Item>
                          );
                        })}
                  </div>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        <Col md={9} lg={10} className="min-w-0">
          <h3 className="fw-bold mb-1 text-primary">
            📊 Dashboard Pengelolaan Data RPJMD
          </h3>
          <div className="mb-3">
            <span className="me-3">
              <strong>Dokumen Aktif:</strong> <Badge bg="info">{dokumen}</Badge>
            </span>
            {periodeRentangLabel ? (
              <span className="me-3">
                <strong>Periode RPJMD:</strong>{" "}
                <Badge bg="primary">{periodeRentangLabel}</Badge>
              </span>
            ) : null}
            <span className="text-muted small d-block d-md-inline mt-1 mt-md-0">
              RPJMD satu periode (lima tahun); tidak ada pemilihan tahun terpisah — konteks data mengikuti periode aktif
              Anda.
            </span>
          </div>

          {!selectedMenu && (
            <Row className="mb-4 g-3">
              {(roleBasedMenu[user?.role] || []).map((menu) => (
                <Col xs={6} sm={4} md={3} xl={2} key={menu.key}>
                  <Card className="text-center shadow-sm border-0 bg-light">
                    <Card.Body>
                      <div className="fs-3 text-primary mb-1">{menu.icon}</div>
                      <div className="fw-semibold">{menu.label}</div>
                      {loadingSummary ? (
                        <Spinner
                          animation="border"
                          size="sm"
                          className="mt-2"
                        />
                      ) : (
                        <div className="fs-5 mt-2">
                          <Badge bg="success" pill>
                            {summary[menu.key] ?? 0}
                          </Badge>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          <h5 className="mt-4">Rekap Jumlah Data Indikator</h5>
          <table className="table table-bordered table-sm w-auto mb-4">
            <thead>
              <tr>
                <th>Indikator Tujuan</th>
                <th>Indikator Sasaran</th>
                <th>Indikator Program</th>
                <th>Indikator Kegiatan</th>
                <th>Sub Kegiatan Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {loadingIndikatorSummary
                    ? "..."
                    : indikatorSummary.indikator_tujuan}
                </td>
                <td>
                  {loadingIndikatorSummary
                    ? "..."
                    : indikatorSummary.indikator_sasaran}
                </td>
                <td>
                  {loadingIndikatorSummary
                    ? "..."
                    : indikatorSummary.indikator_program}
                </td>
                <td>
                  {loadingIndikatorSummary
                    ? "..."
                    : indikatorSummary.indikator_kegiatan}
                </td>
                <td>
                  {loadingIndikatorSummary
                    ? "..."
                    : indikatorSummary.sub_kegiatan_output}
                </td>
              </tr>
            </tbody>
          </table>

          {!selectedMenu ? (
            <></>
          ) : (
            <div>
              <Button
                variant="secondary"
                className="mb-3"
                onClick={() => {
                  setSelectedMenu(null);
                  localStorage.removeItem("selectedMenuRPJMD");
                }}
              >
                &larr; Kembali ke Panel RPJMD
              </Button>
              {renderMenuContent()}
            </div>
          )}
          <Outlet />
        </Col>
      </Row>
    </Container>
  );
}
