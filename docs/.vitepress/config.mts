import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'

// prepare.mjs 生成的映射表：源路径 -> { slug, title, lastUpdated }
const MAP_PATH = path.join(process.cwd(), 'docs', '.vitepress', 'url-map.json')
type PageMap = Record<string, { slug: string; title: string; lastUpdated: number }>
const map: PageMap = fs.existsSync(MAP_PATH)
  ? JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')) as PageMap
  : {}

const docs = Object.entries(map)
  .filter(([key]) => key !== 'index.md')
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => {
    const dir = path.posix.dirname(key)
    const link = dir === '.' ? `/${value.slug}` : `/${dir}/${value.slug}`
    return { text: value.title, link }
  })

// 生成文件路径 -> lastUpdated，用于 transformPageData 覆盖 git 时间戳
const reverseMap = Object.fromEntries(
  Object.entries(map).map(([key, value]) => {
    const dir = path.posix.dirname(key)
    const rel = dir === '.' ? `${value.slug}.md` : `${dir}/${value.slug}.md`
    return [rel, value.lastUpdated]
  }),
)

export default defineConfig({
  lang: 'zh-CN',
  base: '/any-docs/',
  srcDir: '.vitepress/src',
  title: 'any-docs',
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
      ...docs.slice(0, 3).map((d) => ({ text: d.text, link: d.link })),
    ],

    sidebar: [
      {
        text: '调研',
        items: docs,
      },
    ],

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
