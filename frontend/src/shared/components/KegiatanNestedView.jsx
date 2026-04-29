// frontend/src/shared/components/KegiatanNestedView.jsx
import React from "react";
import { Accordion, ListGroup, Button } from "react-bootstrap";

const capitalize = (text = "") =>
  String(text || "")
    .toLowerCase()
    .replace(/^\w|\s\w/g, (c) => c.toUpperCase());

const toNumber = (value) => Number(value) || 0;

const formatRupiah = (value) =>
  `Rp ${toNumber(value).toLocaleString("id-ID")}`;

const getKegiatanPagu = (keg) => {
  return toNumber(keg?.total_pagu_anggaran ?? keg?.pagu_anggaran);
};

const sumKegiatanList = (kegiatanList) => {
  return (kegiatanList || []).reduce(
    (total, keg) => total + getKegiatanPagu(keg),
    0
  );
};

const sumProgramMap = (programMap) => {
  return Object.values(programMap || {}).reduce(
    (total, kegiatanList) => total + sumKegiatanList(kegiatanList),
    0
  );
};

const sumSasaranMap = (sasaranMap) => {
  return Object.values(sasaranMap || {}).reduce(
    (total, programMap) => total + sumProgramMap(programMap),
    0
  );
};

const sumGrouped = (grouped) => {
  return Object.values(grouped || {}).reduce(
    (total, sasaranMap) => total + sumSasaranMap(sasaranMap),
    0
  );
};

export default function KegiatanNestedView({ data, onEdit, onDelete }) {
  const grouped = {};

  data.forEach((keg) => {
    const tujuan = keg.program?.sasaran?.Tujuan ?? {
      no_tujuan: "-",
      isi_tujuan: "Tidak Ada Tujuan",
    };

    const sasaran = keg.program?.sasaran ?? {
      nomor: "-",
      isi_sasaran: "Tidak Ada Sasaran",
    };

    const program = keg.program ?? {
      kode_program: "-",
      nama_program: "Tidak Ada Program",
    };

    const tujuanKey = `${tujuan.no_tujuan} - ${tujuan.isi_tujuan}`;
    const sasaranKey = `${sasaran.nomor} - ${sasaran.isi_sasaran}`;
    const programKey = `${program.kode_program} - ${program.nama_program}`;

    if (!grouped[tujuanKey]) grouped[tujuanKey] = {};
    if (!grouped[tujuanKey][sasaranKey]) grouped[tujuanKey][sasaranKey] = {};
    if (!grouped[tujuanKey][sasaranKey][programKey]) {
      grouped[tujuanKey][sasaranKey][programKey] = [];
    }

    grouped[tujuanKey][sasaranKey][programKey].push(keg);
  });

  const totalPaguOpd = sumGrouped(grouped);

  return (
    <>
      <div className="mb-3 p-3 border rounded bg-light">
        <div className="fw-bold text-primary">
          Total Pagu RPJMD:{" "}
          <span className="badge bg-info text-dark">
            {formatRupiah(totalPaguOpd)}
          </span>
        </div>
      </div>

      <Accordion defaultActiveKey="0" alwaysOpen>
        {Object.entries(grouped).map(([tujuan, sasaranMap], i) => (
          <Accordion.Item eventKey={i.toString()} key={tujuan}>
            <Accordion.Header>
              <div className="d-flex flex-column">
                <span style={{ fontWeight: "bold", color: "#0f172a" }}>
                  {tujuan}
                </span>
                <small className="text-muted">
                  Total Pagu Tujuan: {formatRupiah(sumSasaranMap(sasaranMap))}
                </small>
              </div>
            </Accordion.Header>

            <Accordion.Body>
              <Accordion alwaysOpen>
                {Object.entries(sasaranMap).map(([sasaran, programMap], j) => (
                  <Accordion.Item
                    eventKey={`s-${i}-${j}`}
                    key={`${tujuan}-${sasaran}`}
                  >
                    <Accordion.Header>
                      <div className="d-flex flex-column">
                        <span style={{ fontWeight: "bold", color: "#1e3a8a" }}>
                          {sasaran}
                        </span>
                        <small className="text-muted">
                          Total Pagu Sasaran:{" "}
                          {formatRupiah(sumProgramMap(programMap))}
                        </small>
                      </div>
                    </Accordion.Header>

                    <Accordion.Body>
                      <Accordion alwaysOpen>
                        {Object.entries(programMap).map(
                          ([program, kegiatanList], k) => {
                            const firstKegiatan = kegiatanList?.[0];
                            const totalPaguProgram =
                              sumKegiatanList(kegiatanList);

                            return (
                              <Accordion.Item
                                eventKey={`p-${i}-${j}-${k}`}
                                key={`${tujuan}-${sasaran}-${program}`}
                              >
                                <Accordion.Header>
                                  <div className="d-flex flex-column">
                                    <span
                                      style={{
                                        fontWeight: "bold",
                                        color: "#3b82f6",
                                      }}
                                    >
                                      {capitalize(program)}
                                    </span>
                                    <small className="text-muted">
                                      Total Pagu Program:{" "}
                                      {formatRupiah(totalPaguProgram)}
                                    </small>
                                  </div>
                                </Accordion.Header>

                                <Accordion.Body>
                                  <div className="mb-3 ps-3 text-muted small">
                                    <span className="fw-semibold">
                                      🏛️ OPD Penanggung Jawab:
                                    </span>{" "}
                                    <span className="badge bg-success">
                                      {firstKegiatan?.opd?.nama_opd ||
                                        firstKegiatan?.program?.opd?.nama_opd ||
                                        firstKegiatan?.opd_penanggung_jawab ||
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
                                              fontSize: "1rem",
                                            }}
                                          >
                                            {keg.kode_kegiatan} -{" "}
                                            {capitalize(keg.nama_kegiatan)}
                                          </span>

                                          <div className="mt-2 text-muted small">
                                            <span className="fw-semibold">
                                              💰 Total Pagu Kegiatan:
                                            </span>{" "}
                                            <span className="badge bg-info text-dark">
                                              {formatRupiah(
                                                keg.total_pagu_anggaran ??
                                                  keg.pagu_anggaran
                                              )}
                                            </span>
                                          </div>

                                          <div className="mt-2 text-muted small">
                                            <span className="fw-semibold">
                                              📁 Bidang Penanggung Jawab:
                                            </span>{" "}
                                            <span className="badge bg-secondary">
                                              {keg.bidang_opd_penanggung_jawab ||
                                                keg.opd?.nama_bidang_opd ||
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
    </>
  );
}