// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const importPlugin = require('eslint-plugin-import');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'projects/**/*'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {},
        node: { extensions: ['.ts'] },
      },
    },
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'error',
      'import/extensions': ['error', { ts: 'never', json: 'always' }],
      'import/order': 'error',
      'import/no-absolute-path': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-alert': 'warn',
      'no-unused-expressions': 'error',
      'no-useless-constructor': 'off',
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions', 'functions', 'methods'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      'max-len': ['error', { code: 120, ignorePattern: '^\\s*import' }],
      'spaced-comment': ['error', 'always'],
      'class-methods-use-this': 'off',
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      '@typescript-eslint/naming-convention': ['error', { selector: 'typeLike', format: ['PascalCase'] }],
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: ['static-field', 'instance-field', 'static-method', 'instance-method'],
        },
      ],
      '@typescript-eslint/unified-signatures': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {},
  },
  {
    files: ['**/*.html'],
    ignores: ['**/*inline-template-*.component.html'],
    plugins: { prettier: prettierPlugin },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': ['error', { parser: 'angular' }],
    },
  },
);
