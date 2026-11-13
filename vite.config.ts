import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Include the code license and the notices required by the distributed fonts.
// 构建产物包含代码许可及自托管字体所需的许可声明。
function includeLicenses(): Plugin {
  const files = [
    ['LICENSE.txt', './LICENSE'],
    ['inter-OFL.txt', './src/assets/fonts/inter/LICENSE.txt'],
    ['source-serif-OFL.txt', './src/assets/fonts/source-serif/LICENSE.md'],
    ['source-han-sans-OFL.txt', './src/assets/fonts/source-han-sans/LICENSE.txt'],
    ['source-han-serif-OFL.txt', './src/assets/fonts/source-han-serif/LICENSE.txt']
  ] as const
  return {
    name: 'include-licenses',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const filename = req.url?.split('?')[0]?.replace(/^\/licenses\//, '')
        const file = files.find(([name]) => name === filename)
        if (!file) return next()
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(readFileSync(new URL(file[1], import.meta.url), 'utf8'))
      })
    },
    generateBundle() {
      for (const [filename, source] of files) {
        this.emitFile({ type: 'asset', fileName: `licenses/${filename}`, source: readFileSync(new URL(source, import.meta.url), 'utf8') })
      }
    }
  }
}

// Set VITE_BASE_PATH to /<repository>/ when building a GitHub Pages project site.
// 发布到 GitHub Pages 项目地址时，将 VITE_BASE_PATH 设为 /<仓库名>/。
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [vue({ template: { transformAssetUrls } }), vuetify({ autoImport: true }), includeLicenses()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // Local notes and screenshots should not trigger a development reload.
    // 本地笔记和截图不应触发开发服务器刷新。
    watch: { ignored: ['**/.codex-local/**'] }
  },
  build: { sourcemap: false }
})
