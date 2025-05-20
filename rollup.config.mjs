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

const name = 'NanoUI'; // your global var

export default [
  {
    input: normalize('src/index.ts'),
    output: [
      {
        file: normalize('dist/nanoui.umd.min.js'),
        format: 'umd',
        name, // exposes window.NanoUI
        sourcemap: true,
        globals: {}
      },
      {
        file: normalize('dist/nanoui.esm.js'),
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/nanoui.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'auto'
      }
    ],
    plugins: [
      nodeResolve({ browser: true }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        target: 'ES2020'
      }),
      terser()
    ],
    external
  },
  {
    input: normalize('dist/types/index.d.ts'),
    output: {
      file: normalize('dist/nanoui.d.ts'),
      format: 'es'
    },
    plugins: [dts()]
  }
];