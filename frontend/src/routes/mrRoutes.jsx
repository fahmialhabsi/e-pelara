// frontend/src/routes/mrRoutes.jsx

import MrPlanningContextPage from "@/pages/mr/MrPlanningContextPage";
import MrPlanningRiskListPage from "@/pages/mr/MrPlanningRiskListPage";
import MrPlanningRiskForm from "@/pages/mr/MrPlanningRiskForm";
import MrPlanningRiskHistoryPage from "@/pages/mr/MrPlanningRiskHistoryPage";
import MrPlanningReportPage from "@/pages/mr/MrPlanningReportPage";
import MrPlanningMitigationListPage from "@/pages/mr/MrPlanningMitigationListPage";
import MrPlanningMitigationForm from "@/pages/mr/MrPlanningMitigationForm";
import MrPlanningMonitoringListPage from "@/pages/mr/MrPlanningMonitoringListPage";

const MR_READ_ROLES = [
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "PENGAWAS",
  "PELAKSANA",
];

const MR_WRITE_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];

const MR_HISTORY_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];

const mrRoutes = [
  {
    path: "/mr/planning-context",
    element: <MrPlanningContextPage />,
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk",
    element: <MrPlanningRiskListPage />,
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk/create",
    element: <MrPlanningRiskForm mode="create" />,
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/edit/:id",
    element: <MrPlanningRiskForm mode="edit" />,
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/revisi/:id",
    element: <MrPlanningRiskForm mode="revisi" />,
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/detail/:id",
    element: <MrPlanningRiskForm mode="detail" />,
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk/:id/history",
    element: <MrPlanningRiskHistoryPage />,
    role: MR_HISTORY_ROLES,
  },

  // STEP R17B-4C-3
  // Halaman Rencana Tindak Pengendalian / Mitigasi Risiko.
  // Guard:
  // - Halaman ini membaca data rencana tindak pengendalian dari backend.
  // - Istilah UI memakai bahasa pemerintahan.
  // - Tidak menghitung substansi laporan di frontend.
  {
    path: "/mr/planning-risk/:riskId/mitigation",
    element: <MrPlanningMitigationListPage />,
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk/:riskId/mitigation/create",
    element: <MrPlanningMitigationForm mode="create" />,
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/:riskId/mitigation/:mitigationId/edit",
    element: <MrPlanningMitigationForm mode="edit" />,
    role: MR_WRITE_ROLES,
  },

  // STEP R17B-4C-3
  // Halaman Realisasi / Pemantauan Pengendalian.
  // Guard:
  // - Halaman ini membaca data pemantauan dari backend.
  // - Data ini menjadi dasar Lampiran 5 dan Lampiran 6 pada laporan.
  // - Tidak menghitung substansi laporan di frontend.
  {
    path: "/mr/planning-risk/:riskId/monitoring",
    element: <MrPlanningMonitoringListPage />,
    role: MR_READ_ROLES,
  },

  {
    path: "/mr/planning-report",
    element: <MrPlanningReportPage />,
    role: MR_READ_ROLES,
  },
];

export default mrRoutes;