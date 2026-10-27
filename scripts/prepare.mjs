// 构建前预处理：把中文文件名的 Markdown 复制到 .vitepress/src/，文件名转成拼音 slug。
// 侧边栏标题与「最后更新」登记在 url-map.json，由 config.mts 读取。
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'docs')
const OUT = path.join(SRC, '.vitepress', 'src')
const MAP_PATH = path.join(SRC, '.vitepress', 'url-map.json')

const toPosix = (p) => p.split(path.sep).join('/')

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(abs))
    else if (entry.name.endsWith('.md')) files.push(abs)
  }
  return files
}

function slugify(base) {
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(base)) return base.toLowerCase()
  const text = pinyin(base, { toneType: 'none', nonZh: 'consecutive' })
  return (
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .join('-')
      .replace(/^-+|-+$/g, '') || 'page'
  )
}

function gitTime(abs) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%at', '--', abs], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    return out ? Number(out) : undefined
  } catch {
    return undefined
  }
}

export function prepare() {
  const files = walk(SRC)
  const oldMap = fs.existsSync(MAP_PATH)
    ? JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
    : {}
  const newMap = {}
  const used = new Set()

  for (const abs of files) {
    const rel = toPosix(path.relative(SRC, abs))
    const relDir = path.posix.dirname(rel)
    const filename = path.basename(rel)

    let slug
    if (oldMap[rel]?.slug) {
      slug = oldMap[rel].slug // 已登记过的文件复用 slug，保持 URL 稳定
    } else {
      slug = slugify(filename.replace(/\.md$/, ''))
      let candidate = slug
      let i = 2
      while (used.has(`${relDir}/${candidate}`)) candidate = `${slug}-${i++}`
      slug = candidate
    }
    used.add(`${relDir}/${slug}`)

    const content = fs.readFileSync(abs, 'utf8')
    const title = (content.match(/^#\s+(.+)$/m) || [])[1]?.trim() || filename
    // VitePress 的 lastUpdated 使用毫秒时间戳；git log 返回秒，需换算
    const t = gitTime(abs)
    const lastUpdated = t ? t * 1000 : Math.floor(fs.statSync(abs).mtimeMs)

    const outAbs = path.join(OUT, relDir, `${slug}.md`)
    fs.mkdirSync(path.dirname(outAbs), { recursive: true })
    fs.writeFileSync(outAbs, content)

    newMap[rel] = { slug, title, lastUpdated }
  }

  // 首页（index.md）里以源路径写法引用的链接，改写成 slug 路由，
  // 这样首页按钮/链接不随中文文件名变动而失效。
  const srcIndex = path.join(SRC, 'index.md')
  if (fs.existsSync(srcIndex)) {
    let content = fs.readFileSync(srcIndex, 'utf8')
    for (const [key, v] of Object.entries(newMap)) {
      if (key === 'index.md') continue
      const dir = path.posix.dirname(key)
      const srcRoute = `/${dir}/${path.posix.basename(key, '.md')}`
      content = content.split(srcRoute).join(`/${dir}/${v.slug}`)
    }
    fs.writeFileSync(path.join(OUT, 'index.md'), content)
  }

  // 清理已不存在的源文件对应的生成文件
  const valid = new Set(
    Object.entries(newMap).map(([rel, v]) =>
      toPosix(path.join(OUT, path.posix.dirname(rel), `${v.slug}.md`)),
    ),
  )
  for (const abs of walk(OUT)) {
    if (!valid.has(abs)) fs.rmSync(abs, { force: true })
  }
  for (const entry of fs.readdirSync(OUT, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const abs = path.join(OUT, entry.name)
      if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs)
    }
  }

  fs.writeFileSync(MAP_PATH, JSON.stringify(newMap, null, 2) + '\n')
}

// 直接运行脚本时执行一次（被 dev.mjs 以模块方式引入时跳过）
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  prepare()
  console.log('[prepare] 预处理完成，产物见 docs/.vitepress/src/')
}
