// src/shared/components/TablerSidebarGlobal.js

import React from "react";
import { NavLink } from "react-router-dom";
import {
  IconBook,
  IconCalendarStats,
  IconFolder,
  IconClipboard,
  IconLayoutDashboard,
  IconArrowsExchange,
  IconFileSearch,
} from "@tabler/icons-react";
import { useAuth } from "../../hooks/useAuth";
import { normalizeRole } from "../../utils/roleUtils";

const menu = [
  { label: "RPJMD", icon: <IconBook size={22} />, path: "/dashboard-rpjmd" },
  {
    label: "Renstra",
    icon: <IconClipboard size={22} />,
    path: "/dashboard-renstra",
  },
  {
    label: "RKPD",
    icon: <IconCalendarStats size={22} />,
    path: "/dashboard-rkpd",
  },
  {
    label: "Sync RPJMD → RKPD",
    icon: <IconArrowsExchange size={22} />,
    path: "/rkpd/rpjmd-sync",
    roles: ["SUPER_ADMIN", "ADMINISTRATOR"],
  },
  {
    label: "Audit compliance",
    icon: <IconFileSearch size={22} />,
    path: "/audit/planning-compliance",
    roles: ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"],
  },
  { label: "Renja", icon: <IconFolder size={22} />, path: "/dashboard-renja" },
  {
    label: "DPA",
    icon: <IconLayoutDashboard size={22} />,
    path: "/dashboard-dpa",
  },
];

export default function TablerSidebarGlobal() {
  const { user } = useAuth();
  const roleNorm = normalizeRole(user?.role);
  const visible = menu.filter((item) => {
    if (!item.roles?.length) return true;
    return item.roles.includes(roleNorm);
  });

  return (
    <div
      style={{
        width: 220,
        background: "#212b36",
        color: "#fff",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        fontFamily: "inherit",
      }}
    >
      <div style={{ fontWeight: 700, padding: 24, fontSize: 22 }}>
        e-PLANNING <br />
        DISPANG MALUT
      </div>
      <div>
        {visible.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "11px 24px",
              color: isActive ? "#2b81ff" : "#fff",
              background: isActive ? "#2b81ff20" : "transparent",
              textDecoration: "none",
              borderLeft: isActive
                ? "4px solid #2b81ff"
                : "4px solid transparent",
              fontWeight: isActive ? 600 : 400,
              transition: "background 0.2s",
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
