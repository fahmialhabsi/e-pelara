// src/features/rpjmd/hooks/ListPageComponent.jsx
import React, { useState, useMemo } from "react";
import {
  Container,
  Table,
  Button,
  Spinner,
  Form,
  Row,
  Col,
} from "react-bootstrap";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import ReactPaginate from "react-paginate";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { logoBase64 } from "@/assets/logoBase64";

const getValueByPath = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

export default function ListPageComponent({
  title,
  data,
  columns,
  loading,
  onAdd,
  onEdit,
  onDelete,
  exportFileName = "export",
  filterFields = [],
  userRole = "",
  itemsPerPage = 10,
  jenis_dokumen = "RPJMD",
}) {
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (search) {
      filtered = filtered.filter((item) =>
        columns.some((col) =>
          String(getValueByPath(item, col.key) || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      );
    }

    filterFields.forEach((field) => {
      if (filters[field.key]) {
        filtered = filtered.filter(
          (item) =>
            String(getValueByPath(item, field.key)) ===
            String(filters[field.key])
        );
      }
    });

    return filtered;
  }, [data, search, filters, columns, filterFields]);

  const pageCount = useMemo(() => {
    return Math.ceil(filteredData.length / itemsPerPage) || 1;
  }, [filteredData, itemsPerPage]);

  const paginatedData = filteredData.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleExportCSV = () => {
    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${exportFileName}.csv`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const logoWidth = 20;
    const logoHeight = 20;
    const tahunAktif = new Date().getFullYear();

    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 15, 10, logoWidth, logoHeight);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title || "Daftar Data", pageWidth / 2, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Jenis Dokumen: ${jenis_dokumen}`, pageWidth / 2, 26, {
      align: "center",
    });
    doc.text(`Tahun: ${tahunAktif}`, pageWidth / 2, 32, { align: "center" });

    const head = [["#", ...columns.map((col) => col.label)]];
    const body = filteredData.map((item, idx) => [
      idx + 1,
      ...columns.map((col) => getValueByPath(item, col.key) || ""),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 40,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        valign: "middle",
        halign: "left",
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { top: 30 },
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(
        `Halaman ${i} dari ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        {
          align: "center",
        }
      );
    }

    doc.save(`${exportFileName}.pdf`);
  };

  const handlePrint = () => window.print();

  const resetFilters = () => {
    setFilters({});
    setSearch("");
    setCurrentPage(0);
  };

  return (
    <Container className="py-4">
      <style>
        {`
        @media print {
          .no-print {
            display: none !important;
          }
        }

        .pagination {
          display: flex;
          justify-content: center;
          list-style: none;
          gap: 0.5rem;
          padding: 0.5rem 0;
        }

        .page-item .page-link {
          border: 1px solid #dee2e6;
          padding: 0.375rem 0.75rem;
          color: #0d6efd;
          text-decoration: none;
          cursor: pointer;
        }

        .page-item.active .page-link {
          background-color: #0d6efd;
          color: white;
          border-color: #0d6efd;
        }
      `}
      </style>

      <Toaster position="top-right" />
      <div className="d-flex justify-content-between align-items-center mb-3 no-print">
        <h4>{title}</h4>
        <div className="d-flex gap-2">
          {userRole !== "viewer" && (
            <Button variant="success" onClick={onAdd} disabled={loading}>
              Tambah
            </Button>
          )}
          <Button variant="outline-secondary" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="outline-secondary" onClick={handleExportPDF}>
            Export PDF
          </Button>
          <Button variant="outline-primary" onClick={handlePrint}>
            Cetak
          </Button>
        </div>
      </div>

      <Row className="mb-3 no-print">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Cari..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        {filterFields.map((field) => (
          <Col key={field.key} md={3}>
            {field.type === "select" ? (
              <Form.Select
                value={filters[field.key] || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
              >
                <option value="">-- {field.label} --</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                placeholder={field.label}
                value={filters[field.key] || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
              />
            )}
          </Col>
        ))}
        <Col md="auto">
          <Button variant="outline-secondary" onClick={resetFilters}>
            Reset Filter
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center my-4">
          <Spinner animation="border" role="status" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center text-muted">Tidak ada data ditemukan.</div>
      ) : (
        <>
          <div id="table-to-export">
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>No</th>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  {userRole !== "viewer" && <th className="no-print">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>{currentPage * itemsPerPage + idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key}>{getValueByPath(item, col.key)}</td>
                    ))}
                    {userRole !== "viewer" && (
                      <td className="no-print">
                        <Button
                          size="sm"
                          variant="warning"
                          className="me-2"
                          onClick={() => onEdit(item)}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (
                              window.confirm("Yakin ingin menghapus data ini?")
                            ) {
                              try {
                                onDelete(item);
                                toast.success("Data berhasil dihapus!");
                              } catch {
                                toast.error("Gagal menghapus data.");
                              }
                            }
                          }}
                        >
                          Hapus
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {pageCount > 1 && (
            <>
              <div className="text-end text-muted no-print">
                Halaman {currentPage + 1} dari {pageCount}
              </div>

              <div className="d-flex justify-content-end align-items-center gap-2 mt-3 no-print">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setCurrentPage(0)}
                  disabled={currentPage === 0}
                >
                  ⏮ Awal
                </Button>
                <ReactPaginate
                  previousLabel={"←"}
                  nextLabel={"→"}
                  breakLabel={"..."}
                  pageCount={pageCount}
                  forcePage={currentPage}
                  onPageChange={({ selected }) => setCurrentPage(selected)}
                  containerClassName={"pagination mb-0"}
                  pageClassName={"page-item"}
                  pageLinkClassName={"page-link"}
                  previousClassName={"page-item"}
                  previousLinkClassName={"page-link"}
                  nextClassName={"page-item"}
                  nextLinkClassName={"page-link"}
                  breakClassName={"page-item"}
                  breakLinkClassName={"page-link"}
                  activeClassName={"active"}
                />
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setCurrentPage(pageCount - 1)}
                  disabled={currentPage === pageCount - 1}
                >
                  Akhir ⏭
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Container>
  );
}
