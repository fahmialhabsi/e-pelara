// src/features/rkpd/pages/RkpDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CSidebar,
  CSidebarNav,
  CHeader,
  CHeaderBrand,
} from "@coreui/react";
import { useParams, useNavigate } from "react-router-dom";

const labelMap = {
  tujuan_id: "Tujuan",
  sasaran_id: "Sasaran",
  strategi_id: "Strategi",
  arah_kebijakan_id: "Arah Kebijakan",
  program_id: "Program",
  kegiatan_id: "Kegiatan",
  sub_kegiatan_id: "Sub Kegiatan",
  opd_penanggung_jawab_id: "OPD Penanggung Jawab",
  prioritas_nasional_id: "Prioritas Nasional",
  prioritas_daerah_id: "Prioritas Daerah",
  prioritas_kepala_daerah_id: "Prioritas Kepala Daerah",
  indikator_tujuan_id: "Indikator Tujuan",
  indikator_sasaran_id: "Indikator Sasaran",
  indikator_program_id: "Indikator Program",
  indikator_kegiatan_id: "Indikator Kegiatan",
};

const RkpdDashboard = ({ data }) => {
  const { submenu } = useParams();
  const navigate = useNavigate();
  const [entities, setEntities] = useState({});

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const entityRequests = Object.entries(labelMap).map(async ([key]) => {
          if (!data || !data[key]) return [key, null];
          const endpoint = key
            .replace("_id", "")
            .replace("opd_penanggung_jawab", "opd-penanggung-jawab")
            .replace("prioritas_kepala_daerah", "prioritas-gubernur")
            .replace("prioritas_nasional", "prioritas-nasional")
            .replace("prioritas_daerah", "prioritas-daerah")
            .replace("arah_kebijakan", "arah-kebijakan")
            .replace("indikator_tujuan", "indikator-tujuans")
            .replace("indikator_sasaran", "indikator-sasaran")
            .replace("indikator_program", "indikator-program")
            .replace("indikator_kegiatan", "indikator-kegiatan");

          const res = await api.get(`/${endpoint}/${data[key]}`);
          return [key, res.data];
        });

        const resolved = await Promise.all(entityRequests);
        const mappedEntities = Object.fromEntries(resolved);
        setEntities(mappedEntities);
      } catch (error) {
        console.error("Gagal mengambil data entitas RKPD:", error);
      }
    };

    if (data) fetchEntities();
  }, [data]);

  return (
    <div className="d-flex">
      <CSidebar className="vh-100 border-end" visible>
        <CSidebarNav>
          <div className="p-3 fw-bold">e-PeLARA</div>
          <nav className="nav flex-column px-3">
            <button
              onClick={() => navigate("/dashboard-rkpd/form")}
              className="btn btn-sm btn-success mt-3"
            >
              Tambah RKPD
            </button>
          </nav>
        </CSidebarNav>
      </CSidebar>

      <div className="flex-grow-1">
        <CHeader className="bg-white border-bottom">
          <CHeaderBrand>Ringkasan RKPD</CHeaderBrand>
        </CHeader>
        <CContainer className="my-4">
          <CCard className="mb-4">
            <CCardHeader>
              Data RKPD: {submenu?.replaceAll("_", " ")?.toUpperCase()}
            </CCardHeader>
            <CCardBody>
              <CRow>
                {Object.keys(labelMap).map((key) => {
                  const value = entities[key];
                  return (
                    <CCol md={3} key={key} className="mb-3">
                      <div className="bg-light border rounded p-3 text-center h-100">
                        <div className="text-muted small mb-1">
                          {labelMap[key]}
                        </div>
                        <div className="fw-bold">
                          {value?.nama || value?.name || value?.label || "-"}
                        </div>
                      </div>
                    </CCol>
                  );
                })}
              </CRow>
            </CCardBody>
          </CCard>
        </CContainer>
      </div>
    </div>
  );
};

export default RkpdDashboard;
