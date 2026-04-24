// src/routes/renstraRoutes.jsx
import React from "react";
import TargetRenstraList from "../features/renstra/pages/TargetRenstraList";

const ListRenstraOPD = React.lazy(() =>
  import("../features/renstra/pages/ListRenstraOPD")
);
const FormRenstraOPD = React.lazy(() =>
  import("../features/renstra/components/FormRenstraOPD")
);
const FormRenstraOPDWrapper = React.lazy(() =>
  import("../features/renstra/components/FormRenstraOPDWrapper")
);
const FormCascadingRenstra = React.lazy(() =>
  import("../features/renstra/components/FormCascadingRenstra")
);
const DynamicBabPage = React.lazy(() =>
  import("../features/renstra/pages/DynamicBabPage")
);
const TujuanRenstraAddPage = React.lazy(() =>
  import("../features/renstra/tujuan/pages/tujuanRenstraAddPage")
);
const TujuanRenstraEditPage = React.lazy(() =>
  import("../features/renstra/tujuan/pages/tujuanRenstraEditPage")
);
const TujuanRenstraListPage = React.lazy(() =>
  import("../features/renstra/tujuan/pages/tujuanRenstraListPage")
);

const SasaranRenstraAddPage = React.lazy(() =>
  import("../features/renstra/sasaran/pages/sasaranRenstraAddPage")
);
const SasaranRenstraEditPage = React.lazy(() =>
  import("../features/renstra/sasaran/pages/sasaranRenstraEditPage")
);
const SasaranRenstraListPage = React.lazy(() =>
  import("../features/renstra/sasaran/pages/sasaranRenstraListPage")
);

const StrategiRenstraAddPage = React.lazy(() =>
  import("../features/renstra/strategi/pages/strategiRenstraAddPage")
);
const StrategiRenstraEditPage = React.lazy(() =>
  import("../features/renstra/strategi/pages/strategiRenstraEditPage")
);
const StrategiRenstraListPage = React.lazy(() =>
  import("../features/renstra/strategi/pages/strategiRenstraListPage")
);

const KebijakanRenstraAddPage = React.lazy(() =>
  import("../features/renstra/kebijakan/pages/kebijakanRenstraAddPage")
);
const KebijakanRenstraEditPage = React.lazy(() =>
  import("../features/renstra/kebijakan/pages/kebijakanRenstraEditPage")
);
const KebijakanRenstraListPage = React.lazy(() =>
  import("../features/renstra/kebijakan/pages/kebijakanRenstraListPage")
);

const ProgramRenstraAddPage = React.lazy(() =>
  import("../features/renstra/program/pages/programRenstraAddPage")
);
const ProgramRenstraEditPage = React.lazy(() =>
  import("../features/renstra/program/pages/programRenstraEditPage")
);
const ProgramRenstraListPage = React.lazy(() =>
  import("../features/renstra/program/pages/programRenstraListPage")
);

const KegiatanRenstraAddPage = React.lazy(() =>
  import("../features/renstra/kegiatan/pages/kegiatanRenstraAddPage")
);
const KegiatanRenstraEditPage = React.lazy(() =>
  import("../features/renstra/kegiatan/pages/kegiatanRenstraEditPage")
);
const KegiatanRenstraListPage = React.lazy(() =>
  import("../features/renstra/kegiatan/pages/kegiatanRenstraListPage")
);

const SubKegiatanRenstraAddPage = React.lazy(() =>
  import("../features/renstra/subkegiatan/pages/subkegiatanRenstraAddPage")
);
const SubKegiatanRenstraEditPage = React.lazy(() =>
  import("../features/renstra/subkegiatan/pages/subkegiatanRenstraEditPage")
);
const SubKegiatanRenstraListPage = React.lazy(() =>
  import("../features/renstra/subkegiatan/pages/subkegiatanRenstraListPage")
);

const IndikatorUmumRenstraAddPage = React.lazy(() =>
  import(
    "../features/renstra/indikator/umumRentra/pages/indikatorUmumRenstraAddPage"
  )
);
const IndikatorUmumRenstraEditPage = React.lazy(() =>
  import(
    "../features/renstra/indikator/umumRentra/pages/indikatorUmumRenstraEditPage"
  )
);
const IndikatorUmumRenstraListPage = React.lazy(() =>
  import(
    "../features/renstra/indikator/umumRentra/pages/indikatorUmumRenstraListPage"
  )
);
const TargetRenstra = React.lazy(() =>
  import("../features/renstra/pages/TargetRenstra")
);

// /* Input Tabel Renstra */
// ✅ Tujuan Tabel
const RenstraTabelTujuanForm = React.lazy(() =>
  import("../features/renstra/tujuan/components/RenstraTabelTujuanForm")
);
const RenstraTabelTujuanListPage = React.lazy(() =>
  import("../features/renstra/tujuan/pages/RenstraTabelTujuanListPage")
);
const RenstraTabelTujuanAddPage = React.lazy(() =>
  import("../features/renstra/tujuan/pages/RenstraTabelTujuanAddPage")
);
const RenstraTabelTujuanEditPage = React.lazy(() =>
  import("../features/renstra/tujuan/pages/RenstraTabelTujuanEditPage")
);

