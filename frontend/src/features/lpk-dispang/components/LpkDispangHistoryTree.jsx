import React, { useMemo } from 'react';
import { Accordion, Badge } from 'react-bootstrap';
import LpkDispangTable from './LpkDispangTable';

const buildHistoryTree = (tree, historyRows) => {
  const rowsByKegiatan = new Map();
  historyRows.forEach((r) => {
    const kode = r.dpa?.kode_kegiatan;
    if (!kode) return;
    if (!rowsByKegiatan.has(kode)) rowsByKegiatan.set(kode, []);
    rowsByKegiatan.get(kode).push(r);
  });

  return tree
    .map((t) => {
      const sasaran = (t.sasaran || [])
        .map((s) => {
          const program = (s.program || [])
            .map((p) => {
              const kegiatan = (p.kegiatan || [])
                .map((k) => ({ ...k, rows: rowsByKegiatan.get(k.kode_kegiatan) || [] }))
                .filter((k) => k.rows.length > 0);
              const count = kegiatan.reduce((sum, k) => sum + k.rows.length, 0);
              return { ...p, kegiatan, count };
            })
            .filter((p) => p.count > 0);
          const count = program.reduce((sum, p) => sum + p.count, 0);
          return { ...s, program, count };
        })
        .filter((s) => s.count > 0);
      const count = sasaran.reduce((sum, s) => sum + s.count, 0);
      return { ...t, sasaran, count };
    })
    .filter((t) => t.count > 0);
};

const CountBadge = ({ count }) => (
  <Badge bg="secondary" className="ms-2">
    {count} data
  </Badge>
);

const LpkDispangHistoryTree = ({ tree, historyRows, onEdit, onDelete }) => {
  const grouped = useMemo(() => buildHistoryTree(tree, historyRows), [tree, historyRows]);

  if (!grouped.length) {
    return <p className="text-muted fst-italic small">Belum ada data</p>;
  }

  return (
    <Accordion>
      {grouped.map((t) => (
        <Accordion.Item eventKey={`t-${t.id}`} key={t.id}>
          <Accordion.Header>
            {t.no_tujuan} — {t.isi_tujuan}
            <CountBadge count={t.count} />
          </Accordion.Header>
          <Accordion.Body>
            <Accordion>
              {t.sasaran.map((s) => (
                <Accordion.Item eventKey={`s-${s.id}`} key={s.id}>
                  <Accordion.Header>
                    {s.nomor} — {s.isi_sasaran}
                    <CountBadge count={s.count} />
                  </Accordion.Header>
                  <Accordion.Body>
                    <Accordion>
                      {s.program.map((p) => (
                        <Accordion.Item eventKey={`p-${p.id}`} key={p.id}>
                          <Accordion.Header>
                            {p.kode_program} — {p.nama_program}
                            <CountBadge count={p.count} />
                          </Accordion.Header>
                          <Accordion.Body>
                            <Accordion>
                              {p.kegiatan.map((k) => (
                                <Accordion.Item eventKey={`k-${k.id}`} key={k.id}>
                                  <Accordion.Header>
                                    {k.kode_kegiatan} — {k.nama_kegiatan}
                                    <CountBadge count={k.rows.length} />
                                  </Accordion.Header>
                                  <Accordion.Body>
                                    <LpkDispangTable
                                      data={k.rows}
                                      onEdit={onEdit}
                                      onDelete={onDelete}
                                    />
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
};

export default LpkDispangHistoryTree;
