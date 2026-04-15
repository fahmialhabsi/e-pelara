import React, { Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { ConfigProvider, App as AntdApp } from "antd";
import AuthProvider from "./contexts/AuthProvider";
import { NotificationProvider } from "./contexts/NotificationProvider";
import { FilterProvider } from "./contexts/FilterContext";
import { MonevProvider } from "./features/monev/context/MonevContext";
import { DokumenProvider } from "./contexts/DokumenProvider";
import { useDokumen } from "./hooks/useDokumen";
import { PeriodeProvider } from "./contexts/PeriodeContext";
import {
  PeriodeAktifProvider,
  usePeriodeAktif,
} from "./features/rpjmd/hooks/usePeriodeAktif";
import { useAuth } from "./hooks/useAuth";

import GlobalDokumenTahunPickerModal from "./shared/components/GlobalDokumenTahunPickerModal";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import GuestRoute from "./features/auth/components/GuestRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import KegiatanNestedView from "./shared/components/KegiatanNestedView";

import rpjmdRoutes from "./config/routes";
import renstraRoutes from "./routes/renstraRoutes";
import RkpdSidebarLayout from "@/features/rkpd/components/RkpdSidebarLayout";
import RkpdDashboard from "./features/rkpd/pages/RkpdDashboard";
import RkpdDashboardLayout from "./features/rkpd/pages/RkpdDashboardLayout";
import RkpdForm from "@/features/rkpd/pages/RkpdFormPage";
import RkpdV2BuatDokumenPage from "./features/rkpd/pages/RkpdV2BuatDokumenPage";
import RkpdV2DokumenDetailPage from "./features/rkpd/pages/RkpdV2DokumenDetailPage";
import RenjaBuatDokumenPage from "./features/renja/pages/RenjaBuatDokumenPage";
import RenjaDokumenDetailPage from "./features/renja/pages/RenjaDokumenDetailPage";
import RenjaDashboardV3Page from "./features/renja/pages/RenjaDashboardV3Page";
import RenjaSectionEditorPage from "./features/renja/pages/RenjaSectionEditorPage";
import RenjaRencanaKerjaPage from "./features/renja/pages/RenjaRencanaKerjaPage";
import RenjaVersionsPage from "./features/renja/pages/RenjaVersionsPage";
import RenjaComparePage from "./features/renja/pages/RenjaComparePage";
import RenjaValidationPage from "./features/renja/pages/RenjaValidationPage";
import RenjaSinkronisasiPage from "./features/renja/pages/RenjaSinkronisasiPage";
import RenjaExportPage from "./features/renja/pages/RenjaExportPage";
import RenjaReadonlyDetailPage from "./features/renja/pages/RenjaReadonlyDetailPage";
import RkaDashboard from "./features/rka/pages/RkaDashboard";
import RkaFormPage from "./features/rka/pages/RkaFormPage";
import DpaDashboard from "./features/dpa/pages/DpaDashboard";
import DpaFormPage from "./features/dpa/pages/DpaFormPage";
import PengkegDashboard from "./features/pengkeg/pages/PengkegDashboard";
import MonevDashboard from "./features/monev/pages/MonevDashboard";
import LpkDispangDashboard from "./features/lpk-dispang/pages/LpkDispangDashboard";
import LkDashboard from "./features/lk-dispang/pages/LkDashboard";
import LakipDashboard from "./features/lakip/pages/LAKIPDashboard";
import CloningData from "./admin/ClonePeriodePage";
import ClonedDataTable from "./admin/ClonedDataTable";

const Login = React.lazy(() => import("./features/auth/pages/Login"));
const Register = React.lazy(() => import("./features/auth/pages/Register"));
const ForgotPassword = React.lazy(() =>
  import("./features/auth/pages/ForgotPassword"),
);
const ResetPassword = React.lazy(() =>
  import("./features/auth/pages/ResetPassword"),
);
const DashboardLayoutGlobal = React.lazy(
  () => import("./layouts/DashboardLayoutGolbal"),
);
const DashboardHome = React.lazy(
  () => import("./features/rpjmd/pages/DashboardHome"),
);
const DashboardUtamaRpjmd = React.lazy(
  () => import("./features/rpjmd/pages/DashboardUtamaRpjmd"),
);
const DashboardLayout = React.lazy(
  () => import("./features/renstra/pages/DashboardLayout"),
);
const RenstraDashboard = React.lazy(
  () => import("./features/renstra/pages/RenstraDashboard"),
);

const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));

