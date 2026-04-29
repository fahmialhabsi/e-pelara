// frontend/src/shared/components/ProgramNestedView.jsx
import React, { useState, useEffect } from "react";
import { Accordion, ListGroup, Button, Collapse } from "react-bootstrap";
import { FiCopy, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { toast } from "react-toastify";

const capitalize = (text = "") =>
  String(text || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const toNumber = (value) => Number(value) || 0;

const formatRupiah = (value) =>
  `Rp ${toNumber(value).toLocaleString("id-ID")}`;

const getProgramPagu = (program) =>
  toNumber(program?.total_pagu_anggaran ?? program?.pagu_anggaran);

const sumProgramList = (programList) =>
  (programList || []).reduce(
    (total, program) => total + getProgramPagu(program),
    0
  );

const sumSasaranMap = (sasaranMap) =>
  Object.values(sasaranMap || {}).reduce(
    (total, programList) => total + sumProgramList(programList),
    0
  );

const sumGrouped = (grouped) =>
  Object.values(grouped || {}).reduce(
    (total, sasaranMap) => total + sumSasaranMap(sasaranMap),
    0
  );

function ProgramItem({ program, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [shownArah, setShownArah] = useState({});

  useEffect(() => {
    console.log("🎯 Program diterima:", program);
    console.log("📘 Strategi:", program.Strategi);
    console.log("📗 ArahKebijakan:", program.ArahKebijakan);

    program.ArahKebijakan?.forEach((a) => {
      console.log("🧾 Arah:", a);
    });
  }, [program]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text || "");
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
              {formatRupiah(program.total_pagu_anggaran ?? program.pagu_anggaran)}
            </span>
          </div>

          <div className="mt-2 ps-1 text-muted small">
            <span className="fw-semibold">🏛️ OPD Penanggung Jawab:</span>{" "}
            <span className="badge bg-success">
              {program.opd_penanggung_jawab ||
                program.opd?.nama_opd ||
                program.opdPenanggungJawab?.nama_opd ||
                "-"}
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

  const totalPaguOpd = sumGrouped(grouped);

  return (
    <>
      <div className="mb-3 p-3 border rounded bg-light">
        <div className="fw-bold text-primary">
          Total Pagu OPD:{" "}
          <span className="badge bg-info text-dark">
            {formatRupiah(totalPaguOpd)}
          </span>
        </div>
      </div>

      <Accordion defaultActiveKey="0" alwaysOpen>
        {Object.entries(grouped).map(([tujuan, sasaranMap], i) => (
          <Accordion.Item eventKey={`t-${i}`} key={tujuan}>
            <Accordion.Header>
              <div className="d-flex flex-column">
                <span style={{ fontWeight: "bold", color: "#0f172a" }}>
                  {capitalize(tujuan)}
                </span>
                <small className="text-muted">
                  Total Pagu Tujuan: {formatRupiah(sumSasaranMap(sasaranMap))}
                </small>
              </div>
            </Accordion.Header>

            <Accordion.Body>
              <Accordion alwaysOpen>
                {Object.entries(sasaranMap).map(([sasaran, programList], j) => (
                  <Accordion.Item eventKey={`s-${i}-${j}`} key={sasaran}>
                    <Accordion.Header>
                      <div className="d-flex flex-column">
                        <span style={{ fontWeight: "bold", color: "#1e3a8a" }}>
                          {capitalize(sasaran)}
                        </span>
                        <small className="text-muted">
                          Total Pagu Sasaran:{" "}
                          {formatRupiah(sumProgramList(programList))}
                        </small>
                      </div>
                    </Accordion.Header>

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
    </>
  );
}

export default ProgramNestedView;