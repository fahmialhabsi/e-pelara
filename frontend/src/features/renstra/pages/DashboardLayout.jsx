// src/features/renstra/pages/DashboardLayout.js

import React from "react";
import RenstraSidebar from "./RenstraSidebar";
import "../../../style/RenstraSidebar.css";

const DashboardLayout = ({ children }) => (
  <div className="container-fluid">
    <div className="row">
      {/* Sidebar sticky di kiri */}
      <div className="col-lg-3 col-xl-2 py-3 bg-white">
        <RenstraSidebar />
      </div>
      {/* Konten utama dashboard */}
      <div className="col-lg-9 col-xl-10 py-3">{children}</div>
    </div>
  </div>
);

export default DashboardLayout;
