import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: "node",
    include: [
      "src/features/rpjmd/services/**/*.test.js",
      "src/utils/mapBackendErrorsToFormik.test.js",
      "src/validations/indikatorSchemas.test.js",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      path: "path-browserify",
    },
  },
  optimizeDeps: {
    include: ["@coreui/react", "@coreui/icons", "@coreui/chartjs", "chart.js"],
  },
  server: {
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
