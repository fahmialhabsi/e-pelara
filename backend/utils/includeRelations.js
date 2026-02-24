// utils/includeRelations.js

const {
  Sasaran,
  Tujuan,
  Strategi,
  ArahKebijakan,
  OpdPenanggungJawab,
} = require("../models");

module.exports = [
  {
    model: Sasaran,
    as: "sasaran",
    required: false,
    include: [
      {
        model: Tujuan,
        as: "Tujuan",
        required: false,
      },
    ],
  },
  {
    model: Strategi,
    as: "Strategi",
    through: { attributes: [] },
    required: false,
  },
  {
    model: ArahKebijakan,
    as: "ArahKebijakan",
    through: { attributes: [] },
    required: false,
  },
  {
    model: OpdPenanggungJawab,
    as: "opd",
    attributes: ["id", "nama_opd", "nama_bidang_opd"],
    required: false,
  },
];
