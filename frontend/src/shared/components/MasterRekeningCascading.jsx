import { useReducer, useEffect, useCallback } from 'react';
import Select from 'react-select';
import api from '../../services/api';

const toOption = (item) => ({
  value: item.id,
  label:
    `${item.kode_program_full || item.kode_kegiatan_full || item.kode_sub_kegiatan_full || ''} - ${item.nama_program || item.nama_kegiatan || item.nama_sub_kegiatan || ''}`.trim(),
  raw: item,
});

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none',
    borderRadius: '0.5rem',
    minHeight: '40px',
    fontSize: '0.875rem',
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#111827',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const initialState = {
  programs: [],
  kegiatans: [],
  subKegiatans: [],
  selectedProgram: null,
  selectedKegiatan: null,
  selectedSubKegiatan: null,
  loadingProgram: false,
  loadingKegiatan: false,
  loadingSubKegiatan: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROGRAMS':
      return { ...state, programs: action.payload, loadingProgram: false };
    case 'SET_KEGIATANS':
      return { ...state, kegiatans: action.payload, loadingKegiatan: false };
    case 'SET_SUB_KEGIATANS':
      return { ...state, subKegiatans: action.payload, loadingSubKegiatan: false };
    case 'LOADING_PROGRAM':
      return { ...state, loadingProgram: true };
    case 'LOADING_KEGIATAN':
      return { ...state, loadingKegiatan: true };
    case 'LOADING_SUB_KEGIATAN':
      return { ...state, loadingSubKegiatan: true };
    case 'SELECT_PROGRAM':
      return {
        ...state,
        selectedProgram: action.payload,
        selectedKegiatan: null,
        selectedSubKegiatan: null,
        kegiatans: [],
        subKegiatans: [],
      };
    case 'SELECT_KEGIATAN':
      return {
        ...state,
        selectedKegiatan: action.payload,
        selectedSubKegiatan: null,
        subKegiatans: [],
      };
    case 'SELECT_SUB_KEGIATAN':
      return { ...state, selectedSubKegiatan: action.payload };
    default:
      return state;
  }
}

