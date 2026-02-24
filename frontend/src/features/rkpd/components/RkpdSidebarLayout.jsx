// src/features/rkpd/components/RkpdSidebarLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CSidebar,
  CSidebarNav,
} from "@coreui/react";

const RkpdSidebarLayout = () => {
  return (
    <div className="d-flex">
      <CSidebar className="vh-100 border-end" visible>
        <CSidebarNav>
          <div className="p-3 fw-bold">e-PeLARA</div>
          <nav className="nav flex-column px-3">
            <a href="/dashboard-rkpd" className="nav-link">
              Dashboard RKPD
            </a>
            <a href="/dashboard-rkpd/form" className="nav-link">
              Tambah RKPD
            </a>
          </nav>
        </CSidebarNav>
      </CSidebar>

      <div className="flex-grow-1">
        <CHeader className="bg-white border-bottom">
          <CHeaderBrand>Ringkasan RKPD</CHeaderBrand>
        </CHeader>
        <CContainer className="my-4">
          <Outlet />
        </CContainer>
      </div>
    </div>
  );
};

export default RkpdSidebarLayout;
