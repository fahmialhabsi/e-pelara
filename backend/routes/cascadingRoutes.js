const router = require("express").Router();
const ctrl = require("../controllers/cascadingController");
const strategiCtrl = require("../controllers/strategiController");
const akCtrl = require("../controllers/arahKebijakanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  ctrl.list
);
router.get(
  "/statistik",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  ctrl.statistik
);

router.get(
  "/sankey",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  (req, res, next) => {
    console.log("🚀 Sampai ke route /sankey");
    next();
  },
  ctrl.statistikSankey
);
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  ctrl.get
);
router.get(
  "/sasaran/:sasaranId/strategi",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  strategiCtrl.bySasaran
);
router.get(
  "/program/:programId/arah-kebijakan",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  akCtrl.byProgram
);

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  ctrl.create
);
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  ctrl.update
);
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  ctrl.remove
);

module.exports = router;
