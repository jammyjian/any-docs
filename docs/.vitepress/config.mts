import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'

// prepare.mjs 生成的映射表：源路径 -> { slug, route, title, lastUpdated }
const MAP_PATH = path.join(process.cwd(), 'docs', '.vitepress', 'url-map.json')
type MapEntry = { slug: string; route: string; title: string; lastUpdated: number }
type PageMap = Record<string, MapEntry>
const map: PageMap = fs.existsSync(MAP_PATH)
  ? JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')) as PageMap
  : {}

type Page = { key: string; route: string; title: string; lastUpdated: number; name: string }
const allPages: Page[] = Object.entries(map).map(([key, value]) => {
  const dir = path.posix.dirname(key)
  const route = value.route ?? (dir === '.' ? value.slug : `${dir}/${value.slug}`)
  return {
    key,
    route,
    title: value.title,
    lastUpdated: value.lastUpdated,
    name: path.posix.basename(key),
  }
})

// 生成文件路径 -> lastUpdated，用于 transformPageData 覆盖 git 时间戳
const reverseMap = Object.fromEntries(allPages.map((p) => [`${p.route}.md`, p.lastUpdated]))

// ---- 侧边栏：按源目录树自动生成；目录内的 README 作为该目录的标题与入口 ----
type SidebarItem = { text: string; link?: string; items?: SidebarItem[] }
type RawFile = { text: string; link: string; _readme: boolean }
type DirNode = { top?: string; seg: string; files: RawFile[]; children: Map<string, DirNode> }

// 顶层目录的展示名
const TOP_LABELS: Record<string, string> = {
  any: '调研',
  electrician: '低压电工考证',
}

// 目录段展示名：如 "01-Chapter 1-安全生产法律法规" -> "第 1 章 安全生产法律法规"
function cleanDirLabel(seg: string): string {
  const m = seg.match(/^(\d+)-chapter\s*\d+-(.+)$/i)
  return m ? `第 ${Number(m[1])} 章 ${m[2]}` : seg
}

function finalize(node: DirNode): SidebarItem {
  // 无文件且仅一个子目录的目录：直接呈现子目录内容（保留本目录的标签与入口）
  let eff = node
  while (eff.files.length === 0 && eff.children.size === 1) {
    eff = [...eff.children.values()][0]
  }

  const readme = eff.files.find((f) => f._readme)
  const label =
    (node.top && TOP_LABELS[node.top]) ?? // 顶层目录用固定标签
    (readme ? readme.text : cleanDirLabel(eff.seg))
  const link = readme?.link

  const files: SidebarItem[] = eff.files
    .filter((f) => f !== readme)
    .sort((a, b) => a.text.localeCompare(b.text, 'zh-CN', { numeric: true }))
    .map((f) => ({ text: f.text, link: f.link }))

  const children: SidebarItem[] = [...eff.children.values()]
    .sort((a, b) => a.seg.localeCompare(b.seg, 'zh-CN', { numeric: true }))
    .map((c) => finalize(c))

  const items = [...files, ...children]
  if (items.length === 0) return { text: label, link }
  return { text: label, link, items }
}

function buildSidebar(pages: Page[]): SidebarItem[] {
  const root: DirNode = { seg: '', files: [], children: new Map() }
  for (const p of pages) {
    const segs = path.posix.dirname(p.key).split('/').filter(Boolean)
    let node = root
    for (let i = 0; i < segs.length; i++) {
      if (!node.children.has(segs[i])) {
        node.children.set(segs[i], {
          top: i === 0 ? segs[i] : undefined,
          seg: segs[i],
          files: [],
          children: new Map(),
        })
      }
      node = node.children.get(segs[i])!
    }
    node.files.push({
      text: p.title,
      link: `/${p.route}`,
      _readme: p.name.toUpperCase().startsWith('README'),
    })
  }
  return [...root.children.values()]
    .sort((a, b) => a.seg.localeCompare(b.seg, 'zh-CN', { numeric: true }))
    .map((c) => finalize(c))
}

const sidebar = buildSidebar(allPages.filter((p) => p.key !== 'index.md'))

export default defineConfig({
  lang: 'zh-CN',
  base: '/some-docs/',
  srcDir: '.vitepress/src',
  title: 'some-docs',
  description: '个人调研与文档集合',
  lastUpdated: true,

  // 生成的源文件不在 git 中，用 prepare 记录的提交时间覆盖 lastUpdated
  transformPageData: (pageData) => {
    const ts = reverseMap[pageData.relativePath]
    if (ts) return { lastUpdated: ts }
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      ...sidebar.map((g) => ({ text: g.text, link: g.link ?? g.items?.[0]?.link ?? '/' })),
    ],

    sidebar,

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    darkModeSwitchLabel: '主题',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
              modal: {
                noResultsText: '没有找到结果',
                resetButtonTitle: '清除条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
  },
})
