import React from "react";
import RenjaSidebar from "./RenjaSidebar";

const DashboardLayout = ({ children }) => (
  <div className="flex">
    <RenjaSidebar />
    <main className="flex-1 p-4">{children}</main>
  </div>
);

export default DashboardLayout;
