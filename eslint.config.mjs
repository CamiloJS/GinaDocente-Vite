// Configuracion de ESLint para atrapar errores que rompen la pagina en produccion
// (por ejemplo: variables/componentes que no existen -> "X is not defined").
import globals from "globals";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        __app_id: "readonly",
        __APP_BUILD_TIME__: "readonly",
      },
    },
    rules: {
      // Lo que rompe la pagina: usar algo que no esta definido ni importado
      "no-undef": "error",
      // Errores graves de sintaxis/scope
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-const-assign": "error",
      "no-redeclare": "error",
      "no-self-assign": "error",
      "no-cond-assign": "error",
      "no-unsafe-negation": "error",
      "no-func-assign": "error",
      "no-obj-calls": "error",
      "no-sparse-arrays": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    // polyfills.js comprueba a proposito el objeto `global` de Node dentro de un typeof (seguro)
    files: ["src/polyfills.js"],
    languageOptions: { globals: { global: "readonly" } },
  },
  {
    // Archivos generados / de plantilla
    ignores: ["dist/**", "node_modules/**", "src/templates/**", "englishtech-ova-editor-complete/**", "functions/**"],
  },
];
