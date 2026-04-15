const { Sequelize } = require("sequelize");
const s = new Sequelize("db_epelara", "root", "", {
  host: "localhost", dialect: "mysql", logging: false,
});
s.query("SHOW TABLES")
  .then(([r]) => {
    console.log("TABLES:", r.map((t) => Object.values(t)[0]).join(", "));
    return s.query("DESCRIBE dpa");
  })
  .then(([r]) => {
    console.log("DPA COLS:", r.map((c) => c.Field).join(", "));
    return s.query("DESCRIBE lakip");
  })
  .then(([r]) => {
    console.log("LAKIP COLS:", r.map((c) => c.Field).join(", "));
    process.exit(0);
  })
  .catch((e) => { console.error("ERR:", e.message, e.original?.message); process.exit(1); });
