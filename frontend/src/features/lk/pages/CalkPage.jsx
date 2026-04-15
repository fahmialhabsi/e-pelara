import React, { useEffect, useState, useMemo } from "react";
import {
  Layout,
  List,
  Typography,
  Button,
  Space,
  InputNumber,
  Progress,
  Card,
  Tabs,
  message,
  Table,
  Tag,
  Input,
  Alert,
} from "antd";

const { TextArea } = Input;
import {
  getCalkTahun,
  getCalkBab,
  putCalkBab,
  generateCalkAll,
  refreshCalkBabData,
} from "../services/lkApi";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const statusColor = (s) => {
  if (s === "FINAL") return "success";
  if (s === "DRAFT") return "default";
  return "error";
};

export default function CalkPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [listPayload, setListPayload] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [babDetail, setBabDetail] = useState(null);
  const [kontenEdit, setKontenEdit] = useState("");
  const [tab, setTab] = useState("edit");

  const loadList = async (opts = {}) => {
    setLoading(true);
    try {
      const res = await getCalkTahun(tahun);
      setListPayload(res);
      const first = res.bab?.[0]?.template_id;
      if (!opts.keepSelection) setSelectedId(first ?? null);
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat daftar CALK");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [tahun]);

  const loadBab = async (templateId) => {
    if (!templateId) return;
    setLoading(true);
    try {
      const res = await getCalkBab(tahun, templateId);
      setBabDetail(res);
      setKontenEdit(res.konten?.konten || "");
    } catch (e) {
      message.error(e.response?.data?.message || "Gagal memuat bab");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) loadBab(selectedId);
  }, [selectedId, tahun]);

  const ringkas = listPayload?.status_ringkas;
  const progressPct = useMemo(() => {
    if (!ringkas?.total_bab) return 0;
    return Math.round((ringkas.final / ringkas.total_bab) * 1000) / 10;
  }, [ringkas]);

  const simpan = async (status) => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await putCalkBab(tahun, selectedId, { konten: kontenEdit, status });
      message.success(status === "FINAL" ? "Disimpan sebagai FINAL" : "Draft disimpan");
      await loadList({ keepSelection: true });
      await loadBab(selectedId);
    } catch (e) {
      message.error(e.response?.data?.message || "Simpan gagal");
    } finally {
      setLoading(false);
    }
  };

  const onGenerateAll = async () => {
    setLoading(true);
    try {
      const out = await generateCalkAll(tahun);
      message.success(`Generate selesai — ${out.diisi || 0} bab diperbarui`);
      await loadList({ keepSelection: true });
      if (selectedId) await loadBab(selectedId);
    } catch (e) {
      message.error(e.response?.data?.message || "Generate gagal");
    } finally {
      setLoading(false);
    }
  };

  const onRefreshData = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await refreshCalkBabData(tahun, selectedId);
      message.success("Data otomatis diperbarui");
      await loadBab(selectedId);
    } catch (e) {
      message.error(e.response?.data?.message || "Refresh gagal");
    } finally {
      setLoading(false);
    }
  };

  const tmpl = babDetail?.template;
  const kontenRow = babDetail?.konten;
  const dataOtomatis = kontenRow?.data_otomatis;
  const tipe = tmpl?.tipe;

  const tableFromJson = () => {
    if (!dataOtomatis) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Data belum tersedia. Generate laporan LO/LPE (dan refresh data) terlebih dahulu."
        />
      );
    }
    const hasBaris = Array.isArray(dataOtomatis.baris) && dataOtomatis.baris.length > 0;
    const hasRingkas =
      Array.isArray(dataOtomatis.ringkasan_per_jenis) &&
      dataOtomatis.ringkasan_per_jenis.length > 0;
    if (!hasBaris && !hasRingkas) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Data belum tersedia. Generate laporan LO/LPE terlebih dahulu, lalu klik Refresh data."
        />
      );
    }
    if (hasBaris) {
      const sample = dataOtomatis.baris[0] || {};
      const keys = Object.keys(sample);
      return (
        <Table
          size="small"
          scroll={{ x: true }}
          pagination={false}
          dataSource={dataOtomatis.baris.map((r, i) => ({ ...r, key: i }))}
          columns={keys.map((k) => ({ title: k, dataIndex: k, key: k, ellipsis: true }))}
        />
      );
    }
    return (
      <Table
        size="small"
        pagination={false}
        dataSource={dataOtomatis.ringkasan_per_jenis.map((r, i) => ({ ...r, key: i }))}
        columns={Object.keys(dataOtomatis.ringkasan_per_jenis[0] || {}).map((k) => ({
          title: k,
          dataIndex: k,
          key: k,
        }))}
      />
    );
  };

  return (
    <Layout style={{ minHeight: "100%", background: "#fff" }}>
      <Sider width={320} style={{ background: "#fafafa", borderRight: "1px solid #f0f0f0" }}>
        <div style={{ padding: 16 }}>
          <Title level={4}>CALK</Title>
          <Space wrap>
            <Text type="secondary">Tahun</Text>
            <InputNumber min={2000} max={2100} value={tahun} onChange={(v) => v && setTahun(v)} />
          </Space>
          <Button block type="primary" style={{ marginTop: 12 }} onClick={onGenerateAll} loading={loading}>
            Generate semua bab
          </Button>
          {ringkas && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                {ringkas.final} dari {ringkas.total_bab} bab FINAL
              </Text>
              <Progress percent={progressPct} size="small" />
            </div>
          )}
          <List
            style={{ marginTop: 16, maxHeight: "70vh", overflow: "auto" }}
            size="small"
            loading={loading}
            dataSource={listPayload?.bab || []}
            renderItem={(item) => (
              <List.Item
                style={{
                  cursor: "pointer",
                  background: selectedId === item.template_id ? "#e6f4ff" : undefined,
                  padding: "8px 12px",
                }}
                onClick={() => setSelectedId(item.template_id)}
              >
                <List.Item.Meta
                  title={
                    <Space size={4} wrap>
                      <Text strong={selectedId === item.template_id}>
                        {item.bab}
                        {item.sub_bab ? `.${item.sub_bab}` : ""}
                      </Text>
                      <Tag color={statusColor(item.status)}>{item.status}</Tag>
                    </Space>
                  }
                  description={
                    <Text ellipsis style={{ maxWidth: 260 }}>
                      {item.judul}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Sider>
      <Content style={{ padding: 24 }}>
        {!tmpl ? (
          <Text>Pilih bab di kiri.</Text>
        ) : (
          <>
            <Title level={4}>
              Bab {tmpl.bab}
              {tmpl.sub_bab ? `.${tmpl.sub_bab}` : ""} — {tmpl.judul}
            </Title>
            <Text type="secondary">
              Tipe: {tmpl.tipe}
              {tmpl.sumber_data ? ` — sumber: ${tmpl.sumber_data}` : ""}
            </Text>
            <Card size="small" style={{ marginTop: 16 }}>
              <Tabs
                activeKey={tab}
                onChange={setTab}
                items={[
                  {
                    key: "edit",
                    label: "Editor",
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        {tipe === "TABEL_AUTO" || tipe === "CAMPURAN" ? (
                          <>
                            <Space>
                              <Button onClick={onRefreshData} loading={loading}>
                                Refresh data
                              </Button>
                              <Text type="secondary">Tabel di bawah hanya baca; narasi di textarea.</Text>
                            </Space>
                            {tableFromJson()}
                          </>
                        ) : null}
                        <TextArea
                          rows={16}
                          value={kontenEdit}
                          onChange={(e) => setKontenEdit(e.target.value)}
                          placeholder="Isi teks/HTML bab (template TEKS). Setelah generate, revisi manual."
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "preview",
                    label: "Pratinjau HTML",
                    children: (
                      <div
                        className="calk-html-preview"
                        style={{
                          border: "1px solid #eee",
                          padding: 16,
                          minHeight: 200,
                          background: "#fff",
                        }}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: kontenEdit || "" }}
                      />
                    ),
                  },
                ]}
              />
            </Card>
            <Space style={{ marginTop: 16 }}>
              <Button onClick={() => simpan("DRAFT")} loading={loading}>
                Simpan draft
              </Button>
              <Button type="primary" onClick={() => simpan("FINAL")} loading={loading}>
                Tandai final
              </Button>
            </Space>
          </>
        )}
      </Content>
    </Layout>
  );
}
