import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import path from 'node:path';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const normalize = (p) => path.posix.normalize(p);
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

export default [
  {
    input: normalize('src/index.ts'),
    output: [
      {
        file: normalize('dist/index.cjs.js'),
        format: 'cjs',
        sourcemap: true
      },
      {
        file: normalize('dist/index.esm.js'),
        format: 'esm',
        sourcemap: true
      }
    ],
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        target: 'ES2020'
      }),
      terser()
    ]
  },
  {
    input: normalize('dist/types/index.d.ts'),
    output: {
      file: normalize('dist/index.d.ts'),
      format: 'es'
    },
    plugins: [dts()]
  }
];