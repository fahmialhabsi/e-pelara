import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import RkpdForm from "@/features/rkpd/pages/RkpdFormPage";
import RenjaDashboard from "./features/renja/pages/RenjaDashboard";
import RkaDashboard from "./features/rka/pages/RkaDashboard";
import DpaDashboard from "./features/dpa/pages/DpaDashboard";
import PengkegDashboard from "./features/pengkeg/pages/PengkegDashboard";
import MonevDashboard from "./features/monev/pages/MonevDashboard";
import LpkDispangDashboard from "./features/lpk-dispang/pages/LpkDispangDashboard";
import LkDashboard from "./features/lk-dispang/pages/LkDashboard";
import LakipDashboard from "./features/lakip/pages/LAKIPDashboard";
import CloningData from "./admin/ClonePeriodePage";
import ClonedDataTable from "./admin/ClonedDataTable";

const Login = React.lazy(() => import("./features/auth/pages/Login"));
const Register = React.lazy(() => import("./features/auth/pages/Register"));
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
                    <RkpdForm />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
            <Route
              path="dashboard-renja"
              element={
                <DokumenTahunGuard>
                  <RequireDokumenType dokType="renja">
                    <RenjaDashboard />
                  </RequireDokumenType>
                </DokumenTahunGuard>
              }
            />
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

  const isLoginOrRegister = ["/login", "/register"].includes(location.pathname);

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
