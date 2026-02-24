import * as React from "react";
import { NavLink } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TodayIcon from "@mui/icons-material/Today";
import FolderIcon from "@mui/icons-material/Folder";
import { useDokumen } from "../../hooks/useDokumen";

const drawerWidth = 220;

const menuItems = [
  { label: "RPJMD", icon: <MenuBookIcon />, path: "/dashboard-rpjmd" },
  { label: "Renstra", icon: <AssignmentIcon />, path: "/dashboard-renstra" },
  { label: "RKPD", icon: <TodayIcon />, path: "/dashboard-rkpd" },
  { label: "Renja", icon: <FolderIcon />, path: "/dashboard-renja" },
  { label: "RKA", icon: <DashboardIcon />, path: "/dashboard-rka" },
  { label: "DPA", icon: <DashboardIcon />, path: "/dashboard-dpa" },
  {
    label: "Penatausahaan",
    icon: <DashboardIcon />,
    path: "/dashboard-penatausahaan",
  },
  { label: "BMD", icon: <DashboardIcon />, path: "/dashboard-bmd" },
  { label: "PENGKEG", icon: <DashboardIcon />, path: "/dashboard-pengelolaan" },
  { label: "Monev", icon: <DashboardIcon />, path: "/dashboard-monev" },
  {
    label: "LPK-Dispang",
    icon: <DashboardIcon />,
    path: "/dashboard-lpk-dispang",
  },
  {
    label: "LK-Dispang",
    icon: <DashboardIcon />,
    path: "/dashboard-lk-dispang",
  },
  { label: "LAKIP", icon: <DashboardIcon />, path: "/dashboard-lakip" },
  {
    label: "Cloning Data",
    icon: <DashboardIcon />,
    path: "/admin/clone-periode",
  },
];

export default function MuiSidebarGlobal() {
  const { dokumen, tahun } = useDokumen();
  const locked = !dokumen || !tahun;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          background: "#212b36",
          color: "#fff",
        },
      }}
    >
      <div className="hide-on-print" style={{ padding: 24 }}>
        <div style={{ fontWeight: "bold", fontSize: 20 }}>e-PeLARA</div>
        <div style={{ fontSize: 12, color: "#b0bec5", marginTop: 4 }}>
          elektronik Perencanaan, Eksesuksi, Laporan & Rangkuman
        </div>
      </div>
      <Divider />
      <List>
        {menuItems.map((item) =>
          locked ? (
            <ListItem
              key={item.label}
              sx={{
                opacity: 0.5,
                cursor: "not-allowed",
                pointerEvents: "none",
                userSelect: "none",
              }}
              title="Silakan pilih jenis dokumen dan tahun dahulu"
            >
              <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ) : (
            <ListItemButton
              key={item.label}
              component={NavLink}
              to={item.path}
              sx={{
                "&.active": {
                  background: "#2b81ff33",
                  color: "#2b81ff",
                  fontWeight: "bold",
                  borderLeft: "4px solid #2b81ff",
                },
              }}
            >
              <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          )
        )}
      </List>
    </Drawer>
  );
}
