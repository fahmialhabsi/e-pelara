// StrategiItem.jsx
import React, { useState } from "react";
import { Collapse, Button } from "react-bootstrap";
import { FiCopy } from "react-icons/fi";
import { toast } from "react-toastify";

const capitalize = (text = "") =>
  text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function StrategiItem({ strategi, arahList = [] }) {
  const [open, setOpen] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard!");
  };

  return (
    <li className="mb-2">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <strong>{strategi.kode_strategi}:</strong>{" "}
          {capitalize(strategi.deskripsi)}{" "}
          <Button
            variant="link"
            size="sm"
            onClick={() => handleCopy(strategi.deskripsi)}
            title="Salin deskripsi strategi"
          >
            <FiCopy />
          </Button>
        </div>
        {arahList.length > 0 && (
          <Button variant="link" size="sm" onClick={() => setOpen(!open)}>
            {open ? "Sembunyikan" : "Tampilkan"} Arah Kebijakan
          </Button>
        )}
      </div>

      <Collapse in={open}>
        <div>
          <ul className="mt-1">
            {arahList.map((a) => (
              <li key={`arah-${a.id}`}>
                <strong>{a.kode_arah}:</strong> {capitalize(a.deskripsi)}{" "}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleCopy(a.deskripsi)}
                  title="Salin deskripsi arah"
                >
                  <FiCopy />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </Collapse>
    </li>
  );
}
