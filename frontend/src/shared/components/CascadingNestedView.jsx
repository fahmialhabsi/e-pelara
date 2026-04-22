/**
 * CascadingNestedView.jsx
 *
 * Tampilan hierarkis cascading yang bersih dan mudah dibaca.
 * Dikelompokkan per Misi → Tujuan → Sasaran → Program/Kegiatan.
 * Prioritas ditampilkan sebagai badge di setiap baris.
 *
 * Perbaikan vs versi lama:
 * - Tidak ada 10-level nested accordion yang membingungkan
 * - Setiap baris menampilkan info lengkap dengan ikon kontekstual
 * - Tombol aksi lebih jelas dan konsisten
 */

import React, { useState } from "react";
import { useDokumen } from "../../hooks/useDokumen";
import { isDokumenLevelPeriode } from "../../utils/planningDokumenUtils";
import {
  cascadingPrioritasDisplayLabel,
  cascadingPrioritasTooltipText,
  CASCADING_PRIORITAS_NASIONAL_FIELDS,
  CASCADING_PRIORITAS_DAERAH_FIELDS,
  CASCADING_PRIORITAS_GUB_FIELDS,
} from "../../utils/cascadingPrioritasLabels";
import {
  Accordion,
  Badge,
  Button,
  ListGroup,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  BsPencilSquare,
  BsTrash,
  BsEye,
  BsChevronDown,
  BsChevronRight,
} from "react-icons/bs";

// ─── Helper label ─────────────────────────────────────────────────────────────

function misiLabel(m) {
  if (!m) return "—";
  return [m.no_misi, m.isi_misi].filter(Boolean).join(" — ");
}
function tujuanLabel(t) {
  if (!t) return "—";
  return [t.no_tujuan, t.isi_tujuan].filter(Boolean).join(" — ");
}
function sasaranLabel(s) {
  if (!s) return "—";
  return [s.nomor, s.isi_sasaran].filter(Boolean).join(" — ");
}
function programLabel(p) {
  if (!p) return "—";
  return [p.kode_program, p.nama_program].filter(Boolean).join(" — ");
}
function kegiatanLabel(k) {
  if (!k) return "—";
  return [k.kode_kegiatan, k.nama_kegiatan].filter(Boolean).join(" — ");
}
function subKegiatanLabel(sk) {
  if (!sk) return null;
  return [sk.kode_sub_kegiatan, sk.nama_sub_kegiatan].filter(Boolean).join(" — ");
}

// ─── Sub-komponen ─────────────────────────────────────────────────────────────

/**
 * Row item: satu entri cascading (level kegiatan/sub-kegiatan)
 */
