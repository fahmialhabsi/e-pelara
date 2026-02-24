import React from "react";
import { Accordion, ListGroup, Button } from "react-bootstrap";

const capitalize = (text = "") =>
  text.toLowerCase().replace(/^\w|\s\w/g, (c) => c.toUpperCase());

export default function KegiatanNestedView({ data, onEdit, onDelete }) {
  const grouped = {};

  data.forEach((keg) => {
    const tujuan = keg.program?.sasaran?.Tujuan;
    const sasaran = keg.program?.sasaran;
    const program = keg.program;

    if (!tujuan || !sasaran || !program) return;

    const tujuanKey = `${tujuan.no_tujuan} - ${tujuan.isi_tujuan}`;
    const sasaranKey = `${sasaran.nomor} - ${sasaran.isi_sasaran}`;
    const programKey = `${program.kode_program} - ${program.nama_program}`;

    if (!grouped[tujuanKey]) grouped[tujuanKey] = {};
    if (!grouped[tujuanKey][sasaranKey]) grouped[tujuanKey][sasaranKey] = {};
    if (!grouped[tujuanKey][sasaranKey][programKey])
      grouped[tujuanKey][sasaranKey][programKey] = [];

    grouped[tujuanKey][sasaranKey][programKey].push(keg);
  });

  return (
    <Accordion defaultActiveKey="0" alwaysOpen>
      {Object.entries(grouped).map(([tujuan, sasaranMap], i) => (
        <Accordion.Item eventKey={i.toString()} key={tujuan}>
          <Accordion.Header>
            <span
              style={{
                fontWeight: "bold",
                color: "#0f172a",
                textTransform: "uppercase",
              }}
            >
              {tujuan}
            </span>
          </Accordion.Header>
          <Accordion.Body>
            <Accordion alwaysOpen>
              {Object.entries(sasaranMap).map(([sasaran, programMap], j) => (
                <Accordion.Item
                  eventKey={`s-${i}-${j}`}
                  key={`${tujuan}-${sasaran}`}
                >
                  <Accordion.Header>
                    <span style={{ fontWeight: "bold", color: "#1e3a8a" }}>
                      {sasaran}
                    </span>
                  </Accordion.Header>
                  <Accordion.Body>
                    <Accordion alwaysOpen>
                      {Object.entries(programMap).map(
                        ([program, kegiatanList], k) => {
                          const firstKegiatan = kegiatanList?.[0]; // Ambil contoh data

                          return (
                            <Accordion.Item
                              eventKey={`p-${i}-${j}-${k}`}
                              key={`${tujuan}-${sasaran}-${program}`}
                            >
                              <Accordion.Header>
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    color: "#3b82f6",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {capitalize(program)}
                                </span>
                              </Accordion.Header>
                              <Accordion.Body>
                                {/* ✅ Tambah OPD Penanggung Jawab */}
                                <div className="mb-3 ps-3 text-muted small">
                                  <span className="fw-semibold">
                                    🏛️ OPD Penanggung Jawab:
                                  </span>{" "}
                                  <span className="badge bg-success">
                                    {firstKegiatan?.opd?.nama_opd || "-"}
                                    {firstKegiatan?.bidang_opd_penanggung_jawab ||
                                      "-"}
                                  </span>
                                </div>

                                <ListGroup>
                                  {kegiatanList.map((keg) => (
                                    <ListGroup.Item
                                      key={keg.id}
                                      className="d-flex justify-content-between align-items-start"
                                    >
                                      <div>
                                        <span
                                          style={{
                                            fontWeight: "bold",
                                            fontStyle: "italic",
                                            color: "#0f766e",
                                            textTransform: "capitalize",
                                            fontSize: "1rem",
                                          }}
                                        >
                                          {keg.kode_kegiatan} -{" "}
                                          {capitalize(keg.nama_kegiatan)}
                                        </span>

                                        {/* 💰 Tambah Total Pagu Anggaran */}
                                        <div className="mt-1 text-muted small">
                                          💰 Total Pagu Kegiatan:{" "}
                                          {keg.total_pagu_anggaran?.toLocaleString(
                                            "id-ID"
                                          ) || "0"}
                                        </div>

                                        {/* 📁 Bidang Penanggung Jawab */}
                                        <div className="mt-2 text-muted small">
                                          <span className="fw-semibold">
                                            📁 Bidang Penanggung Jawab:
                                          </span>{" "}
                                          <span className="badge bg-secondary">
                                            {keg.bidang_opd_penanggung_jawab ||
                                              "-"}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="ms-2 d-flex gap-2">
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => onEdit?.(keg)}
                                        >
                                          Ubah
                                        </Button>
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={() => onDelete?.(keg.id)}
                                        >
                                          Hapus
                                        </Button>
                                      </div>
                                    </ListGroup.Item>
                                  ))}
                                </ListGroup>
                              </Accordion.Body>
                            </Accordion.Item>
                          );
                        }
                      )}
                    </Accordion>
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
