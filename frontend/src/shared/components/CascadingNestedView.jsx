import React from "react";
import { Accordion, Button, ListGroup } from "react-bootstrap";

export default function CascadingNestedView({
  data = [],
  onEdit,
  onDelete,
  onDetail,
}) {
  if (!data || data.length === 0) {
    return <p className="text-muted">Belum ada data cascading.</p>;
  }

  const grouped = {};

  data.forEach((item) => {
    console.log("🧪 item.strategis:", item.strategis);

    const misi = item.misi ?? { no_misi: "-", isi_misi: "Tidak Ada Misi" };
    const priorNasional = item.priorNasional ?? {
      kode_prionas: "-",
      nama_prionas: "Tidak Ada Prioritas Nasional",
    };
    const priorDaerah = item.priorDaerah ?? {
      kode_prioda: "-",
      nama_prioda: "Tidak Ada Prioritas Daerah",
    };
    const priorKepda = item.priorKepda ?? {
      kode_priogub: "-",
      nama_priogub: "Tidak Ada Prioritas Gubernur",
    };
    const tujuan = item.tujuan ?? {
      no_tujuan: "-",
      isi_tujuan: "Tidak Ada Tujuan",
    };
    const sasaran = item.sasaran ?? {
      nomor: "-",
      isi_sasaran: "Tidak Ada Sasaran",
    };
    const strategi =
      Array.isArray(item.strategis) && item.strategis.length
        ? item.strategis
            .map((s) => `${s.kode_strategi} - ${s.deskripsi}`)
            .join(", ")
        : "Tidak Ada Strategi";

    const arahKebijakan =
      Array.isArray(item.arahKebijakans) && item.arahKebijakans.length
        ? item.arahKebijakans
            .map((a) => `${a.kode_arah} - ${a.deskripsi || a.nama_arah}`)
            .join(", ")
        : "Tidak Ada Arah Kebijakan";

    const program = item.program ?? {
      kode_program: "-",
      nama_program: "Tidak Ada Program",
    };
    const kegiatan = item.kegiatan ?? {
      kode_kegiatan: "-",
      nama_kegiatan: "Tidak Ada Kegiatan",
    };

    const key1 = `${misi.no_misi} - ${misi.isi_misi}`;
    const key2 = `${priorNasional.kode_prionas} - ${priorNasional.nama_prionas}`;
    const key3 = `${priorDaerah.kode_prioda} - ${priorDaerah.nama_prioda}`;
    const key4 = `${priorKepda.kode_priogub} - ${priorKepda.nama_priogub}`;
    const key5 = `${tujuan.no_tujuan} - ${tujuan.isi_tujuan}`;
    const key6 = `${sasaran.nomor} - ${sasaran.isi_sasaran}`;
    const key7 = strategi;
    const key8 = arahKebijakan;
    const key9 = `${program.kode_program} - ${program.nama_program}`;
    const key10 = `${kegiatan.kode_kegiatan} - ${kegiatan.nama_kegiatan}`;

    grouped[key1] = grouped[key1] || {};
    grouped[key1][key2] = grouped[key1][key2] || {};
    grouped[key1][key2][key3] = grouped[key1][key2][key3] || {};
    grouped[key1][key2][key3][key4] = grouped[key1][key2][key3][key4] || {};
    grouped[key1][key2][key3][key4][key5] =
      grouped[key1][key2][key3][key4][key5] || {};
    grouped[key1][key2][key3][key4][key5][key6] =
      grouped[key1][key2][key3][key4][key5][key6] || {};
    grouped[key1][key2][key3][key4][key5][key6][key7] =
      grouped[key1][key2][key3][key4][key5][key6][key7] || {};
    grouped[key1][key2][key3][key4][key5][key6][key7][key8] =
      grouped[key1][key2][key3][key4][key5][key6][key7][key8] || {};
    grouped[key1][key2][key3][key4][key5][key6][key7][key8][key9] =
      grouped[key1][key2][key3][key4][key5][key6][key7][key8][key9] || {};
    grouped[key1][key2][key3][key4][key5][key6][key7][key8][key9][key10] =
      grouped[key1][key2][key3][key4][key5][key6][key7][key8][key9][key10] ||
      [];

    grouped[key1][key2][key3][key4][key5][key6][key7][key8][key9][key10].push(
      item
    );
  });

  return (
    <Accordion defaultActiveKey="0" alwaysOpen>
      {Object.entries(grouped).map(([misi, pnMap], i) => (
        <Accordion.Item eventKey={i.toString()} key={misi}>
          <Accordion.Header>{misi}</Accordion.Header>
          <Accordion.Body>
            <Accordion alwaysOpen>
              {Object.entries(pnMap).map(([pn, pdMap], j) => (
                <Accordion.Item eventKey={`pn-${j}`} key={pn}>
                  <Accordion.Header>{pn}</Accordion.Header>
                  <Accordion.Body>
                    <Accordion alwaysOpen>
                      {Object.entries(pdMap).map(([pd, pkMap], k) => (
                        <Accordion.Item eventKey={`pd-${k}`} key={pd}>
                          <Accordion.Header>{pd}</Accordion.Header>
                          <Accordion.Body>
                            <Accordion alwaysOpen>
                              {Object.entries(pkMap).map(([pk, tjMap], l) => (
                                <Accordion.Item eventKey={`pk-${l}`} key={pk}>
                                  <Accordion.Header>{pk}</Accordion.Header>
                                  <Accordion.Body>
                                    <Accordion alwaysOpen>
                                      {Object.entries(tjMap).map(
                                        ([tj, ssMap], m) => (
                                          <Accordion.Item
                                            eventKey={`tj-${m}`}
                                            key={tj}
                                          >
                                            <Accordion.Header>
                                              {tj}
                                            </Accordion.Header>
                                            <Accordion.Body>
                                              <Accordion alwaysOpen>
                                                {Object.entries(ssMap).map(
                                                  ([ss, stMap], n) => (
                                                    <Accordion.Item
                                                      eventKey={`ss-${n}`}
                                                      key={ss}
                                                    >
                                                      <Accordion.Header>
                                                        {ss}
                                                      </Accordion.Header>
                                                      <Accordion.Body>
                                                        <Accordion alwaysOpen>
                                                          {Object.entries(
                                                            stMap
                                                          ).map(
                                                            (
                                                              [st, akMap],
                                                              o
                                                            ) => (
                                                              <Accordion.Item
                                                                eventKey={`st-${o}`}
                                                                key={st}
                                                              >
                                                                <Accordion.Header>
                                                                  {st}
                                                                </Accordion.Header>
                                                                <Accordion.Body>
                                                                  <Accordion
                                                                    alwaysOpen
                                                                  >
                                                                    {Object.entries(
                                                                      akMap
                                                                    ).map(
                                                                      (
                                                                        [
                                                                          ak,
                                                                          prMap,
                                                                        ],
                                                                        p
                                                                      ) => (
                                                                        <Accordion.Item
                                                                          eventKey={`ak-${p}`}
                                                                          key={
                                                                            ak
                                                                          }
                                                                        >
                                                                          <Accordion.Header>
                                                                            {ak}
                                                                          </Accordion.Header>
                                                                          <Accordion.Body>
                                                                            <Accordion
                                                                              alwaysOpen
                                                                            >
                                                                              {Object.entries(
                                                                                prMap
                                                                              ).map(
                                                                                (
                                                                                  [
                                                                                    pr,
                                                                                    kgMap,
                                                                                  ],
                                                                                  q
                                                                                ) => (
                                                                                  <Accordion.Item
                                                                                    eventKey={`pr-${q}`}
                                                                                    key={
                                                                                      pr
                                                                                    }
                                                                                  >
                                                                                    <Accordion.Header>
                                                                                      {
                                                                                        pr
                                                                                      }
                                                                                    </Accordion.Header>
                                                                                    <Accordion.Body>
                                                                                      <Accordion
                                                                                        alwaysOpen
                                                                                      >
                                                                                        {Object.entries(
                                                                                          kgMap
                                                                                        ).map(
                                                                                          (
                                                                                            [
                                                                                              kg,
                                                                                              items,
                                                                                            ],
                                                                                            r
                                                                                          ) => (
                                                                                            <Accordion.Item
                                                                                              eventKey={`kg-${r}`}
                                                                                              key={
                                                                                                kg
                                                                                              }
                                                                                            >
                                                                                              <Accordion.Header>
                                                                                                {
                                                                                                  kg
                                                                                                }
                                                                                              </Accordion.Header>
                                                                                              <Accordion.Body>
                                                                                                <ListGroup>
                                                                                                  {items.map(
                                                                                                    (
                                                                                                      it
                                                                                                    ) => (
                                                                                                      <ListGroup.Item
                                                                                                        key={
                                                                                                          it.id
                                                                                                        }
                                                                                                        className="d-flex justify-content-between align-items-start"
                                                                                                      >
                                                                                                        <div>
                                                                                                          <strong className="text-primary">
                                                                                                            {it.kode_sub_kegiatan ||
                                                                                                              it.id}
                                                                                                          </strong>

                                                                                                          <div className="mt-2 text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              🎯
                                                                                                              Misi:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.misi
                                                                                                              ?.isi_misi ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              📌
                                                                                                              Prioritas
                                                                                                              Nasional:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.priorNasional
                                                                                                              ?.nama_prionas ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              🏞️
                                                                                                              Prioritas
                                                                                                              Daerah:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.priorDaerah
                                                                                                              ?.nama_prioda ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              🏛️
                                                                                                              Prioritas
                                                                                                              Gubernur:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.priorKepda
                                                                                                              ?.nama_priogub ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              🎯
                                                                                                              Tujuan:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.tujuan
                                                                                                              ?.isi_tujuan ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              🎯
                                                                                                              Sasaran:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.sasaran
                                                                                                              ?.isi_sasaran ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              🧠
                                                                                                              Strategi:
                                                                                                            </span>
                                                                                                            <ul className="mb-1">
                                                                                                              {Array.isArray(
                                                                                                                it.strategis
                                                                                                              ) &&
                                                                                                              it
                                                                                                                .strategis
                                                                                                                .length >
                                                                                                                0 ? (
                                                                                                                it.strategis.map(
                                                                                                                  (
                                                                                                                    s
                                                                                                                  ) => (
                                                                                                                    <li
                                                                                                                      key={
                                                                                                                        s.id
                                                                                                                      }
                                                                                                                    >
                                                                                                                      <strong>
                                                                                                                        {
                                                                                                                          s.kode_strategi
                                                                                                                        }
                                                                                                                      </strong>{" "}
                                                                                                                      –{" "}
                                                                                                                      {
                                                                                                                        s.deskripsi
                                                                                                                      }
                                                                                                                    </li>
                                                                                                                  )
                                                                                                                )
                                                                                                              ) : (
                                                                                                                <li>
                                                                                                                  -
                                                                                                                </li>
                                                                                                              )}
                                                                                                            </ul>
                                                                                                          </div>

                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              📖
                                                                                                              Arah
                                                                                                              Kebijakan:
                                                                                                            </span>
                                                                                                            <ul className="mb-1">
                                                                                                              {Array.isArray(
                                                                                                                it.arahKebijakans
                                                                                                              ) &&
                                                                                                              it
                                                                                                                .arahKebijakans
                                                                                                                .length >
                                                                                                                0 ? (
                                                                                                                it.arahKebijakans.map(
                                                                                                                  (
                                                                                                                    a
                                                                                                                  ) => (
                                                                                                                    <li
                                                                                                                      key={
                                                                                                                        a.id
                                                                                                                      }
                                                                                                                    >
                                                                                                                      <strong>
                                                                                                                        {
                                                                                                                          a.kode_arah
                                                                                                                        }
                                                                                                                      </strong>{" "}
                                                                                                                      –{" "}
                                                                                                                      {a.deskripsi ||
                                                                                                                        a.nama_arah}
                                                                                                                    </li>
                                                                                                                  )
                                                                                                                )
                                                                                                              ) : (
                                                                                                                <li>
                                                                                                                  -
                                                                                                                </li>
                                                                                                              )}
                                                                                                            </ul>
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              📂
                                                                                                              Program:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.program
                                                                                                              ?.nama_program ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                          <div className="text-muted small">
                                                                                                            <span className="fw-semibold">
                                                                                                              📁
                                                                                                              Kegiatan:
                                                                                                            </span>{" "}
                                                                                                            {it
                                                                                                              ?.kegiatan
                                                                                                              ?.nama_kegiatan ||
                                                                                                              "-"}
                                                                                                          </div>
                                                                                                        </div>

                                                                                                        <div className="ms-2 d-flex flex-column gap-2">
                                                                                                          <Button
                                                                                                            variant="outline-primary"
                                                                                                            size="sm"
                                                                                                            onClick={() =>
                                                                                                              onEdit?.(
                                                                                                                it
                                                                                                              )
                                                                                                            }
                                                                                                          >
                                                                                                            Ubah
                                                                                                          </Button>
                                                                                                          <Button
                                                                                                            variant="outline-danger"
                                                                                                            size="sm"
                                                                                                            onClick={() =>
                                                                                                              onDelete?.(
                                                                                                                it.id
                                                                                                              )
                                                                                                            }
                                                                                                          >
                                                                                                            Hapus
                                                                                                          </Button>
                                                                                                        </div>
                                                                                                        <Button
                                                                                                          size="sm"
                                                                                                          variant="outline-primary"
                                                                                                          onClick={() =>
                                                                                                            onDetail?.(
                                                                                                              it
                                                                                                            )
                                                                                                          }
                                                                                                        >
                                                                                                          Lihat
                                                                                                          Detail
                                                                                                        </Button>
                                                                                                      </ListGroup.Item>
                                                                                                    )
                                                                                                  )}
                                                                                                </ListGroup>
                                                                                              </Accordion.Body>
                                                                                            </Accordion.Item>
                                                                                          )
                                                                                        )}
                                                                                      </Accordion>
                                                                                    </Accordion.Body>
                                                                                  </Accordion.Item>
                                                                                )
                                                                              )}
                                                                            </Accordion>
                                                                          </Accordion.Body>
                                                                        </Accordion.Item>
                                                                      )
                                                                    )}
                                                                  </Accordion>
                                                                </Accordion.Body>
                                                              </Accordion.Item>
                                                            )
                                                          )}
                                                        </Accordion>
                                                      </Accordion.Body>
                                                    </Accordion.Item>
                                                  )
                                                )}
                                              </Accordion>
                                            </Accordion.Body>
                                          </Accordion.Item>
                                        )
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
