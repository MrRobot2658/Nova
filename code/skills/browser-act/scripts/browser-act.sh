#!/usr/bin/env bash
# browser-act — 通过 Nova 内置浏览器自动化桥控制右侧 webview
# 用法：
#   browser-act.sh navigate <url>
#   browser-act.sh read <url>        # navigate + text
#   browser-act.sh text | html | info | scroll | screenshot
#   browser-act.sh eval '<js>'
set -euo pipefail

# 解析桥地址与 token：优先环境变量，其次 ~/.nova/bridge.json
bridge="${NOVA_BROWSER_BRIDGE:-}"
token="${NOVA_BROWSER_BRIDGE_TOKEN:-}"
if [ -f "$HOME/.nova/bridge.json" ]; then
  if [ -z "$bridge" ]; then
    port="$(grep -o '"port"[^0-9]*[0-9]\+' "$HOME/.nova/bridge.json" | grep -o '[0-9]\+' | head -1)"
    [ -n "$port" ] && bridge="http://127.0.0.1:$port"
  fi
  [ -z "$token" ] && token="$(grep -o '"token"[^"]*"[^"]*"' "$HOME/.nova/bridge.json" | sed -E 's/.*"token"[^"]*"([^"]*)".*/\1/')"
fi
if [ -z "$bridge" ]; then
  echo '{"ok":false,"error":"Nova 浏览器桥未运行：请先启动 Nova 桌面端"}'
  exit 1
fi

# 安全 JSON 字符串编码（处理引号/换行）
json_str() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }
post() { curl -s -X POST "$bridge/browser" -H 'content-type: application/json' -H "x-nova-token: $token" -d "$1"; }

cmd="${1:-}"; shift || true
case "$cmd" in
  navigate)   post "$(printf '{"action":"navigate","url":%s}' "$(json_str "${1:?需要 url}")")" ;;
  read)       post "$(printf '{"action":"navigate","url":%s}' "$(json_str "${1:?需要 url}")")" >/dev/null; post '{"action":"text"}' ;;
  text)       post '{"action":"text"}' ;;
  html)       post '{"action":"html"}' ;;
  info)       post '{"action":"info"}' ;;
  eval)       post "$(printf '{"action":"eval","js":%s}' "$(json_str "${1:?需要 js}")")" ;;
  scroll)     post '{"action":"scrollBottom"}' ;;
  screenshot) post '{"action":"screenshot"}' ;;
  *) echo "usage: browser-act.sh {navigate <url>|read <url>|text|html|info|eval <js>|scroll|screenshot}"; exit 2 ;;
esac
