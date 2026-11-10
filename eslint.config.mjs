import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Built output and retired code, which nothing here maintains
  { ignores: [".next/**", "app-old/**", "app-old-2/**", "public/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // The catch-all route that forwards old addresses (app/(page)/[...path]) answers any path,
  // so this rule sees every internal <a> as a link to a page. In the app that's right: use
  // <Link>. Tests draw plain links on purpose, to check how they're handled.
  { files: ["__tests__/**"], rules: { "@next/next/no-html-link-for-pages": "off" } },
];

export default eslintConfig;
