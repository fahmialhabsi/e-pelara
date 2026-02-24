import { Style } from "@mui/icons-material";
import { Currency } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Accordion, ListGroup, Button, Collapse } from "react-bootstrap";
import { FiCopy, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { toast } from "react-toastify";

const capitalize = (text = "") =>
  text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function ProgramItem({ program, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [shownArah, setShownArah] = useState({});

  useEffect(() => {
    console.log("🎯 Program diterima:", program);
    console.log("📘 Strategi:", program.Strategi);
    console.log("📗 ArahKebijakan:", program.ArahKebijakan);
    console.log("📗 ArahKebijakan (dengan through):", program.ArahKebijakan);

    program.ArahKebijakan?.forEach((a) => {
      console.log("🧾 Arah:", a);
    });
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard!");
  };

  return (
    <ListGroup.Item className="d-flex flex-column gap-2 p-3 rounded shadow-sm bg-white">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <strong className="text-primary">
            {program.kode_program} - {capitalize(program.nama_program)}
          </strong>
          <div className="mt-2 text-muted small">
            <span className="fw-semibold">💰 Total Pagu Program:</span>{" "}
            <span className="badge bg-info text-dark">
              {program.total_pagu_anggaran
                ? `Rp ${program.total_pagu_anggaran.toLocaleString("id-ID")}`
                : "Rp 0"}
            </span>
            <br />
          </div>

          <div className="mt-2 ps-1 text-muted small">
            <span className="fw-semibold">🏛️ OPD Penanggung Jawab:</span>{" "}
            <span className="badge bg-success">
              {program.opd_penanggung_jawab || "-"}
            </span>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap justify-content-end">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setOpen(!open)}
          >
            {open ? <FiChevronUp /> : <FiChevronDown />}{" "}
            {open ? "Sembunyikan Rincian" : "Lihat Rincian Program"}
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => onEdit?.(program)}
          >
            Ubah
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => {
              if (window.confirm("Yakin ingin menghapus program ini?")) {
                onDelete?.(program.id);
              }
            }}
          >
            Hapus
          </Button>
        </div>
      </div>

      <Collapse in={open}>
        <div>
          {program.Strategi?.length > 0 && (
            <div className="mt-3">
              <strong>Strategi dan Arah Kebijakan</strong>
              <ul className="mt-2">
                {program.Strategi.map((s) => {
                  const arahTerkait =
                    program.ArahKebijakan?.filter(
                      (a) =>
                        `${a.ProgramArahKebijakan?.strategi_id}` === `${s.id}`
                    ) || [];
                  console.log("🧪 Strategi ID:", s.id);
                  console.log("🧪 Arah Terkait:", arahTerkait);

                  return (
                    <li key={`strategi-${s.id}`} className="mb-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>
                            <em>Strategi:</em>
                          </strong>{" "}
                          <strong>{s.kode_strategi}:</strong>{" "}
                          {capitalize(s.deskripsi)}{" "}
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleCopy(s.deskripsi)}
                            title="Salin deskripsi strategi"
                          >
                            <FiCopy />
                          </Button>
                        </div>
                        {arahTerkait.length > 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              setShownArah((prev) => ({
                                ...prev,
                                [s.id]: !prev[s.id],
                              }))
                            }
                          >
                            {shownArah[s.id] ? "Sembunyikan" : "Tampilkan"} Arah
                            Kebijakan
                          </Button>
                        )}
                      </div>
                      <Collapse in={shownArah[s.id]}>
                        <div>
                          <ul className="mt-1">
                            {arahTerkait.map((a) => (
                              <li key={`arah-${a.id}`}>
                                <strong>
                                  <em>Arah Kebijakan:</em>
                                </strong>{" "}
                                <strong>{a.kode_arah}:</strong>{" "}
                                {capitalize(a.deskripsi)}{" "}
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
                })}
              </ul>
            </div>
          )}
        </div>
      </Collapse>
    </ListGroup.Item>
  );
}

function ProgramNestedView({ data = [], onEdit, onDelete }) {
  const grouped = {};

  data.forEach((program) => {
    const sasaran = program.sasaran ?? {
      nomor: "-",
      isi_sasaran: "Tidak Ada Sasaran",
      Tujuan: {
        no_tujuan: "-",
        isi_tujuan: "Tidak Ada Tujuan",
      },
    };

    const tujuan = sasaran.Tujuan ?? {
      no_tujuan: "-",
      isi_tujuan: "Tidak Ada Tujuan",
    };

    const tujuanKey = `${tujuan.no_tujuan} - ${tujuan.isi_tujuan}`;
    const sasaranKey = `${sasaran.nomor} - ${sasaran.isi_sasaran}`;

    if (!grouped[tujuanKey]) grouped[tujuanKey] = {};
    if (!grouped[tujuanKey][sasaranKey]) grouped[tujuanKey][sasaranKey] = [];

    grouped[tujuanKey][sasaranKey].push(program);
  });

  return (
    <Accordion defaultActiveKey="0" alwaysOpen>
      {Object.entries(grouped).map(([tujuan, sasaranMap], i) => (
        <Accordion.Item eventKey={`t-${i}`} key={tujuan}>
          <Accordion.Header>{capitalize(tujuan)}</Accordion.Header>
          <Accordion.Body>
            <Accordion alwaysOpen>
              {Object.entries(sasaranMap).map(([sasaran, programList], j) => (
                <Accordion.Item eventKey={`s-${i}-${j}`} key={sasaran}>
                  <Accordion.Header>{capitalize(sasaran)}</Accordion.Header>
                  <Accordion.Body>
                    <ListGroup>
                      {programList.map((program) => (
                        <ProgramItem
                          key={program.id}
                          program={program}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      ))}
                    </ListGroup>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

export default ProgramNestedView;
