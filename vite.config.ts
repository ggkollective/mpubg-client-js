import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { readdirSync, statSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname, basename } from 'path'

const __dirname = resolve()

// 렌더러 폴더에서 모든 HTML 파일을 자동으로 찾는 함수
function findHtmlFiles(dir: string, baseDir: string = dir): Record<string, string> {
  const htmlFiles: Record<string, string> = {}

  try {
    const items = readdirSync(dir)

    for (const item of items) {
      const fullPath = join(dir, item)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        // 하위 디렉토리 재귀 탐색
        Object.assign(htmlFiles, findHtmlFiles(fullPath, baseDir))
      } else if (item.endsWith('.html')) {
        // HTML 파일 발견
        const relativePath = fullPath.replace(baseDir + '/', '')
        const key = relativePath.replace('.html', '').replace(/\//g, '-')
        htmlFiles[key] = fullPath
      }
    }
  } catch (error) {
    console.warn(`Failed to scan directory ${dir}:`, (error as Error).message)
  }

  return htmlFiles
}

// HTML 파일을 자동으로 복사하는 플러그인
const copyHtmlPlugin = () => ({
  name: 'copy-html',
  writeBundle() {
    try {
      const sourceDir = 'dist/renderer/src/renderer'
      const targetDir = 'dist/renderer'

      // src/renderer 하위의 모든 HTML 파일 찾기
      const htmlFiles = findHtmlFiles(sourceDir)

      for (const [key, sourcePath] of Object.entries(htmlFiles)) {
        // 소스 경로에서 폴더 이름 추출 (예: src/renderer/main-window/main-window.html → main-window)
        const relativePath = sourcePath.replace(sourceDir + '/', '')
        const folderName = dirname(relativePath) // 상위 디렉토리 이름 사용
        const targetFolder = join(targetDir, folderName)
        mkdirSync(targetFolder, { recursive: true })

        // HTML 파일 읽기 및 경로 수정
        const html = readFileSync(sourcePath, 'utf8')
        const fixedHtml = html.replace(/\.\.\/\.\.\/\.\.\//g, '../')

        // 대상 파일 경로 생성
        const fileName = basename(sourcePath)
        const targetPath = join(targetFolder, fileName)

        // 파일 쓰기
        writeFileSync(targetPath, fixedHtml)
        console.log(`✓ Copied: ${sourcePath} → ${targetPath}`)
      }

      console.log(`HTML files copied successfully (${Object.keys(htmlFiles).length} files)`)
    } catch (error) {
      console.warn('HTML copy failed:', (error as Error).message)
    }
  }
})

// 렌더러 HTML 파일들을 자동으로 찾아서 입력으로 설정
const rendererHtmlFiles = findHtmlFiles(resolve(__dirname, 'src/renderer'))

export default defineConfig({
  plugins: [
    electron([
      {
        entry: 'src/main.ts',
        onstart: (options) => options.reload(),
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist',
            rollupOptions: { external: ['electron'] }
          }
        }
      },
      {
        entry: 'src/preload.ts',
        onstart: (options) => options.reload(),
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist',
            rollupOptions: { external: ['electron'] }
          }
        }
      },
      {
        entry: 'src/test-modules.ts',
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist',
            rollupOptions: { external: ['electron'] }
          }
        }
      },
      {
        entry: 'src/test-websocket.ts',
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist',
            rollupOptions: { external: ['electron'] }
          }
        }
      }
    ]),
    renderer(),
    copyHtmlPlugin()
  ],
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      input: rendererHtmlFiles
    }
  },
  publicDir: resolve(__dirname, 'src/assets'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@core': resolve(__dirname, 'src/core'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  }
})
