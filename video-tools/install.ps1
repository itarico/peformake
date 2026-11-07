# Instala as ferramentas de vídeo da Performake no Windows.
# Rode no PowerShell, a partir da pasta do repositório:
#   powershell -ExecutionPolicy Bypass -File video-tools\install.ps1
# Instala (via winget) o que faltar: Python 3.12, Node.js LTS e FFmpeg (build completo, com vid.stab).
# O ambiente Python fica em %USERPROFILE%\.video-venv (o atalho video-tools/bin/vpy encontra ele sozinho).

# "Continue": no Windows PowerShell 5.1, "Stop" transforma avisos de programas externos em erro fatal.
# Os erros reais são checados com $LASTEXITCODE e throw.
$ErrorActionPreference = "Continue"
$Dir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Venv = if ($env:VIDEO_VENV) { $env:VIDEO_VENV } else { Join-Path $env:USERPROFILE ".video-venv" }

function Atualizar-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path", "User")
}

function Garantir($comando, $idWinget, $nome) {
  if (Get-Command $comando -ErrorAction SilentlyContinue) { Write-Host "OK  $nome"; return }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "$nome não encontrado e o winget não está disponível. Instale $nome manualmente e rode de novo."
  }
  Write-Host "Instalando $nome..."
  winget install --id $idWinget -e --accept-source-agreements --accept-package-agreements --silent
  Atualizar-Path
  if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) {
    throw "$nome foi instalado, mas ainda não está no PATH. Feche e abra o PowerShell e rode de novo."
  }
}

# 1. Programas
Garantir "node"   "OpenJS.NodeJS.LTS" "Node.js"
Garantir "ffmpeg" "Gyan.FFmpeg"       "FFmpeg"

# Python: usa o launcher "py" (evita o atalho falso da Microsoft Store)
$Py = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
  foreach ($v in "3.12", "3.13", "3.11", "3.10") {
    & py "-$v" -c "import sys" 2>$null
    if ($LASTEXITCODE -eq 0) { $Py = @("py", "-$v"); break }
  }
}
if (-not $Py) {
  Write-Host "Instalando Python 3.12..."
  winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements --silent
  Atualizar-Path
  $Py = @("py", "-3.12")
}
Write-Host "OK  Python ($($Py -join ' '))"

$filtros = (& ffmpeg -hide_banner -filters 2>$null) -join "`n"
if ($filtros -notmatch "vidstabdetect") {
  Write-Warning "Este FFmpeg não tem vid.stab (estabilização). Instale o build completo: winget install Gyan.FFmpeg"
}

# 2. Ambiente Python
$PyVenv = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path $PyVenv)) {
  Write-Host "Criando ambiente Python em $Venv..."
  & $Py[0] $Py[1] -m venv $Venv
}
& $PyVenv -m pip install -q --upgrade pip
& $PyVenv -m pip install -q -r (Join-Path $Dir "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar os pacotes Python." }

# 3. Remotion
Push-Location (Join-Path $Dir "remotion")
npm install --no-audit --no-fund --silent
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Falha no npm install do Remotion." }
Pop-Location

# 4. Conferência
& $PyVenv -c "import faster_whisper, scenedetect, cv2, rembg, openpyxl; print('Pacotes Python OK')"
if ($LASTEXITCODE -ne 0) { throw "Algum pacote Python não carregou." }
Write-Host ""
Write-Host "Ferramentas de vídeo instaladas. Python: $PyVenv"
Write-Host "No Claude Code, peça por exemplo: 'edita os vídeos da Disalp em C:\Users\intal\Desktop\DISALP'"
