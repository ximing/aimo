export default {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  overrides: [
    {
      files: '.prettierrc.js',
      options: { parser: 'babel' },
    },
  ],
};
