import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Button,
  Table,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  getKodeAkunList,
  createJurnal,
  updateJurnal,
  getJurnalById,
  postJurnal,
} from "../services/lkApi";

const { Title, Text } = Typography;

export default function JurnalFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const isEdit = Boolean(id);
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [akunOptions, setAkunOptions] = useState([]);
  const [rows, setRows] = useState([
    { key: "1", kode_akun: "", debit: 0, kredit: 0, uraian: "" },
    { key: "2", kode_akun: "", debit: 0, kredit: 0, uraian: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [statusJurnal, setStatusJurnal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getKodeAkunList({ aktif: true });
        const opts = (res.data || []).map((a) => ({
          value: a.kode,
          label: `${a.kode} — ${a.nama}`,
        }));
        setAkunOptions(opts);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getJurnalById(id);
        const j = res.data;
        setStatusJurnal(j.status);
        form.setFieldsValue({
          tanggal: dayjs(j.tanggal),
          tahun_anggaran: j.tahun_anggaran,
          keterangan: j.keterangan,
          referensi: j.referensi,
          jenis_jurnal: j.jenis_jurnal,
        });
        const d = (j.details || []).map((x, i) => ({
          key: String(i),
          kode_akun: x.kode_akun,
          debit: Number(x.debit),
          kredit: Number(x.kredit),
          uraian: x.uraian || "",
        }));
        setRows(d.length ? d : rows);
      } catch (e) {
        message.error("Gagal memuat jurnal");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const totals = useMemo(() => {
    const td = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const tk = rows.reduce((s, r) => s + (Number(r.kredit) || 0), 0);
    return { td, tk, ok: Math.abs(td - tk) < 0.01 };
  }, [rows]);

  const addRow = () => {
    setRows((r) => [
      ...r,
      { key: String(Date.now()), kode_akun: "", debit: 0, kredit: 0, uraian: "" },
    ]);
  };

  const removeRow = (key) => {
    setRows((r) => (r.length <= 2 ? r : r.filter((x) => x.key !== key)));
  };

  const updateRow = (key, patch) => {
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  const buildPayload = (postNow) => {
    const v = form.getFieldsValue();
    const detail = rows
      .filter((r) => r.kode_akun)
      .map((r) => ({
        kode_akun: r.kode_akun,
        debit: Number(r.debit) || 0,
        kredit: Number(r.kredit) || 0,
        uraian: r.uraian || undefined,
      }));
    return {
      tanggal: v.tanggal ? v.tanggal.format("YYYY-MM-DD") : undefined,
      tahun_anggaran: v.tahun_anggaran,
      keterangan: v.keterangan,
      referensi: v.referensi || undefined,
      jenis_jurnal: v.jenis_jurnal || "UMUM",
      detail,
      post_now: postNow,
    };
  };

  const viewOnly = isEdit && statusJurnal && statusJurnal !== "DRAFT";
  const ro = viewOnly;

  const save = async (postNow) => {
    if (viewOnly) return;
    if (!totals.ok) {
      message.error("Total debit harus sama dengan total kredit.");
      return;
    }
    try {
      await form.validateFields();
      const payload = buildPayload(postNow);
      if (payload.detail.length < 2) {
        message.error("Minimal dua baris dengan kode akun.");
        return;
      }
      setLoading(true);
      if (isEdit) {
        await updateJurnal(id, {
          ...payload,
          post_now: undefined,
        });
        if (postNow) await postJurnal(id);
        message.success("Jurnal diperbarui.");
      } else {
        await createJurnal(payload);
        message.success(postNow ? "Jurnal dibuat & diposting." : "Jurnal disimpan (DRAFT).");
      }
      nav("/lk/jurnal");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || e.message;
      message.error(typeof msg === "string" ? msg : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Kode akun",
      dataIndex: "kode_akun",
      width: 280,
      render: (_, r) => (
        <Select
          showSearch
          disabled={ro}
          optionFilterProp="label"
          style={{ width: "100%" }}
          placeholder="Pilih akun"
          options={akunOptions}
          value={r.kode_akun || undefined}
          onChange={(v) => updateRow(r.key, { kode_akun: v })}
        />
      ),
    },
    {
      title: "Debit",
      dataIndex: "debit",
      width: 140,
      render: (_, r) => (
        <InputNumber
          min={0}
          disabled={ro}
          style={{ width: "100%" }}
          value={r.debit}
          onChange={(v) => updateRow(r.key, { debit: v || 0 })}
        />
      ),
    },
    {
      title: "Kredit",
      dataIndex: "kredit",
      width: 140,
      render: (_, r) => (
        <InputNumber
          min={0}
          disabled={ro}
          style={{ width: "100%" }}
          value={r.kredit}
          onChange={(v) => updateRow(r.key, { kredit: v || 0 })}
        />
      ),
    },
    {
      title: "Uraian",
      dataIndex: "uraian",
      render: (_, r) => (
        <Input
          disabled={ro}
          value={r.uraian}
          onChange={(e) => updateRow(r.key, { uraian: e.target.value })}
        />
      ),
    },
    ...(viewOnly
      ? []
      : [
          {
            title: "",
            width: 80,
            render: (_, r) => (
              <Button type="link" danger onClick={() => removeRow(r.key)}>
                Hapus
              </Button>
            ),
          },
        ]),
  ];

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Title level={4}>
          {isNew ? "Jurnal Baru" : `Jurnal #${id}`}
          {statusJurnal ? (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              ({statusJurnal})
            </Text>
          ) : null}
        </Title>
        <Form
          form={form}
          layout="vertical"
          disabled={viewOnly}
          initialValues={{
            tahun_anggaran: new Date().getFullYear(),
            jenis_jurnal: "UMUM",
            tanggal: dayjs(),
          }}
        >
          <Space wrap>
            <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true }]}>
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              name="tahun_anggaran"
              label="Tahun anggaran"
              rules={[{ required: true }]}
            >
              <InputNumber min={2020} max={2035} />
            </Form.Item>
            <Form.Item name="jenis_jurnal" label="Jenis jurnal">
              <Select
                options={[
                  { value: "UMUM", label: "Umum" },
                  { value: "PENYESUAIAN", label: "Penyesuaian" },
                  { value: "PENUTUP", label: "Penutup" },
                  { value: "KOREKSI", label: "Koreksi" },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="keterangan" label="Keterangan" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="referensi" label="Referensi (SPJ, bukti, …)">
            <Input />
          </Form.Item>
        </Form>

        <div>
          <Space>
            <Text strong>Baris jurnal</Text>
            {!viewOnly && (
              <Button size="small" onClick={addRow}>
                + Baris
              </Button>
            )}
          </Space>
          <Table
            style={{ marginTop: 12 }}
            size="small"
            pagination={false}
            rowKey="key"
            columns={columns}
            dataSource={rows}
          />
          <Space style={{ marginTop: 12 }}>
            <Text>Total debit: Rp. {totals.td.toLocaleString("id-ID")}</Text>
            <Text>Total kredit: Rp. {totals.tk.toLocaleString("id-ID")}</Text>
            <Text type={totals.ok ? "success" : "danger"}>
              {totals.ok ? "Balance" : "Tidak balance"}
            </Text>
          </Space>
        </div>

        <Space wrap>
          <Button onClick={() => nav("/lk/jurnal")}>Kembali</Button>
          {!viewOnly && !isEdit && (
            <>
              <Button loading={loading} onClick={() => save(false)}>
                Simpan Draft
              </Button>
              <Button type="primary" loading={loading} onClick={() => save(true)}>
                Posting Langsung
              </Button>
            </>
          )}
          {!viewOnly && isEdit && (
            <Button type="primary" loading={loading} onClick={() => save(false)}>
              Simpan Perubahan
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
