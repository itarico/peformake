#!/bin/bash
# Liga o Claude Code ao Premiere Pro e ao After Effects neste Mac (Apple Silicon).
# Roda uma vez:  bash instalar-mac.sh
# Não pede senha de administrador: tudo fica na pasta do usuário.
#   1. Node.js LTS oficial (nodejs.org, com conferência do código de verificação) em ~/.local/node
#   2. MCP do Premiere: adobe-premiere-pro-mcp (o mesmo do PC de edição) + painel "MCP Bridge (CEP)"
#   3. MCP do After Effects: @kumoproductions/mcp-aftereffects (MIT, macOS)
#   4. Registra os dois no Claude Code (~/.claude.json, escopo do usuário), telemetria desligada
set -euo pipefail

NODE_DIR="$HOME/.local/node"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== 1/4 Node.js"
if [ -x "$NODE_DIR/bin/node" ] && [ "$("$NODE_DIR/bin/node" -p 'process.versions.node.split(".")[0]')" -ge 24 ]; then
  echo "Node já instalado: $("$NODE_DIR/bin/node" -v)"
else
  V=$(curl -fsSL https://nodejs.org/dist/index.json | /usr/bin/python3 -I -c \
    "import json,sys;print([x['version'] for x in json.load(sys.stdin) if x['lts'] and int(x['version'][1:].split('.')[0])>=24][0])")
  F="node-$V-darwin-arm64.tar.gz"
  echo "Baixando $F de nodejs.org"
  (cd "$TMP" && curl -fsSLO "https://nodejs.org/dist/$V/$F" && curl -fsSLO "https://nodejs.org/dist/$V/SHASUMS256.txt" \
    && grep " $F\$" SHASUMS256.txt | shasum -a 256 -c -)
  mkdir -p "$HOME/.local"
  tar -xzf "$TMP/$F" -C "$HOME/.local"
  ln -sfn "$HOME/.local/node-$V-darwin-arm64" "$NODE_DIR"
fi
grep -q '.local/node/bin' "$HOME/.zprofile" 2>/dev/null || echo 'export PATH="$HOME/.local/node/bin:$PATH"' >> "$HOME/.zprofile"
export PATH="$NODE_DIR/bin:$PATH"
node -v

echo "== 2/4 MCP do Premiere"
npm install -g adobe-premiere-pro-mcp
premiere-pro-mcp --install-cep || true
premiere-pro-mcp --doctor || true

echo "== 3/4 MCP do After Effects"
npm install -g @kumoproductions/mcp-aftereffects

echo "== 4/4 Registrando no Claude Code"
/usr/bin/python3 -I - "$NODE_DIR/bin" <<'PY'
import json, os, sys
bindir = sys.argv[1]
p = os.path.expanduser("~/.claude.json")
d = json.load(open(p)) if os.path.exists(p) else {}
env = {"PATH": f"{bindir}:/usr/bin:/bin:/usr/sbin:/sbin"}
s = d.setdefault("mcpServers", {})
s["premiere-pro"] = {"type": "stdio", "command": f"{bindir}/premiere-pro-mcp", "args": [],
                     "env": {**env, "PREMIERE_MCP_TELEMETRY": "0"}}
import glob
ae = sorted(a for a in glob.glob('/Applications/Adobe After Effects */Adobe After Effects *.app') if 'Render Engine' not in a)
aenv = {**env, **({'AE_MCP_EXE': ae[-1]} if ae else {})}
s["aftereffects"] = {"type": "stdio", "command": f"{bindir}/mcp-aftereffects", "args": [], "env": aenv}
if not os.path.exists(s["aftereffects"]["command"]):
    s["aftereffects"] = {"type": "stdio", "command": f"{bindir}/npx",
                         "args": ["-y", "@kumoproductions/mcp-aftereffects"], "env": env}
json.dump(d, open(p, "w"), indent=2)
print("ok:", ", ".join(s))
PY

cat <<'TXT'

Pronto. Falta só a parte que é clicando:
 PREMIERE  1. Feche e abra o Premiere.  2. Janela > Extensões > MCP Bridge (CEP).
           3. Confirme a pasta da ponte que o instalador mostrou acima e clique em Start (bolinha verde).
 AFTER     1. Abra o After.  2. Configurações > Scripts e Expressões > ligar
              "Permitir que scripts gravem arquivos e acessem a rede".
           3. Se o Mac perguntar, permita o Claude controlar o After (Ajustes > Privacidade > Automação).
 CLAUDE    Abra uma sessão NOVA do Claude Code e peça: "testa a conexão com o Premiere e o After".
TXT
