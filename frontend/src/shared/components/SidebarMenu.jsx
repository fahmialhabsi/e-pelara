// src/components/SidebarMenu.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Accordion, ListGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useDokumen } from "../../hooks/useDokumen";

const jenisToPath = {
  rpjmd: "/dashboard-rpjmd",
  renstra: "/dashboard-renstra",
  rkpd: "/dashboard-rkpd",
  renja: "/dashboard-renja",
  rka: "/dashboard-rka",
  dpa: "/dashboard-dpa",
  pengkeg: "/dashboard-pengelolaan",
  monev: "/dashboard-monev",
  "lpk-dispang": "/dashboard-lpk",
  "lk-dispang": "/dashboard-lk",
  lakip: "/dashboard-lakip",
  cloneData: "/clone-periode",
};

const groupedSidebarConfig = [
  {
    title: "Menu Input 1",
    items: [
      { key: "visi", label: "Visi" },
      { key: "misi", label: "Misi" },
      { key: "tujuan", label: "Tujuan" },
    ],
  },
  {
    title: "Menu Input 2",
    items: [
      { key: "sasaran", label: "Sasaran" },
      { key: "strategi", label: "Strategi" },
      { key: "arah_kebijakan", label: "Arah Kebijakan" },
    ],
  },
  {
    title: "Menu Input 3",
    items: [
      { key: "prioritas_nasional", label: "Prioritas Nasional" },
      { key: "prioritas_daerah", label: "Prioritas Daerah" },
      { key: "prioritas_gubernur", label: "Prioritas Gubernur" },
    ],
  },
  {
    title: "Menu Input 4",
    items: [
      { key: "program", label: "Program" },
      { key: "kegiatan", label: "Kegiatan" },
      { key: "sub_kegiatan", label: "Sub Kegiatan" },
    ],
  },
  {
    title: "Menu Input 5",
    items: [
      { key: "opd_penanggung_jawab", label: "Penanggung Jawab OPD" },
      { key: "indikator_rpjmd", label: "Indikator RPJMD" },
      { key: "cascading", label: "Cascading" },
    ],
  },
  {
    title: "Menu List 1",
    items: [{ key: "tujuan_list", label: "Daftar Tujuan" }],
  },
];

const SidebarMenu = ({ onMenuSelect, values }) => {
  const { dokumen, tahun } = useDokumen();
  const [activeKey, setActiveKey] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!dokumen || !tahun) {
      // Optional redirect jika dokumen belum dipilih
    }
  }, [dokumen, tahun]);

  const handleClick = (key) => {
    console.log("📦 Formik values in sidebar:", values);
    if (onMenuSelect) onMenuSelect(key);
    localStorage.setItem("selectedMenuRPJMD", key);

    const cleanedDok = dokumen?.toLowerCase();
    const basePath = jenisToPath[cleanedDok] || "/";

    console.log("dokumen:", dokumen);
    console.log("navigasi ke:", `${basePath}/${key}`);

    if (!basePath) {
      alert("Dokumen belum dipilih. Harap pilih dokumen terlebih dahulu.");
      return;
    }

    navigate(`${basePath}/${key}`);
  };

  return (
    <div className="p-3">
      <Accordion activeKey={activeKey} onSelect={setActiveKey} alwaysOpen>
        {groupedSidebarConfig.map((section, idx) => (
          <Accordion.Item eventKey={String(idx)} key={idx}>
            <Accordion.Header>{section.title}</Accordion.Header>
            <Accordion.Body className="p-0">
              <ListGroup variant="flush">
                {section.items.map((item) => (
                  <ListGroup.Item
                    action
                    key={item.key}
                    onClick={() => handleClick(item.key)}
                    className="text-dark"
                  >
                    {item.label}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  );
};

SidebarMenu.propTypes = {
  onMenuSelect: PropTypes.func,
  values: PropTypes.object.isRequired,
};

export default SidebarMenu;
