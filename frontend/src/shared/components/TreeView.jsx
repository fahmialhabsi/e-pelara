import React from "react";

export default function TreeView({ data, onSelectNode }) {
  // Placeholder: nanti ganti dengan library atau render custom
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <p>
        <em>Tree view akan di-render di sini.</em>
      </p>
    </div>
  );
}
