#!/usr/bin/env bash
# 本地构建 VitePress 站点，并把产物强制推送到 gh-pages 分支。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run docs:build

DIST="$ROOT/docs/.vitepress/dist"
if [ ! -f "$DIST/index.html" ]; then
  echo "构建失败：找不到 $DIST/index.html" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

cp -R "$DIST"/. "$TMP"/
touch "$TMP/.nojekyll"

USER_NAME="$(git config user.name || true)"
USER_EMAIL="$(git config user.email || true)"
REMOTE="$(git remote get-url origin)"

cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="${USER_NAME:-deploy}" -c user.email="${USER_EMAIL:-deploy@localhost}" \
  commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git remote add origin "$REMOTE"
git push -f origin gh-pages

echo "已发布到 gh-pages 分支。"
