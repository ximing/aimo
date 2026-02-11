import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import postcss from 'rollup-plugin-postcss';

/**
 * Creates a rollup configuration for a package
 * @param {Object} options
 * @param {string} options.input - The entry point file
 * @param {string} options.packageDir - The package directory
 * @param {Object} [options.external] - External dependencies
 * @returns {Array} Rollup configuration
 */
export function createRollupConfig({ input, packageDir, external = [] }) {
  return [
    {
      input,
      output: [
        {
          file: `${packageDir}/dist/index.js`,
          format: 'cjs',
          sourcemap: true,
          exports: 'named',
        },
        {
          file: `${packageDir}/dist/index.mjs`,
          format: 'esm',
          sourcemap: true,
          exports: 'named',
        },
      ],
      external: [...external, /node_modules/],
      plugins: [
        nodeResolve(),
        commonjs(),
        postcss({
          extract: true,
          minimize: true,
          sourceMap: true,
        }),
        typescript({
          tsconfig: `${packageDir}/tsconfig.json`,
          declaration: true,
          declarationDir: `${packageDir}/dist/types`,
        }),
      ],
    },
    {
      input: `${packageDir}/dist/types/index.d.ts`,
      output: [{ file: `${packageDir}/dist/index.d.ts`, format: 'esm' }],
      external: [/\.css$/, /\.scss$/, /\.sass$/, /\.less$/, /\.styl$/],
      plugins: [dts()],
    },
  ];
}