export default function MasterRekeningCascading({
  onChange,
  disabled = false,
  required = false,
  datasetKey = 'kepmendagri_provinsi_900_2024',
  allowedKodeProgram = [],
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    programs,
    kegiatans,
    subKegiatans,
    selectedProgram,
    selectedKegiatan,
    selectedSubKegiatan,
    loadingProgram,
    loadingKegiatan,
    loadingSubKegiatan,
  } = state;

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'LOADING_PROGRAM' });
    api
      .get('/master-program', { params: { dataset_key: datasetKey } })
      .then((res) => {
        let items = res.data?.data || [];
        if (allowedKodeProgram && allowedKodeProgram.length > 0) {
          items = items.filter((p) =>
            allowedKodeProgram.some((kode) => (p.kode_program_full || '').startsWith(kode)),
          );
        }
        // Deduplikasi berdasarkan kode_program_full, ambil id terkecil
        const seen = new Set();
        items = items.filter((p) => {
          const kode = p.kode_program_full || '';
          if (seen.has(kode)) return false;
          seen.add(kode);
          return true;
        });

        if (!cancelled) dispatch({ type: 'SET_PROGRAMS', payload: items.map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [datasetKey, allowedKodeProgram]);

  useEffect(() => {
    dispatch({ type: 'SELECT_PROGRAM', payload: null });
  }, [allowedKodeProgram]);

  useEffect(() => {
    if (!selectedProgram) return;
    let cancelled = false;
    dispatch({ type: 'LOADING_KEGIATAN' });
    api
      .get('/master-kegiatan', {
        params: { program_id: selectedProgram.value, dataset_key: datasetKey },
      })
      .then((res) => {
        if (!cancelled)
          dispatch({ type: 'SET_KEGIATANS', payload: (res.data?.data || []).map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedProgram, datasetKey]);

  useEffect(() => {
    if (!selectedKegiatan) return;
    let cancelled = false;
    dispatch({ type: 'LOADING_SUB_KEGIATAN' });
    api
      .get('/master-sub-kegiatan', {
        params: { kegiatan_id: selectedKegiatan.value, dataset_key: datasetKey },
      })
      .then((res) => {
        if (!cancelled)
          dispatch({ type: 'SET_SUB_KEGIATANS', payload: (res.data?.data || []).map(toOption) });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedKegiatan, datasetKey]);

  useEffect(() => {
    if (onChange)
      onChange({
        program: selectedProgram?.raw || null,
        kegiatan: selectedKegiatan?.raw || null,
        subKegiatan: selectedSubKegiatan?.raw || null,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram, selectedKegiatan, selectedSubKegiatan]);

  const handleProgram = useCallback(
    (opt) => dispatch({ type: 'SELECT_PROGRAM', payload: opt }),
    [],
  );
  const handleKegiatan = useCallback(
    (opt) => dispatch({ type: 'SELECT_KEGIATAN', payload: opt }),
    [],
  );
  const handleSubKegiatan = useCallback(
    (opt) => dispatch({ type: 'SELECT_SUB_KEGIATAN', payload: opt }),
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={labelStyle}>
          Program {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={programs}
          value={selectedProgram}
          onChange={handleProgram}
          isLoading={loadingProgram}
          isDisabled={disabled}
          placeholder="Pilih Program..."
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          isClearable
        />
        {selectedProgram && <p style={hintStyle}>Kode: {selectedProgram.raw?.kode_program_full}</p>}
      </div>

      <div>
        <label style={labelStyle}>
          Kegiatan {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={kegiatans}
          value={selectedKegiatan}
          onChange={handleKegiatan}
          isLoading={loadingKegiatan}
          isDisabled={disabled || !selectedProgram}
          placeholder={selectedProgram ? 'Pilih Kegiatan...' : 'Pilih Program terlebih dahulu'}
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          isClearable
        />
        {selectedKegiatan && (
          <p style={hintStyle}>Kode: {selectedKegiatan.raw?.kode_kegiatan_full}</p>
        )}
      </div>

      <div>
        <label style={labelStyle}>
          Sub Kegiatan {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <Select
          options={subKegiatans}
          value={selectedSubKegiatan}
          onChange={handleSubKegiatan}
          isLoading={loadingSubKegiatan}
          isDisabled={disabled || !selectedKegiatan}
          placeholder={
            selectedKegiatan ? 'Pilih Sub Kegiatan...' : 'Pilih Kegiatan terlebih dahulu'
          }
          noOptionsMessage={() => 'Tidak ada data'}
          loadingMessage={() => 'Memuat...'}
          styles={selectStyles}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          isClearable
        />
        {selectedSubKegiatan && (
          <p style={hintStyle}>Kode: {selectedSubKegiatan.raw?.kode_sub_kegiatan_full}</p>
        )}
      </div>

      {selectedProgram && selectedKegiatan && selectedSubKegiatan && (
        <div style={summaryStyle}>
          <p
            style={{
              margin: '0 0 0.25rem',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: '#1d4ed8',
            }}
          >
            ✓ Rekening Terpilih
          </p>
          <p style={summaryRow}>
            <span>Program</span>
            <span>{selectedProgram.raw?.kode_program_full}</span>
          </p>
          <p style={summaryRow}>
            <span>Kegiatan</span>
            <span>{selectedKegiatan.raw?.kode_kegiatan_full}</span>
          </p>
          <p style={summaryRow}>
            <span>Sub Kegiatan</span>
            <span>{selectedSubKegiatan.raw?.kode_sub_kegiatan_full}</span>
          </p>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.375rem',
};
const hintStyle = { margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280' };
const summaryStyle = {
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
};
const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '0.125rem 0',
  fontSize: '0.75rem',
  color: '#1e40af',
};