function CascadingItemRow({ item, onEdit, onDelete, onDetail }) {
  const [expanded, setExpanded] = useState(false);

  const prioritasBadges = [
    item.priorNasional && {
      display:
        cascadingPrioritasDisplayLabel(
          item.priorNasional,
          CASCADING_PRIORITAS_NASIONAL_FIELDS,
        ) || "PN",
      tooltip: cascadingPrioritasTooltipText(
        item.priorNasional,
        CASCADING_PRIORITAS_NASIONAL_FIELDS,
      ),
      bg: "primary",
    },
    item.priorDaerah && {
      display:
        cascadingPrioritasDisplayLabel(
          item.priorDaerah,
          CASCADING_PRIORITAS_DAERAH_FIELDS,
        ) || "PD",
      tooltip: cascadingPrioritasTooltipText(
        item.priorDaerah,
        CASCADING_PRIORITAS_DAERAH_FIELDS,
      ),
      bg: "info",
    },
    item.priorKepda && {
      display:
        cascadingPrioritasDisplayLabel(
          item.priorKepda,
          CASCADING_PRIORITAS_GUB_FIELDS,
        ) || "PG",
      tooltip: cascadingPrioritasTooltipText(
        item.priorKepda,
        CASCADING_PRIORITAS_GUB_FIELDS,
      ),
      bg: "warning",
    },
  ].filter(Boolean);

  const strategiList = Array.isArray(item.strategis) ? item.strategis : [];
  const arahList     = Array.isArray(item.arahKebijakans) ? item.arahKebijakans : [];

  return (
    <ListGroup.Item className="px-3 py-2">
      <div className="d-flex justify-content-between align-items-start gap-2">
        {/* Info utama */}
        <div className="flex-grow-1 min-w-0 pe-1">
          {/* Program */}
          <div className="fw-semibold text-dark mb-1">
            <span className="text-muted me-1">📂</span>
            {programLabel(item.program)}
          </div>

          {/* Kegiatan */}
          <div className="small text-secondary mb-1">
            <span className="me-1">📁</span>
            <span className="fw-medium text-dark">Kegiatan:</span>{" "}
            {kegiatanLabel(item.kegiatan)}
          </div>

          {/* Sub Kegiatan (jika ada) */}
          {item.subKegiatan && subKegiatanLabel(item.subKegiatan) && (
            <div className="small text-secondary mb-1">
              <span className="me-1">📎</span>
              <span className="fw-medium text-dark">Sub Kegiatan:</span>{" "}
              {subKegiatanLabel(item.subKegiatan)}
            </div>
          )}

          {/* Prioritas badges */}
          {prioritasBadges.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-1 mb-1 align-items-stretch">
              {prioritasBadges.map((b, i) => (
                <OverlayTrigger
                  key={i}
                  placement="top"
                  overlay={
                    <Tooltip style={{ whiteSpace: "pre-line", maxWidth: 360 }}>
                      {b.tooltip}
                    </Tooltip>
                  }
                >
                  <Badge
                    bg={b.bg}
                    className="fw-normal text-start text-wrap"
                    style={{
                      cursor: "help",
                      fontSize: "0.75rem",
                      lineHeight: 1.35,
                      maxWidth: "100%",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {b.display}
                  </Badge>
                </OverlayTrigger>
              ))}
            </div>
          )}

          {/* Ekspansi detail strategi & arah kebijakan */}
          {(strategiList.length > 0 || arahList.length > 0) && (
            <button
              className="btn btn-link btn-sm p-0 text-muted"
              style={{ fontSize: "0.75rem" }}
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <BsChevronDown size={12} /> : <BsChevronRight size={12} />}
              {" "}
              {expanded ? "Sembunyikan" : "Lihat"} Strategi & Arah Kebijakan
            </button>
          )}

          {expanded && (
            <div className="mt-2 ps-2 border-start border-2">
              {strategiList.length > 0 && (
                <div className="small text-secondary mb-1">
                  <span className="fw-medium text-dark">🧠 Strategi:</span>
                  <ul className="mb-1 mt-0 ps-3">
                    {strategiList.map((s) => (
                      <li key={s.id}>
                        <strong>{s.kode_strategi}</strong> – {s.deskripsi}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {arahList.length > 0 && (
                <div className="small text-secondary">
                  <span className="fw-medium text-dark">📖 Arah Kebijakan:</span>
                  <ul className="mb-1 mt-0 ps-3">
                    {arahList.map((a) => (
                      <li key={a.id}>
                        <strong>{a.kode_arah}</strong> – {a.deskripsi || a.nama_arah}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tombol aksi */}
        <div className="d-flex flex-column gap-1" style={{ minWidth: 80 }}>
          {onDetail && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onDetail(item)}
              title="Lihat Detail"
            >
              <BsEye />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => onEdit(item)}
              title="Ubah"
            >
              <BsPencilSquare />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onDelete(item.id)}
              title="Hapus"
            >
              <BsTrash />
            </Button>
          )}
        </div>
      </div>
    </ListGroup.Item>
  );
}

/**
 * Grup Sasaran — menampilkan daftar item di bawah satu sasaran
 */
function SasaranGroup({ sasaranKey, items, onEdit, onDelete, onDetail, eventKey }) {
  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>
        <span className="me-2">🎯</span>
        <span className="fw-medium">{sasaranKey}</span>
        <Badge bg="light" text="dark" className="ms-2 border">
          {items.length} kegiatan
        </Badge>
      </Accordion.Header>
      <Accordion.Body className="p-0">
        <ListGroup variant="flush">
          {items.map((it) => (
            <CascadingItemRow
              key={it.id}
              item={it}
              onEdit={onEdit}
              onDelete={onDelete}
              onDetail={onDetail}
            />
          ))}
        </ListGroup>
      </Accordion.Body>
    </Accordion.Item>
  );
}

/**
 * Grup Tujuan — menampilkan sasaran-sasaran di bawah satu tujuan
 */
function TujuanGroup({ tujuanKey, sasaranMap, onEdit, onDelete, onDetail, eventKey }) {
  const totalItems = Object.values(sasaranMap).reduce((n, arr) => n + arr.length, 0);
  return (
    <Accordion.Item eventKey={eventKey}>
      <Accordion.Header>
        <span className="me-2">🏹</span>
        <span className="fw-medium">{tujuanKey}</span>
        <Badge bg="light" text="dark" className="ms-2 border">
          {Object.keys(sasaranMap).length} sasaran · {totalItems} kegiatan
        </Badge>
      </Accordion.Header>
      <Accordion.Body>
        <Accordion>
          {Object.entries(sasaranMap).map(([sk, items], ni) => (
            <SasaranGroup
              key={sk}
              sasaranKey={sk}
              items={items}
              onEdit={onEdit}
              onDelete={onDelete}
              onDetail={onDetail}
              eventKey={`ss-${ni}`}
            />
          ))}
        </Accordion>
      </Accordion.Body>
    </Accordion.Item>
  );
}

// ─── Komponen utama ──────────────────────────────────────────────────────────

export default function CascadingNestedView({ data = [], onEdit, onDelete, onDetail }) {
  const { dokumen } = useDokumen();

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        <div style={{ fontSize: "2rem" }}>📋</div>
        <p className="mb-0">
          {isDokumenLevelPeriode(dokumen)
            ? "Belum ada data cascading untuk konteks dokumen / periode ini."
            : "Belum ada data cascading untuk konteks dokumen / waktu ini."}
        </p>
        <small>Klik <strong>Tambah Cascading</strong> untuk mulai mengisi data.</small>
      </div>
    );
  }

  /**
   * Struktur pengelompokan:
   * misiKey → tujuanKey → sasaranKey → [ items ]
   */
  const grouped = {};

  data.forEach((item) => {
    const misiKey    = item.misi
      ? misiLabel(item.misi)
      : "— Misi Tidak Diketahui";
    const tujuanKey  = item.tujuan
      ? tujuanLabel(item.tujuan)
      : "— Tujuan Tidak Diketahui";
    const sasaranKey = item.sasaran
      ? sasaranLabel(item.sasaran)
      : "— Sasaran Tidak Diketahui";

    grouped[misiKey] = grouped[misiKey] || {};
    grouped[misiKey][tujuanKey] = grouped[misiKey][tujuanKey] || {};
    grouped[misiKey][tujuanKey][sasaranKey] = grouped[misiKey][tujuanKey][sasaranKey] || [];
    grouped[misiKey][tujuanKey][sasaranKey].push(item);
  });

  return (
    <Accordion defaultActiveKey="0">
      {Object.entries(grouped).map(([misiKey, tujuanMap], mi) => {
        const totalItems = Object.values(tujuanMap).reduce(
          (n, ss) => n + Object.values(ss).reduce((m, arr) => m + arr.length, 0),
          0
        );
        return (
          <Accordion.Item eventKey={mi.toString()} key={misiKey}>
            <Accordion.Header>
              <span className="me-2">🎖️</span>
              <span className="fw-semibold">{misiKey}</span>
              <Badge bg="primary" className="ms-2">
                {Object.keys(tujuanMap).length} tujuan · {totalItems} kegiatan
              </Badge>
            </Accordion.Header>
            <Accordion.Body>
              <Accordion>
                {Object.entries(tujuanMap).map(([tujuanKey, sasaranMap], ti) => (
                  <TujuanGroup
                    key={tujuanKey}
                    tujuanKey={tujuanKey}
                    sasaranMap={sasaranMap}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDetail={onDetail}
                    eventKey={`tj-${ti}`}
                  />
                ))}
              </Accordion>
            </Accordion.Body>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