const KodeAkunPage = React.lazy(() => import("./features/lk/pages/KodeAkunPage"));
const LkJurnalPage = React.lazy(() => import("./features/lk/pages/JurnalPage"));
const LkJurnalFormPage = React.lazy(() => import("./features/lk/pages/JurnalFormPage"));
const SaldoAkunPage = React.lazy(() => import("./features/lk/pages/SaldoAkunPage"));
const BkuPage = React.lazy(() => import("./features/lk/pages/BkuPage"));
const BkuFormPage = React.lazy(() => import("./features/lk/pages/BkuFormPage"));
const BkuCetakPage = React.lazy(() => import("./features/lk/pages/BkuCetakPage"));
const BkuUpPage = React.lazy(() => import("./features/lk/pages/BkuUpPage"));
const LraPage = React.lazy(() => import("./features/lk/pages/LraPage"));
const NeracaPage = React.lazy(() => import("./features/lk/pages/NeracaPage"));
const AsetTetapPage = React.lazy(() => import("./features/lk/pages/AsetTetapPage"));
const KewajibanPage = React.lazy(() => import("./features/lk/pages/KewajibanPage"));
const PersediaanPage = React.lazy(() => import("./features/lk/pages/PersediaanPage"));
const LoPage = React.lazy(() => import("./features/lk/pages/LoPage"));
const LpePage = React.lazy(() => import("./features/lk/pages/LpePage"));
const PenyusutanPage = React.lazy(() => import("./features/lk/pages/PenyusutanPage"));
const LkDashboardPage = React.lazy(() => import("./features/lk/pages/LkDashboardPage"));
const LakPage = React.lazy(() => import("./features/lk/pages/LakPage"));
const CalkPage = React.lazy(() => import("./features/lk/pages/CalkPage"));
const LkGeneratorPage = React.lazy(() => import("./features/lk/pages/LkGeneratorPage"));

function RequireDokumenType({ dokType, children }) {
  const { dokumen } = useDokumen();
  if (!dokumen) return null;
  if (dokumen.toLowerCase() !== dokType) return <Navigate to="/" replace />;
  return children;
}

function DokumenTahunGuard({ children }) {
  const { dokumen, tahun } = useDokumen();
  return (
    <>
      {!dokumen || !tahun ? (
        <GlobalDokumenTahunPickerModal forceOpen />
      ) : (
        children
      )}
    </>
  );
}

/** Deep link: /dashboard-rpjmd/wizard?from=…&sasaran_id=… → dashboard + menu wizard + query */
function RpjmdWizardDeepLinkRedirect() {
  const [searchParams] = useSearchParams();
  const merged = new URLSearchParams();
  searchParams.forEach((v, k) => merged.set(k, v));
  merged.set("menu", "indikator_rpjmd");
  return <Navigate to={`/dashboard-rpjmd?${merged.toString()}`} replace />;
}

const Providers = ({ children }) => (
  <NotificationProvider>
    <FilterProvider>
      <MonevProvider>{children}</MonevProvider>
    </FilterProvider>
  </NotificationProvider>
);

