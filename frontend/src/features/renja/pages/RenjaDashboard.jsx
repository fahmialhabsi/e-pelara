import React from "react";
import ListRenjaOPD from "./ListRenjaOPD";
import RenjaSidebar from "./RenjaSidebar";

const RenjaDashboard = () => (
  <div className="flex">
    <RenjaSidebar />
    <div className="flex-1 p-4">
      <h1 className="text-xl font-bold mb-4">Dashboard RENJA</h1>
      <ListRenjaOPD />
    </div>
  </div>
);

export default RenjaDashboard;
