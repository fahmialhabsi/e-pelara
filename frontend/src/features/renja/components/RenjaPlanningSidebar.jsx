import { Link, useLocation } from "react-router-dom";
import { Card, ListGroup } from "react-bootstrap";

const RenjaPlanningSidebar = () => {
  const location = useLocation();

  const onDashboardClick = (e) => {
    if (location.pathname === "/dashboard-renja") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.dispatchEvent(new CustomEvent("renja-dashboard:refresh"));
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="fw-bold bg-success text-white small py-2">
        Menu Modul RENJA
      </Card.Header>
      <ListGroup variant="flush">
        <ListGroup.Item action as={Link} to="/dashboard-renja" className="small" onClick={onDashboardClick}>
          Dashboard RENJA
        </ListGroup.Item>
        <ListGroup.Item action as={Link} to="/dashboard-renja" className="small">
          Dokumen RENJA
        </ListGroup.Item>
        <ListGroup.Item action as={Link} to="/dashboard-renja/v2/buat" className="small">
          Buat RENJA Baru
        </ListGroup.Item>
        <ListGroup.Item action as={Link} to="/dashboard-renja" className="small">
          Data Fix & Mapping
        </ListGroup.Item>
        <ListGroup.Item action as={Link} to="/dashboard-renja" className="small">
          RENJA Perubahan
        </ListGroup.Item>
        <ListGroup.Item action as={Link} to="/dashboard-renja" className="small">
          Approval / Review
        </ListGroup.Item>
        <ListGroup.Item action as={Link} to="/dashboard-renja" className="small">
          Export / Cetak Dokumen
        </ListGroup.Item>
      </ListGroup>
      <Card.Body className="small text-muted border-top">
        Sumber metrik: <strong>renja_dokumen</strong>, <strong>renja_item</strong>,{" "}
        <strong>renja_rkpd_item_map</strong>, <strong>renja_dokumen_version</strong>.
      </Card.Body>
    </Card>
  );
};

export default RenjaPlanningSidebar;
