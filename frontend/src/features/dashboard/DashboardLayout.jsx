// src/features/dashboard/DashboardLayout.js
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../shared/components/Sidebar";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../../contexts/AuthContext";
import Logo from "../../assets/logo.png";

const drawerWidth = 250;

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <Box sx={{ display: "flex", bgcolor: "#f5f6fa", minHeight: "100vh" }}>
      <Sidebar />

      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: "none",
          bgcolor: "#222b23",
          color: "#43ea6c",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: 56,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center">
            <Avatar src={Logo} sx={{ width: 32, height: 32, mr: 1 }} />
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "#43ea6c", letterSpacing: 1 }}
            >
              DASHBOARD RPJMD
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <IconButton color="inherit">
              <NotificationsIcon />
            </IconButton>
            <Tooltip title={user?.username || ""}>
              <IconButton color="inherit" onClick={handleMenu}>
                <Avatar
                  sx={{
                    bgcolor: "#43ea6c",
                    color: "#181920",
                    width: 32,
                    height: 32,
                  }}
                >
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              onClick={handleClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem disabled>
                <Typography variant="body2">
                  {user?.username || "User"}
                  <br />
                  <span style={{ fontSize: 12, color: "#666" }}>
                    {user?.role}
                  </span>
                </Typography>
              </MenuItem>
              <MenuItem onClick={logout} sx={{ color: "#d32f2f", gap: 1 }}>
                <LogoutIcon fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: "#f5f6fa",
        }}
      >
        <Toolbar sx={{ minHeight: 56 }} />
        <Outlet />
      </Box>
    </Box>
  );
}
