import type { Config } from "tailwindcss";

// Design tokens for ChefConnect: warm, rustic, kitchen-table. Colours are named
// after kitchen materials so choices stay grounded rather than decorative.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        flour: "#F3EBDD",     // page background, like a dusted board
        cream: "#FBF6EC",     // raised surfaces, inputs
        line: "#DCD2BF",      // hairlines and borders
        walnut: "#6E5443",    // secondary text, cutting-board brown
        iron: "#2B2520",      // primary text, cast iron
        olive: {
          DEFAULT: "#5A6B32", // primary action, olive oil
          deep: "#465428",    // hover / pressed
        },
        turmeric: "#D89B14",  // single accent, used sparingly
        paprika: "#A83B2C",   // errors and destructive actions
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        body: ["var(--font-body)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "3px",
      },
      maxWidth: {
        prose: "42rem",
      },
    },
  },
  plugins: [],
};

export default config;
