// frontend/src/pages/mr/MrPlanningTlhpDashboardPage.jsx
// Modul TLHP — Dashboard & Laporan Pemantauan Tindak Lanjut Hasil Pemeriksaan

import React from "react";
import { Alert, Button, Card, Col, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import { FilePdfOutlined, FileWordOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import mrPlanningTlhpReportService from "@/services/mrPlanningTlhpReportService";

const { Title, Text } = Typography;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i).map((y) => ({ value: y, label: String(y) }));

const ENTITAS_OPTIONS = [
  { value: "", label: "Semua Entitas" },
  { value: "BPK", label: "BPK" },
  { value: "BPKP", label: "BPKP" },
  { value: "INSPEKTORAT", label: "Inspektorat" },
];

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function MrPlanningTlhpDashboardPage() {
  const [scope, setScope] = React.useState({ tahun: CURRENT_YEAR, opd_id: undefined, entitas_pemeriksa_ref_id: undefined });
  const [downloading, setDownloading] = React.useState(null);

  const { data: summary, isFetching, refetch } = useQuery({
    queryKey: ["mr-tlhp-report", "summary", scope],
    queryFn: () => mrPlanningTlhpReportService.getSummary(scope),
  });

  const { data: exportHistory } = useQuery({
    queryKey: ["mr-tlhp-report", "export-history", scope],
    queryFn: () => mrPlanningTlhpReportService.getExportHistory(scope),
  });

  const summaryData = summary?.data;
  const historyRows = Array.isArray(exportHistory?.data) ? exportHistory.data : [];

  const handleExport = async (type) => {
    setDownloading(type);
    try {
      const response = type === "word" ? await mrPlanningTlhpReportService.exportWord(scope) : await mrPlanningTlhpReportService.exportPdf(scope);
      const contentDisposition = response.headers?.["content-disposition"] || "";
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `Laporan_Pemantauan_TLHP_${scope.tahun}.${type === "word" ? "docx" : "pdf"}`;
      triggerDownload(response.data, decodeURIComponent(filename));
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Gagal mengunduh laporan.";
      window.alert(msg);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            Laporan Pemantauan TLHP
          </Title>
          <Text type="secondary">Rekapitulasi tindak lanjut temuan Inspektorat, BPK, dan BPKP</Text>
        </Col>
        <Col>
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button icon={<FileWordOutlined />} loading={downloading === "word"} onClick={() => handleExport("word")}>
              Unduh Word
            </Button>
            <Button icon={<FilePdfOutlined />} loading={downloading === "pdf"} onClick={() => handleExport("pdf")}>
              Unduh PDF
            </Button>
          </Space>
        </Col>
      </Row>

      <Card size="small">
        <Space wrap>
          <Select
            style={{ width: 120 }}
            value={scope.tahun}
            options={YEAR_OPTIONS}
            onChange={(v) => setScope((s) => ({ ...s, tahun: v }))}
          />
          <Select
            style={{ width: 180 }}
            value={scope.entitas_pemeriksa_ref_id || ""}
            onChange={(v) => setScope((s) => ({ ...s, entitas_pemeriksa_ref_id: v || undefined }))}
            options={ENTITAS_OPTIONS}
          />
        </Space>
      </Card>

      {summaryData && summaryData.total_rekomendasi === 0 && (
        <Alert type="info" showIcon message="Belum ada data" description="Belum ada LHP/Temuan/Rekomendasi pada cakupan tahun dan filter yang dipilih." />
      )}

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="Total LHP" value={summaryData?.total_lhp || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Temuan" value={summaryData?.total_temuan || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Rekomendasi" value={summaryData?.total_rekomendasi || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Capaian Selesai" value={summaryData?.capaian_persen || 0} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Card title="Rekapitulasi Status Tindak Lanjut">
        <Table
          rowKey={(r) => r[0]}
          pagination={false}
          dataSource={Object.entries(summaryData?.breakdown_status || {})}
          columns={[
            { title: "Status", render: (_, r) => r[0] },
            { title: "Jumlah Rekomendasi", align: "center", render: (_, r) => r[1] },
          ]}
        />
      </Card>

      <Card title="Rekapitulasi per Entitas Pemeriksa">
        <Table
          rowKey={(r) => r[0]}
          pagination={false}
          dataSource={Object.entries(summaryData?.breakdown_entitas || {})}
          columns={[
            { title: "Entitas", render: (_, r) => r[0] },
            { title: "Jumlah Temuan", align: "center", render: (_, r) => r[1] },
          ]}
        />
      </Card>

      <Card title="Riwayat Export">
        <Table
          rowKey="id"
          dataSource={historyRows}
          columns={[
            { title: "Tanggal", dataIndex: "generated_at", render: (v) => (v ? new Date(v).toLocaleString("id-ID") : "-") },
            { title: "Format", dataIndex: "export_format", render: (v) => <Tag>{v}</Tag> },
            { title: "Nama Berkas", dataIndex: "file_name" },
            { title: "Status", dataIndex: "generate_status", render: (v) => <Tag color={v === "success" ? "success" : "error"}>{v}</Tag> },
          ]}
        />
      </Card>
    </Space>
  );
}
