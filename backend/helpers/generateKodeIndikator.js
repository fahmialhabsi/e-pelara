// backend/helpers/generateKodeIndikator.js
const { sequelize, IndikatorSasaran } = require("../models");
const { Op } = require("sequelize");

exports.generateKodeIndikator = async (sasaran_id, prefix) => {
  const result = await IndikatorSasaran.findOne({
    where: {
      sasaran_id,
      kode_indikator: { [Op.like]: `${prefix}-%` },
    },
    attributes: [
      [
        sequelize.fn(
          "MAX",
          sequelize.literal(
            "CAST(SUBSTRING_INDEX(kode_indikator,'-',-1) AS UNSIGNED)"
          )
        ),
        "maxNumber",
      ],
    ],
    raw: true,
  });

  const next = (result?.maxNumber || 0) + 1;
  return `${prefix}-${String(next).padStart(2, "0")}`;
};
