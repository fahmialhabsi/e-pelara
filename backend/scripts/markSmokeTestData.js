"use strict";
/**
 * Tandai data uji (smoke / API test) dengan is_test = true agar tidak terbawa di UI operasional.
 * Usage: node scripts/markSmokeTestData.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../models");

(async () => {
  const { RkpdDokumen, RenjaDokumen, RenstraPdDokumen, PerangkatDaerah, sequelize } = db;
  const lit = (sql) => sequelize.literal(sql);

  try {
    const [rkpdN] = await RkpdDokumen.update(
      { is_test: true },
      {
        where: lit(
          "is_test = 0 AND (LOWER(judul) LIKE '%smoke%' OR LOWER(judul) LIKE '%api test%')",
        ),
      },
    );

    let renjaN = 0;
    if (RenjaDokumen.rawAttributes.is_test) {
      const [n] = await RenjaDokumen.update(
        { is_test: true },
        {
          where: lit(
            "is_test = 0 AND (LOWER(judul) LIKE '%smoke%' OR LOWER(judul) LIKE '%api test%')",
          ),
        },
      );
      renjaN = n;
    }

    const [rstrN] = await RenstraPdDokumen.update(
      { is_test: true },
      {
        where: lit(
          "is_test = 0 AND (LOWER(judul) LIKE '%smoke%' OR LOWER(judul) LIKE '%api test%')",
        ),
      },
    );

    const [pdN] = await PerangkatDaerah.update(
      { is_test: true },
      {
        where: lit(
          "is_test = 0 AND (LOWER(nama) LIKE '%smoke%' OR LOWER(kode) LIKE '%test%')",
        ),
      },
    );

    console.log("markSmokeTestData rows updated:", {
      rkpd_dokumen: rkpdN,
      renja_dokumen: renjaN,
      renstra_pd_dokumen: rstrN,
      perangkat_daerah: pdN,
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
