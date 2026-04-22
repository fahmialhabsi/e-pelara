import React from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}`, label: "Ringkasan" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/pendahuluan`, label: "BAB I" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/evaluasi`, label: "BAB II" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/tujuan-sasaran`, label: "BAB III" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/rencana-kerja`, label: "BAB IV" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/penutup`, label: "BAB V" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/sinkronisasi`, label: "Sinkronisasi" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/data-fix`, label: "Data Fix & Mapping" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/validasi`, label: "Validasi" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/versions`, label: "Versi" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/compare`, label: "Compare" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/export`, label: "Export" },
  { to: (id) => `/dashboard-renja/v2/dokumen/${id}/readonly`, label: "Readonly" },
];

const RenjaDokumenNavTabs = ({ id }) => (
  <div className="d-flex flex-wrap gap-2 mb-3">
    {links.map((x) => (
      <NavLink
        key={x.label}
        to={x.to(id)}
        className={({ isActive }) =>
          `btn btn-sm ${isActive ? "btn-success" : "btn-outline-success"}`
        }
      >
        {x.label}
      </NavLink>
    ))}
  </div>
);

export default RenjaDokumenNavTabs;
