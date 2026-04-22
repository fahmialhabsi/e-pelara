import React, { useEffect, useMemo } from "react";
import { Form, Input, Button, Card, Select, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import api from "../../../services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  extractListData,
  normalizeListItems,
} from "../../../utils/apiResponse";

const schema = Yup.object().shape({
  opd_id: Yup.number().required("OPD wajib dipilih"),
  bidang_opd: Yup.string().required("Bidang OPD wajib dipilih"),
  sub_bidang_opd: Yup.string().required("Sub Bidang OPD wajib diisi"),
  rpjmd_id: Yup.number().required("RPJMD wajib dipilih"),
  tahun_mulai: Yup.number().required("Awal periode Renstra wajib dipilih"),
  tahun_akhir: Yup.number().required("Akhir periode Renstra wajib dipilih"),
  keterangan: Yup.string(),
});

const FormRenstraOPD = ({ initialData = null, onSuccess }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      opd_id: "",
      bidang_opd: "",
      sub_bidang_opd: "",
      rpjmd_id: "",
      tahun_mulai: "",
      tahun_akhir: "",
      keterangan: "",
    },
  });

  const selectedOpdId = watch("opd_id");

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const { data: opdOptions = [] } = useQuery({
    queryKey: ["opd-penanggung-jawab"],
    queryFn: async () => {
      const res = await api.get("/opd-penanggung-jawab");
      return normalizeListItems(res.data);
    },
  });

  const { data: rpjmdOptions = [] } = useQuery({
    queryKey: ["rpjmd"],
    queryFn: () => api.get("/rpjmd").then((res) => res.data),
  });

  const { data: periodeOptions = [] } = useQuery({
    queryKey: ["periode-rpjmd"],
    queryFn: () =>
      api.get("/periode-rpjmd").then((res) => extractListData(res.data)),
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const opdSelected = opdOptions.find((opd) => opd.id === data.opd_id);
      const payload = {
        ...data,
        is_aktif: 1, // langsung aktifkan di backend
        nama_opd: opdSelected?.nama_opd || null,
      };

      if (initialData?.id) {
        return await api.put(`/renstra-opd/${initialData.id}`, payload);
      } else {
        return await api.post("/renstra-opd", payload);
      }
    },
    onSuccess: () => {
      message.success("Data berhasil disimpan!");
      queryClient.invalidateQueries(["renstra-opd"]);
      navigate("/dashboard-renstra");
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Gagal menyimpan data.");
    },
  });

  // Filter bidang berdasarkan OPD yang dipilih.
  // Cari nama_opd dari entri yang dipilih, lalu tampilkan SEMUA bidang
  // yang memiliki nama_opd yang sama (bukan hanya satu entri by primary key).
  const filteredBidangOptions = useMemo(() => {
    if (!selectedOpdId) return [];
    // Konversi ke number untuk menghindari type-mismatch string vs number
    const selectedId = Number(selectedOpdId);
    const selectedOpd = opdOptions.find((opd) => Number(opd.id) === selectedId);
    if (!selectedOpd || !selectedOpd.nama_opd) return [];

    // Ambil semua bidang yang berada di bawah nama_opd yang sama
    const seen = new Set();
    return opdOptions
      .filter(
        (opd) =>
          opd.nama_opd === selectedOpd.nama_opd &&
          opd.nama_bidang_opd &&
          !seen.has(opd.nama_bidang_opd) &&
          seen.add(opd.nama_bidang_opd)
      )
      .map((opd) => ({
        value: opd.nama_bidang_opd,
        label: opd.nama_bidang_opd,
      }));
  }, [selectedOpdId, opdOptions]);

  return (
    <Card
      title={initialData ? "Edit Renstra OPD" : "Tambah Renstra OPD"}
      extra={
        <Button onClick={() => navigate("/dashboard-renstra")}>
          Kembali ke Dashboard
        </Button>
      }
    >
      <Form layout="vertical" onFinish={handleSubmit(mutation.mutate)}>
        {/* OPD */}
        <Form.Item
          label="OPD"
          validateStatus={errors.opd_id ? "error" : ""}
          help={errors.opd_id?.message}
        >
          <Controller
            name="opd_id"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                placeholder="Pilih OPD"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {opdOptions.map((opd) => (
                  <Select.Option key={opd.id} value={opd.id}>
                    {opd.nama_opd}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* Bidang OPD */}
        <Form.Item
          label="Bidang OPD"
          validateStatus={errors.bidang_opd ? "error" : ""}
          help={errors.bidang_opd?.message}
        >
          <Controller
            name="bidang_opd"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                placeholder={
                  selectedOpdId
                    ? "Pilih Bidang dari OPD yang dipilih"
                    : "Pilih OPD terlebih dahulu"
                }
                disabled={!selectedOpdId}
              >
                {filteredBidangOptions.map((bidang) => (
                  <Select.Option key={bidang.value} value={bidang.value}>
                    {bidang.label}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* Sub Bidang */}
        <Form.Item
          label="Sub Bidang OPD"
          validateStatus={errors.sub_bidang_opd ? "error" : ""}
          help={errors.sub_bidang_opd?.message}
        >
          <Controller
            name="sub_bidang_opd"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Isi Sub Bidang OPD" />
            )}
          />
        </Form.Item>

        {/* RPJMD */}
        <Form.Item
          label="RPJMD"
          validateStatus={errors.rpjmd_id ? "error" : ""}
          help={errors.rpjmd_id?.message}
        >
          <Controller
            name="rpjmd_id"
            control={control}
            render={({ field }) => (
              <Select {...field} allowClear placeholder="Pilih RPJMD">
                {rpjmdOptions.map((rpjmd) => (
                  <Select.Option key={rpjmd.id} value={rpjmd.id}>
                    {rpjmd.nama_rpjmd}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* Awal periode (nilai = tahun_awal RPJMD, dipetakan ke field tahun_mulai) */}
        <Form.Item
          label="Awal periode Renstra"
          validateStatus={errors.tahun_mulai ? "error" : ""}
          help={errors.tahun_mulai?.message}
        >
          <Controller
            name="tahun_mulai"
            control={control}
            render={({ field }) => (
              <Select {...field} allowClear placeholder="Pilih awal periode">
                {periodeOptions.map((p) => (
                  <Select.Option key={p.tahun_awal} value={p.tahun_awal}>
                    {p.nama} ({p.tahun_awal}–{p.tahun_akhir})
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* Akhir periode (nilai = tahun_akhir RPJMD, dipetakan ke field tahun_akhir) */}
        <Form.Item
          label="Akhir periode Renstra"
          validateStatus={errors.tahun_akhir ? "error" : ""}
          help={errors.tahun_akhir?.message}
        >
          <Controller
            name="tahun_akhir"
            control={control}
            render={({ field }) => (
              <Select {...field} allowClear placeholder="Pilih akhir periode">
                {periodeOptions.map((p) => (
                  <Select.Option key={p.tahun_akhir} value={p.tahun_akhir}>
                    {p.nama} ({p.tahun_awal}–{p.tahun_akhir})
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* Keterangan */}
        <Form.Item label="Keterangan">
          <Controller
            name="keterangan"
            control={control}
            render={({ field }) => <Input.TextArea rows={3} {...field} />}
          />
        </Form.Item>

        {/* Submit */}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isLoading}>
            {initialData ? "Update" : "Simpan"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default FormRenstraOPD;
