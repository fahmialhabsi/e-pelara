import React from "react";
import { Row, Col, Form, Button } from "react-bootstrap";

export default function AktivitasFilter({ filters, setFilters }) {
  return (
    <Form className="mb-3">
      <Row>
        <Col>
          <Form.Select
            value={filters.role}
            onChange={(e) =>
              setFilters((f) => ({ ...f, role: e.target.value }))
            }
          >
            <option value="">— Pilih Role —</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="PENGAWAS">Pengawas</option>
            <option value="PELAKSANA">Pelaksana</option>
          </Form.Select>
        </Col>
        <Col>
          <Form.Select
            value={filters.periodType}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                periodType: e.target.value,
                period: "",
              }))
            }
          >
            <option value="tanggal">Per Tanggal</option>
            <option value="bulan">Per Bulan</option>
            <option value="triwulan">Per Triwulan</option>
            <option value="semester">Per Semester</option>
            <option value="tahun">Agregat 12 bulan (log aktivitas)</option>
          </Form.Select>
        </Col>
        <Col>
          <Form.Control
            type={filters.periodType === "tanggal" ? "date" : "text"}
            placeholder={
              filters.periodType === "bulan" ? "YYYY-MM" : filters.periodType
            }
            value={filters.period}
            onChange={(e) =>
              setFilters((f) => ({ ...f, period: e.target.value }))
            }
          />
        </Col>
        <Col xs="auto">
          <Button
            onClick={() => {
              /* trigger fetch */
            }}
          >
            Terapkan
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