// ✅ Sasaran Tabel
const RenstraTabelSasaranForm = React.lazy(() =>
  import("../features/renstra/sasaran/components/RenstraTabelSasaranForm")
);
const RenstraTabelSasaranListPage = React.lazy(() =>
  import("../features/renstra/sasaran/pages/RenstraTabelSasaranListPage")
);
const RenstraTabelSasaranAddPage = React.lazy(() =>
  import("../features/renstra/sasaran/pages/RenstraTabelSasaranAddPage")
);
const RenstraTabelSasaranEditPage = React.lazy(() =>
  import("../features/renstra/sasaran/pages/RenstraTabelSasaranEditPage")
);

// ✅ Program Tabel
const RenstraTabelProgramForm = React.lazy(() =>
  import("../features/renstra/program/components/RenstraTabelProgramForm")
);

const RenstraTabelProgramListPage = React.lazy(() =>
  import("../features/renstra/program/pages/RenstraTabelProgramListPage")
);
const RenstraTabelProgramAddPage = React.lazy(() =>
  import("../features/renstra/program/pages/RenstraTabelProgramAddPage")
);
const RenstraTabelProgramEditPage = React.lazy(() =>
  import("../features/renstra/program/pages/RenstraTabelProgramEditPage")
);

const RenstraTabelProgramFormWrapper = React.lazy(() =>
  import(
    "../features/renstra/program/components/RenstraTabelProgramFormWrapper"
  )
);

// ✅ Kegiatan Tabel
const RenstraTabelKegiatanForm = React.lazy(() =>
  import("../features/renstra/kegiatan/components/RenstraTabelKegiatanForm")
);
const RenstraTabelKegiatanListPage = React.lazy(() =>
  import("../features/renstra/kegiatan/pages/RenstraTabelKegiatanListPage")
);
const RenstraTabelKegiatanAddPage = React.lazy(() =>
  import("../features/renstra/kegiatan/pages/RenstraTabelKegiatanAddPage")
);
const RenstraTabelKegiatanEditPage = React.lazy(() =>
  import("../features/renstra/kegiatan/pages/RenstraTabelKegiatanEditPage")
);

// ✅ Sub Kegiatan Tabel
const RenstraTabelSubKegiatanForm = React.lazy(() =>
  import(
    "../features/renstra/subkegiatan/components/RenstraTabelSubKegiatanForm"
  )
);
const RenstraTabelSubKegiatanListPage = React.lazy(() =>
  import(
    "../features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanListPage"
  )
);
const RenstraTabelSubKegiatanAddPage = React.lazy(() =>
  import("../features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanAddPage")
);
const RenstraTabelSubKegiatanEditPage = React.lazy(() =>
  import(
    "../features/renstra/subkegiatan/pages/RenstraTabelSubKegiatanEditPage"
  )
);

// ✅ Tabel Strategi & Kebijakan
const RenstraTabelStrategiKebijakanListPage = React.lazy(() =>
  import("../features/renstra/strategiKebijakan/pages/RenstraTabelStrategiKebijakanListPage")
);
const RenstraTabelStrategiKebijakanAddPage = React.lazy(() =>
  import("../features/renstra/strategiKebijakan/pages/RenstraTabelStrategiKebijakanAddPage")
);
const RenstraTabelStrategiKebijakanEditPage = React.lazy(() =>
  import("../features/renstra/strategiKebijakan/pages/RenstraTabelStrategiKebijakanEditPage")
);

// ✅ Tabel Prioritas (Nasional / Daerah / Gubernur)
const RenstraTabelPrioritasListPage = React.lazy(() =>
  import("../features/renstra/prioritas/pages/RenstraTabelPrioritasListPage")
);
const RenstraTabelPrioritasAddPage = React.lazy(() =>
  import("../features/renstra/prioritas/pages/RenstraTabelPrioritasAddPage")
);
const RenstraTabelPrioritasEditPage = React.lazy(() =>
  import("../features/renstra/prioritas/pages/RenstraTabelPrioritasEditPage")
);

