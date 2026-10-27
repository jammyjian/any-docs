// 本地开发：先执行 prepare，再启动 VitePress dev，并监听 docs/ 下 Markdown 源文件变更自动重新 prepare。
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { prepare } from './prepare.mjs'

prepare()

const proc = spawn('vitepress', ['dev', 'docs'], { stdio: 'inherit' })

let timer = null
fs.watch(path.resolve('docs'), { recursive: true }, (_evt, fname) => {
  if (!fname) return
  const rel = fname.replace(/\\/g, '/')
  if (rel.startsWith('.') || rel.includes('.vitepress')) return // 忽略产物与缓存目录
  if (!rel.endsWith('.md')) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      prepare()
    } catch (err) {
      console.error('[prepare] 失败：', err)
    }
  }, 150)
})

proc.on('exit', () => process.exit(0))
