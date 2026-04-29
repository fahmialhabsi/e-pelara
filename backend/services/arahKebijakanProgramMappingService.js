// backend/services/arahKebijakanProgramMappingService.js

const {
  ArahKebijakanProgramMapping,
  MasterProgram,
} = require("../models");

async function getMappedMasterProgramsByArah({
  arah_kebijakan_id,
  dataset_key,
}) {
  const mappings = await ArahKebijakanProgramMapping.findAll({
    where: {
      arah_kebijakan_id,
      dataset_key,
      is_active: true,
    },
  });

  const masterProgramIds = mappings.map((m) => m.master_program_id);

  if (masterProgramIds.length === 0) {
    return [];
  }

  return MasterProgram.findAll({
    where: {
      id: masterProgramIds,
      dataset_key,
      is_active: true,
    },
  });
}

module.exports = {
  getMappedMasterProgramsByArah,
};