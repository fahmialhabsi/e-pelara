import { Link, useLocation } from 'react-router-dom';
import { Card, ListGroup } from 'react-bootstrap';

/**
 * Sidebar ringkas RKPD — pola mirip Renstra (nav + konteks), tanpa bab panjang.
 * Catatan: Link ke path yang sama dengan halaman aktif tidak memicu navigasi di SPA;
 * untuk "Ringkasan v2" kita scroll + refresh data jika sudah di dashboard.
 */
const RkpdPlanningSidebar = () => {
  const location = useLocation();

  const onDashboardClick = (e) => {
    if (location.pathname === '/dashboard-rkpd') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new CustomEvent('rkpd-dashboard:refresh'));
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="fw-bold bg-primary text-white small py-2">Menu RKPD</Card.Header>
      <ListGroup variant="flush">
        <ListGroup.Item
          action
          as={Link}
          to="/dashboard-rkpd"
          className="small"
          onClick={onDashboardClick}
        >
          📋 Dashboard RKPD
        </ListGroup.Item>
        <ListGroup.Item action as={Link} to="/dashboard-rkpd/v2/buat" className="small">
          ➕ Buat Dokumen RKPD
        </ListGroup.Item>
      </ListGroup>
    </Card>
  );
};
export default RkpdPlanningSidebar;
