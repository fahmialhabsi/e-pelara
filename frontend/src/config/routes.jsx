// ===== src/config/routes.js =====
import { Navigate } from "react-router-dom";

import VisiForm from "../shared/components/VisiForm";
import MisiForm from "../shared/components/MisiForm";
import TujuanForm from "../shared/components/TujuanForm";
import IndikatorTujuanEditPage from "@/features/rpjmd/pages/IndikatorTujuanEditPage";
import SasaranForm from "../shared/components/SasaranForm";
// import IndikatorSaaranForm from "@/features/rpjmd/pages/IndikatorSasaranForm";
import IndikatorSasaranEditPage from "@/features/rpjmd/pages/IndikatorSasaranEditPage";
import StrategiForm from "../shared/components/StrategiForm";
import ArahKebijakanForm from "../shared/components/ArahKebijakanForm";
import PrioritasNasionalForm from "../shared/components/PrioritasNasionalForm";
import PrioritasDaerahForm from "../shared/components/PrioritasDaerahForm";
import PrioritasGubernurForm from "../shared/components/PrioritasGubernurForm";
import ProgramForm from "../shared/components/ProgramPrioritasForm";
import ProgramPrioritasEdit from "../shared/components/ProgramPrioritasEdit";
// import IndikatorProgramForm from "@/features/rpjmd/pages/IndikatorProgramForm";
import IndikatorProgramEditPage from "@/features/rpjmd/pages/IndikatorProgramEditPage";
import ProgramPrioritasList from "../shared/components/ProgramPrioritasList";
import KegiatanForm from "../shared/components/KegiatanForm";
import CascadingEdit from "@/shared/components/CascadingEdit";
import CascadingList from "@/shared/components/CascadingList";
import CascadingNested from "@/shared/components/CascadingNestedView";
import IndikatorKegiatanEditPage from "@/features/rpjmd/pages/IndikatorKegiatanEditPage";
import SubKegiatanForm from "../shared/components/SubKegiatanForm";
import OPDPenanggungJawabForm from "@/shared/components/OPDPenanggungJawabForm";

import DashboardHome from "../features/rpjmd/pages/DashboardHome";
import DashboardUtamaRpjmd from "@/features/rpjmd/pages/DashboardUtamaRpjmd";
import MonevDashboard from "../features/monev/pages/MonevDashboard";
import MonevListPage from "../features/monev/pages/MonevListPage";
import UploadExcelPage from "../features/monev/pages/UploadExcelPage";
import LaporanMonevPage from "../features/monev/pages/LaporanMonevPage";

import CascadingView from "../pages/cascading/Modul1_CascadingView";
import IndikatorWizardForm from "../shared/components/arsip/IndikatorWizardForm";

import IndikatorList from "../shared/components/IndikatorList";

import RekapStatistik from "../pages/statistik/Modul2_RekapStatistik";
import AktivitasPengguna from "../pages/aktivitas/Modul3_AktivitasPengguna";
import Users from "../features/users/Users";
import KegiatanList from "@/shared/components/KegiatanList";
import SubKegiatanList from "@/shared/components/SubKegiatanList";
import { OpdPenanggungJawabForm, TujuanList, IndikatorRPJMD } from "@/shared/components/Forms";
import SasaranList from "@/shared/components/SasaranList";
import StrategiList from "@/shared/components/StrategiList";
import ArahKebijakanList from "@/shared/components/ArahKebijakanList";
import PrioritasNasionalList from "@/shared/components/PrioritasNasionalList";
import PrioritasDaerahList from "@/shared/components/PrioritasDaerahList";
import PrioritasGubernurList from "@/shared/components/PrioritasGubernurList";
import OpdList from "@/shared/components/OpdList";
import IndikatorTujuanListPage from "@/features/rpjmd/pages/IndikatorTujuanListPage";
import RpjmdMonitoringIndikator from "@/features/rpjmd/pages/RpjmdMonitoringIndikator";
import RpjmdMonitoringOPD from "@/features/rpjmd/pages/RpjmdMonitoringOPD";
import RpjmdMonitoringHeatmap from "@/features/rpjmd/pages/RpjmdMonitoringHeatmap";
import RpjmdBulkMasterImportPage from "@/features/rpjmd/pages/RpjmdBulkMasterImportPage";
import CascadingDetail from "@/pages/CascadingDetail";

