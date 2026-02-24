import React from "react";

const RenjaSidebar = () => (
  <aside className="w-64 bg-gray-100 h-screen p-4">
    <h2 className="font-semibold mb-2">Navigasi RENJA</h2>
    <ul className="space-y-2 text-sm">
      <li><a href="#/renja/dashboard" className="text-blue-600">Dashboard</a></li>
      <li><a href="#/renja/bab" className="text-blue-600">Editor BAB</a></li>
      <li><a href="#/renja/program" className="text-blue-600">Program</a></li>
      <li><a href="#/renja/kegiatan" className="text-blue-600">Kegiatan</a></li>
      <li><a href="#/renja/subkegiatan" className="text-blue-600">Subkegiatan</a></li>
    </ul>
  </aside>
);

export default RenjaSidebar;
