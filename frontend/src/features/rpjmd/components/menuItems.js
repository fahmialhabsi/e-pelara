import VisiForm from "./VisiForm";
import MisiForm from "./MisiForm";
import TujuanForm from "./TujuanForm";
import SasaranForm from "./SasaranForm";
import StrategiForm from "./StrategiForm";
import ProgramForm from "./ProgramPrioritasForm";
import KegiatanForm from "./KegiatanForm";
import OpdPenanggungJawabForm from "../../../shared/components/OPDPenanggungJawabForm";
import RPJMDPage from "../../../shared/components/RPJMDPage";
import PrioritasDaerah from "./PrioritasDaerahForm";
import PrioritasGubernur from "./PrioritasGubernurForm";
import PrioritasNasional from "./PrioritasNasionalForm";
import { CascadingForm } from "./CascadingForm";
import Indikator from "./IndikatorWizardForm";
import ArahKebijakanForm from "./ArahKebijakanForm";

const menuItems = [
  { key: "rpjmd", label: "RPJMD", Form: RPJMDPage },
  { key: "visi", label: "Visi", Form: VisiForm },
  { key: "misi", label: "Misi", Form: MisiForm },
  { key: "tujuan", label: "Tujuan", Form: TujuanForm },
  { key: "sasaran", label: "Sasaran", Form: SasaranForm },
  { key: "strategi", label: "Strategi", Form: StrategiForm },
  { key: "arah", label: "ArahKebijakan", Form: ArahKebijakanForm },
  { key: "prionas", label: "Nasional", Form: PrioritasNasional },
  { key: "prioda", label: "Daerah", Form: PrioritasDaerah },
  { key: "priogub", label: "Gubernur", Form: PrioritasGubernur },
  { key: "program", label: "Program", Form: ProgramForm },
  { key: "kegiatan", label: "Kegiatan", Form: KegiatanForm },
  { key: "cascading", label: "Cascading", Form: CascadingForm },
  { key: "opdpj", label: "OPD PJ", Form: OpdPenanggungJawabForm },
  { key: "indikator-wizard", label: "Indikator Wizard", Form: Indikator },
];

export default menuItems;
