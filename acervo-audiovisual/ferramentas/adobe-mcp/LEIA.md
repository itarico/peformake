# Claude ligado ao Premiere e ao After Effects (MCP)

Instalação no Mac (28/11/2026): `bash acervo-audiovisual/ferramentas/adobe-mcp/instalar-mac.sh` (uma vez, sem senha de admin).

| Programa | MCP | Como conversa | Teste |
|---|---|---|---|
| Premiere Pro | `adobe-premiere-pro-mcp` (hetpatel-11, MIT; o mesmo do PC de edição) | painel `Janela > Extensões > MCP Bridge (CEP)` ligado (Start) | `verify_premiere_connection` |
| After Effects | `@kumoproductions/mcp-aftereffects` (MIT, Win e Mac, Node 24+) | sem painel; ligar "Permitir que scripts gravem arquivos e acessem a rede" | pedir para listar as composições do projeto aberto |

- Os dois ficam em `~/.claude.json` (escopo do usuário), telemetria do Premiere desligada.
- After: código ExtendScript livre fica **desligado** por padrão (`AE_MCP_ENABLE_EVAL`); modo só leitura: `AE_MCP_READONLY=1`.
- Premiere: dicas de uso real em `../openmotion/APRENDIZADOS.md` (importar em lote, ~130 clipes por chamada, reabrir a ponte).
- No PC Windows o Premiere já estava instalado; o After por MCP foi revisado em 07/11 e ficou de fora (decisão antiga). No Mac o Italo pediu os dois (28/11).

## Testado no Mac em 28/11/2026: os dois conectados
- Premiere 27.0 (build 88): `verify_premiere_connection` = connected, bridge responsive. After 27.0x78: `ae_version_info` ok (saveFrameToPng, socket).
- **Premiere:** o conector só acha o painel com `PREMIERE_TEMP_DIR=/tmp/premiere-mcp-bridge` no env (sem isso cria pasta própria e diz "bridge_unavailable" mesmo com o painel ligado). O painel não abre sozinho: abrir um projeto, depois Janela > Extensões > MCP Bridge (CEP) > Start Bridge.
- **After 2027:** o conector só procura até 2026; precisa de `AE_MCP_EXE` apontando o .app (o instalador acha sozinho, ignorando o Render Engine).
- Apontar os comandos para a pasta real do Node (`~/.local/node-vXX-darwin-arm64/bin`), não para o atalho `~/.local/node`: outro instalador trocou o atalho por uma cópia limpa e os conectores sumiram dele.
- Configuração do Claude só é lida ao abrir sessão: mudou `~/.claude.json`, abrir sessão nova.
