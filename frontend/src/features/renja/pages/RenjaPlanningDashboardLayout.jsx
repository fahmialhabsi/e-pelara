import RenjaPlanningSidebar from "../components/RenjaPlanningSidebar";

/** Meniru RkpdDashboardLayout / Renstra: sidebar + konten. */
const RenjaPlanningDashboardLayout = ({ children }) => (
  <div className="container-fluid">
    <div className="row">
      <div className="col-lg-3 col-xl-2 py-3 bg-light border-end">
        <RenjaPlanningSidebar />
      </div>
      <div className="col-lg-9 col-xl-10 py-3">{children}</div>
    </div>
  </div>
);

export default RenjaPlanningDashboardLayout;