const renstraRoutes = [
  { path: "renstra-opd", element: <ListRenstraOPD /> },
  { path: "renstra-opd/new", element: <FormRenstraOPD /> },
  { path: "renstra-opd/edit/:id", element: <FormRenstraOPDWrapper /> },
  { path: "renstra/:babId", element: <DynamicBabPage tahun={2025} /> },
  { path: "renstra/cascading", element: <FormCascadingRenstra /> },

  { path: "renstra/tujuan", element: <TujuanRenstraListPage /> },
  { path: "renstra/tujuan/add", element: <TujuanRenstraAddPage /> },
  { path: "renstra/tujuan/edit/:id", element: <TujuanRenstraEditPage /> },

  { path: "renstra/sasaran", element: <SasaranRenstraListPage /> },
  { path: "renstra/sasaran/add", element: <SasaranRenstraAddPage /> },
  { path: "renstra/sasaran/edit/:id", element: <SasaranRenstraEditPage /> },

  { path: "renstra/strategi", element: <StrategiRenstraListPage /> },
  { path: "renstra/strategi/add", element: <StrategiRenstraAddPage /> },
  { path: "renstra/strategi/edit/:id", element: <StrategiRenstraEditPage /> },

  { path: "renstra/kebijakan", element: <KebijakanRenstraListPage /> },
  { path: "renstra/kebijakan/add", element: <KebijakanRenstraAddPage /> },
  { path: "renstra/kebijakan/edit/:id", element: <KebijakanRenstraEditPage /> },

  { path: "renstra/program", element: <ProgramRenstraListPage /> },
  { path: "renstra/program/add", element: <ProgramRenstraAddPage /> },
  { path: "renstra/program/edit/:id", element: <ProgramRenstraEditPage /> },

  { path: "renstra/kegiatan", element: <KegiatanRenstraListPage /> },
  { path: "renstra/kegiatan/add", element: <KegiatanRenstraAddPage /> },
  { path: "renstra/kegiatan/edit/:id", element: <KegiatanRenstraEditPage /> },

  { path: "renstra/subkegiatan", element: <SubKegiatanRenstraListPage /> },
  { path: "renstra/subkegiatan/add", element: <SubKegiatanRenstraAddPage /> },
  {
    path: "renstra/subkegiatan/edit/:id",
    element: <SubKegiatanRenstraEditPage />,
  },

  { path: "renstra/indikator-umum", element: <IndikatorUmumRenstraListPage /> },
  {
    path: "renstra/indikator-umum/add",
    element: <IndikatorUmumRenstraAddPage />,
  },
  {
    path: "renstra/indikator-umum/edit/:id",
    element: <IndikatorUmumRenstraEditPage />,
  },
  { path: "renstra/target", element: <TargetRenstraList /> },
  { path: "renstra/target/add", element: <TargetRenstra /> },

  // ✅ Input Tabel Renstra Tujuan
  {
    path: "renstra/tabel/tujuan",
    element: <RenstraTabelTujuanListPage />,
  },
  {
    path: "renstra/tabel/tujuan/add",
    element: <RenstraTabelTujuanAddPage />,
  },
  {
    path: "renstra/tabel/tujuan/edit/:id",
    element: <RenstraTabelTujuanEditPage />,
  },
  {
    path: "renstra/tabel/tujuan/by/:tujuanId", // 🔹 route baru untuk filter by tujuan
    element: <RenstraTabelTujuanForm />,
  },

  // ✅ Input Tabel Renstra Sasaran
  {
    path: "renstra/tabel/sasaran",
    element: <RenstraTabelSasaranListPage />,
  },
  {
    path: "renstra/tabel/sasaran/add",
    element: <RenstraTabelSasaranAddPage />,
  },
  {
    path: "renstra/tabel/sasaran/edit/:id",
    element: <RenstraTabelSasaranEditPage />,
  },
  {
    path: "renstra/tabel/sasaran/by/:tujuanId",
    element: <RenstraTabelSasaranForm />,
  },

  // ✅ Input Tabel Renstra Program
  { path: "renstra/tabel/program", element: <RenstraTabelProgramListPage /> },
  {
    path: "renstra/tabel/program/add",
    element: <RenstraTabelProgramAddPage />,
  },
  {
    path: "renstra/tabel/program/edit/:id",
    element: <RenstraTabelProgramEditPage />,
  },

  // ✅ Input Tabel Renstra Kegiatan
  { path: "renstra/tabel/kegiatan", element: <RenstraTabelKegiatanListPage /> },
  {
    path: "renstra/tabel/kegiatan/add",
    element: <RenstraTabelKegiatanAddPage />,
  },
  {
    path: "renstra/tabel/kegiatan/edit/:id",
    element: <RenstraTabelKegiatanEditPage />,
  },

  // ✅ Input Tabel Renstra Sub Kegiatan
  {
    path: "renstra/tabel/subkegiatan",
    element: <RenstraTabelSubKegiatanListPage />,
  },
  {
    path: "renstra/tabel/subkegiatan/add",
    element: <RenstraTabelSubKegiatanAddPage />,
  },
  {
    path: "renstra/tabel/subkegiatan/edit/:id",
    element: <RenstraTabelSubKegiatanEditPage />,
  },

  // ✅ Tabel Strategi & Arah Kebijakan
  { path: "renstra/tabel/strategi-kebijakan",           element: <RenstraTabelStrategiKebijakanListPage /> },
  { path: "renstra/tabel/strategi-kebijakan/add",       element: <RenstraTabelStrategiKebijakanAddPage /> },
  { path: "renstra/tabel/strategi-kebijakan/edit/:id",  element: <RenstraTabelStrategiKebijakanEditPage /> },

  // ✅ Tabel Prioritas Nasional / Daerah / Gubernur
  { path: "renstra/tabel/prioritas/:jenis",            element: <RenstraTabelPrioritasListPage /> },
  { path: "renstra/tabel/prioritas/:jenis/add",        element: <RenstraTabelPrioritasAddPage /> },
  { path: "renstra/tabel/prioritas/:jenis/edit/:id",   element: <RenstraTabelPrioritasEditPage /> },
];

export default renstraRoutes;
