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
import BusinessIcon from "@mui/icons-material/Business";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useDokumen } from "../../hooks/useDokumen";
import { useAuth } from "../../hooks/useAuth";
import { isDokumenLevelPeriode } from "../../utils/planningDokumenUtils";
import { normalizeRole } from "../../utils/roleUtils";

const drawerWidth = 220;

const SIGAP_MALUT_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SIGAP_MALUT_URL) || "";

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
  { label: "LK — Dashboard", icon: <DashboardIcon />, path: "/lk/dashboard" },
  { label: "LK — LAK", icon: <DashboardIcon />, path: "/lk/lak" },
  { label: "LK — CALK", icon: <DashboardIcon />, path: "/lk/calk" },
  { label: "LK — Generator PDF", icon: <DashboardIcon />, path: "/lk/generator" },
  { label: "LK — Kode Akun BAS", icon: <DashboardIcon />, path: "/lk/kode-akun" },
  { label: "LK — Jurnal", icon: <DashboardIcon />, path: "/lk/jurnal" },
  { label: "LK — Saldo Akun", icon: <DashboardIcon />, path: "/lk/saldo-akun" },
  { label: "LK — BKU", icon: <DashboardIcon />, path: "/lk/bku" },
  { label: "LK — LRA", icon: <DashboardIcon />, path: "/lk/lra" },
  { label: "LK — Neraca", icon: <DashboardIcon />, path: "/lk/neraca" },
  { label: "LK — Aset Tetap", icon: <DashboardIcon />, path: "/lk/aset-tetap" },
  { label: "LK — Kewajiban", icon: <DashboardIcon />, path: "/lk/kewajiban" },
  { label: "LK — Persediaan", icon: <DashboardIcon />, path: "/lk/persediaan" },
  { label: "LK — Penyusutan", icon: <DashboardIcon />, path: "/lk/penyusutan" },
  { label: "LK — LO", icon: <DashboardIcon />, path: "/lk/lo" },
  { label: "LK — LPE", icon: <DashboardIcon />, path: "/lk/lpe" },
  {
    label: "Cloning Data",
    icon: <DashboardIcon />,
    path: "/admin/clone-periode",
  },
];

export default function MuiSidebarGlobal() {
  const { dokumen, tahun } = useDokumen();
  const { user } = useAuth();
  const locked = !dokumen || !tahun;
  const isSuperAdmin = normalizeRole(user?.role) === "SUPER_ADMIN";

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
        <ListItemButton
          component={NavLink}
          to="/pricing"
          sx={{
            "&.active": {
              background: "#2b81ff33",
              color: "#2b81ff",
              fontWeight: "bold",
              borderLeft: "4px solid #2b81ff",
            },
          }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <CardMembershipIcon />
          </ListItemIcon>
          <ListItemText primary="Paket & harga" />
        </ListItemButton>
      </List>
      {isSuperAdmin && (
        <List>
          <ListItemButton
            component={NavLink}
            to="/admin/tenants"
            sx={{
              "&.active": {
                background: "#2b81ff33",
                color: "#2b81ff",
                fontWeight: "bold",
                borderLeft: "4px solid #2b81ff",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText primary="Tenant (SaaS)" />
          </ListItemButton>
          <ListItemButton
            component={NavLink}
            to="/admin/subscriptions"
            sx={{
              "&.active": {
                background: "#2b81ff33",
                color: "#2b81ff",
                fontWeight: "bold",
                borderLeft: "4px solid #2b81ff",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <AdminPanelSettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Langganan tenant" />
          </ListItemButton>
        </List>
      )}
      {isSuperAdmin && <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />}
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
              title={
                isDokumenLevelPeriode(dokumen)
                  ? "Pilih jenis dokumen di header (RPJMD/Renstra: periode otomatis)."
                  : "Silakan pilih jenis dokumen dan konteks waktu di header dahulu"
              }
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
      {!locked && (
        <>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
          <List>
            <ListItemButton
              component="a"
              href={SIGAP_MALUT_URL || undefined}
              target="_blank"
              rel="noopener noreferrer"
              disabled={!SIGAP_MALUT_URL}
              sx={{ opacity: SIGAP_MALUT_URL ? 1 : 0.5 }}
            >
              <ListItemIcon sx={{ color: "inherit" }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Buka SIGAP-MALUT" />
            </ListItemButton>
            <ListItemButton component={NavLink} to="/lk/dashboard">
              <ListItemIcon sx={{ color: "inherit" }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Sinkronisasi SIGAP (LK)" />
            </ListItemButton>
          </List>
        </>
      )}
    </Drawer>
  );
}
