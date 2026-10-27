# some-docs

调研与文档集合，使用 [VitePress](https://vitepress.dev/) 构建为静态站点，发布在 GitHub Pages。

- 线上地址：<https://jammyjian.github.io/some-docs/>
- 仓库地址：<https://github.com/jammyjian/some-docs>

## 环境要求

- Node.js >= 18（本项目在 Node 22 下验证通过）
- 推送 `gh-pages` 分支需要已配置好的 GitHub 凭据（SSH key 或 token）

## 目录结构

```
some-docs/
├─ docs/                          # Markdown 源目录（文件、目录都可以用中文命名）
│  ├─ index.md                    # 首页
│  ├─ any/                        # 调研文档
│  │  └─ 重庆OPC社区调研.md
│  ├─ electrician/                # 低压电工考证学习文档
│  │  └─ low-voltage electrician/ # 目录名同样支持中文/空格，构建时自动转拼音
│  │     ├─ README.md             # 课程首页（H1 为「低压电工考证学习文档」）
│  │     └─ 01-Chapter 1-安全生产法律法规/
│  │        ├─ README.md          # 章节页（H1 会作为侧边栏章节标题）
│  │        └─ 1.1-安全生产法律法规体系.md
│  └─ .vitepress/
│     ├─ config.mts               # 站点配置：base、导航、侧边栏
│     ├─ url-map.json             # 自动生成的「源文件 → 拼音 URL」映射（需提交）
│     ├─ src/                     # 预处理产物：中文文件名转成拼音名（已忽略）
│     ├─ cache/                   # 构建缓存（已忽略）
│     └─ dist/                    # 构建产物（已忽略）
├─ scripts/
│  ├─ prepare.mjs                 # 预处理：中文文件名转拼音 slug，登记侧边栏信息
│  ├─ dev.mjs                     # 本地开发：prepare + vitepress dev + 监听源文件
│  └─ publish.sh                  # 发布：构建 + 推送 gh-pages
├─ package.json
└─ package-lock.json
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run docs:prepare` | 执行预处理（中文文件名 → 拼音 slug），生成 `url-map.json` |
| `npm run docs:dev` | 本地开发服务器，自动预处理并监听源文件变更 |
| `npm run docs:build` | 预处理 + 构建静态站点到 `docs/.vitepress/dist/` |
| `npm run docs:preview` | 本地预览构建产物 |
| `npm run docs:publish` | 构建并发布到 GitHub Pages（见下文） |

## 本地开发

```bash
npm install
npm run docs:dev
```

打开 <http://localhost:5173/some-docs/>。`docs:dev` 会先执行一次预处理，然后启动 VitePress 开发服务器，并监听 `docs/` 下的 Markdown 变更，保存后自动重新预处理。

## 新增文档

1. 在 `docs/` 下任意目录新建 Markdown 文件，**直接用中文命名**，标题写在 `# H1`：

   ```markdown
   # 成都 AI 社区调研

   > 调研日期：2026-10-27

   正文……
   ```

2. 保存。侧边栏标题和 URL **自动生成，无需手工登记**。

**URL 规则：**

- 文件名和**目录名**都会由 `prepare.mjs` 转成拼音 slug，例如 `成都AI社区调研.md` → `/any/cheng-du-ai-she-qu-diao-yan`，目录 `low-voltage electrician` → `low-voltage-electrician`。
- **正文链接自动改写**：文档里可以放心写中文文件名的链接——同目录/子目录的相对链接（`](13.1-xxx.md)`、`](01-Chapter 1-xxx/README.md)`）以及绝对源路由（`/any/成都AI社区调研.md`）都会在构建时改写成 slug 路由。
- 想自定义 URL，编辑 `docs/.vitepress/url-map.json` 中对应条目的 `slug` 字段后重新构建即可。
- 已登记过的文件会复用原 slug，URL 不会因构建而变动。
- 如果以后重命名了中文文件名，slug 会重新生成，旧 URL 将失效。

**侧边栏结构：** 按源目录树自动生成。顶层目录作为一组（如 `any` →「调研」、`electrician` →「低压电工考证」）；目录内的 `README.md` 作为该目录的标题与入口，章节可嵌套课时。首页顶部入口按钮指向 `docs/electrician/low-voltage electrician/README.md`，在 `docs/index.md` 的 `hero.actions` 里维护。

## 发布流程

### 分支模型

仓库使用两条分支，职责严格分开：

| 分支 | 内容 | 谁维护 |
|---|---|---|
| `master` | 源码：Markdown、`config.mts`、脚本、`url-map.json` | 手工提交 |
| `gh-pages` | 构建产物：HTML、JS、CSS、字体 | `scripts/publish.sh` 自动生成，**不要手动修改** |

GitHub Pages 不会执行 VitePress 构建，只能提供静态文件或运行 Jekyll，因此产物必须在本地构建好，再放到 `gh-pages` 分支。产物不放进 `master`，是为了避免每次构建产生的哈希文件名污染源码历史、撑大仓库。

### 发布步骤

```bash
# 1. 提交源码（必须，否则线上与仓库源码不一致，最后更新时间也不准）
git add docs scripts package.json package-lock.json README.md .gitignore
git commit -m "docs: 新增成都 AI 社区调研"
git push

# 2. 构建并发布
npm run docs:publish

# 3. 等待约 1 分钟，访问 https://jammyjian.github.io/some-docs/
```

`npm run docs:publish` 会先执行预处理再构建，把产物强推到 `gh-pages`。注意它**只发布站点，不提交源码**，所以第 1 步不能省略。

`docs/.vitepress/url-map.json` 由脚本生成，但建议提交到 `master`，让 URL 映射稳定、可追踪；`src/`、`cache/`、`dist/` 均已被 `.gitignore` 忽略。

### 发布脚本做了什么

`npm run docs:publish` 执行的是 `scripts/publish.sh`（`package.json` 中定义），流程如下：

1. 运行 `npm run docs:build`（即 `prepare.mjs` 预处理 + `vitepress build`），产物输出到 `docs/.vitepress/dist/`。
2. 检查 `dist/index.html` 是否存在，防止空构建被误发布。
3. 用 `mktemp -d` 建一个临时目录，把产物复制进去，并写入 `.nojekyll`（让 GitHub Pages 跳过 Jekyll 处理）。
4. 在临时目录里 `git init -b gh-pages`，把产物提交为**一个全新的单提交**。
5. `git push -f origin gh-pages` 强制覆盖远端 `gh-pages` 分支。

因为临时仓库与远端分支没有共同历史，所以必须使用 `-f`。这也意味着远端 `gh-pages` 始终只有一个提交，发布历史不会累积；同时也意味着任何手动改动都会被下一次发布覆盖。

脚本对当前工作区没有任何副作用：不改工作区、不写本地索引、不提交源码。

### 首次配置 GitHub Pages

仓库已完成过一次发布（`gh-pages` 分支存在），只需在网页上开启 Pages：

1. 打开仓库 **Settings → Pages**。
2. **Source** 选择 `Deploy from a branch`。
3. **Branch** 选择 `gh-pages`，目录选择 `/ (root)`。
4. 保存后等待 1–2 分钟，访问 <https://jammyjian.github.io/some-docs/>。

### 注意事项

- **不要手改 `gh-pages`**：该分支由脚本生成，每次发布都会强推覆盖。
- **`base` 路径**：`config.mts` 中是 `base: '/some-docs/'`，与仓库名一致。如果重命名仓库或绑定自定义域名，需要同步修改，否则 CSS 和链接会 404。
- **最后更新时间**：取源文件的 git 提交时间；未提交的文件退回用文件修改时间，所以先提交再发布更准确。
- **搜索**：使用 VitePress 内置本地搜索，对英文词（OPC、AI 等）有效，中文分词支持有限。
- **发布失败**：构建报错或推送失败时脚本会中断，远端保持上一次的版本，修复后重新执行即可。
