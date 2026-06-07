const rkaEngine = require('../services/rkaEngine');
const { validateEngineContract } = require('../services/engineContractValidator');

const run = async () => {
  const rka_id = process.argv[2];

  if (!rka_id) {
    console.error('❌ Missing rka_id');
    process.exit(1);
  }

  try {
    const engineResult = await rkaEngine.recalculate(rka_id);
    const contract = validateEngineContract(engineResult);

    console.log('\n===== ENGINE CONTRACT CHECK =====');
    console.log('Rows:', engineResult.rows.length);
    console.log('Total:', engineResult.total);
    console.log('Valid:', contract.valid);

    if (!contract.valid) {
      console.log('\n❌ VIOLATIONS:');
      console.dir(contract.violations, { depth: null });
      process.exit(2);
    }

    console.log('\n✅ CONTRACT PASSED');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  }
};

run();
