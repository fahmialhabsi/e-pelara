// frontend/src/services/mrAutoFillService.js
import api from '@/services/api';

export const getAutoFillSuggestion = async (contextId) => {
  if (!contextId) {
    throw new Error('ID MR Planning Context wajib diisi.');
  }

  const response = await api.get(`/mr-autofill/${contextId}`);

  return response.data;
};

const mrAutoFillService = {
  getAutoFillSuggestion,
};

export default mrAutoFillService;
