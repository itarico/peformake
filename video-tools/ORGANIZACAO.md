# Organização de pastas — padrão do Italo (Ellcazo/Performake)

Raiz: `D:\ELLCAZO\JOBS\<ANO>\<MÊS>\<CLIENTE>\`
- Mês com 3 letras maiúsculas: JAN FEV MAR ABR MAI JUN JUL AGO SET OUT NOV DEZ.
- O cliente fica no mês em que o trabalho foi **feito/gravado** (ex.: 3LM gravado em 05/11 → NOV).
- Tudo no HD D: (o SSD C: fica livre).

## Dentro de cada cliente
**Só crie a subpasta se houver algo para colocar nela** (nada de pasta vazia). Os nomes abaixo são a sugestão
padrão; pode adaptar ao conteúdo do cliente (ex.: `ENTREVISTAS`, `EVENTO BAIRRO 1`), mantendo a lógica
mês → cliente → tipo de material.
```
D:\ELLCAZO\JOBS\2026\NOV\<CLIENTE>\
├── BRUTOS\          vídeos originais da câmera (somente leitura; nunca editar)
├── FOTOS\           fotos (RAW/ARW e JPG) do cliente
├── MUSICAS\         trilhas e SFX usados (com LICENCAS.txt: faixa, artista, fonte, licença)
├── ARQUIVOS\        logos, roteiros, briefs, referências, material baixado do Drive (APOIO_DRIVE)
├── PROJETOS\        tudo que é editável
│   ├── <cliente>.prproj / *.xml (projeto Premiere)
│   ├── MOTION\      animações separadas (ProRes 4444 alpha)
│   ├── ESTABILIZADOS\  cenas de apoio tratadas (mídia usada pelo XML)
│   └── TRABALHO\    decupagem, transcrições, frames, scripts, logs, relatórios internos
└── VIDEOS PRONTOS\  MP4 finais + .srt + capas + RELATORIO.md
```

## Regras ao mover
- Mesmo disco (D:→D:): mover/renomear (instantâneo). De C: para D:: `robocopy /E`, conferir contagem e bytes, só então apagar a origem.
- Depois de mover, **regerar os XML** com os caminhos novos (`--caminho-pc` / `--midia`) e conferir que nenhum caminho antigo sobrou (`grep -r` no XML).
- Não mover nada enquanto um render/transcrição estiver lendo a pasta.
- Atualizar `video-tools/clientes/<cliente>.md` com o caminho novo.
