// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoot from "./App";

// Default react-query sebelumnya: staleTime 0 + refetchOnWindowFocus true + retry 3.
// Kombinasi ini bikin SEMUA query di halaman (termasuk endpoint berat seperti
// mr-report full & mr-autofill options) refetch bersamaan setiap kali user
// pindah tab/window, dan setiap fetch yang gagal/lambat dicoba ulang otomatis
// 3x — tepat saat backend sedang berat itu justru menambah beban dobel-tiga.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoot />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
