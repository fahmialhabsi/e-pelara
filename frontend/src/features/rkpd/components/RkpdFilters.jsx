import React from "react";

const RkpdFilters = ({ filters, onChange, options }) => (
  <div className="mb-4 flex gap-4">
    <select
      name="periode_id"
      value={filters.periode_id}
      onChange={onChange}
      className="border px-2 py-1 rounded"
    >
      <option value="">Semua Periode</option>
      {options.periode.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nama}
        </option>
      ))}
    </select>

    <select
      name="opd_id"
      value={filters.opd_id}
      onChange={onChange}
      className="border px-2 py-1 rounded"
    >
      <option value="">Semua OPD</option>
      {Array.isArray(options.opd) &&
        options.opd.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nama}
          </option>
        ))}
    </select>
  </div>
);

export default RkpdFilters;
