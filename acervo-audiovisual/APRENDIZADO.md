# Auto-aprendizado do motor (o ciclo que a rotina roda sozinha)

O motor aprende de duas fontes: **o que viraliza lá fora** (engenharia reversa) e **o que funciona com os nossos
clientes** (placar). Este arquivo é o roteiro da rotina diária na nuvem ("Acervo: virais do dia, estruturas novas e
placar", 06:41) e de qualquer sessão que queira ensinar o motor. Cada estrutura já é uma "skill" carregada sob demanda:
a página `ESTRUTURAS/S__.md`, aplicada pela skill `estrutura-video` em qualquer conteúdo e nicho.

## O ciclo (todo dia, na ordem)
1. **Placar primeiro.** Medir os Reels dos clientes com 7+ dias no ar (`client_scan` fonte `perfis`), uma linha por vídeo
   em `PLACAR-ESTRUTURAS.md` com o código do card. É o aprendizado que mais vale: é o nosso público.
2. **Caçar virais que ensinam algo novo** (2 por dia), nesta prioridade:
   1. Estrutura **sem exemplo real** (páginas com `evidencia: catálogo`): procurar um vídeo que a use.
   2. Estrutura com **evidência fraca** (1 ficha, ou só de passagem).
   3. Viral em **nicho de cliente** (`ESTRUTURAS/NICHOS.md`), de perfil que fala com cliente final, não com editores.
   4. Estrutura que **nenhum S descreve** (candidata a S-novo).
   Critério de viral: força de 3x ou mais a mediana do próprio perfil (ver `MAPA-ESTRUTURAS.md`). Fonte: perfis
   acompanhados em `perfis/`, salvos do Italo, busca pública. Nunca com login ou conta de cliente; post privado ou
   bloqueado fica para o Italo mandar o arquivo.
3. **Engenharia reversa.** Skill `engenharia-reversa-viral` → ficha em `virais/`, com o público do perfil anotado.
4. **Ensinar a página.** Na página do código:
   - linha nova em **Evidência** e, se a ficha mostrou um jeito novo, uma linha em **Variações vistas**;
   - página de catálogo que ganhou o primeiro vídeo real: tirar `evidencia: catálogo`, trocar as variações "possíveis"
     pelas vistas e revisar os blocos contra o vídeo;
   - se a ficha contradiz a gramática (um bloco que a página diz obrigatório e o viral não tem), anotar em "Dá errado
     quando" ou em Variações com o porquê; nunca apagar o que já tinha prova sem dizer por quê.
5. **Estrutura nova.** S-novo com **2 fichas** de perfis diferentes vira página nova (`ESTRUTURAS/_MODELO.md`), com o
   próximo número livre depois de S117 e o nome em `peformake-gestao/src/features/strategy/brief/estruturas.ts`.
   Com 1 ficha só, fica em "Candidatos a S-novo" no mapa.
6. **Rodar o mapa:** `python acervo-audiovisual/ferramentas/mapa_estruturas.py` (refaz mapa, compacto, equivalências,
   vídeos de cada página com link, força, viralizou e nota, e o resumo das funções de IA).
7. **Git no mesmo dia:** commit e push com o que mudou.
8. **Às segundas, relatório curto** em `acervo-audiovisual/relatorios/AAAA-MM-DD.md`: o que o placar ensinou (códigos
   que passaram para repetir, descansar ou evitar), páginas que ganharam o primeiro exemplo real, estruturas novas,
   e as 3 estruturas que o modo de escolha deve testar na semana. Sem números inventados.

## O que o motor NÃO aprende sozinho (passa pelo Italo)
- Mudar a gramática de uma estrutura com placar "repetir" só por causa de um viral de fora.
- Juntar ou apagar códigos (candidatos a juntar ficam anotados no relatório).
- Qualquer coisa que publique, poste ou mande mensagem.

## Sinais de que está aprendendo
- Menos páginas com `evidencia: catálogo` a cada mês.
- Placar com mais clientes e mais códigos com status (hoje: 1 cliente).
- A nota de referência média dos exemplos sobe (mais virais de negócio comum, menos de editores para editores).
