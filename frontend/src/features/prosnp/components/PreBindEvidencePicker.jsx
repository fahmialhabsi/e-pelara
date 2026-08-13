import React, { useEffect, useState } from 'react';
import { Badge, Button, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getFoodOpsDocumentDetail, getFoodOpsEvidenceCandidates } from '../../foodOperations/services/foodOpsApi';
import { CANDIDATE_RELEVANCE_LABEL, CANDIDATE_RELEVANCE_VARIANT, DOCUMENT_TYPE_LABEL } from '../../foodOperations/services/foodOpsConstants';

/**
 * Corrective "ProSN Semester-II Readiness — Recall-First Register Creation"
 * (mandat §11/§12/§13, Req D/E/F) — DISKOVERI dokumen kanonis SEBELUM record
 * ProSN dibuat (mis. Surat Penugasan/Rapat/Inovasi belum punya id). Berbeda
 * dari `EntityBuktiManager` (yg mengikat evidence ke entity yg SUDAH ADA),
 * komponen ini HANYA memilih kandidat + mengembalikan metadata dokumen lewat
 * `onSelect(document)` — pemanggil bertanggung jawab autofill field form-nya
 * sendiri (field mapping berbeda per indikator, mandat §18 "no fabrication",
 * "only safely derivable fields") dan mengikat evidence SETELAH record
 * tersimpan (via `bindFoodOpsEvidenceToProsn`, mesin ranking/dedup yg SAMA
 * dgn EntityBuktiManager — reuse total, mandat §15 "unified candidate
 * ranking"). TIDAK PERNAH auto-bind/auto-isi tanpa klik eksplisit (mandat §12
 * "always require explicit user confirmation").
 */
export default function PreBindEvidencePicker({ kategoriProsn, documentType, onSelect, label }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => { setCandidates([]); setLoaded(false); setSelectedId(null); }, [kategoriProsn, documentType]);

  const search = async () => {
    setLoading(true);
    try {
      const rows = await getFoodOpsEvidenceCandidates({ kategori_prosn: kategoriProsn, document_type: documentType });
      setCandidates(rows);
      setLoaded(true);
    } catch { toast.error('Gagal mencari dokumen existing.'); }
    finally { setLoading(false); }
  };

  // Kandidat dari findCandidates SENGAJA tidak membawa seluruh field dokumen
  // (mis. nomor_dokumen/penerbit) — ambil detail lengkap HANYA saat user
  // eksplisit memilih (bukan utk seluruh daftar sekaligus, mandat §40.G "no
  // unbounded scan"), lalu serahkan objek dokumen LENGKAP ke pemanggil.
  const pilih = async (candidate) => {
    setResolving(true);
    try {
      const detail = await getFoodOpsDocumentDetail(candidate.document_id);
      setSelectedId(candidate.document_id);
      onSelect(detail);
    } catch { toast.error('Gagal memuat detail dokumen.'); }
    finally { setResolving(false); }
  };

  return (
    <div className="mb-3 border rounded p-2 bg-light">
      <div className="d-flex justify-content-between align-items-center">
        <div className="small text-muted">{label || 'Isi Otomatis dari Dokumen Existing (opsional) — tidak perlu unggah ulang berkas yang sama.'}</div>
        <Button size="sm" variant="outline-primary" onClick={search} disabled={loading}>
          {loading ? 'Mencari…' : 'Cari Dokumen Existing'}
        </Button>
      </div>
      {loaded && (
        candidates.length ? (
          <ListGroup className="mt-2">
            {candidates.map((c) => (
              <ListGroup.Item key={c.document_id} className="d-flex justify-content-between align-items-center flex-wrap gap-2 py-2">
                <div>
                  <Badge bg={CANDIDATE_RELEVANCE_VARIANT[c.relevance] || 'secondary'} className="me-2">{CANDIDATE_RELEVANCE_LABEL[c.relevance] || c.relevance}</Badge>
                  <strong>{c.judul}</strong>
                  <div className="small text-muted">{DOCUMENT_TYPE_LABEL[c.document_type] || c.document_type} · {c.tanggal_dokumen || 'tanggal tidak diketahui'}</div>
                </div>
                <Button size="sm" variant={selectedId === c.document_id ? 'success' : 'outline-secondary'} disabled={resolving} onClick={() => pilih(c)}>
                  {selectedId === c.document_id ? 'Terpilih' : 'Gunakan'}
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : <div className="small text-muted mt-2">Tidak ditemukan dokumen yang cocok — isi manual di bawah.</div>
      )}
    </div>
  );
}
