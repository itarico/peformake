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
