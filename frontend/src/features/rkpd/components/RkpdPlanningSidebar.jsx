import { Link, useLocation } from "react-router-dom";
import { Card, ListGroup } from "react-bootstrap";
import { useAuth } from "../../../hooks/useAuth";
import { mapRoleToEpelara } from "../../../utils/roleUtils";

/**
 * Sidebar ringkas RKPD — pola mirip Renstra (nav + konteks), tanpa bab panjang.
 * Catatan: Link ke path yang sama dengan halaman aktif tidak memicu navigasi di SPA;
 * untuk "Ringkasan v2" kita scroll + refresh data jika sudah di dashboard.
 */
const RkpdPlanningSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const canRpjmdRkpdSync = ["SUPER_ADMIN", "ADMINISTRATOR"].includes(
    mapRoleToEpelara(user?.role),
  );

  const onRingkasanClick = (e) => {
    if (location.pathname === "/dashboard-rkpd") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.dispatchEvent(new CustomEvent("rkpd-dashboard:refresh"));
    }
  };

  return (
  <Card className="border-0 shadow-sm">
    <Card.Header className="fw-bold bg-primary text-white small py-2">
      Menu RKPD
    </Card.Header>
    <ListGroup variant="flush">
      <ListGroup.Item
        action
        as={Link}
        to="/dashboard-rkpd"
        className="small"
        onClick={onRingkasanClick}
      >
        📊 Ringkasan perencanaan v2
      </ListGroup.Item>
      <ListGroup.Item action as={Link} to="/dashboard-rkpd/v2/buat" className="small">
        ➕ Buat dokumen RKPD (v2)
      </ListGroup.Item>
      <ListGroup.Item action as={Link} to="/dashboard-rkpd/form" className="small">
        📎 Entri RKPD klasik (legacy)
      </ListGroup.Item>
      {canRpjmdRkpdSync ? (
        <ListGroup.Item action as={Link} to="/rkpd/rpjmd-sync" className="small">
          🔁 Sync dari RPJMD (preview & commit)
        </ListGroup.Item>
      ) : null}
    </ListGroup>
    <Card.Body className="small text-muted border-top">
      <strong>v2</strong> = <code>rkpd_dokumen</code> / <code>rkpd_item</code>.{" "}
      <strong>Legacy</strong> = form lama / tabel RKPD hierarki — dipisah sengaja.
    </Card.Body>
  </Card>
  );
};

export default RkpdPlanningSidebar;
