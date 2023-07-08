module.exports = {
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'google',
  ],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  plugins: [
    'sort-class-members',
  ],
  rules: {
    'sort-class-members/sort-class-members': [
      2, {
        order: [
          '[static-properties]',
          '[static-methods]',
          '[properties]',
          '[conventional-private-properties]',
          'constructor',
          '[methods]',
          '[conventional-private-methods]',
        ],
        accessorPairPositioning: 'getThenSet',
      }],
    'yoda': ['error', 'always'], // Enforce Yoda style
    'quotes': ['error', 'single'], // Enforce single quotes
    'eqeqeq': ['error', 'always'], // Enforce triple equal signs
  },
};