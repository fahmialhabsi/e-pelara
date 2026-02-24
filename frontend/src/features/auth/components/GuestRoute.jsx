import { useAuth } from "../../../hooks/useAuth";
import { useDokumen } from "../../../hooks/useDokumen";
import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  console.log("[GuestRoute]", { user, loading });
  const { dokumen } = useDokumen();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" />
      </div>
    );
  }

  if (user) {
    const jenis_dokumen = dokumen || user.jenis_dokumen || "";
    if (jenis_dokumen) {
      const jenisToPath = {
        rpjmd: "/dashboard-rpjmd",
        renstra: "/dashboard-renstra",
        rkpd: "/dashboard-rkpd",
        renja: "/dashboard-renja",
        rka: "/dashboard-rka",
        dpa: "/dashboard-dpa",
        pengkeg: "/dashboard-pengelolaan",
        "lpk-dispang": "/dashboard-lpk-dispang",
        "lk-dispang": "/dashboard-lk-dispang",
        lakip: "/dashboard-lakip",
        monev: "/dashboard-monev",
      };
      const path = jenisToPath[jenis_dokumen.toLowerCase()] || "/";
      return <Navigate to={path} replace />;
    }
  }

  return children;
};

export default GuestRoute;
