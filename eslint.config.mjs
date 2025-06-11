import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/agent_venv/**',
      '**/target/**',
      '**/*.py',
      '**/*.rs',
      '**/*.sql',
      '**/*.md',
      '**/*.yml',
      '**/*.yaml',
      '**/*.toml',
      '**/*.sh',
      'Archives/**',
      'infrastructure/**'
    ]
  },
  ...compat.extends("next/core-web-vitals"),
  {
    settings: {
      next: {
        rootDir: ["./frontend/"]
      }
    }
  },
  {
    rules: {
      "prefer-const": "error"
    }
  }
];

export default eslintConfig;
