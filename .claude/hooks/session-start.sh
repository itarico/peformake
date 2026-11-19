#!/bin/bash
# Ao abrir qualquer sessão (PC, nuvem ou celular pelo Controle Remoto):
# 1) traz o que as outras sessões enviaram ao GitHub;
# 2) mostra ao Claude o topo do diário, para ele começar sabendo o que já foi feito.
# Nunca trava a sessão: qualquer falha só vira um aviso.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
BRANCH=claude/performig-app-data-hxl4zh
DIARIO=peformake-gestao/docs/rotina-diario.md
BASTAO=peformake-gestao/docs/EM-ANDAMENTO.md

echo "== Sincronização automática (início da sessão) =="
atual=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$atual" != "$BRANCH" ]; then
  echo "Aviso: a pasta está na branch '$atual', não em $BRANCH. Não puxei nada."
elif ! out=$(GIT_TERMINAL_PROMPT=0 timeout 40 git pull --ff-only -q origin "$BRANCH" 2>&1); then
  echo "Aviso: o git pull automático não deu certo (sem internet ou mudanças locais não enviadas). Rode git pull antes de mexer no código."
  echo "$out" | tail -3
else
  echo "Código atualizado com o GitHub: $(git log -1 --format='%h %s' 2>/dev/null)"
fi
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "Atenção: há mudanças nesta máquina que ainda não foram enviadas ao GitHub."
fi

if [ -f "$BASTAO" ]; then
  echo
  echo "== EM ANDAMENTO (passagem de bastão entre PC e nuvem: $BASTAO) =="
  cut -c1-900 "$BASTAO" | head -60
fi

if [ -f "$DIARIO" ]; then
  echo
  echo "== Últimas entradas do diário ($DIARIO) =="
  # linhas soltas do topo (antes do primeiro "## ") (as 6 mais novas) e a última seção
  awk '/^## /{n++} n==0 && /^- / && c++<6 {print} n==1' "$DIARIO" | cut -c1-500 | head -30
fi
exit 0
