import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'bundle',
  format: ['cjs'],
  target: 'node18',
  platform: 'node',
  // 将所有依赖打包进来，实现单文件零依赖
  noExternal: [/.*/],
  // 不生成类型声明（CLI 工具不需要）
  dts: false,
  sourcemap: false,
  clean: true,
  // 不拆分代码，保持单文件
  splitting: false,
  // 不压缩，方便调试；如需最小体积可改为 true
  minify: false,
});
