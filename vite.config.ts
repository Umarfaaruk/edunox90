import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  root: path.resolve(__dirname),
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/ai": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: path.resolve(__dirname),
  },
}));
