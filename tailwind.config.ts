import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        sun: "#fca311",
        mist: "#e5eef6",
        paper: "#fffdf8",
        sage: "#4d7c0f",
        berry: "#9f1239"
      },
      boxShadow: {
        card: "0 18px 40px rgba(20, 33, 61, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
