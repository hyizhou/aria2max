module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  overrides: [
    {
      files: ['*.js', '*.ts'],
      excludedFiles: ['src/client/**/*'],
      env: {
        node: true,
        browser: false
      },
      extends: ['eslint:recommended'],
      rules: {
        'no-console': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    },
    {
      files: ['*.vue', '*.ts'],
      excludedFiles: ['src/server/**/*'],
      env: {
        node: false,
        browser: true
      },
      extends: [
        'plugin:vue/vue3-essential',
        '@vue/typescript/recommended'
      ],
      parserOptions: {
        ecmaVersion: 2021,
        parser: '@typescript-eslint/parser'
      },
      rules: {
        'vue/multi-word-component-names': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    }
  ]
}