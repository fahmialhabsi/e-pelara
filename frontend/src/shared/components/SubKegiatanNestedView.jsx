// frontend/src/shared/components/SubKegiatanNestedView.jsx
import React from "react";
import { Accordion, ListGroup, Button } from "react-bootstrap";

const capitalize = (text = "") =>
  text.toLowerCase().replace(/^\w|\s\w/g, (c) => c.toUpperCase());

const toNumber = (value) => Number(value) || 0;

const formatRupiah = (value) =>
  `Rp ${toNumber(value).toLocaleString("id-ID")}`;

const sumProgramMap = (programMap) => {
  const programKeys = Object.keys(programMap || {});

  return programKeys.reduce((total, programKey) => {
    const kegiatanMap = programMap[programKey] || {};
    const firstSub = Object.values(kegiatanMap)?.[0]?.[0];

    return (
      total +
      toNumber(firstSub?.kegiatan?.program?.total_pagu_anggaran)
    );
  }, 0);
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

export default function SubKegiatanNestedView({ data, onEdit, onDelete }) {
  const grouped = {};

  data.forEach((item, index) => {
    console.log(`🔍 SubKegiatan[${index}]:`, item);
    const tujuan = item.kegiatan?.program?.sasaran?.Tujuan ?? {
      no_tujuan: "-",
      isi_tujuan: "Tidak Ada Tujuan",
    };
    const sasaran = item.kegiatan?.program?.sasaran ?? {
      nomor: "-",
      isi_sasaran: "Tidak Ada Sasaran",
    };
    const program = item.kegiatan?.program ?? {
      kode_program: "-",
      nama_program: "Tidak Ada Program",
    };
    const kegiatan = item.kegiatan ?? {
      kode_kegiatan: "-",
      nama_kegiatan: "Tidak Ada Kegiatan",
    };

    console.log("👉 tujuan:", tujuan);
    console.log("👉 sasaran:", sasaran);
    console.log("👉 program:", program);
    console.log("👉 kegiatan:", kegiatan);

    const tujuanKey = `${tujuan.no_tujuan} - ${tujuan.isi_tujuan}`;
    const sasaranKey = `${sasaran.nomor} - ${sasaran.isi_sasaran}`;
    const programKey = `${program.kode_program} - ${program.nama_program}`;
    const kegiatanKey = `${kegiatan.kode_kegiatan} - ${kegiatan.nama_kegiatan}`;

    if (!grouped[tujuanKey]) grouped[tujuanKey] = {};
    if (!grouped[tujuanKey][sasaranKey]) grouped[tujuanKey][sasaranKey] = {};
    if (!grouped[tujuanKey][sasaranKey][programKey])
      grouped[tujuanKey][sasaranKey][programKey] = {};
    if (!grouped[tujuanKey][sasaranKey][programKey][kegiatanKey])
      grouped[tujuanKey][sasaranKey][programKey][kegiatanKey] = [];

    grouped[tujuanKey][sasaranKey][programKey][kegiatanKey].push(item);
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
          <Accordion.Header style={{ fontWeight: "bold", color: "#0f172a" }}>
            <div className="d-flex flex-column">
              <span>{tujuan}</span>
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
                  <Accordion.Header style={{ color: "#1e3a8a" }}>
                    <div className="d-flex flex-column">
                      <span>{sasaran}</span>
                      <small className="text-muted">
                        Total Pagu Sasaran: {formatRupiah(sumProgramMap(programMap))}
                      </small>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    <Accordion alwaysOpen>
                      {Object.entries(programMap).map(
                        ([program, kegiatanMap], k) => {
                          const firstSub = Object.values(kegiatanMap)?.[0]?.[0];

                          return (
                            <Accordion.Item
                              eventKey={`p-${i}-${j}-${k}`}
                              key={`${tujuan}-${sasaran}-${program}`}
                            >
                              <Accordion.Header style={{ color: "#3b82f6" }}>
                                {capitalize(program)}
                              </Accordion.Header>
                              <Accordion.Body>
                                {/* 👇 OPD Penanggung Jawab di bawah Program */}
                                <div className="mb-3 ps-3 text-muted small">
                                  <span className="fw-semibold">
                                    🏛️ OPD Penanggung Jawab:
                                  </span>{" "}
                                  <span className="badge bg-success">
                                    {firstSub?.opd_penanggung_jawab || "-"}
                                  </span>
                                </div>

                                <div className="mb-2 ps-3 text-muted small">
                                  <span className="fw-semibold">
                                    📊 Total Pagu Program:
                                  </span>{" "}
                                  <span className="badge bg-info text-dark">
                                    Rp{" "}
                                    {firstSub?.kegiatan?.program?.total_pagu_anggaran?.toLocaleString(
                                      "id-ID"
                                    ) || "0"}
                                  </span>
                                </div>

                                <Accordion alwaysOpen>
                                  {Object.entries(kegiatanMap).map(
                                    ([kegiatan, subList], l) => {
                                      const totalSubPagu = subList.reduce(
                                        (acc, curr) =>
                                          acc +
                                          (Number(curr.pagu_anggaran) || 0),
                                        0
                                      );

                                      return (
                                        <Accordion.Item
                                          eventKey={`k-${i}-${j}-${k}-${l}`}
                                          key={`${tujuan}-${sasaran}-${program}-${kegiatan}`}
                                        >
                                          <Accordion.Header
                                            style={{ color: "#0f766e" }}
                                          >
                                            {capitalize(kegiatan)}
                                          </Accordion.Header>
                                          <Accordion.Body>
                                            {/* 👇 Bidang Penanggung Jawab di bawah Kegiatan */}
                                            <div className="mb-3 ps-3 text-muted small">
                                              <span className="fw-semibold">
                                                📁 Bidang Penanggung Jawab:
                                              </span>{" "}
                                              <span className="badge bg-secondary">
                                                {subList?.[0]
                                                  ?.nama_bidang_opd ||
                                                  subList?.[0]
                                                    ?.bidang_opd_penanggung_jawab ||
                                                  "-"}
                                              </span>
                                            </div>

                                            <div className="mb-2 ps-3 text-muted small">
                                              <span className="fw-semibold">
                                                💵 Total Pagu Kegiatan:
                                              </span>{" "}
                                              <span className="badge bg-secondary">
                                                Rp{" "}
                                                {subList?.[0]?.kegiatan?.total_pagu_anggaran?.toLocaleString(
                                                  "id-ID"
                                                ) || "0"}
                                              </span>
                                            </div>

                                            <ListGroup>
                                              {subList.map((sub) => (
                                                <ListGroup.Item
                                                  key={sub.id}
                                                  className="d-flex justify-content-between align-items-start"
                                                >
                                                  <div>
                                                    <strong className="text-primary">
                                                      {sub.kode_sub_kegiatan} -{" "}
                                                      {capitalize(
                                                        sub.nama_sub_kegiatan
                                                      )}
                                                    </strong>

                                                    {/* 👇 Sub Bidang Penanggung Jawab di bawah Sub Kegiatan */}
                                                    <div className="mt-2 text-muted small">
                                                      <span className="fw-semibold">
                                                        📎 Sub Bidang Penanggung
                                                        Jawab:
                                                      </span>{" "}
                                                      <span className="badge bg-warning text-dark">
                                                        {sub.sub_bidang_opd_penanggung_jawab ||
                                                          "-"}
                                                      </span>
                                                    </div>
                                                    <div className="mt-2 text-muted small">
                                                      <span className="fw-semibold">
                                                        💰 Pagu Anggaran:
                                                      </span>{" "}
                                                      <span className="badge bg-info text-dark">
                                                        {typeof sub.pagu_anggaran ===
                                                        "number"
                                                          ? `Rp ${sub.pagu_anggaran.toLocaleString(
                                                              "id-ID"
                                                            )}`
                                                          : "-"}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div className="ms-2 d-flex flex-column gap-2">
                                                    <Button
                                                      variant="outline-primary"
                                                      size="sm"
                                                      onClick={() =>
                                                        onEdit?.(sub)
                                                      }
                                                    >
                                                      Ubah
                                                    </Button>
                                                    <Button
                                                      variant="outline-danger"
                                                      size="sm"
                                                      onClick={() =>
                                                        onDelete?.(sub.id)
                                                      }
                                                    >
                                                      Hapus
                                                    </Button>
                                                  </div>
                                                </ListGroup.Item>
                                              ))}

                                              {/* 👇 Total Pagu Sub Kegiatan ditampilkan terakhir */}
                                              <ListGroup.Item className="bg-light fw-semibold text-muted">
                                                💰 Total Pagu{" "}
                                                {subList?.[0]?.kegiatan
                                                  ?.kode_kegiatan || "-"}{" "}
                                                -{" "}
                                                {subList?.[0]?.kegiatan
                                                  ?.nama_kegiatan
                                                  ? subList[0].kegiatan
                                                      .nama_kegiatan
                                                  : "-"}{" "}
                                                = Rp{" "}
                                                {totalSubPagu.toLocaleString(
                                                  "id-ID"
                                                )}
                                              </ListGroup.Item>
                                            </ListGroup>
                                          </Accordion.Body>
                                        </Accordion.Item>
                                      );
                                    }
                                  )}
                                </Accordion>
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
