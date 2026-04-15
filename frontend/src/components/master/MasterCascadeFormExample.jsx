/**
 * Contoh integrasi MasterCascadeSelect ke form e-Pelara.
 * Tidak terpasang ke router secara default — impor di halaman uji atau salin pola ke FormDPA / modul perencanaan.
 */
import React, { useState, useCallback } from "react";
import { Card, Typography, Divider, Space, Button } from "antd";
import MasterCascadeSelect from "./MasterCascadeSelect";

const { Title, Paragraph, Text } = Typography;

const initialSelection = {
  masterProgramId: "",
  masterKegiatanId: "",
  masterSubKegiatanId: "",
  programLabel: "",
  kegiatanLabel: "",
  subKegiatanLabel: "",
  program: null,
  kegiatan: null,
  subKegiatan: null,
  indikators: [],
};

export default function MasterCascadeFormExample() {
  const [selection, setSelection] = useState(initialSelection);

  const handleChange = useCallback((payload) => {
    setSelection(payload);
  }, []);

  const handleReset = useCallback(() => {
    setSelection(initialSelection);
  }, []);

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={4} style={{ marginTop: 0 }}>
            Referensi master (Permendagri 900 — pola e-Pelara)
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Pilih program → kegiatan → sub kegiatan dari master Sheet2_Normalized. Kode dan
            nama referensi bersifat read-only dari server; tidak ada input manual nomenklatur.
            Nilai di bawah siap disalin ke payload form (mis. <Text code>master_*_id</Text> +
            snapshot untuk transaksi).
          </Paragraph>
        </div>

        <MasterCascadeSelect
          datasetKey="sekretariat_bidang_sheet2"
          onChange={handleChange}
        />

        <Divider />

        <div>
          <Text strong>Snapshot untuk integrasi form (JSON)</Text>
          <pre
            style={{
              marginTop: 8,
              padding: 12,
              background: "#f5f5f5",
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
              maxHeight: 320,
            }}
          >
            {JSON.stringify(
              {
                masterProgramId: selection.masterProgramId || null,
                programLabel: selection.programLabel || null,
                masterKegiatanId: selection.masterKegiatanId || null,
                kegiatanLabel: selection.kegiatanLabel || null,
                masterSubKegiatanId: selection.masterSubKegiatanId || null,
                subKegiatanLabel: selection.subKegiatanLabel || null,
                kode_program_full: selection.program?.kode_program_full ?? null,
                nama_program: selection.program?.nama_program ?? null,
                kode_kegiatan_full: selection.kegiatan?.kode_kegiatan_full ?? null,
                nama_kegiatan: selection.kegiatan?.nama_kegiatan ?? null,
                kode_sub_kegiatan_full:
                  selection.subKegiatan?.kode_sub_kegiatan_full ?? null,
                nama_sub_kegiatan:
                  selection.subKegiatan?.nama_sub_kegiatan ?? null,
                indikators: (selection.indikators || []).map((r) => ({
                  id: r.id,
                  indikator: r.indikator,
                  satuan: r.satuan,
                  kinerja: r.kinerja,
                })),
              },
              null,
              2,
            )}
          </pre>
          <Button type="default" onClick={handleReset} style={{ marginTop: 8 }}>
            Reset pilihan
          </Button>
        </div>
      </Space>
    </Card>
  );
}
