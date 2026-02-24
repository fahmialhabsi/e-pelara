import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import Register from "./components/pages/Register";
import Login from "./components/pages/Login";
import Dashboard from "./components/dashboards";
import Users from "./components/Users";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationProvider";
import { FilterProvider } from "./contexts/FilterContext";
import { MonevProvider } from "./monev/context/MonevContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Dashboard Utama
import { CascadingForm } from "./components/CascadingForm";

// File Utama Dalam Sidebaar
import OpdListst from "./components/OpdList";
import TujuanList from "./components/TujuanList";
import SasaranList from "./components/SasaranList";
import StrategiList from "./components/StrategiList";
import ArahList from "./components/ArahKebijakanList.js";
import PrionasList from "./components/PrioritasNasionalList";
import PriodaList from "./components/PrioritasDaerahList";
import PriogubList from "./components/PrioritasGubernurList";
import ProgramList from "./components/ProgramPrioritasList";
import KegiatanList from "./components/KegiatanList";
import IndikatorList from "./components/IndikatorList";
import { CascadingList } from "./components/CascadingList";

// Monitoring Dashboard Layout & Pages
import Layout from "./components/Layout";
import DashboardHome from "./components/dashboards/DashboardHome";
import KeterkaitanPage from "./components/pages/KeterkaitanPage";
import RekapPage from "./components/pages/RekapPage";
import AktivitasPage from "./components/pages/AktivitasPage";
import NotifikasiPage from "./components/pages/NotifikasiPage";
import SettingsPage from "./components/pages/SettingsPage";

// Monev Nested Pages
import DashboardMonev from "./monev/pages/DashboardMonev";
import UploadExcelPage from "./monev/pages/UploadExcelPage";
import FormInputRealisasi from "./monev/pages/FormInputRealisasi";
import LaporanMonevPage from "./monev/pages/LaporanMonevPage";
import FilterSasaran from "./monev/components/FilterSasaran";
import GrafikCapaian from "./monev/components/GrafikCapaian";
import TabelRealisasi from "./monev/components/TabelRealisasi";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <FilterProvider>
          <MonevProvider>
            <Router>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Dashboard Utama */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                {/* File Utama Dalam Sidebaar */}
                <Route
                  path="/OpdList"
                  element={
                    <ProtectedRoute>
                      <OpdListst />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tujuan-list"
                  element={
                    <ProtectedRoute>
                      <TujuanList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sasaran-list"
                  element={
                    <ProtectedRoute>
                      <SasaranList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/strategi-list"
                  element={
                    <ProtectedRoute>
                      <StrategiList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/arahkebijakan-list"
                  element={
                    <ProtectedRoute>
                      <ArahList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/prioritas-nasional-list"
                  element={
                    <ProtectedRoute>
                      <PrionasList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/prioritas-daerah-list"
                  element={
                    <ProtectedRoute>
                      <PriodaList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/prioritas-gubernur-list"
                  element={
                    <ProtectedRoute>
                      <PriogubList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/program-list"
                  element={
                    <ProtectedRoute>
                      <ProgramList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kegiatan-list"
                  element={
                    <ProtectedRoute>
                      <KegiatanList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/indikator-list"
                  element={
                    <ProtectedRoute>
                      <IndikatorList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cascading"
                  element={
                    <ProtectedRoute>
                      <CascadingForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cascading-list"
                  element={
                    <ProtectedRoute>
                      <CascadingList />
                    </ProtectedRoute>
                  }
                />
                {/* Monitoring App Routes */}
                <Route
                  path="/app/*"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardHome />} />
                  <Route path="keterkaitan" element={<KeterkaitanPage />} />
                  <Route path="rekap" element={<RekapPage />} />
                  <Route path="aktivitas" element={<AktivitasPage />} />
                  <Route path="notifikasi" element={<NotifikasiPage />} />
                  <Route path="settings" element={<SettingsPage />} />

                  {/* Monev Nested */}
                  <Route path="monev" element={<Outlet />}>
                    <Route index element={<DashboardMonev />} />
                    <Route path="upload" element={<UploadExcelPage />} />
                    <Route path="input" element={<FormInputRealisasi />} />
                    <Route path="laporan" element={<LaporanMonevPage />} />
                    <Route path="filter" element={<FilterSasaran />} />
                    <Route path="grafik" element={<GrafikCapaian />} />
                    <Route path="tabel" element={<TabelRealisasi />} />
                  </Route>
                </Route>

                {/* Admin-only */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <Users />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback to Login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </MonevProvider>
        </FilterProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
