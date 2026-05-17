import React from "react";
import { Spin } from "antd";

const SpinnerStrategiFullscreen = ({ tip = "Loading Strategi..." }) => (
  <div style={{
    position: "fixed",
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }}>
    <Spin size="large" />
    <span>{tip}</span>
  </div>
);

export default SpinnerStrategiFullscreen;