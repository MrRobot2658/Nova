# Nova Windows 一键安装器
# 用法: powershell -ExecutionPolicy Bypass -File install-windows.ps1
# 打包为 .exe: 使用 PS2EXE 或 iexpress

Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Nova — AI 办公自动化平台 安装器" -ForegroundColor Cyan
Write-Host "  Windows .exe  |  macOS .dmg 双平台支持" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 检测 WSL2 ──
$wsl = wsl --status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 未检测到 WSL2，正在安装..." -ForegroundColor Yellow
    wsl --install -d Ubuntu-22.04
    Write-Host "⚠️  安装 WSL2 后需重启电脑，重启后重新运行本安装器" -ForegroundColor Yellow
    Read-Host "按 Enter 重启"
    Restart-Computer -Force
    exit
}
Write-Host "✅ WSL2 已就绪" -ForegroundColor Green

# ── 在 WSL 中安装 Hermes ──
Write-Host ""
Write-Host "📦 安装 Hermes Agent (WSL2 内)..." -ForegroundColor Yellow
wsl bash -c '
    if [ ! -d "$HOME/.hermes" ]; then
        curl -fsSL https://get.hermes-agent.nousresearch.com | bash
    fi
'
Write-Host "✅ Hermes Agent 已安装" -ForegroundColor Green

# ── 复制 Nova 到 WSL ──
Write-Host ""
Write-Host "📦 部署 Nova Skills..." -ForegroundColor Yellow
# 脚本位于 code/scripts/，install.sh 在上一级 code/ 目录
$novaPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$wslNovaPath = wsl wslpath -a $novaPath
wsl bash -c "cd '$wslNovaPath' && bash install.sh"
Write-Host "✅ Nova Skills 已部署" -ForegroundColor Green

# ── 创建桌面快捷方式 ──
Write-Host ""
Write-Host "📦 创建桌面快捷方式..." -ForegroundColor Yellow

$shortcutPath = "$env:USERPROFILE\Desktop\Nova.lnk"
$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wsl.exe"
$shortcut.Arguments = "bash -c 'nova'"
$shortcut.WorkingDirectory = "%USERPROFILE%"
$shortcut.IconLocation = "shell32.dll,13"
$shortcut.Description = "Nova — AI 办公自动化平台 | 自然语言驱动"
$shortcut.Save()

Write-Host "✅ 桌面快捷方式已创建" -ForegroundColor Green

# ── 完成 ──
Write-Host ""
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ Nova Windows 安装完成！" -ForegroundColor Green
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  快速开始:" -ForegroundColor White
Write-Host "    双击桌面 Nova 图标" -ForegroundColor White
Write-Host "    或 WSL 终端输入: nova `"帮我做XXX`"" -ForegroundColor White
Write-Host ""
Write-Host "  已激活 28 个 Skill:" -ForegroundColor White
Write-Host "    🏢 办公自动化 (13)  |  🕷️ 数据采集 (5)  |  ⚡ 自动化引擎 (4)  |  📤 内容发布 (2)" -ForegroundColor White
Write-Host ""
