import path from "path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "vendor-react";
          }

          if (id.includes("@tanstack/react-router") || id.includes("@tanstack/router")) {
            return "vendor-router";
          }

          if (id.includes("@tanstack/react-query") || id.includes("@tanstack/query")) {
            return "vendor-query";
          }

          if (id.includes("@tanstack/react-table")) {
            return "vendor-table";
          }

          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }

          if (id.includes("date-fns") || id.includes("react-day-picker")) {
            return "vendor-date";
          }

          if (id.includes("i18next") || id.includes("react-i18next")) {
            return "vendor-i18n";
          }

          if (id.includes("zod") || id.includes("react-hook-form") || id.includes("@hookform/resolvers")) {
            return "vendor-form";
          }

          if (id.includes("axios") || id.includes("zustand") || id.includes("sonner")) {
            return "vendor-data";
          }

          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          return "vendor-misc";
        },
      },
    },
  },
  server: {
    port: 4200,
    host: true,
    allowedHosts: [""],
    proxy: {
      '/api/v1/files': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  preview: {
    port: 4200,
    host: "localhost",
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
