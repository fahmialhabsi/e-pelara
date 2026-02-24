// src/features/renstra/components/RenstraSidebar.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, Accordion, Spinner, Alert } from "react-bootstrap";
import api from "../../../services/api";

const babList = [
  { nomor: "I", title: "Pendahuluan" },
  { nomor: "II", title: "Gambaran Umum Dinas Pangan" },
  { nomor: "III", title: "Permasalahan & Isu Strategis" },
  { nomor: "IV", title: "Tujuan & Sasaran" },
  { nomor: "V", title: "Strategi & Kebijakan" },
  { nomor: "VI", title: "Program & Kegiatan" },
  { nomor: "VII", title: "Indikator Kinerja" },
  { nomor: "VIII", title: "Penutup" },
];

const inputActions = [
  { label: "Tujuan", to: "/renstra/tujuan/add", className: "btn-primary" },
  { label: "Sasaran", to: "/renstra/sasaran/add", className: "btn-info" },
  { label: "Strategi", to: "/renstra/strategi/add", className: "btn-warning" },
  { label: "Kebijakan", to: "/renstra/kebijakan/add", className: "btn-danger" },
  { label: "Program", to: "/renstra/program/add", className: "btn-secondary" },
  { label: "Kegiatan", to: "/renstra/kegiatan/add", className: "btn-dark" },
  {
    label: "Sub Kegiatan",
    to: "/renstra/subkegiatan/add",
    className: "btn-outline-secondary",
  },
  {
    label: "Indikator",
    to: "/renstra/indikator-umum/add",
    className: "btn-outline-primary",
  },
];

const STORAGE_KEY = "renstraAccordionOpen";

const defaultBidangList = [
  "Sekretariat",
  "Bidang Ketersediaan dan Kerawanan Pangan",
  "Bidang Distribusi dan Cadangan Pangan",
  "Bidang Konsumsi dan Keamanan Pangan",
  "Balai Pengawasan Mutu Pangan",
];

