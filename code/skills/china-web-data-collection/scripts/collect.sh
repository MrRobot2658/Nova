#!/usr/bin/env bash
# china-web-data-collection 通用采集：打开页面 → 限速滚动 → 抽取结构化数据
# 用法: collect.sh <url> [scrolls=5] ['<返回 JSON.stringify(...) 的 JS>']
set -euo pipefail

bridge="${NOVA_BROWSER_BRIDGE:-}"
token="${NOVA_BROWSER_BRIDGE_TOKEN:-}"
if [ -f "$HOME/.nova/bridge.json" ]; then
  if [ -z "$bridge" ]; then
    port="$(grep -o '"port"[^0-9]*[0-9]\+' "$HOME/.nova/bridge.json" | grep -o '[0-9]\+' | head -1)"
    [ -n "$port" ] && bridge="http://127.0.0.1:$port"
  fi
  [ -z "$token" ] && token="$(grep -o '"token"[^"]*"[^"]*"' "$HOME/.nova/bridge.json" | sed -E 's/.*"token"[^"]*"([^"]*)".*/\1/')"
fi
[ -z "$bridge" ] && { echo '{"ok":false,"error":"Nova 浏览器桥未运行：请先启动 Nova 桌面端"}'; exit 1; }

json_str() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }
post() { curl -s -X POST "$bridge/browser" -H 'content-type: application/json' -H "x-nova-token: $token" -d "$1"; }

url="${1:?需要 url}"
scrolls="${2:-5}"
js="${3:-document.body.innerText}"

post "$(printf '{"action":"navigate","url":%s}' "$(json_str "$url")")" >/dev/null
for _ in $(seq 1 "$scrolls"); do
  post '{"action":"scrollBottom"}' >/dev/null
  sleep 1.5   # 限速，降低被风控概率
done
post "$(printf '{"action":"eval","js":%s}' "$(json_str "$js")")"
