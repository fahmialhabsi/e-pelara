import React from "react";
import { Spin, Empty, Typography, List, Alert } from "antd";

const { Text } = Typography;

/**
 * Daftar indikator master di bawah dropdown sub kegiatan (read-only, dari API).
 */
export default function IndikatorPanel({
  loading = false,
  error = null,
  indikators = [],
  emptyText = "Belum ada indikator untuk sub kegiatan ini.",
}) {
  if (error) {
    return (
      <Alert
        className="mt-3"
        type="warning"
        showIcon
        message="Gagal memuat indikator"
        description={error}
      />
    );
  }

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <Spin size="small" />
        <Text type="secondary">Memuat indikator…</Text>
      </div>
    );
  }

  if (!indikators.length) {
    return (
      <div className="mt-3">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: "8px 12px",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 8,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <Text strong style={{ display: "block", marginBottom: 8 }}>
        Indikator & kinerja (master)
      </Text>
      <List
        size="small"
        dataSource={indikators}
        renderItem={(row) => (
          <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
            <div style={{ width: "100%" }}>
              <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.4 }}>
                {row.indikator || "—"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", marginTop: 4 }}>
                {row.satuan ? (
                  <span>
                    <Text type="secondary">Satuan:</Text> {row.satuan}
                    {row.kinerja ? " · " : ""}
                  </span>
                ) : null}
                {row.kinerja ? (
                  <span>
                    <Text type="secondary">Kinerja:</Text> {row.kinerja}
                  </span>
                ) : null}
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
