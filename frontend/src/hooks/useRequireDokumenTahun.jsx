// src/hooks/useRequireDokumenTahun.js
import { useDokumen } from "./useDokumen";
import GlobalDokumenTahunPickerModal from "../shared/components/GlobalDokumenTahunPickerModal.jsx";
import { usePeriodeAktif } from "../features/rpjmd/hooks/usePeriodeAktif";
import { isDokumenLevelPeriode } from "../utils/planningDokumenUtils";

/**
 * Hook ini digunakan untuk menjaga agar user tidak bisa mengakses halaman
 * sebelum memilih jenis dokumen & tahun. Akan memunculkan modal jika diperlukan.
 *
 * @returns {object} {
 *   isReady: boolean,        // apakah dokumen & tahun sudah tersedia
 *   GuardModal: ReactNode,   // render elemen modal jika belum tersedia
 * }
 */
export const useRequireDokumenTahun = () => {
  const { dokumen, tahun } = useDokumen();
  const { loading: periodeLoading } = usePeriodeAktif();

  const periodeLevel = isDokumenLevelPeriode(dokumen);
  const isReady =
    !!dokumen &&
    !!tahun &&
    (!periodeLevel || !periodeLoading);

  const GuardModal = !isReady ? (
    <GlobalDokumenTahunPickerModal forceOpen />
  ) : null;

  return { isReady, GuardModal };
};
