import React from "react";
import { NavLink } from "react-router-dom";

export default function SidebarGlobal() {
  return (
    <aside
      style={{
        width: 230,
        background: "#22272b",
        color: "#fff",
        minHeight: "100vh",
        padding: "30px 0 0 0",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        style={{ textAlign: "center", fontWeight: "bold", marginBottom: 24 }}
      >
        e-PLANNING <br /> DISPANG MALUT
      </div>
      <nav>
        <NavLink to="/dashboard-rpjmd" style={navLinkStyle}>
          RPJMD
        </NavLink>
        <NavLink to="/dashboard-renstra" style={navLinkStyle}>
          Renstra
        </NavLink>
        <NavLink to="/dashboard-rkpd" style={navLinkStyle}>
          RKPD
        </NavLink>
        <NavLink to="/dashboard-renja" style={navLinkStyle}>
          Renja
        </NavLink>
        <NavLink to="/dashboard-dpa" style={navLinkStyle}>
          DPA
        </NavLink>
        {/* Tambahkan menu lain sesuai kebutuhan */}
      </nav>
    </aside>
  );
}

const navLinkStyle = ({ isActive }) => ({
  display: "block",
  color: isActive ? "#2b81ff" : "#fff",
  background: isActive ? "#e7f0fe" : "transparent",
  padding: "10px 24px",
  textDecoration: "none",
  borderLeft: isActive ? "4px solid #2b81ff" : "4px solid transparent",
  fontWeight: isActive ? 600 : 400,
});
