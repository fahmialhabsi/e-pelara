import React from "react";

const RkpdActions = ({ onAdd }) => (
  <div className="flex justify-end mb-2">
    <button
      onClick={onAdd}
      className="px-4 py-2 bg-green-600 text-black rounded"
    >
      Tambah Data
    </button>
  </div>
);

export default RkpdActions;
