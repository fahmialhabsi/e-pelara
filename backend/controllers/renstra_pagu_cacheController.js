const { RenstraPaguCache } = require("../models");

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, stage, ref_id } = req.query;

    const where = {};

    if (renstra_id) where.renstra_id = Number(renstra_id);
    if (stage) where.stage = stage;

    if (ref_id) {
      where.ref_id = Array.isArray(ref_id)
        ? ref_id.map(Number)
        : Number(ref_id);
    }

    const data = await RenstraPaguCache.findAll({
      where,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};