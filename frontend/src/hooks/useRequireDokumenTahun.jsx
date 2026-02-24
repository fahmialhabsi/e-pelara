// src/hooks/useRequireDokumenTahun.js
import { useDokumen } from "./useDokumen";
import GlobalDokumenTahunPickerModal from "../shared/components/GlobalDokumenTahunPickerModal.jsx";

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

  const isReady = !!dokumen && !!tahun;

  const GuardModal = !isReady ? (
    <GlobalDokumenTahunPickerModal forceOpen />
  ) : null;

  return { isReady, GuardModal };
};
