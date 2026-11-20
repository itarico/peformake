# Nichos: o motor serve para qualquer um

As páginas `S__.md` trazem 4 exemplos de tipo de negócio só para mostrar a mecânica em uso. **Qualquer nicho entra**:
esta tabela dá o ponto de partida de cada um (o que costuma ter para gravar, se é regulado, as estruturas que costumam
render e o cuidado). É um palpite inicial; a ficha de entrada do cliente (`FICHA-ENTRADA.md`) e o placar mandam mais.
Nicho que não está aqui: escolha o mais parecido e anote o novo no fim da tabela (o script de escolha lê esta tabela).

Colunas: **chave** (usada no `escolher_estrutura.py --nicho`), **costuma ter** (etiquetas da ficha de entrada),
**regulado** (sim = conselho de classe ou lei específica), **rendem** (códigos S que costumam casar com o nicho),
**cuidado**.

| Nicho | chave | costuma ter | regulado | rendem | cuidado |
|---|---|---|---|---|---|
| Restaurante, pizzaria, delivery | gastronomia | local, processo, produto, humor, duas_pessoas | não | S70, S59, S112, S88, S110, S69, S45, S52 | Promo amarrada ao dia da semana cansa rápido; mostrar o detalhe que surpreende, não "ingredientes selecionados" |
| Padaria, confeitaria, doceria | confeitaria | local, processo, produto | não | S112, S110, S111, S88, S38, S42 | Foto de vitrine parada não prende: o processo prende |
| Bar, cafeteria, hamburgueria | bar-cafe | local, processo, produto, humor, duas_pessoas | não (álcool: sem incentivo a beber em excesso, +18) | S70, S112, S76, S89, S80, S13 | Bebida alcoólica segue a regra do CONAR (sem menor, sem associar a sucesso) |
| Mercado, hortifrúti, empório (varejo) | mercado | local, produto, processo | não | S95, S54, S52, S30, S19, S85 | Preço na tela só se estiver certo no dia |
| Distribuidora, atacado, food service (B2B) | distribuidora-b2b | local, processo, numeros, fala | não | S42, S69, S5, S20, S11, S39, S60 | Fala com quem compra (chef, compras, diretoria): técnico e acessível, nunca preço no vídeo se a casa não quer |
| Indústria, fábrica | industria | local, processo, numeros, diaria | não | S20, S60, S111, S114, S39, S29, S49 | Segurança do trabalho visível (EPI); segredo industrial fora do quadro |
| Construção, reforma, arquitetura | construcao | local, processo, numeros | com cuidado (CREA/CAU: sem promessa de prazo que não cumpre) | S63, S111, S113, S115, S60, S14, S96 | Antes e depois só da própria obra, com autorização do dono do imóvel |
| Imobiliária, corretor | imoveis | local, fala | com cuidado (CRECI: preço e condição reais) | S95, S45, S19, S47, S113, S1, S10 | Sem endereço exato de imóvel ocupado |
| Oficina mecânica, auto center | oficina | local, processo, fala, humor | não | S38, S53, S60, S5, S115, S52, S10 | Não expor carro e placa de cliente sem permissão |
| Assistência técnica, ferramentas, máquinas | assistencia | local, processo, produto, fala | não | S38, S60, S115, S53, S63, S5, S68 | Mostrar o defeito real; nunca prometer conserto sem diagnóstico |
| Moda, loja de roupas, calçados | moda | produto, local, duas_pessoas, humor | não | S26, S77, S76, S99, S36, S88, S28 | Provador e cliente só com autorização |
| Salão, barbearia, beleza | beleza | local, processo, clientes, humor | com cuidado (procedimento químico: sem promessa) | S63, S112, S67, S13, S70, S110 | Antes e depois só com autorização escrita; nada de "cura" de cabelo ou pele |
| Estética (clínica, procedimentos) | estetica | local, fala | sim (conselhos e Anvisa: sem antes e depois de procedimento médico, sem promessa) | S5, S52, S10, S58, S102, S20, S95 | Regras do conselho em toda fala; sem preço quando a classe proíbe |
| Clínica médica, consultório | saude | fala, local | sim (CFM: sem promessa, sem "o melhor", sem paciente identificável) | S5, S52, S58, S102, S10, S6, S12 | Informação, não diagnóstico; paciente só com autorização e nunca em situação de exposição |
| Odontologia | odontologia | fala, local, processo | sim (CFO: sem antes e depois, sem preço, sem promessa) | S5, S52, S58, S60, S6, S102 | Mesmo cuidado da saúde; o processo pode aparecer sem o paciente |
| Psicologia, terapia | psicologia | fala | sim (CFP: sem promessa de resultado, sem caso real) | S52, S58, S10, S7, S6, S44 | Nunca caso de paciente, nem disfarçado |
| Nutrição | nutricao | fala, produto, processo | sim (CFN: sem promessa de emagrecimento, sem antes e depois) | S52, S54, S58, S50, S5, S102 | Nada de "perca X kg" |
| Fisioterapia, academia, personal | fitness | fala, local, processo, clientes | com cuidado (CREF/COFFITO: sem promessa de resultado no corpo) | S50, S53, S92, S45, S64, S13 | Corpo de aluno só com autorização; sem comparação de corpo |
| Pet shop, veterinária | pet | local, produto, humor, processo | com cuidado (veterinária: CFMV) | S75, S70, S112, S67, S13, S99 | Animal sem estresse em cena; procedimento clínico segue a regra do conselho |
| Escola, colégio, curso presencial | escola | local, fala, clientes, diaria | com cuidado (imagem de criança só com autorização dos pais) | S46, S41, S12, S45, S20, S61, S89 | Criança: AUTORIZAÇÃO escrita dos responsáveis em todo plano |
| Infoproduto, curso online, mentoria | infoproduto | fala, edicao, numeros | com cuidado (sem promessa de renda) | S1, S100, S59, S55, S44, S96, S86 | "Ganhe X por mês" é promessa: proibido sem prova e sem ressalva |
| Advocacia | advocacia | fala | sim (OAB: sem captação de cliente, sem promessa de resultado, sem caso real identificável) | S52, S58, S10, S5, S7, S6 | Informar, nunca oferecer serviço como anúncio |
| Contabilidade, finanças, seguros | financas | fala, numeros | sim (CRC, CVM, SUSEP: sem promessa de rendimento) | S52, S54, S58, S10, S65, S6, S8 | Nada de indicação de investimento personalizada |
| Tecnologia, SaaS, app | tecnologia | fala, edicao, numeros | não | S109, S59, S57, S105, S107, S86, S96 | Tela filmada com dado real de cliente: borrar |
| Agência, marketing, criador | marketing | fala, edicao, humor | não | S1, S116, S113, S100, S97, S44, S96 | Não usar trabalho de cliente sem permissão |
| Eventos, casamento, buffet | eventos | local, processo, clientes, diaria | não | S113, S111, S67, S89, S36, S45, S108 | Convidado só com autorização; música com licença |
| Turismo, hotel, pousada | turismo | local, diaria, edicao | não | S45, S95, S40, S43, S108, S42 | Imagem de hóspede só com autorização |
| Móveis, marcenaria, decoração | moveis | processo, produto, local | não | S112, S111, S36, S60, S115, S63 | — |
| Energia solar, engenharia | energia | numeros, local, processo, fala | com cuidado (sem promessa de economia sem cálculo) | S65, S10, S52, S60, S111, S5 | Economia sempre como "estimativa para o seu consumo" |
| E-commerce, marketplace | ecommerce | produto, edicao | não | S23, S22, S26, S88, S85, S87, S99 | Escassez só se for verdade |
| Logística, transporte | logistica | local, numeros, processo | não | S42, S29, S111, S65, S45 | — |
| Agro, campo | agro | local, processo, numeros, diaria | com cuidado (defensivo: receituário agronômico) | S43, S20, S111, S49, S39, S45 | — |
| Marca pessoal, influenciador | marca-pessoal | fala, humor, edicao | depende da profissão | S1, S2, S41, S97, S101, S92, S3 | Segue a regra da profissão de quem fala |
| Política, mandato | politica | fala, local, clientes | sim (lei eleitoral: sem pedido de voto, número ou partido fora do período e das regras) | S41, S46, S12, S13, S20, S39 | Em período eleitoral, tudo passa pelo jurídico |
| ONG, igreja, causa | causa | fala, local, clientes | com cuidado (doação: transparência) | S41, S47, S46, S61, S9, S39 | Pessoa atendida sem exposição de vulnerabilidade |