const RenstraSidebar = () => {
  const [activeKeys, setActiveKeys] = useState(["0"]);
  const [bidangList, setBidangList] = useState(defaultBidangList);
  const [loadingBidang, setLoadingBidang] = useState(true);
  const [errorBidang, setErrorBidang] = useState("");

  // Load state accordion dari localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setActiveKeys(parsed);
      } catch {
        // jika parsing gagal, abaikan
      }
    }
  }, []);

  // Simpan state accordion ke localStorage
  const handleToggle = (key) => {
    let updatedKeys;
    if (activeKeys.includes(key)) {
      updatedKeys = activeKeys.filter((k) => k !== key);
    } else {
      updatedKeys = [...activeKeys, key];
    }
    setActiveKeys(updatedKeys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedKeys));
  };

  // Ambil daftar bidang dari API
  useEffect(() => {
    let isMounted = true;

    api
      .get("/opd-penanggung-jawab")
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data || [];
        const uniqueBidang = [
          ...new Set(data.map((item) => item.nama_bidang_opd).filter(Boolean)),
        ];
        if (uniqueBidang.length > 0) {
          setBidangList(uniqueBidang);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat bidang OPD:", err);
        if (isMounted) {
          setErrorBidang("Gagal memuat daftar bidang dari server.");
        }
      })
      .finally(() => {
        if (isMounted) setLoadingBidang(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="sticky-sidebar">
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Accordion activeKey={activeKeys} alwaysOpen flush>
            {/* BAB RENSTRA */}
            <Accordion.Item eventKey="0">
              <Accordion.Header onClick={() => handleToggle("0")}>
                BAB RENSTRA
              </Accordion.Header>
              <Accordion.Body>
                <ul className="mb-0 ps-3">
                  {babList.map((bab) => (
                    <li key={bab.nomor}>
                      <Link to={`/renstra/${bab.nomor}`}>
                        {bab.nomor}. {bab.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            {/* Aksi Input */}
            <Accordion.Item eventKey="1">
              <Accordion.Header onClick={() => handleToggle("1")}>
                Aksi Input Data Renstra
              </Accordion.Header>
              <Accordion.Body>
                <div className="d-flex flex-wrap gap-2">
                  {inputActions.map((act, idx) => (
                    <Link
                      key={idx}
                      to={act.to}
                      className={`btn btn-sm ${act.className}`}
                    >
                      {act.label}
                    </Link>
                  ))}
                </div>
              </Accordion.Body>
            </Accordion.Item>

            {/* Input Tabel Renstra */}
            <Accordion.Item eventKey="5">
              <Accordion.Header onClick={() => handleToggle("5")}>
                Input Tabel Renstra
              </Accordion.Header>
              <Accordion.Body>
                <div className="d-flex flex-column gap-2">
                  <Link
                    to="/renstra/tabel/tujuan"
                    className="btn btn-outline-primary btn-sm"
                  >
                    📊 Tabel Tujuan
                  </Link>
                  <Link
                    to="/renstra/tabel/sasaran"
                    className="btn btn-outline-success btn-sm"
                  >
                    🎯 Tabel Sasaran
                  </Link>
                  <Link
                    to="/renstra/tabel/program"
                    className="btn btn-outline-warning btn-sm"
                  >
                    🗂️ Tabel Program
                  </Link>
                  <Link
                    to="/renstra/tabel/kegiatan"
                    className="btn btn-outline-info btn-sm"
                  >
                    📑 Tabel Kegiatan
                  </Link>
                  <Link
                    to="/renstra/tabel/subkegiatan"
                    className="btn btn-outline-secondary btn-sm"
                  >
                    📝 Tabel Sub Kegiatan
                  </Link>
                </div>
              </Accordion.Body>
            </Accordion.Item>

            {/* ✅ Target Renstra */}
            <Accordion.Item eventKey="4">
              <Accordion.Header onClick={() => handleToggle("4")}>
                Target Renstra
              </Accordion.Header>
              <Accordion.Body>
                <div className="d-flex flex-column gap-2">
                  <Link
                    to="/renstra/target" // list target
                    className="btn btn-outline-success btn-sm"
                  >
                    🎯 Lihat Target Renstra
                  </Link>
                  <Link
                    to="/renstra/target/add" // form tambah
                    className="btn btn-outline-primary btn-sm"
                  >
                    ➕ Tambah Target Renstra
                  </Link>
                </div>
              </Accordion.Body>
            </Accordion.Item>

            {/* Manajemen Renstra OPD */}
            <Accordion.Item eventKey="2">
              <Accordion.Header onClick={() => handleToggle("2")}>
                Manajemen Renstra OPD
              </Accordion.Header>
              <Accordion.Body>
                <div className="d-flex flex-column gap-2">
                  <Link
                    to="/renstra-opd"
                    className="btn btn-outline-primary btn-sm"
                  >
                    📋 Lihat Daftar Renstra OPD
                  </Link>
                  <Link
                    to="/renstra-opd/new"
                    className="btn btn-outline-success btn-sm"
                  >
                    ➕ Tambah Renstra OPD
                  </Link>
                </div>
              </Accordion.Body>
            </Accordion.Item>

            {/* Bidang Dinas Pangan */}
            <Accordion.Item eventKey="3">
              <Accordion.Header onClick={() => handleToggle("3")}>
                Bidang Dinas Pangan
              </Accordion.Header>
              <Accordion.Body>
                {loadingBidang ? (
                  <div className="text-center py-2">
                    <Spinner animation="border" size="sm" /> Memuat...
                  </div>
                ) : errorBidang ? (
                  <Alert variant="danger" className="py-1">
                    {errorBidang}
                  </Alert>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {bidangList.map((bidang, idx) => (
                      <li key={idx} className="mb-2">
                        <Link
                          to={`/renstra/bidang/${encodeURIComponent(bidang)}`}
                          className="text-decoration-none"
                        >
                          {bidang}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Card.Body>
      </Card>
    </aside>
  );
};

export default RenstraSidebar;
