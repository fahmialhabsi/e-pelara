const { LakipPk, LakipPkOutputSasaran, LakipPkProgramAnggaran, IkmPenilaian, IndikatorRenstra } = require('../models');

console.log('LakipPk:', !!LakipPk);
console.log('LakipPkOutputSasaran:', !!LakipPkOutputSasaran);
console.log('LakipPkProgramAnggaran:', !!LakipPkProgramAnggaran);
console.log('IkmPenilaian:', !!IkmPenilaian);
console.log('is_iku_pk kolom ada:', 'is_iku_pk' in IndikatorRenstra.rawAttributes);
