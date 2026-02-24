import React from "react";

const RenjaBabEditor = ({ babNumber, content, onChange }) => (
  <div className="mb-4">
    <h2 className="text-lg font-semibold mb-2">BAB {babNumber}</h2>
    <textarea
      rows={8}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded"
      placeholder={"Tuliskan isi BAB " + babNumber}
    />
  </div>
);

export default RenjaBabEditor;
