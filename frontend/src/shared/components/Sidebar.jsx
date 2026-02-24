// Sidebar.js
import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Avatar,
} from "@mui/material";
import { useAuth } from "../../contexts/authContext";
import { useDokumen } from "../../contexts/DokumenContext";
import sidebarConfig from "../../config/sidebarConfig";
import { NavLink } from "react-router-dom";
import Logo from "../../assets/logo.png";

const drawerWidth = 250;

export default function Sidebar() {
  const { user } = useAuth();
  const { dokumen } = useDokumen();
  const role = user?.role;

  if (!role || !sidebarConfig[role]) return null;

  // Helper untuk active NavLink
  const linkStyle = ({ isActive }) => ({
    color: "#43ea6c",
    fontWeight: isActive ? 700 : 500,
    background: isActive ? "#222b23" : "none",
    borderRadius: 12,
    textDecoration: "none",
    paddingLeft: 12,
    paddingRight: 12,
    display: "flex",
    alignItems: "center",
  });

  // Sidebar MUI
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "#181920",
          color: "#43ea6c",
        },
      }}
      open
    >
      {/* Logo/Header */}
      <Box display="flex" flexDirection="column" alignItems="center" py={3}>
        <Avatar src={Logo} alt="Logo" sx={{ width: 70, height: 70, mb: 1 }} />
        <Typography variant="h6" fontWeight="bold" color="#43ea6c">
          Pengelolaan RPJMD
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
      {/* Menu Dinamis */}
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {sidebarConfig[role].map((section, idx) => {
          // Hanya tampilkan menu jika dokumen aktif dan sesuai allowedDokumen
          const filteredItems = section.items.filter(
            (item) =>
              !item.allowedDokumen ||
              (dokumen &&
                item.allowedDokumen
                  .map((x) => x.toLowerCase())
                  .includes(dokumen.toLowerCase()))
          );
          if (filteredItems.length === 0) return null;
          return (
            <Box key={idx} mb={2}>
              <Typography
                variant="overline"
                sx={{
                  color: "#43ea6c",
                  px: 2,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {section.group}
              </Typography>
              <List dense>
                {filteredItems.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <NavLink to={item.path} style={linkStyle}>
                      <ListItemButton sx={{ pl: 1 }}>
                        {item.icon && (
                          <ListItemIcon sx={{ color: "#43ea6c", minWidth: 36 }}>
                            {item.icon}
                          </ListItemIcon>
                        )}
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ sx: { color: "#43ea6c" } }}
                        />
                      </ListItemButton>
                    </NavLink>
                  </ListItem>
                ))}
              </List>
            </Box>
          );
        })}
      </Box>
      <Divider sx={{ bgcolor: "rgba(255, 255, 255, 0.08)" }} />
      <Box py={2} textAlign="center" fontSize={13} sx={{ color: "#43ea6c" }}>
        &copy; 2025 Pemerintah Daerah
      </Box>
    </Drawer>
  );
}
