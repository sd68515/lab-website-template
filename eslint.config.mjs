import eslint from '@eslint/js'
import globals from 'globals'
import typescriptEslint from 'typescript-eslint'
import eslintPluginVue from 'eslint-plugin-vue'

export default typescriptEslint.config(
  { ignores: ['dist/**', 'node_modules/**', '*.d.ts'] },
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  ...eslintPluginVue.configs['flat/essential'],
  {
    files: ['**/*.{ts,vue}'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        parser: typescriptEslint.parser,
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      'no-console': 'off',
      quotes: 'off',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  }
)
