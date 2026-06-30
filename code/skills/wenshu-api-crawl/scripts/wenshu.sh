#!/usr/bin/env bash
# wenshu-api-crawl — 裁判文书网采集（走 Nova 内置浏览器桥）
# 用法: wenshu.sh {open|check|extract|next}
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

WENSHU="https://wenshu.court.gov.cn"

# 抽取当前结果页的案件列表（选择器随改版调整）
EXTRACT_JS='JSON.stringify(
  [...document.querySelectorAll(".LM_list .list_item, .result-list .item, .ws-list .item, [class*=docList] [class*=item]")]
    .slice(0,30).map(function(el){
      var a = el.querySelector("a");
      var t = (el.querySelector(".caseName, .title, h4, a")||{}).innerText||"";
      var court = (el.querySelector(".court, [class*=court]")||{}).innerText||"";
      var date = (el.querySelector(".date, [class*=date], time")||{}).innerText||"";
      return { title:(t||"").trim(), court:(court||"").trim(), date:(date||"").trim(), link:a?a.href:"" };
    }).filter(function(x){return x.title})
)'

case "${1:-}" in
  open)
    post "$(printf '{"action":"navigate","url":%s}' "$(json_str "$WENSHU")")"
    echo
    echo "→ 请在 Nova 右侧浏览器里登录并完成滑块验证，输入检索条件后点检索，然后继续。" >&2
    ;;
  check)
    post "$(printf '{"action":"eval","js":%s}' "$(json_str 'JSON.stringify({ url:location.href, needLogin: /login|登录/i.test(document.body.innerText.slice(0,400)), needVerify: /验证|滑块|captcha|slide/i.test(document.body.innerText.slice(0,400)) })')")"
    ;;
  extract)
    post "$(printf '{"action":"eval","js":%s}' "$(json_str "$EXTRACT_JS")")"
    ;;
  next)
    post "$(printf '{"action":"eval","js":%s}' "$(json_str 'var n=document.querySelector(".next, .pageNext, [class*=next]"); if(n){n.click();} JSON.stringify({clicked:!!n})')")"
    sleep 2
    ;;
  *)
    echo "usage: wenshu.sh {open|check|extract|next}"; exit 2 ;;
esac
