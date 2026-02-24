import { useAuth } from "../../../hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { normalizeRole } from "../../../utils/roleUtils";

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Memuat pengguna...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect ke login, dengan state "from" untuk smart redirect setelah login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // === Cek role jika role di-prop-kan ===
  if (role) {
    const userRole = normalizeRole(user.role);
    const allowedRoles = Array.isArray(role)
      ? role.map(normalizeRole)
      : [normalizeRole(role)];
    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="p-4 text-danger text-center">
          <h5>🚫 Akses Ditolak</h5>
          <p>
            Role <strong>{user.role}</strong> tidak memiliki izin ke halaman
            ini.
          </p>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
