import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  root: path.resolve(__dirname),
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true as const,
    hmr: {
      overlay: false,
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Firebase SDK (large)
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
            "firebase/analytics",
          ],
          // Charting library (large)
          "vendor-recharts": ["recharts"],
          // Radix UI primitives
          "vendor-radix": [
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          // Animation libraries
          "vendor-animation": ["framer-motion", "gsap", "@gsap/react"],
          // Flow diagram library
          "vendor-flow": ["@xyflow/react"],
          // Markdown renderer
          "vendor-markdown": ["react-markdown"],
        },
      },
    },
    // Warn at 600 KB since we have intentional chunking
    chunkSizeWarningLimit: 600,
  },
}));
