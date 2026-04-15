/**
 * KodeRekeningAutocomplete.jsx
 * Searchable dropdown untuk memilih kode rekening dari referensi Permendagri 90.
 *
 * Props:
 *   value          {string}  — kode_rekening yang terpilih saat ini
 *   namaValue      {string}  — nama rekening yang terpilih (display)
 *   onChange       {fn}      — dipanggil dengan { kode_rekening, nama_rekening }
 *   disabled       {bool}
 *   placeholder    {string}
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

const KodeRekeningAutocomplete = ({
  value       = "",
  namaValue   = "",
  onChange,
  disabled    = false,
  placeholder = "Ketik kode/nama rekening untuk mencari...",
}) => {
  const [query,   setQuery]   = useState(value || "");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [selected, setSelected] = useState(value ? { kode_rekening: value, nama: namaValue, label: `${value} — ${namaValue}` } : null);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Sinkron dari luar saat value berubah (edit mode)
  useEffect(() => {
    if (value && value !== (selected?.kode_rekening || "")) {
      setQuery(value);
      setSelected({ kode_rekening: value, nama: namaValue, label: `${value} — ${namaValue}` });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setOptions([]); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const res = await fetch(`/api/rekening/search?q=${encodeURIComponent(q)}&limit=25&_token=${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal fetch");
      const json = await res.json();
      setOptions(json.data || []);
      setOpen(true);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setSelected(null);
    if (onChange) onChange({ kode_rekening: "", nama_rekening: "" });

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (opt) => {
    setSelected(opt);
    setQuery(opt.kode_rekening);
    setOpen(false);
    setOptions([]);
    if (onChange) onChange({ kode_rekening: opt.kode_rekening, nama_rekening: opt.nama });
  };

  const handleClear = () => {
    setQuery("");
    setSelected(null);
    setOptions([]);
    setOpen(false);
    if (onChange) onChange({ kode_rekening: "", nama_rekening: "" });
  };

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Input */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "6px 36px 6px 10px",
            border: selected ? "1px solid #52c41a" : "1px solid #d9d9d9",
            borderRadius: 6,
            fontSize: 13,
            outline: "none",
            background: disabled ? "#f5f5f5" : "#fff",
            boxSizing: "border-box",
          }}
          onFocus={() => { if (options.length) setOpen(true); }}
        />
        {/* Loading spinner / clear btn */}
        {loading ? (
          <span style={iconStyle}>⏳</span>
        ) : query ? (
          <span style={{ ...iconStyle, cursor: "pointer", color: "#999" }} onClick={handleClear}>✕</span>
        ) : (
          <span style={{ ...iconStyle, color: "#bbb" }}>🔍</span>
        )}
      </div>

      {/* Nama rekening terpilih */}
      {selected && (
        <div style={{
          marginTop: 3,
          fontSize: 11,
          color: "#52c41a",
          padding: "2px 8px",
          background: "#f6ffed",
          border: "1px solid #b7eb8f",
          borderRadius: 4,
        }}>
          ✓ {selected.nama}
        </div>
      )}

      {/* Dropdown hasil pencarian */}
      {open && options.length > 0 && (
        <ul style={dropdownStyle}>
          {options.map((opt) => (
            <li
              key={opt.kode_rekening}
              onMouseDown={() => handleSelect(opt)}
              style={optionStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e6f7ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <span style={{ fontWeight: 600, color: "#1677ff", fontSize: 12 }}>
                {opt.kode_rekening}
              </span>
              <span style={{ color: "#555", marginLeft: 8, fontSize: 12 }}>
                {opt.nama}
              </span>
              {opt.level && (
                <span style={{ float: "right", fontSize: 10, color: "#bbb", marginTop: 2 }}>
                  Lvl {opt.level}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {open && !loading && query.length >= 2 && options.length === 0 && (
        <div style={{ ...dropdownStyle, padding: "10px 14px", color: "#888", fontSize: 12 }}>
          Kode rekening tidak ditemukan untuk &quot;{query}&quot;
        </div>
      )}
    </div>
  );
};

const iconStyle = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 14,
  pointerEvents: "none",
};

const dropdownStyle = {
  position: "absolute",
  zIndex: 9999,
  top: "100%",
  left: 0,
  right: 0,
  margin: 0,
  padding: 0,
  listStyle: "none",
  background: "white",
  border: "1px solid #d9d9d9",
  borderTop: "none",
  borderRadius: "0 0 6px 6px",
  maxHeight: 260,
  overflowY: "auto",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

const optionStyle = {
  padding: "8px 14px",
  cursor: "pointer",
  borderBottom: "1px solid #f0f0f0",
  background: "white",
  transition: "background 0.15s",
};

export default KodeRekeningAutocomplete;
