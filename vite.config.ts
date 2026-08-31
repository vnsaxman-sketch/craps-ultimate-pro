import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  base: "/craps-ultimate-pro/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
