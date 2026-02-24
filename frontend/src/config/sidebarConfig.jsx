// === src/config/sidebarConfig.js ===
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AirplanemodeActiveIcon from "@mui/icons-material/AirplanemodeActive";
import FlagIcon from "@mui/icons-material/Flag";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PublicIcon from "@mui/icons-material/Public";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import StarIcon from "@mui/icons-material/Star";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";

const sidebarConfig = {
  SUPER_ADMIN: [
    {
      group: "📘 RPJMD",
      items: [
        {
          label: "Visi",
          path: "/rpjmd/visi",
          icon: <DashboardIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Misi",
          path: "/rpjmd/misi",
          icon: <AssignmentIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Tujuan",
          path: "/rpjmd/tujuan",
          icon: <AirplanemodeActiveIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Sasaran",
          path: "/rpjmd/sasaran",
          icon: <FlagIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Strategi",
          path: "/rpjmd/strategi",
          icon: <TrackChangesIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Arah Kebijakan",
          path: "/rpjmd/arah-kebijakan",
          icon: <TrendingUpIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Prioritas Nasional",
          path: "/rpjmd/prioritas-nasional",
          icon: <PublicIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Prioritas Daerah",
          path: "/rpjmd/prioritas-daerah",
          icon: <LocationCityIcon />,
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Prioritas Gubernur",
          path: "/rpjmd/prioritas-gubernur",
          icon: <StarIcon />,
          allowedDokumen: ["rpjmd"],
        },
      ],
    },
    {
      group: "🛠 Program & Kegiatan",
      items: [
        {
          label: "Program",
          path: "/program",
          icon: <ListAltIcon />,
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Kegiatan",
          path: "/kegiatan",
          icon: <AssignmentTurnedInIcon />,
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Sub Kegiatan",
          path: "/sub-kegiatan",
          icon: <SubdirectoryArrowRightIcon />,
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
      ],
    },
    {
      group: "📊 Monitoring & Evaluasi",
      items: [
        {
          label: "Dashboard Monev",
          path: "/monev",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Input Realisasi",
          path: "/monev/input",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Upload Excel",
          path: "/monev/upload",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Laporan",
          path: "/monev/laporan",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
      ],
    },
    {
      group: "🔀 Cascading Indikator",
      items: [
        {
          label: "Cascading View",
          path: "/cascading",
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Indikator Wizard",
          path: "/indikator-wizard",
          allowedDokumen: ["rpjmd"],
        },
      ],
    },
    {
      group: "📡 Statistik & Aktivitas",
      items: [
        {
          label: "Rekap Statistik",
          path: "/statistik",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Aktivitas Pengguna",
          path: "/aktivitas",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
      ],
    },
    {
      group: "👥 Admin",
      items: [
        {
          label: "Manajemen Pengguna",
          path: "/admin/users",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Clone Periode",
          path: "/admin/clone-periode",
        },
      ],
    },
  ],
  // Role lain silakan isi allowedDokumen juga
  ADMINISTRATOR: [
    {
      group: "📘 RPJMD",
      items: [
        {
          label: "Visi",
          path: "/rpjmd/visi",
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Misi",
          path: "/rpjmd/misi",
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Tujuan",
          path: "/rpjmd/tujuan",
          allowedDokumen: ["rpjmd"],
        },
        {
          label: "Sasaran",
          path: "/rpjmd/sasaran",
          allowedDokumen: ["rpjmd"],
        },
      ],
    },
    {
      group: "🛠 Program & Kegiatan",
      items: [
        {
          label: "Program",
          path: "/program",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
        {
          label: "Kegiatan",
          path: "/kegiatan",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
      ],
    },
    {
      group: "📊 Monitoring & Evaluasi",
      items: [
        {
          label: "Dashboard Monev",
          path: "/monev",
          allowedDokumen: ["rpjmd", "renstra", "rkpd", "renja", "dpa"],
        },
      ],
    },
  ],
  // ...dst (role lain)
};

export default sidebarConfig;
