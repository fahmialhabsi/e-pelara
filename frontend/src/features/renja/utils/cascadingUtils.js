export const getCascadingOptions = (opd, programData) => {
  return programData.filter(item => item.opd_id === opd);
};
