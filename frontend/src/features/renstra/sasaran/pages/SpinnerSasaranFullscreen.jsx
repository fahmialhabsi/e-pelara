// src/features/renstra/sasaran/components/SpinnerSasaranFullscreen.jsx
import React from "react";
import { Spin } from "antd";

const SpinnerSasaranFullscreen = ({ tip = "Loading..." }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.7)",
      zIndex: 9999,
      flexDirection: "column",
      gap: 12,
    }}
  >
    <Spin size="large" />
    <span style={{ fontSize: 16, color: "#333" }}>{tip}</span>
  </div>
);

export default SpinnerSasaranFullscreen;
