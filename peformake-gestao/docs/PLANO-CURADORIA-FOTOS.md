# Curadoria de fotos (Ellcazo)

Mais uma fonte de receita do audiovisual: o cliente escolhe as fotos, paga as extras pelo sistema e baixa em boa resolução.

## Fluxo
1. **Audiovisual → Fotos → Nova galeria**: cliente, nome e quantas fotos estão incluídas no pacote. O preço da foto extra vem de Configurações → Orçamento → Fotos. Cliente **parceiro** ganha o desconto sozinho (mesmo do contrato de 5 meses, hoje 15%).
2. **Subir fotos**: o navegador gera a **prévia leve com marca d'água** (até 1.400 px) e envia junto a **foto original em boa resolução**, que fica escondida.
3. **Enviar galeria**: WhatsApp, e-mail ou link (você confere antes de mandar).
4. **Cliente escolhe** pelo link `/galeria/...`: coração em cada foto, barra "X de N incluídas · extras × R$ = total".
5. **Pagamento**: com extras, gera a cobrança no **Asaas** (Pix, boleto ou cartão). Sem CPF/CNPJ no cadastro, a página pede na hora. Sem extras, libera na hora.
6. **Download**: pago, a página libera as fotos escolhidas em boa resolução (links temporários) e o link do Drive, se houver. A equipe é avisada.

## Armazenamento: Cloudflare R2 (estrutura pronta, falta ligar)
- 10 GB grátis/mês e **download grátis**. Arquivos sob uma chave aleatória por galeria; links assinados que expiram.
- Para ligar: criar conta Cloudflare → R2 → bucket (ex.: `ellcazo-fotos`) → **API token do R2** (Object Read & Write) e colar no Supabase (Edge Functions → Secrets): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
- No bucket: **CORS** permitindo `PUT` e `GET` de `https://peformake-gestao.vercel.app` (cabeçalho `Content-Type`), e **regra de ciclo de vida** apagando objetos depois de 30 dias (ou o prazo que preferir).
- Enquanto não liga, a aba Fotos avisa e as galerias podem ser criadas, mas o envio das fotos fica parado.

## Peças
- Banco: `photo_galleries`, `photo_gallery_items`, `gallery_create`, `gallery_public`, `gallery_select`, gatilho de fatura paga, `clients.is_partner`, `client_set_partner`, `partner_discount_pct`.
- Função: `gallery-storage` (status, upload, team_view, view, download, pay).
- Telas: `AvPhotosPage` (lista e galeria da equipe), `PublicGalleryPage` (cliente).
