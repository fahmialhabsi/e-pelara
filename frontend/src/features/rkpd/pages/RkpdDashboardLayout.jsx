import RkpdPlanningSidebar from "../components/RkpdPlanningSidebar";

/** Meniru grid Dashboard Renstra: sidebar kiri + konten. */
const RkpdDashboardLayout = ({ children }) => (
  <div className="container-fluid">
    <div className="row">
      <div className="col-lg-3 col-xl-2 py-3 bg-light border-end">
        <RkpdPlanningSidebar />
      </div>
      <div className="col-lg-9 col-xl-10 py-3">{children}</div>
    </div>
  </div>
);

export default RkpdDashboardLayout;
