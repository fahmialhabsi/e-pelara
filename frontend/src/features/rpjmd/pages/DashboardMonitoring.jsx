import React, { useEffect, useState, useCallback } from "react";
import api from "../../../services/api";
import { Table, Form, Pagination, Spinner, Row, Col } from "react-bootstrap";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useAuth } from "../../../hooks/useAuth";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardMonitoring() {
  const { user } = useAuth();

  const [misiList, setMisiList] = useState([]);
  const [prionasList, setPrionasList] = useState([]);
  const [priodaList, setPriodaList] = useState([]);
  const [priogubList, setPriogubList] = useState([]);
  const [tujuanList, setTujuanList] = useState([]);
  const [sasaranList, setSasaranList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [kegiatanList, setKegiatanList] = useState([]);

  const [activities, setActivities] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [timeType, setTimeType] = useState("bulan");
  const [timeValue, setTimeValue] = useState("");

  const [loading, setLoading] = useState(true);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  const buildChart = useCallback(
    (data) => {
      const labels = data.map((d) => d.label);
      const ds = data.map((d) => d.count);
      setChartData({
        labels,
        datasets: [
          {
            label: `Aktivitas ${roleFilter}`,
            data: ds,
            fill: true,
            tension: 0.3,
          },
        ],
      });
    },
    [roleFilter]
  );

  useEffect(() => {
    (async () => {
      try {
        const [
          misi,
          prionas,
          prioda,
          priogub,
          tujuan,
          sasaran,
          program,
          kegiatan,
        ] = await Promise.all([
          api.get("/misi"),
          api.get("/prioritas-nasional"),
          api.get("/prioritas-daerah"),
          api.get("/prioritas-gubernur"),
          api.get("/tujuan"),
          api.get("/indikator-sasaran"),
          api.get("/indikator-program"),
          api.get("/indikator-kegiatan"),
        ]);

        setMisiList(misi.data.data || misi.data);
        setPrionasList(prionas.data.data || prionas.data);
        setPriodaList(prioda.data.data || prioda.data);
        setPriogubList(priogub.data.data || priogub.data);
        setTujuanList(tujuan.data.data || tujuan.data);
        setSasaranList(sasaran.data.data || sasaran.data);
        setProgramList(program.data.data || program.data);
        setKegiatanList(kegiatan.data.data || kegiatan.data);
      } catch (err) {
        console.error("Error fetching master data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!roleFilter || !timeValue) {
      setFilteredData([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await api.get("/activities", {
          params: { role: roleFilter, periodType: timeType, period: timeValue },
        });
        const acts = res.data.data || res.data;
        setActivities(acts);
        setFilteredData(acts);
        buildChart(acts);
      } catch (err) {
        console.error("Error fetching activities:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [roleFilter, timeType, timeValue, buildChart]);

  const idxLast = currentPage * itemsPerPage;
  const idxFirst = idxLast - itemsPerPage;
  const currentItems = filteredData.slice(idxFirst, idxLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  if (loading) {
    return <Spinner animation="border" className="mt-5 mx-auto d-block" />;
  }

  if (!["ADMINISTRATOR", "PENGAWAS"].includes(user?.role)) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <Alert variant="danger" className="text-center w-100 fw-bold fs-5">
          ❌ Akses ditolak. Halaman monitoring hanya dapat diakses oleh
          ADMINISTRATOR atau PENGAWAS.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📊 Dashboard Monitoring RPJMD</h2>

      {/* Role & Period Filters */}
      <Row className="mb-3">
        <Col md={3}>
          <Form.Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">-- Pilih Role --</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="PENGAWAS">Pengawas</option>
            <option value="PELAKSANA">Pelaksana</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={timeType}
            onChange={(e) => {
              setTimeType(e.target.value);
              setTimeValue("");
            }}
          >
            <option value="tanggal">Per Tanggal</option>
            <option value="bulan">Per Bulan</option>
            <option value="triwulan">Per Triwulan</option>
            <option value="semester">Per Semester</option>
            <option value="tahun">Per Tahun</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Control
            type={timeType === "tanggal" ? "date" : "text"}
            placeholder={
              timeType === "bulan"
                ? "YYYY-MM"
                : timeType === "triwulan"
                ? "Q1-Q4"
                : timeType === "semester"
                ? "S1/S2"
                : timeType === "tahun"
                ? "YYYY"
                : ""
            }
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
          />
        </Col>
      </Row>

      {/* Cascading Dropdowns */}
      <Row className="mb-4">
        {[
          {
            label: "Misi",
            list: misiList,
            key: "id",
            codeKey: "no_misi",
            nameKey: "isi_misi",
          },
          {
            label: "Prioritas Nasional",
            list: prionasList,
            key: "kode_prionas",
            codeKey: "kode_prionas",
            nameKey: "nama_prionas",
          },
          {
            label: "Prioritas Daerah",
            list: priodaList,
            key: "kode_prioda",
            codeKey: "kode_prioda",
            nameKey: "nama_prioda",
          },
          {
            label: "Prioritas Gubernur",
            list: priogubList,
            key: "kode_priogub",
            codeKey: "kode_priogub",
            nameKey: "nama_priogub",
          },
          {
            label: "Tujuan",
            list: tujuanList,
            key: "id",
            codeKey: "no_tujuan",
            nameKey: "isi_tujuan",
          },
          {
            label: "Sasaran",
            list: sasaranList,
            key: "kode_indikator",
            codeKey: "kode_indikator",
            nameKey: "nama_indikator",
          },
          {
            label: "Program",
            list: programList,
            key: "kode_indikator",
            codeKey: "kode_indikator",
            nameKey: "nama_indikator",
          },
          {
            label: "Kegiatan",
            list: kegiatanList,
            key: "kode_indikator",
            codeKey: "kode_indikator",
            nameKey: "nama_indikator",
          },
        ].map((f, i) => (
          <Col md={3} key={i} className="mb-2">
            <Form.Select>
              <option>-- {f.label} --</option>
              {f.list.map((item) => (
                <option key={item[f.key]} value={item[f.key]}>
                  {`${item[f.codeKey]} - ${item[f.nameKey]}`}
                </option>
              ))}
            </Form.Select>
          </Col>
        ))}
      </Row>

      {/* Summary Counts */}
      <Table bordered className="mb-4">
        <thead>
          <tr>
            <th>Role</th>
            <th>Jumlah Aktivitas</th>
          </tr>
        </thead>
        <tbody>
          {["ADMINISTRATOR", "PENGAWAS", "PELAKSANA"].map((r) => (
            <tr key={r}>
              <td>{r}</td>
              <td>{activities.filter((a) => a.role === r).length}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Activity Log Table */}
      <Table striped hover responsive>
        <thead>
          <tr>
            <th>No</th>
            <th>Waktu</th>
            <th>Role</th>
            <th>Deskripsi</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((act, idx) => (
            <tr key={act.id}>
              <td>{idxFirst + idx + 1}</td>
              <td>{act.timestamp}</td>
              <td>{act.role}</td>
              <td>{act.description}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination */}
      <Pagination className="justify-content-center">
        <Pagination.First
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        />
        <Pagination.Prev
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        />
        {[...Array(totalPages)].map((_, i) => (
          <Pagination.Item
            key={i}
            active={currentPage === i + 1}
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </Pagination.Item>
        ))}
        <Pagination.Next
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        />
        <Pagination.Last
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        />
      </Pagination>

      {/* Activity Chart */}
      <div className="mt-5">
        <h4 className="mb-3">📈 Grafik Aktivitas</h4>
        <Line data={chartData} />
      </div>
    </div>
  );
}
