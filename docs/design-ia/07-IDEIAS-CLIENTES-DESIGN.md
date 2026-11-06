# Ideias de design: clientes com serviço de Design ativo

Base: banco `peformake-app` (06/11/2026), fichas dos clientes, sessões anteriores e os padrões em 06-DESIGNS-DE-SUCESSO.md.
Calendário de novembro: feriado de 20/11 (Consciência Negra), Black Friday em 27/11, aquecimento para o Natal.
Antes de produzir qualquer ideia: passar pelo checklist QA de 02-ERROS-E-REGRAS.md e confirmar preço, telefone e oferta com o Italo.

Legenda de formato: **F** = feed 1080×1350 · **C** = carrossel · **S** = story 1080×1920 · **R** = Reels · **A** = anúncio Meta

---

## 1. MF Máquinas (Camaragibe · 4 artes/mês)
Público: roçador, jardineiro, sitiante, síndico, gente de obra. Dor: serviço parado, diária perdida.
1. **C: "Sua roçadeira parou? Você perdeu R$ 150 hoje."** Conta da diária perdida, depois revisão, peças e coleta. Fita laranja ligando as telas.
2. **F/A Black Friday sem preto:** fundo creme, palavra gigante "BLACK" atrás da roçadeira recortada, com o preço em camada de texto.
3. **R estilo UGC:** cliente real (jardineiro) mostra o equipamento consertado e fala a cidade. Logo nos primeiros 2 s.
4. **S "Abre no feriado?"** com o horário de 20/11. Pendente: confirmar o horário com a MF.

## 2. Will Motos (motos e carros · 4/mês)
1. **F/A "Sua moto com 1ª parcela pra [mês]":** moto centralizada e grande, com o texto legível no celular. Gerar pelo sistema próprio (Satori), já com a moldura corrigida com o 9.
2. **R "Do sonho à chave":** cliente real retirando a moto, com o rosto e a fala dele.
3. **C "5 motos até R$ X de entrada"** puxado do estoque da OLX que o site já lê.
4. **A Black Friday:** promoção "capacete ou tanque cheio" (o vídeo já existe), reaproveitado como estático e carrossel de 3.

## 3. Restaurante do Vando (Camaragibe · 4/mês)
Proposta: "a família come de tudo pagando pouco, com promoção todo dia".
1. **C "Cardápio da semana": cada dia tem uma promoção.** Paleta quente, foto real do prato.
2. **F "Domingo em família por R$ X"**, com foto de mesa cheia (real, nunca gerada por IA).
3. **R UGC:** criança escolhendo entre pizza, chinês e peixe. Gancho: "Aqui ninguém briga pelo cardápio."
4. **S enquete "Hoje é pizza ou chinês?"** que leva ao WhatsApp de delivery.

## 4. SN Distribuidora (materiais hidráulicos · 4/mês)
1. **C técnico "3 erros de instalação hidráulica que custam caro na obra"**, voltado para engenheiros e construtoras.
2. **F produto herói:** tubo ou registro recortado, palavra gigante "SEM VAZAMENTO" por trás.
3. **A B2B "Orçamento para sua obra em 24 h"**, com a frota ou o estoque real ao fundo.
4. **R bastidores:** separação de pedido e entrega na obra.

## 5. Fuctura Soluções (prevenção de incêndio · 5/mês)
1. **C "Seu condomínio está regular com os Bombeiros?"** em checklist de 5 itens (AVCB, extintor, hidrante, sinalização, brigada).
2. **F alerta:** extintor real vencido com a data em destaque. "Vencido não apaga."
3. **R "Projeto à execução":** timelapse de uma obra real.
4. **A eventos de fim de ano:** "Vai fazer evento? Precisa de laudo", para organizadores.
5. **S quiz** "Qual extintor para qual fogo?", com resposta no story seguinte.

## 6. MB Centrífugas (manutenção industrial · 1/mês)
1. **C "Sinais de que sua centrífuga vai parar":** vibração, ruído e temperatura, mostrados como laudo técnico. Segue a linha visual industrial que já existe no Canva.

## 7. Disalp (food service, 42 anos · 1/mês)
1. **C/A "42 anos sem deixar sua cozinha parar"**, com a câmara fria e a frota reais. Público: compradores de restaurantes e hotéis para a alta de fim de ano.

## 8. Fornario (pizzaria premium · 2/mês)
1. **F/A experiência premium:** close na massa e no forno, tipografia serifada, muito respiro. "Sexta merece Fornario."
2. **C "Ceia diferente: encomende pizzas para o Natal"**, já abrindo a pré-venda de dezembro.

## 9. Brio Burguer (delivery artesanal · 1/mês)
1. **R/A "chega quente"**, estilo lo-fi: o motoboy entrega e o lanche é aberto na câmera. Público de 18 a 35 anos, tipografia grande e cor saturada.

## 10. Cajá Limão (Tardezinha Bar · 1/mês)
Avaliado como "muito ruim" na satisfação e sem nenhuma arte em outubro. **Prioridade de retenção.**
1. **F/S/A "Rodízio de petisco ilimitado por R$ 49,99":** a oferta é a arte inteira, com foto real da mesa cheia e dos amigos. Testar 3 versões (UGC, foto e texto grande) para atender o Andromeda.

## 11. APM: Colégio Militar do Recife (associação de pais · 5/mês)
1. **C "O que a APM fez por seu filho em 2026"**: retrospectiva com números reais.
2. **F convite** para o evento ou a formatura de fim de ano, sóbrio e institucional (verde-oliva, dourado, serifa).
3. **S "Associe-se para 2027"**, com os benefícios em 3 telas.
4. **F datas** de calendário escolar e férias.
5. **F agradecimento** aos professores e voluntários, com foto real.

## 12. Infinity Graff (3/mês) e 13. Natalia de Menudo (5/mês)
⚠️ **Sem ficha no sistema** (segmento, descrição, público e estilo vazios). Não dá para criar ideias sem inventar. **Próximo passo:** preencher a ficha (skill `diagnostico-cliente-agencia`) e o brand kit antes de produzir.

---

## Ações transversais
- **Brand kit de cada cliente** no Canva e no campo `brand_style` do banco. Hoje os 13 estão vazios.
- Para cada cliente com anúncio: de 8 a 12 criativos diferentes por conjunto (UGC, demo, depoimento, texto, lifestyle).
- Preço, telefone e endereço sempre como camada de texto. A IA só gera imagem quando não houver foto real.
