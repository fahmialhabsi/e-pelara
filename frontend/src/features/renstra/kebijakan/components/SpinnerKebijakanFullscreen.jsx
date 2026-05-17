import React from "react";
import { Spin } from "antd";

const SpinnerKebijakanFullscreen = ({ tip = "Loading Kebijakan..." }) => (
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

export default SpinnerKebijakanFullscreen;