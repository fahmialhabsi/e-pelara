// Enhanced ReusableStepTemplate.jsx now aligned with TujuanStep
import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  ProgressBar,
  Tab,
  Nav,
  Row,
  Col,
  Table,
  Form,
  Alert,
} from "react-bootstrap";
import { useFormikContext } from "formik";
import { toast, ToastContainer } from "react-toastify";

const TOTAL_TABS = 5;
const MAX_ITEM = 5;

export default function ReusableStepTemplate({
  stepKey,
  options = {},
  stepOptions = [],
  tabKey,
  setTabKey,
}) {
  const { values, errors, touched, setFieldValue, validateForm, resetForm } =
    useFormikContext();
  const [activeInnerTab, setActiveInnerTab] = useState(1);
  const [itemList, setItemList] = useState([]);
  const opdOptions = useMemo(
    () => options.penanggungJawab || [],
    [options.penanggungJawab]
  );

  useEffect(() => {
    const saved =
      localStorage.getItem("form_rpjmd") ||
      sessionStorage.getItem("form_rpjmd");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([k, v]) => setFieldValue(k, v));
    }
  }, [setFieldValue]);

  useEffect(() => {
    const str = JSON.stringify(values);
    localStorage.setItem("form_rpjmd", str);
    sessionStorage.setItem("form_rpjmd", str);
  }, [values]);

  useEffect(() => {
    setItemList(values[stepKey] || []);
  }, [values[stepKey], stepKey]);

  const buildItem = () => {
    const unit = values.satuan || "";
    const selectedOPD = opdOptions.find(
      (o) => o.id === values.penanggung_jawab
    );
    return {
      ...values,
      baseline: values.baseline ? `${values.baseline} ${unit}` : "",
      ...[1, 2, 3, 4, 5].reduce(
        (acc, i) => ({
          ...acc,
          [`target_tahun_${i}`]: values[`target_tahun_${i}`]
            ? `${values[`target_tahun_${i}`]} ${unit}`
            : "",
        }),
        {}
      ),
      penanggung_jawab_label: selectedOPD
        ? `${selectedOPD.nama_opd} - ${selectedOPD.nama_bidang_opd}`
        : "",
    };
  };

  const resetFields = () => {
    [
      "tolok_ukur_kinerja",
      "target_kinerja",
      "definisi_operasional",
      "metode_penghitungan",
      "baseline",
      "kriteria_kuantitatif",
      "kriteria_kualitatif",
      "nama_indikator",
      ...[1, 2, 3, 4, 5].map((i) => `target_tahun_${i}`),
      "keterangan",
    ].forEach((field) => setFieldValue(field, ""));
  };

  const handleAdd = async () => {
    if (itemList.length >= MAX_ITEM) {
      toast.warning(`Maksimal ${MAX_ITEM} indikator.`);
      return;
    }
    const errors = await validateForm();
    if (Object.keys(errors).length > 0) {
      toast.error("Data belum lengkap atau tidak valid.");
      return;
    }
    const item = buildItem();
    const updatedList = [...itemList, item];
    setFieldValue(stepKey, updatedList);
    resetFields();
    toast.success("Item berhasil ditambahkan.");
  };

  const handleDelete = (index) => {
    const updated = itemList.filter((_, i) => i !== index);
    setFieldValue(stepKey, updated);
  };

  const handleReset = () => {
    resetForm();
    localStorage.removeItem("form_rpjmd");
    sessionStorage.removeItem("form_rpjmd");
    setItemList([]);
  };

  return (
    <Card className="p-4 shadow-sm">
      <ToastContainer position="top-right" autoClose={3000} />
      <ProgressBar now={(tabKey / TOTAL_TABS) * 100} className="mb-3" />
      <Tab.Container
        activeKey={activeInnerTab}
        onSelect={(k) => setActiveInnerTab(Number(k))}
      >
        <Nav variant="tabs" className="mb-4">
          {["Umum", "Detail", "Deskripsi", "Target", "Preview"].map(
            (label, i) => (
              <Nav.Item key={i + 1}>
                <Nav.Link eventKey={i + 1}>{label}</Nav.Link>
              </Nav.Item>
            )
          )}
        </Nav>

        <Card.Body>
          <Tab.Content>
            <Tab.Pane eventKey={1}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="nama_indikator">
                    <Form.Label>Nama Indikator</Form.Label>
                    <Form.Control
                      name="nama_indikator"
                      type="text"
                      value={values.nama_indikator || ""}
                      onChange={(e) =>
                        setFieldValue("nama_indikator", e.target.value)
                      }
                      isInvalid={
                        touched.nama_indikator && !!errors.nama_indikator
                      }
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.nama_indikator}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </Tab.Pane>

            <Tab.Pane eventKey={2}>
              <Alert variant="info">Isi untuk Detail</Alert>
            </Tab.Pane>
            <Tab.Pane eventKey={3}>
              <Alert variant="info">Isi untuk Deskripsi</Alert>
            </Tab.Pane>
            <Tab.Pane eventKey={4}>
              <Alert variant="info">Isi untuk Target</Alert>
            </Tab.Pane>

            <Tab.Pane eventKey={5}>
              <Table bordered hover size="sm">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Baseline</th>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <th key={i}>{`Th. ke-${i}`}</th>
                    ))}
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {itemList.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{item.nama_indikator}</td>
                      <td>{item.baseline}</td>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <td key={j}>{item[`target_tahun_${j}`]}</td>
                      ))}
                      <td>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(idx)}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Button variant="secondary" onClick={handleAdd} className="mt-3">
                Tambah Indikator
              </Button>
              <Button
                variant="outline-secondary"
                onClick={handleReset}
                className="mt-3 ms-2"
              >
                Reset Form
              </Button>
            </Tab.Pane>
          </Tab.Content>
        </Card.Body>
      </Tab.Container>
    </Card>
  );
}
