import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        culqi: {
          primary: "#0E0E2C",
          accent: "#00E0B0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
