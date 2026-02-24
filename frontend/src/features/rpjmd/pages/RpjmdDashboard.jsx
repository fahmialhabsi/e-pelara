import React from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "react-bootstrap";
import { useAuth } from "../../../hooks/useAuth";
import { refreshToken } from "../../../services/authService";
import DeadlinePanel from "../../../pages/notifications/Modul4_DeadlinePanel";
import { checkAuthStatus } from "../../../contexts/AuthProvider";

const RpjmdDashboard = () => {
  const { user, loading, logout } = useAuth();
  const allowedRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return <div>Loading user context...</div>;
  }

  if (!user) {
    return null;
  }

  const sidebarItems = [
    { label: "Beranda RPJMD", path: "/dashboard-rpjmd" },
    { label: "Keterkaitan RPJMD", path: "/statistik" },
    { label: "Rekap Program", path: "/rpjmd/tujuan" },
    { label: "Aktivitas Pengguna", path: "/aktivitas" },
    { label: "Notifikasi & Deadline", path: "/notifikasi" },
    { label: "Pengaturan", path: "/admin/users" },
  ];

  if (!allowedRoles.includes(user?.role)) {
    return (
      <Container className="p-5 d-flex justify-content-center align-items-center">
        <Alert variant="danger" className="text-center w-100 fw-bold fs-5">
          ❌ Anda tidak memiliki akses ke Dashboard RPJMD.
        </Alert>
      </Container>
    );
  }

  useEffect(() => {
    if (!checkAuthStatus()) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div
      className="d-flex flex-column"
      style={{ minHeight: "100vh", height: "100vh" }}
    >
      <div className="d-flex flex-grow-1" style={{ minHeight: 0 }}>
        <aside
          className="bg-dark text-white d-flex flex-column justify-content-between"
          style={{ width: 260 }}
        >
          <div className="p-3" style={{ overflowY: "auto", flex: 1 }}>
            <h5 className="text-white mb-4">Dashboard RPJMD</h5>
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `d-block py-2 px-3 rounded text-decoration-none fw-semibold ${
                    isActive
                      ? "bg-light text-dark"
                      : "text-white text-opacity-75"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="p-3 border-top border-secondary small text-white-50">
            {user?.username && (
              <>
                <div className="fw-bold text-white">👤 {user.username}</div>
                <div>{user.role}</div>
                <Button
                  onClick={async () => {
                    await logout(true);
                    navigate("/login");
                  }}
                >
                  Keluar / Logout
                </Button>
                <Button
                  className="btn btn-outline-warning btn-sm mt-2 w-100"
                  onClick={async () => {
                    try {
                      const newToken = await refreshToken();
                      alert("Token berhasil di-refresh!\n" + newToken);
                    } catch {
                      alert("Refresh token gagal, silakan login ulang.");
                    }
                  }}
                >
                  🔄 Refresh Token (Manual)
                </Button>
              </>
            )}
          </div>
        </aside>

        <main className="flex-grow-1 bg-light">
          <div
            className="p-3"
            style={{
              height: "100%",
              overflowY: "auto",
              backgroundColor: "#f8f9fa",
            }}
          >
            {location.pathname === "/notifikasi" ? (
              <DeadlinePanel />
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      <footer className="bg-dark text-white-50 text-center py-2 small">
        © 2025 Pemerintah Daerah
      </footer>
    </div>
  );
};

export default RpjmdDashboard;
