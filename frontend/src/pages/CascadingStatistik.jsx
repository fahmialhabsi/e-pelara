// src/pages/CascadingStatistik.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
} from "recharts";
import { Sankey } from "@nivo/sankey";
import { Button, Card, Modal, Form, Tabs, Tab } from "react-bootstrap";
import api from "../services/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useDokumen } from "../hooks/useDokumen";

const LEVELS = [
  "Misi",
  "Tujuan",
  "Sasaran",
  "Strategi",
  "Arah Kebijakan",
  "Program",
  "Kegiatan",
];

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
];

export default function CascadingStatistik() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [detailMap, setDetailMap] = useState({});
  const [selectedDetail, setSelectedDetail] = useState({
    label: "",
    items: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("Kegiatan");
  const [activeTab, setActiveTab] = useState("bar");
  const ref = useRef();
  const { dokumen, tahun } = useDokumen();

  const truncateLabel = (label, max = 60) =>
    typeof label === "string"
      ? label.length > max
        ? label.slice(0, max) + "..."
        : label
      : "";

  useEffect(() => {
    if (!dokumen || !tahun) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await api.get("/cascading", {
          params: { jenis_dokumen: dokumen, tahun, limit: 9999 },
        });
        const list = res.data?.data || [];
        const struktur = {
          misi: new Set(),
          tujuan: new Set(),
          sasaran: new Set(),
          strategi: new Set(),
          arahKebijakan: new Set(),
          program: new Set(),
          kegiatan: new Set(),
        };
        const detail = {
          Misi: new Set(),
          Tujuan: new Set(),
          Sasaran: new Set(),
          Strategi: new Set(),
          "Arah Kebijakan": new Set(),
          Program: new Set(),
          Kegiatan: new Set(),
        };
        const linksRaw = [];
        const nodesMap = new Map();
        let idx = 0;
        const getIdx = (label) => {
          if (!label || typeof label !== "string") return null;
          const t = truncateLabel(label);
          if (!nodesMap.has(t)) nodesMap.set(t, idx++);
          return nodesMap.get(t);
        };

        list.forEach((item) => {
          const ids = {
            misi: item.misi?.isi_misi,
            tujuan: item.tujuan?.isi_tujuan,
            sasaran: item.sasaran?.isi_sasaran,
            strategi: item.strategis?.[0]?.deskripsi,
            program: item.program?.nama_program,
            kegiatan: item.kegiatan?.nama_kegiatan,
          };
          const arahList = (item.arahKebijakans || [])
            .map((a) => a?.deskripsi || a?.kode_arah)
            .filter(Boolean);

          Object.entries(ids).forEach(([lvl, val]) => {
            if (val) {
              struktur[lvl].add(val);
              const key = lvl.charAt(0).toUpperCase() + lvl.slice(1);
              detail[key]?.add(truncateLabel(val));
            }
          });
          arahList.forEach((arah) => {
            struktur.arahKebijakan.add(arah);
            detail["Arah Kebijakan"].add(truncateLabel(arah));
          });

          const flow = [
            ids.misi,
            ids.tujuan,
            ids.sasaran,
            ids.strategi,
            ...arahList,
            ids.program,
            ids.kegiatan,
          ];
          for (let i = 0; i < flow.length - 1; i++) {
            const s = getIdx(flow[i]);
            const t = getIdx(flow[i + 1]);
            if (s !== null && t !== null) {
              const ex = linksRaw.find((l) => l.source === s && l.target === t);
              if (ex) ex.value++;
              else linksRaw.push({ source: s, target: t, value: 1 });
            }
          }
        });

        // filter nodes that are used
        const usedIds = new Set();
        linksRaw.forEach((l) => {
          usedIds.add(l.source);
          usedIds.add(l.target);
        });

        const labels = [...nodesMap.keys()];
        const nodes = labels
          .map((lbl, i) => (usedIds.has(i) ? { id: lbl } : null))
          .filter(Boolean);

        const links = linksRaw
          .filter((l) => usedIds.has(l.source) && usedIds.has(l.target))
          .map((l) => {
            const src = labels[l.source],
              tgt = labels[l.target];
            if (!src || !tgt || isNaN(l.value)) return null;
            return { source: src, target: tgt, value: Number(l.value) };
          })
          .filter(Boolean);

        setDetailMap(
          Object.fromEntries(
            Object.entries(detail).map(([k, v]) => [k, [...v]])
          )
        );
        const chart = Object.entries(struktur).map(([k, set]) => ({
          label:
            k.charAt(0).toUpperCase() +
            k
              .slice(1)
              .replace(/([A-Z])/g, " $1")
              .trim(),
          jumlah: set.size,
        }));
        setData({ chart, sankey: { nodes, links } });
        console.log("✅ Sankey final:", { nodes, links });
      } catch (e) {
        console.error("❌ Gagal load cascading:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dokumen, tahun]);

  const handleBarClick = (entry) => {
    if (entry?.label && detailMap[entry.label]) {
      setSelectedDetail({ label: entry.label, items: detailMap[entry.label] });
      setShowModal(true);
    }
  };

  const handleExportPDF = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("struktur-cascading.pdf");
  };

  const filteredData = useMemo(() => {
    return (data.chart || []).slice(0, LEVELS.indexOf(selectedLevel) + 1);
  }, [data.chart, selectedLevel]);

  const sankeyDiagram = useMemo(() => {
    if (data?.sankey?.nodes?.length > 1 && data?.sankey?.links?.length > 0) {
      return (
        <Sankey
          data={data.sankey}
          margin={{ top: 10, right: 250, bottom: 10, left: 100 }}
          align="justify"
          nodeOpacity={0.9}
          nodeThickness={20}
          nodePadding={20}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={12}
          colors={{ scheme: "set2" }}
          nodeBorderWidth={1}
          nodeBorderColor={{ from: "color", modifiers: [["darker", 0.8]] }}
          linkOpacity={0.4}
          linkHoverOpacity={0.7}
          animate={false}
        />
      );
    }
    return (
      <div className="text-muted p-4">
        Data Sankey tidak tersedia atau belum cukup untuk divisualisasikan.
      </div>
    );
  }, [data]);

  if (loading)
    return (
      <div className="text-center py-5">Memuat data struktur cascading...</div>
    );

  return (
    <Card className="p-4">
      <div ref={ref}>
        <h4 className="mb-3">
          📚 Struktur Data Cascading ({dokumen?.toUpperCase()} {tahun})
        </h4>
        <Form.Group controlId="filterLevel" className="mb-3">
          <Form.Label>Filter hingga level</Form.Label>
          <Form.Select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab eventKey="bar" title="Bar Chart">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={filteredData}
                layout="vertical"
                margin={{ left: 40 }}
                onClick={({ activeLabel }) =>
                  handleBarClick(
                    filteredData.find((d) => d.label === activeLabel)
                  )
                }
              >
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" />
                <Tooltip formatter={(value) => [`${value} entri`, "Jumlah"]} />
                <Bar dataKey="jumlah" fill="#8884d8">
                  <LabelList dataKey="jumlah" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Tab>

          <Tab eventKey="pie" title="Pie Chart">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={filteredData}
                  dataKey="jumlah"
                  nameKey="label"
                  outerRadius={120}
                  fill="#8884d8"
                  label
                  onClick={(entry) => handleBarClick(entry)}
                >
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Tab>

          <Tab eventKey="radar" title="Radar Chart">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart outerRadius={150} data={filteredData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="label" />
                <PolarRadiusAxis />
                <Radar
                  name="Jumlah"
                  dataKey="jumlah"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Tab>

          <Tab eventKey="treemap" title="Tree Map">
            <ResponsiveContainer width="100%" height={400}>
              <Treemap
                data={filteredData}
                dataKey="jumlah"
                nameKey="label"
                stroke="#fff"
                fill="#8884d8"
                onClick={handleBarClick}
              />
            </ResponsiveContainer>
          </Tab>

          <Tab eventKey="sankey" title="Sankey Diagram">
            <div style={{ height: 500 }}>{sankeyDiagram}</div>
          </Tab>
        </Tabs>
      </div>

      <div className="text-end mt-4">
        <Button onClick={handleExportPDF}>Export PDF</Button>
      </div>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
        dialogClassName="mt-5"
      >
        <Modal.Header closeButton>
          <Modal.Title>📋 Daftar {selectedDetail.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul>
            {selectedDetail.items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </Modal.Body>
      </Modal>
    </Card>
  );
}