function InnerApp() {
  const location = useLocation();
  const {
    dokumen,
    tahun,
    periode_id,
    loading: periodeLoading,
  } = usePeriodeAktif();

  if (periodeLoading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
        <p>Memuat tahap periode...</p>
      </div>
    );
  }

  // Hanya blokir jika dokumen+tahun sudah dipilih tapi periode tidak ditemukan
  if (dokumen && tahun && !periode_id) {
    return (
      <div className="text-center mt-5 text-danger">
        <p>Gagal memuat periode aktif.</p>
      </div>
    );
  }

  return (
    <Providers>
      <ToastContainer position="top-right" autoClose={3000} />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PeriodeProvider>
                  <DashboardLayoutGlobal />
                </PeriodeProvider>
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <DokumenTahunGuard>
                  <DashboardHome />
                </DokumenTahunGuard>
              }
            />

            <Route
              path="dashboard-rpjmd"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rpjmd">
                    <DashboardUtamaRpjmd key={`rpjmd-${tahun}`} />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-rpjmd/wizard"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rpjmd">
                    <RpjmdWizardDeepLinkRedirect />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renstra"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renstra">
                    <DashboardLayout>
                      <RenstraDashboard />
                    </DashboardLayout>
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />

            <Route
              path="dashboard-rkpd"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rkpd">
                    <RkpdDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />

            <Route
              path="dashboard-rkpd/form"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rkpd">
                    <RkpdDashboardLayout>
                      <RkpdForm />
                    </RkpdDashboardLayout>
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-rkpd/form/:id"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rkpd">
                    <RkpdDashboardLayout>
                      <RkpdForm />
                    </RkpdDashboardLayout>
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-rkpd/v2/buat"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rkpd">
                    <RkpdV2BuatDokumenPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-rkpd/v2/dokumen/:id"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rkpd">
                    <RkpdV2DokumenDetailPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaDashboardV3Page />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/buat"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaBuatDokumenPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaDokumenDetailPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/:section"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaSectionEditorPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/rencana-kerja"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaRencanaKerjaPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/sinkronisasi"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaSinkronisasiPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/validasi"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaValidationPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/versions"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaVersionsPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/compare"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaComparePage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/export"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaExportPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja/v2/dokumen/:id/readonly"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaReadonlyDetailPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route path="renja/dashboard" element={<Navigate to="/dashboard-renja" replace />} />
            <Route path="renja" element={<Navigate to="/dashboard-renja" replace />} />
            <Route path="renja/create" element={<Navigate to="/dashboard-renja/v2/buat" replace />} />
            <Route
              path="dashboard-rka"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rka">
                    <RkaDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="rka/form/:id"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="rka">
                    <RkaFormPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-dpa"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="dpa">
                    <DpaDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dpa/form/:id"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="dpa">
                    <DpaFormPage />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-pengelolaan"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="pengkeg">
                    <PengkegDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-pengelolaan"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="pengkeg">
                    <PengkegDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-monev"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="monev">
                    <MonevDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-lpk-dispang"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="lpk-dispang">
                    <LpkDispangDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-lk-dispang"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="lk-dispang">
                    <LkDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-lakip"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="lakip">
                    <LakipDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route path="lk/dashboard" element={<LkDashboardPage />} />
            <Route path="lk/lak" element={<LakPage />} />
            <Route path="lk/calk" element={<CalkPage />} />
            <Route path="lk/generator" element={<LkGeneratorPage />} />
            <Route path="lk/kode-akun" element={<KodeAkunPage />} />
            <Route path="lk/jurnal" element={<LkJurnalPage />} />
            <Route path="lk/jurnal/baru" element={<LkJurnalFormPage />} />
            <Route path="lk/jurnal/:id" element={<LkJurnalFormPage />} />
            <Route path="lk/saldo-akun" element={<SaldoAkunPage />} />
            <Route path="lk/bku/baru" element={<BkuFormPage />} />
            <Route path="lk/bku/cetak" element={<BkuCetakPage />} />
            <Route path="lk/bku/up" element={<BkuUpPage />} />
            <Route path="lk/bku/:id" element={<BkuFormPage />} />
            <Route path="lk/bku" element={<BkuPage />} />
            <Route path="lk/lra" element={<LraPage />} />
            <Route path="lk/neraca" element={<NeracaPage />} />
            <Route path="lk/aset-tetap" element={<AsetTetapPage />} />
            <Route path="lk/kewajiban" element={<KewajibanPage />} />
            <Route path="lk/persediaan" element={<PersediaanPage />} />
            <Route path="lk/lo" element={<LoPage />} />
            <Route path="lk/lpe" element={<LpePage />} />
            <Route path="lk/penyusutan" element={<PenyusutanPage />} />
            <Route
              path="clone-periode"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="clonedata">
                    <CloningData />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="clone-periode/hasil"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="clonedata">
                    <ClonedDataTable />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            {/* Inject dynamic routes here */}
            {[...rpjmdRoutes, ...renstraRoutes].map(
              ({ path, element, role }, index) => (
                <Route
                  key={index}
                  path={path}
                  element={
                    <DokumenTahunGuard>
                      <ProtectedRoute role={role}>{element}</ProtectedRoute>
                    </DokumenTahunGuard>
                  }
                />
              ),
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </Providers>
  );
}

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { dokumen, tahun } = useDokumen();

  const isLoginOrRegister = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(location.pathname);

  if (authLoading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
        <p>Mengecek status login...</p>
      </div>
    );
  }

  if (!user && !isLoginOrRegister) {
    return <Navigate to="/login" replace />;
  }

  if (user && (!dokumen || !tahun)) {
    return <GlobalDokumenTahunPickerModal forceOpen />;
  }

  // ✅ Perbaikan utama di sini:
  if (isLoginOrRegister) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <PeriodeAktifProvider>
      <InnerApp />
    </PeriodeAktifProvider>
  );
};

// jika perlu

const AppWithAuth = () => {
  const { setDokumen, setTahun } = useDokumen();

  return (
    <AuthProvider
      onLoginResetDokumen={() => {
        const dok = sessionStorage.getItem("dokumenTujuan");
        const thn = sessionStorage.getItem("tahun");
        if (dok) setDokumen(dok);
        if (thn) setTahun(thn);
      }}
    >
      <AppContent /> {/* <-- penting: bukan InnerApp */}
    </AuthProvider>
  );
};

const AppRoot = () => {
  return (
    <ConfigProvider
      theme={{ token: { colorPrimary: "#10b981", borderRadius: 6 } }}
    >
      <AntdApp>
        <DokumenProvider>
          <AppWithAuth />
        </DokumenProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default AppRoot;
