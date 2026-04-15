/**
 * Penyesuaian Regulasi — alur: auto-mapping → preview → accept/skip → apply.
 * Butuh role admin untuk run/apply; baca versi/compare bisa peran baca (sesuai route backend).
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Space,
  Select,
  Table,
  Tag,
  Typography,
  Alert,
  message,
  InputNumber,
} from "antd";
import {
  fetchRegulasiVersiList,
  postMigrationRunAutoMapping,
  postMigrationPreview,
  postMigrationApply,
} from "../../services/migrationApi";

const { Title, Text, Paragraph } = Typography;

const rowColor = (record) => {
  if (record.uiStatus === "otomatis") return "#f6ffed";
  if (record.uiStatus === "perlu_mapping_manual") return "#fff2f0";
  if (record.uiStatus === "split") return "#fffbe6";
  return "#fffbe6";
};

export default function RegulasiPenyesuaianPanel() {
  const [versiList, setVersiList] = useState([]);
  const [fromId, setFromId] = useState(null);
  const [toId, setToId] = useState(null);
  const [loadingVersi, setLoadingVersi] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [preview, setPreview] = useState(null);
  const [rowDecisions, setRowDecisions] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingVersi(true);
      try {
        const rows = await fetchRegulasiVersiList();
        if (cancelled) return;
        setVersiList(rows);
        if (rows[0]) setFromId((f) => f ?? rows[0].id);
        if (rows[1]) setToId((t) => t ?? rows[1].id);
      } catch (e) {
        if (!cancelled) {
          message.error(
            e?.response?.data?.message || "Gagal memuat versi regulasi",
          );
        }
      } finally {
        if (!cancelled) setLoadingVersi(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const versiOptions = useMemo(
    () =>
      versiList.map((v) => ({
        value: v.id,
        label: `${v.nomor_regulasi} (${v.tahun}) — ${v.nama_regulasi}`,
      })),
    [versiList],
  );

  const handleRunAuto = async () => {
    if (!fromId || !toId || fromId === toId) {
      message.warning("Pilih dua versi regulasi yang berbeda");
      return;
    }
    setLoadingRun(true);
    try {
      await postMigrationRunAutoMapping(fromId, toId);
      message.success("Auto-mapping selesai");
      await handlePreview();
    } catch (e) {
      message.error(e?.response?.data?.message || "Gagal auto-mapping");
    } finally {
      setLoadingRun(false);
    }
  };

  const handlePreview = async () => {
    if (!fromId || !toId) return;
    setLoadingPreview(true);
    try {
      const res = await postMigrationPreview(fromId, toId);
      setPreview(res);
      setRowDecisions({});
    } catch (e) {
      message.error(e?.response?.data?.message || "Gagal preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const setDecision = (mappingId, patch) => {
    setRowDecisions((prev) => ({
      ...prev,
      [mappingId]: { ...prev[mappingId], ...patch },
    }));
  };

  const handleApply = async () => {
    if (!preview?.mappingSubKegiatan?.length) {
      message.info("Tidak ada baris untuk diterapkan");
      return;
    }
    const decisions = preview.mappingSubKegiatan.map((row) => {
      const d = rowDecisions[row.mappingId] || {};
      const action = d.action || (row.status === "approved" ? "approve" : "skip");
      const out = { mappingId: row.mappingId, action };
      if (action === "setNewSub" && d.newMasterSubKegiatanId) {
        out.newMasterSubKegiatanId = d.newMasterSubKegiatanId;
      }
      return out;
    });

    setLoadingApply(true);
    try {
      await postMigrationApply(decisions);
      message.success("Keputusan disimpan (status mapping diperbarui)");
      await handlePreview();
    } catch (e) {
      message.error(e?.response?.data?.message || "Gagal apply");
    } finally {
      setLoadingApply(false);
    }
  };

  const columns = [
    {
      title: "Data lama (snapshot)",
      dataIndex: "old",
      render: (_, r) => (
        <div>
          <Text strong>{r.old?.label || "—"}</Text>
          {r.warnings?.includes("Kode berubah") ? (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              Kode berubah
            </Tag>
          ) : null}
          {r.warnings?.includes("Nama berubah") ? (
            <Tag color="gold" style={{ marginLeft: 4 }}>
              Nama berubah
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: "Data baru",
      dataIndex: "new",
      render: (_, r) =>
        r.new?.label ? (
          <Text>{r.new.label}</Text>
        ) : (
          <Text type="danger">— (dihapus / belum dipetakan)</Text>
        ),
    },
    {
      title: "Status",
      key: "st",
      render: (_, r) => {
        const color =
          r.uiStatus === "otomatis"
            ? "green"
            : r.uiStatus === "perlu_mapping_manual"
              ? "red"
              : r.uiStatus === "split"
                ? "orange"
                : "blue";
        return (
          <Space direction="vertical" size={0}>
            <Tag color={color}>{r.uiStatus}</Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.matchReason} · conf {r.confidence?.toFixed?.(2) ?? r.confidence}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 280,
      render: (_, r) => {
        const d = rowDecisions[r.mappingId] || {};
        return (
          <Space wrap>
            <Select
              size="small"
              style={{ minWidth: 120 }}
              placeholder="Keputusan"
              value={d.action || undefined}
              onChange={(v) => setDecision(r.mappingId, { action: v })}
              options={[
                { value: "approve", label: "Terima" },
                { value: "skip", label: "Lewati" },
                { value: "reject", label: "Tolak" },
                { value: "setNewSub", label: "Set sub baru (id)" },
              ]}
            />
            {d.action === "setNewSub" ? (
              <InputNumber
                size="small"
                min={1}
                placeholder="new sub id"
                value={d.newMasterSubKegiatanId}
                onChange={(v) =>
                  setDecision(r.mappingId, { newMasterSubKegiatanId: v })
                }
              />
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={4} style={{ marginTop: 0 }}>
            Penyesuaian Regulasi
          </Title>
          <Paragraph type="secondary">
            Update ke regulasi terbaru tanpa input ulang: jalankan auto-mapping, tinjau
            baris berwarna, lalu terapkan keputusan. Data master lama tidak dihapus.
          </Paragraph>
        </div>

        <Space wrap align="center">
          <Text>Dari versi:</Text>
          <Select
            style={{ minWidth: 320 }}
            loading={loadingVersi}
            options={versiOptions}
            value={fromId ?? undefined}
            onChange={setFromId}
            placeholder="Regulasi lama"
          />
          <Text>Ke versi:</Text>
          <Select
            style={{ minWidth: 320 }}
            loading={loadingVersi}
            options={versiOptions}
            value={toId ?? undefined}
            onChange={setToId}
            placeholder="Regulasi baru"
          />
        </Space>

        <Space wrap>
          <Button type="primary" loading={loadingRun} onClick={handleRunAuto}>
            Update ke Regulasi Terbaru (auto-mapping)
          </Button>
          <Button loading={loadingPreview} onClick={handlePreview}>
            Refresh preview
          </Button>
          <Button type="default" loading={loadingApply} onClick={handleApply}>
            Terapkan keputusan
          </Button>
        </Space>

        {preview?.summary ? (
          <Alert
            type="info"
            showIcon
            message="Ringkasan"
            description={
              <span>
                Total mapping: {preview.summary.totalMappings} · Perlu manual:{" "}
                {preview.summary.needManual} · Menunggu review:{" "}
                {preview.summary.pendingReview}
              </span>
            }
          />
        ) : null}

        <Table
          size="small"
          rowKey="mappingId"
          loading={loadingPreview}
          dataSource={preview?.mappingSubKegiatan || []}
          columns={columns}
          pagination={{ pageSize: 8 }}
          scroll={{ x: true }}
          onRow={(record) => ({
            style: { background: rowColor(record) },
          })}
        />
      </Space>
    </Card>
  );
}
