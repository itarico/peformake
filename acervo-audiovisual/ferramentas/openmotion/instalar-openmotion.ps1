# Instala o OpenMotion (nexu-io/openmotion) neste PC e conecta ao Claude Code.
# Uso (PowerShell): powershell -ExecutionPolicy Bypass -File instalar-openmotion.ps1
# Requisitos: git, Node.js >= 22.18 (ideal >= 24.15), ffmpeg no PATH, Google Chrome, Claude Code (comando `claude`).
# Depois de instalar, abra uma sessao NOVA do Claude Code: sessoes abertas antes nao enxergam o MCP novo.

$ErrorActionPreference = 'Stop'
$Base    = Join-Path $env:USERPROFILE '.claude\mcp'
$Repo    = Join-Path $Base 'openmotion'
$Data    = Join-Path $Base 'openmotion-data'
$Skills  = Join-Path $env:USERPROFILE '.claude\skills'
$Commit  = 'c3e1ecfb3df89b6b6e99cd028a7e339fa8223fa6'   # versao testada em 20/11/2026; use -Ultima para pegar a main

$Ultima = $args -contains '-Ultima'

foreach ($c in 'git','node','npm','ffmpeg','claude') {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { throw "Falta '$c' no PATH." }
}
Write-Host "Node $(node -v)"

New-Item -ItemType Directory -Force $Base, $Data, $Skills | Out-Null

if (-not (Test-Path (Join-Path $Repo '.git'))) {
  git -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false clone --single-branch --branch main https://github.com/nexu-io/openmotion.git $Repo
}
Push-Location $Repo
try {
  git -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false fetch origin main
  if ($Ultima) { git checkout --quiet origin/main } else { git checkout --quiet $Commit }
  npm ci --no-audit --no-fund
  npm run build:studio
} finally { Pop-Location }

# Skills do OpenMotion para o Claude Code
Get-ChildItem (Join-Path $Repo 'skills') -Directory | ForEach-Object {
  Copy-Item $_.FullName $Skills -Recurse -Force
}

# MCP no escopo do usuario (vale para todos os projetos)
$node = (Get-Command node).Source
$mcp  = Join-Path $Repo 'mcp.ts'
claude mcp remove openmotion -s user 2>$null | Out-Null
claude mcp add --scope user openmotion -e "MOTION_DATA_DIR=$Data" -- $node --experimental-strip-types $mcp
claude mcp get openmotion
Write-Host "Pronto. Abra uma sessao nova do Claude Code para usar o OpenMotion."
