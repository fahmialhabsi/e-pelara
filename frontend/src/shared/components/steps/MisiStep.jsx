import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import {
  Card,
  Table,
  Spinner,
  Button,
  Form,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import Select from "react-select";
import { ErrorMessage } from "formik";
import { FaInfoCircle } from "react-icons/fa";
import { LEVEL_DOKUMEN_OPTIONS, JENIS_IKU_OPTIONS } from "@/utils/constants";

export default function MisiStep({
  options,
  stepOptions = [],
  tabKey,
  setTabKey,
  onNext,
}) {
  const { values, setFieldValue } = useFormikContext();
  const [selectedMisi, setSelectedMisi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (values.misi_id) {
      const sel = stepOptions.find(
        (m) => String(m.id) === String(values.misi_id)
      );
      setSelectedMisi(sel || null);
    }
  }, [values.misi_id, stepOptions]);

  const handleMisiChange = (e) => {
    const id = e.target.value;
    const sel = stepOptions.find((m) => String(m.id) === id);
    setFieldValue("misi_id", id);
    setFieldValue("no_misi", sel?.no_misi || "");
    setFieldValue("isi_misi", sel?.isi_misi || "");
    setSelectedMisi(sel || null);
  };

  const handleSaveMisi = () => {
    if (!values.misi_id) {
      alert("Silakan pilih Misi terlebih dahulu");
      return;
    }
    if (!values.level_dokumen || !values.jenis_iku) {
      alert("Level Dokumen dan Jenis IKU wajib diisi");
      return;
    }

    console.log("✅ Misi, level dokumen, dan jenis IKU valid. Lanjut...");

    if (typeof onNext === "function") {
      onNext();
    }
  };

  if (loading) return <Spinner animation="border" />;

  return (
    <>
      <Card className="p-3 mb-3">
        <h5>Pilih Misi</h5>

        <Form.Group className="mb-3">
          <Form.Label>Misi</Form.Label>
          <Form.Select
            name="misi_id"
            value={values.misi_id || ""}
            onChange={handleMisiChange}
          >
            <option value="">-- Pilih Misi --</option>
            {stepOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.no_misi} – {m.isi_misi}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>No. Misi</Form.Label>
          <Form.Control name="no_misi" value={values.no_misi || ""} readOnly />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>Isi Misi</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            name="isi_misi"
            value={values.isi_misi || ""}
            readOnly
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            Level Dokumen
            <OverlayTrigger
              overlay={<Tooltip>Pilih jenis dokumen yang relevan</Tooltip>}
              placement="top"
            >
              <span>
                <FaInfoCircle className="ms-2 text-muted" />
              </span>
            </OverlayTrigger>
          </Form.Label>
          <Select
            name="level_dokumen"
            options={LEVEL_DOKUMEN_OPTIONS}
            value={LEVEL_DOKUMEN_OPTIONS.find(
              (opt) => opt.value === values.level_dokumen
            )}
            onChange={(opt) => setFieldValue("level_dokumen", opt.value)}
            placeholder="Pilih Level Dokumen..."
          />
          <ErrorMessage
            name="level_dokumen"
            component="div"
            className="text-danger mt-1"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Jenis IKU</Form.Label>
          <Select
            name="jenis_iku"
            options={JENIS_IKU_OPTIONS}
            value={JENIS_IKU_OPTIONS.find(
              (opt) => opt.value === values.jenis_iku
            )}
            onChange={(opt) => setFieldValue("jenis_iku", opt.value)}
            placeholder="Pilih Jenis IKU..."
          />
          <ErrorMessage
            name="jenis_iku"
            component="div"
            className="text-danger mt-1"
          />
        </Form.Group>
      </Card>

      {selectedMisi && (
        <Card className="p-3 mb-3">
          <h5>Preview Misi Dipilih</h5>
          <Table bordered size="sm">
            <thead>
              <tr>
                <th>No. Misi</th>
                <th>Isi Misi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{selectedMisi.no_misi}</td>
                <td>{selectedMisi.isi_misi}</td>
              </tr>
            </tbody>
          </Table>
        </Card>
      )}

      <div className="d-flex justify-content-end">
        <Button variant="primary" onClick={handleSaveMisi}>
          Simpan & Lanjut
        </Button>
      </div>
    </>
  );
}
