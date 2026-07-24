// frontend/src/routes/mrRoutes.jsx

import MrPlanningContextPage from "@/pages/mr/MrPlanningContextPage";
import MrPlanningRiskListPage from "@/pages/mr/MrPlanningRiskListPage";
import MrPlanningRiskForm from "@/pages/mr/MrPlanningRiskForm";
import MrPlanningRiskHistoryPage from "@/pages/mr/MrPlanningRiskHistoryPage";
import MrPlanningReportPage from "@/pages/mr/MrPlanningReportPage";
import MrPlanningMitigationListPage from "@/pages/mr/MrPlanningMitigationListPage";
import MrPlanningMitigationForm from "@/pages/mr/MrPlanningMitigationForm";
import MrPlanningMonitoringListPage from "@/pages/mr/MrPlanningMonitoringListPage";
import MrRiskManagementWizardPage from "@/pages/mr/unified/MrRiskManagementWizardPage";
import MrModuleErrorBoundary from "@/features/mr/components/MrModuleErrorBoundary";

// Modul TLHP — Pengelolaan Tindak Lanjut Temuan Inspektorat/BPK/BPKP
import MrPlanningLhpListPage from "@/pages/mr/MrPlanningLhpListPage";
import MrPlanningLhpForm from "@/pages/mr/MrPlanningLhpForm";
import MrPlanningTemuanListPage from "@/pages/mr/MrPlanningTemuanListPage";
import MrPlanningTemuanForm from "@/pages/mr/MrPlanningTemuanForm";
import MrPlanningTemuanHistoryPage from "@/pages/mr/MrPlanningTemuanHistoryPage";
import MrPlanningTindakLanjutListPage from "@/pages/mr/MrPlanningTindakLanjutListPage";
import MrPlanningTindakLanjutForm from "@/pages/mr/MrPlanningTindakLanjutForm";
import MrPlanningTlhpDashboardPage from "@/pages/mr/MrPlanningTlhpDashboardPage";

const withMrBoundary = (element) => <MrModuleErrorBoundary>{element}</MrModuleErrorBoundary>;

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
    element: withMrBoundary(<MrPlanningContextPage />),
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk",
    element: withMrBoundary(<MrPlanningRiskListPage />),
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk/create",
    element: withMrBoundary(<MrPlanningRiskForm mode="create" />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/edit/:id",
    element: withMrBoundary(<MrPlanningRiskForm mode="edit" />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/revisi/:id",
    element: withMrBoundary(<MrPlanningRiskForm mode="revisi" />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/detail/:id",
    element: withMrBoundary(<MrPlanningRiskForm mode="detail" />),
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk/:id/history",
    element: withMrBoundary(<MrPlanningRiskHistoryPage />),
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
    element: withMrBoundary(<MrPlanningMitigationListPage />),
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-risk/:riskId/mitigation/create",
    element: withMrBoundary(<MrPlanningMitigationForm mode="create" />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-risk/:riskId/mitigation/:mitigationId/edit",
    element: withMrBoundary(<MrPlanningMitigationForm mode="edit" />),
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
    element: withMrBoundary(<MrPlanningMonitoringListPage />),
    role: MR_READ_ROLES,
  },

  {
    path: "/mr/planning-report",
    element: withMrBoundary(<MrPlanningReportPage />),
    role: MR_READ_ROLES,
  },

  // =====================================================
  // MODUL TERPADU — Pengelolaan Manajemen Risiko (wizard, additive)
  // Menggabungkan MrPlanningContextPage + MrPlanningRiskForm +
  // MrPlanningReportPage jadi satu alur; route lama di atas TETAP ada.
  // =====================================================
  {
    path: "/mr/pengelolaan-risiko/:contextId?",
    element: withMrBoundary(<MrRiskManagementWizardPage />),
    role: MR_WRITE_ROLES,
  },

  // =====================================================
  // MODUL TLHP — Pengelolaan Tindak Lanjut Temuan Inspektorat/BPK/BPKP
  // =====================================================
  {
    path: "/mr/planning-lhp",
    element: withMrBoundary(<MrPlanningLhpListPage />),
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-lhp/create",
    element: withMrBoundary(<MrPlanningLhpForm />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-lhp/edit/:id",
    element: withMrBoundary(<MrPlanningLhpForm />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-lhp/:lhpId/temuan",
    element: withMrBoundary(<MrPlanningTemuanListPage />),
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-lhp/:lhpId/temuan/create",
    element: withMrBoundary(<MrPlanningTemuanForm />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-temuan/edit/:id",
    element: withMrBoundary(<MrPlanningTemuanForm />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-temuan/:id/history",
    element: withMrBoundary(<MrPlanningTemuanHistoryPage />),
    role: MR_HISTORY_ROLES,
  },
  {
    path: "/mr/planning-temuan/:temuanId/rekomendasi/:rekomendasiId/tindak-lanjut",
    element: withMrBoundary(<MrPlanningTindakLanjutListPage />),
    role: MR_READ_ROLES,
  },
  {
    path: "/mr/planning-tindak-lanjut/create/:rekomendasiId",
    element: withMrBoundary(<MrPlanningTindakLanjutForm />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/planning-tindak-lanjut/edit/:id",
    element: withMrBoundary(<MrPlanningTindakLanjutForm />),
    role: MR_WRITE_ROLES,
  },
  {
    path: "/mr/tlhp-report",
    element: withMrBoundary(<MrPlanningTlhpDashboardPage />),
    role: MR_READ_ROLES,
  },
];

export default mrRoutes;
