// src/MyMenu.js
import * as React from "react";
import { Menu } from "react-admin";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ListIcon from "@mui/icons-material/List";
import { useAuth } from "./contexts/AuthContext";

const MyMenu = () => {
  const { user } = useAuth();

  const items = [
    { to: "/home", label: "Home", icon: <DashboardIcon />, roles: [] },
    {
      to: "/rpjmd",
      label: "Rpjmd",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN", "ADMINISTRATOR"],
    },
    { to: "/dpa", label: "DPA", icon: <ListIcon />, roles: ["SUPER_ADMIN"] },
    {
      to: "/lakip",
      label: "Lakip",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN"],
    },
    {
      to: "/lk",
      label: "Laporan Keuangan",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN"],
    },
    {
      to: "/lpk",
      label: "Pengelolaan Keuangan",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN"],
    },
    {
      to: "/monev",
      label: "Monitoring & Evaluasi",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN"],
    },
    {
      to: "/pengelolaan",
      label: "Pengelolaan Kegiatan",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN"],
    },
    {
      to: "/renja",
      label: "Renja",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN"],
    },
    {
      to: "/renstra",
      label: "Renstra",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN", "ADMINISTRATOR"],
    },
    {
      to: "/rkpd",
      label: "RKPD",
      icon: <ListIcon />,
      roles: ["SUPER_ADMIN", "ADMINISTRATOR"],
    },
  ];

  return (
    <Menu>
      <Menu.DashboardItem />
      {items.map(
        (item, idx) =>
          (!item.roles.length || item.roles.includes(user?.role)) && (
            <Menu.Item
              key={idx}
              to={item.to}
              primaryText={item.label}
              leftIcon={item.icon}
            />
          )
      )}
    </Menu>
  );
};

export default MyMenu;
