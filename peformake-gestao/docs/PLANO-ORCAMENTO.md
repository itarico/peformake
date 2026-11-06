# Orçamento editável (Ellcazo)

Estudo e entrega de 06/11/2026. Objetivo: montar e adaptar orçamento sem depender de programador. Nada de valor ou regra fixo no código.

## Como ficou: três camadas, tudo em Configurações → Orçamento

| Camada | O que é | O que dá para fazer |
|---|---|---|
| **Variáveis da conta** | A conta central: pessoas × horas × valor da hora; edição e roteiro por vídeo; edição no mesmo dia (%); sinal e validade | Editar em pop-up, por grupo |
| **Formas de montar** | Câmera, Mobile, Evento, Só serviços | Ligar e desligar |
| **Serviços por categoria** | Pacotes prontos (Planos mensais, Eventos e lives, Institucional e projetos, Diárias e captações, Serviços mensais), Adicionais (drone, fotos, brutos, apresentadora, cortes, motion, live) e Deslocamento | Criar, editar, apagar e ligar/desligar a categoria ou o serviço; preço e unidade de cobrança (unidade, hora, vídeo, captação, diária, mês, pacote, projeto) |
| **Regras de preço** | Acréscimo ou desconto, em % ou R$, sobre o total ou só sobre as horas de captação; opcional (marca no orçamento) ou sempre; valor mínimo para valer | Criar, editar, apagar e ligar/desligar |

Já vêm cadastradas com os valores de hoje: Final de semana +10% e Noturno +15% (sobre as horas), Plano com contrato de 5 meses −15% e Plano sem contrato +20% (sobre o total).

## Na hora de montar
1. Escolhe a forma (câmera, mobile, evento ou só serviços), pessoas, **auxiliares** (em qualquer captação), horas e vídeos.
2. Adiciona serviços com **+ e −**, filtrando por categoria. Os pacotes prontos ficam aqui.
3. Toca nas regras que valem (fim de semana, contrato...). As regras "sempre" entram sozinhas.
4. O resumo e a prévia do cliente atualizam na hora.

## Decisões
- Os pacotes prontos saíram do catálogo de serviços dos clientes e viraram **modelos do orçamento**. O catálogo dos clientes (contratos, cobrança) não mudou.
- Orçamentos já salvos **não mudam** quando um valor muda. Ao reabrir um orçamento antigo, os campos fixos de antes viram serviços e regras, com o mesmo total.
- Apagar categoria apaga os serviços dela. Para só esconder, use desligar.

## Ideias para depois
- Pacote que já preenche a montagem (ex.: Evento Padrão = 2 operadores, 4h, 3 vídeos) em vez de preço fechado.
- Regra por tipo de cliente (recorrente ganha desconto) e por quantidade (a partir de 10 vídeos, −10%).
- Mesmo modelo para orçamento da Peformake (tráfego, social media).