const routes = [
  // 📘 RPJMD
  { path: "/rpjmd/visi", element: <VisiForm />, role: ["SUPER_ADMIN"] },
  { path: "/rpjmd/misi", element: <MisiForm />, role: ["SUPER_ADMIN"] },

  // Redirect root to /rpjmd/tujuan
  { path: "/rpjmd/tujuan", element: <TujuanForm />, role: ["SUPER_ADMIN"] },
  {
    path: "/rpjmd/tujuan-add",
    element: <TujuanForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/tujuan-edit/:id",
    element: <TujuanForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/tujuan-list",
    element: <TujuanList />,
    role: ["SUPER_ADMIN"],
  },

  // Redirect root to /rpjmd/sasaran
  { path: "/rpjmd/sasaran", element: <SasaranForm />, role: ["SUPER_ADMIN"] },
  {
    path: "/rpjmd/sasaran-add",
    element: <SasaranForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/sasaran-edit/:id",
    element: <SasaranForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/sasaran-list",
    element: <SasaranList />,
    role: ["SUPER_ADMIN"],
  },

  // Redirect root to /rpjmd/strategi
  { path: "/rpjmd/strategi", element: <StrategiForm />, role: ["SUPER_ADMIN"] },
  {
    path: "/rpjmd/strategi-add",
    element: <StrategiForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/strategi-edit/:id",
    element: <StrategiForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/strategi-list",
    element: <StrategiList />,
    role: ["SUPER_ADMIN"],
  },

  // Redirect root to /rpjmd/Arah Kebijakan
  {
    path: "/rpjmd/arah-kebijakan",
    element: <ArahKebijakanForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/arah-kebijakan-add",
    element: <ArahKebijakanForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/arah-kebijakan-edit/:id",
    element: <ArahKebijakanForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/arah-kebijakan-list",
    element: <ArahKebijakanList />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/rpjmd/cascading-edit/:id",
    element: <CascadingEdit />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/cascading-list",
    element: <CascadingList />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/cascading-nested",
    element: <CascadingNested />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/cascading-detail/:id",
    element: <CascadingDetail />,
    role: ["SUPER_ADMIN"],
  },

  // Redirect root to /rpjmd/Prioritas Nasional
  {
    path: "/rpjmd/prionas",
    element: <PrioritasNasionalForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/prionas-add",
    element: <PrioritasNasionalForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/prionas-edit/:id",
    element: <PrioritasNasionalForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/prionas-list",
    element: <PrioritasNasionalList />,
    role: ["SUPER_ADMIN"],
  },

  // Redirect root to /rpjmd/Prioritas Daerah
  {
    path: "/rpjmd/prioda",
    element: <PrioritasDaerahForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/prioda-add",
    element: <PrioritasDaerahForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/prioda-edit/:id",
    element: <PrioritasDaerahForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/prioda-list",
    element: <PrioritasDaerahList />,
    role: ["SUPER_ADMIN"],
  },

  // Redirect root to /rpjmd/Prioritas Gubernur
  {
    path: "/rpjmd/priogub",
    element: <PrioritasGubernurForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/priogub-add",
    element: <PrioritasGubernurForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/priogub-edit/:id",
    element: <PrioritasGubernurForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/rpjmd/priogub-list",
    element: <PrioritasGubernurList />,
    role: ["SUPER_ADMIN"],
  },

  // 🛠 Program, Kegiatan & Sub Kegiatan
  // 🔁 Redirect root ke /program-list
  {
    path: "/",
    element: <Navigate to="/program-list" replace />,
  },
  {
    path: "/program",
    element: <ProgramForm />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/program-edit/:id",
    element: <ProgramPrioritasEdit />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/program-list",
    element: <ProgramPrioritasList />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/kegiatan",
    element: <KegiatanForm />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN", "PENGAWAS"],
  },
  {
    path: "/kegiatan-edit/:id",
    element: <KegiatanForm />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN", "PENGAWAS"],
  },
  {
    path: "/kegiatan-list",
    element: <KegiatanList />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN", "PENGAWAS"],
  },
  {
    path: "/sub-kegiatan",
    element: <SubKegiatanForm />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/sub-kegiatan/edit/:id",
    element: <SubKegiatanForm />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/sub-kegiatan-list",
    element: <SubKegiatanList />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/rpjmd/bulk-master-import",
    element: <RpjmdBulkMasterImportPage />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR"],
  },

  // Redirect OPD
  {
    path: "/opd",
    element: <OpdPenanggungJawabForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/opd-add",
    element: <OpdPenanggungJawabForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/opd-edit/:id",
    element: <OpdPenanggungJawabForm />,
    role: ["SUPER_ADMIN"],
  },
  {
    path: "/opd-list",
    element: <OpdList />,
    role: ["SUPER_ADMIN"],
  },

  // 📊 Monitoring & Evaluasi
  {
    path: "/monev",
    element: <MonevDashboard />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/monev/input",
    element: <LaporanMonevPage />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PELAKSANA"],
  },
  {
    path: "/monev/upload",
    element: <UploadExcelPage />,
    role: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/monev/laporan",
    element: <LaporanMonevPage />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"],
  },

  // 🔀 Cascading Indikator
  { path: "/cascading", element: <CascadingView />, role: ["SUPER_ADMIN"] },
  {
    path: "/indikator-wizard",
    element: <IndikatorWizardForm />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd",
    element: <DashboardUtamaRpjmd />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/dashboard-rpjmd/monitoring-indikator",
    element: <RpjmdMonitoringIndikator />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/dashboard-rpjmd/monitoring-opd",
    element: <RpjmdMonitoringOPD />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/dashboard-rpjmd/monitoring-heatmap",
    element: <RpjmdMonitoringHeatmap />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/dashboard-rpjmd/wizard",
    element: <IndikatorRPJMD />,
    role: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"],
  },
  {
    path: "/dashboard-rpjmd/indikator-tujuan-edit/:id",
    element: <IndikatorTujuanEditPage />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-tujuan-list",
    element: <IndikatorList defaultType="tujuan" />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-sasaran-edit/:id",
    element: <IndikatorSasaranEditPage />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-sasaran-list",
    element: <IndikatorList defaultType="sasaran" />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-program-edit/:id",
    element: <IndikatorProgramEditPage />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-program-list",
    element: <IndikatorList defaultType="program" />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-kegiatan-edit/:id",
    element: <IndikatorKegiatanEditPage />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-kegiatan-list",
    element: <IndikatorList defaultType="kegiatan" />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-strategi-list",
    element: <IndikatorList defaultType="strategi" />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-arah-kebijakan-list",
    element: <IndikatorList defaultType="arah_kebijakan" />,
    role: ["SUPER_ADMIN"],
  },

  {
    path: "/dashboard-rpjmd/indikator-sub-kegiatan-list",
    element: <IndikatorList defaultType="sub_kegiatan_indikator" />,
    role: ["SUPER_ADMIN"],
  },

  // 📡 Statistik & Aktivitas
  { path: "/statistik", element: <RekapStatistik />, role: ["SUPER_ADMIN"] },
  { path: "/aktivitas", element: <AktivitasPengguna />, role: ["SUPER_ADMIN"] },

  // 👥 ADMINISTRATOR
  { path: "/ADMINISTRATOR/users", element: <Users />, role: ["SUPER_ADMIN"] },
];

export default routes;
