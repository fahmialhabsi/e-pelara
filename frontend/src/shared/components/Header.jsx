// src/components/Header.js
import React from "react";
import { Navbar, Container, Nav, NavDropdown } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { checkAuthStatus } from "../contexts/AuthProvider";
import { useAuth } from "../hooks/useAuth";

export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    await logout(true); // logout server
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!checkAuthStatus()) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <Navbar bg="light" expand="lg" className="mb-3">
      <Container fluid>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <NavDropdown title="Profile" id="profile-dropdown">
              <NavDropdown.Item onClick={() => navigate("/settings")}>
                Settings
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
