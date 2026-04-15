import React from "react";
import { Link } from "react-router-dom";

const RenjaSidebar = () => (
  <aside className="w-64 h-screen bg-gray-100 p-4">
    <h2 className="mb-2 font-semibold">Navigasi RENJA</h2>
    <ul className="space-y-2 text-sm">
      <li>
        <Link to="/dashboard-renja" className="text-blue-600 hover:underline">
          M029 - Daftar Renja
        </Link>
      </li>
    </ul>
    <p className="mt-4 text-xs text-gray-500">
      Modul list ini sudah terhubung workflow draft/submitted/approved/rejected.
    </p>
  </aside>
);

export default RenjaSidebar;
