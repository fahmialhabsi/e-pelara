// ==== src/features/rpjmd/layouts/RpjmdLayout.js ====
import React from "react";
import { Outlet } from "react-router-dom";
import SidebarMenu from "../../../shared/components/SidebarMenu";
import Header from "../../../shared/components/Header";

const RpjmdLayout = () => {
  return (
    <div className="d-flex">
      <SidebarMenu menu="rpjmd" />
      <div className="flex-grow-1 d-flex flex-column min-vh-100 bg-light">
        <Header />
        <main className="flex-grow-1 p-3">
          <Outlet />
        </main>
        <footer className="text-center py-3 border-top text-muted small">
          © 2025 Dinas Pangan - RPJMD
        </footer>
      </div>
    </div>
  );
};

export default RpjmdLayout;
