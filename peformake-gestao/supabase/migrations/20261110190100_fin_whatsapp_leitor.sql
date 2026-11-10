-- Financeiro pelo WhatsApp (parte 2): o leitor por regras. Sem IA, custo zero.
-- Entende texto livre: valor em formato brasileiro, gasto ou entrada, data ("ontem", "dia 08", "08/11"),
-- empresa ("ellcazo"), "do meu bolso", e a categoria por palavra (regras aprendidas do Caixa + dicionário inicial).

create or replace function public.fin_wa_parse(_text text, _today date default null)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  _d date := coalesce(_today, (now() at time zone 'America/Sao_Paulo')::date);
  _w text := ' ' || regexp_replace(regexp_replace(public.fin_norm(_text), '[\r\n\t]+', ' ', 'g'), '\s+', ' ', 'g') || ' ';
  _date date; _m text[]; _y int; _mo int; _dd int;
  _r record; _num text; _v numeric; _wt int;
  _cands jsonb := '[]'::jsonb;
  _best numeric; _best_raw text; _bw int := -1; _tie boolean := false; _n99 boolean := false;
  _in boolean; _out boolean; _kind text; _pocket boolean; _company boolean;
  _kw text; _kwlabel text; _cat text; _unit text; _hint text; _desc text; _i int;
begin
  -- Datas (saem do texto antes de procurar o valor).
  _m := regexp_match(_w, '\m([0-3]?[0-9])/([01]?[0-9])(?:/([0-9]{2,4}))?\M');
  if _m is not null then
    begin
      _y := coalesce(nullif(_m[3], '')::int, extract(year from _d)::int);
      if _y < 100 then _y := _y + 2000; end if;
      _date := make_date(_y, _m[2]::int, _m[1]::int);
      if _m[3] is null and _date > _d then _date := (_date - interval '1 year')::date; end if;
    exception when others then _date := null; end;
    _w := regexp_replace(_w, '\m[0-3]?[0-9]/[01]?[0-9](/[0-9]{2,4})?\M', ' ');
  end if;
  _m := regexp_match(_w, '\mdia ([0-3]?[0-9])\M');
  if _m is not null then
    begin
      _date := make_date(extract(year from _d)::int, extract(month from _d)::int, _m[1]::int);
      if _date > _d then _date := (_date - interval '1 month')::date; end if;
    exception when others then _date := null; end;
    _w := regexp_replace(_w, '\mdia [0-3]?[0-9]\M', ' ');
  end if;
  if _date is null then
    if _w ~ '\manteontem\M' then _date := _d - 2;
    elsif _w ~ '\montem\M' then _date := _d - 1;
    end if;
  end if;
  -- Horas ("14h", "14:30", "14h30") e "2k"/"2mil" colados.
  _w := regexp_replace(_w, '\m[0-2]?[0-9](h|:)([0-5][0-9])?(min)?\M', ' ', 'g');
  _w := regexp_replace(_w, '([0-9])(mil|k|reais|real|conto|contos)\M', '\1 \2', 'g');
  -- Palavras com letra e número juntos (a6700, 4k, h264) não são valor.
  _w := regexp_replace(_w, '\m[a-z]+[0-9][a-z0-9]*\M', ' ', 'g');

  -- Valores: "r$ 1.234,56", "1.234,56", "89,90", "32.50", "1500", "1,5 mil".
  for _r in
    select m from regexp_matches(_w, '(r\$ ?)?(?<![0-9.,])([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{1,2})?|[0-9]+,[0-9]{1,2}|[0-9]+\.[0-9]{1,2}|[0-9]+)(?![0-9]|[.,][0-9])( ?(?:mil|k)\M)?', 'g') as m
  loop
    _num := _r.m[2];
    if _num ~ ',' then _num := replace(replace(_num, '.', ''), ',', '.');
    elsif _num ~ '^[0-9]{1,3}(\.[0-9]{3})+$' then _num := replace(_num, '.', '');
    end if;
    if length(split_part(_num, '.', 1)) > 7 then continue; end if; -- telefone, código
    _v := _num::numeric;
    if _r.m[3] is not null then _v := _v * 1000; end if;
    if _v <= 0 or _v >= 10000000 then continue; end if;
    _wt := case when _r.m[1] is not null then 3 when _r.m[2] ~ '[.,]' or _r.m[3] is not null then 2 else 1 end;
    -- "99" sozinho perto de outro valor é o app de transporte.
    if _r.m[2] = '99' and _r.m[1] is null then _wt := 0; end if;
    _cands := _cands || jsonb_build_object('value', _v, 'raw', trim(coalesce(_r.m[1], '') || _r.m[2] || coalesce(_r.m[3], '')), 'weight', _wt);
  end loop;
  for _r in select (c->>'value')::numeric v, c->>'raw' raw, (c->>'weight')::int wt from jsonb_array_elements(_cands) c order by (c->>'weight')::int desc loop
    if _bw = -1 then _best := _r.v; _best_raw := _r.raw; _bw := _r.wt;
    elsif _r.wt = _bw and _r.v <> _best then _tie := true;
    end if;
  end loop;
  if _tie then _best := null; _best_raw := null; end if;
  if _bw > 0 and exists (select 1 from jsonb_array_elements(_cands) c where c->>'raw' = '99' and (c->>'weight')::int = 0) then _n99 := true; end if;

  -- Gasto ou entrada.
  _pocket := _w ~ '\m(do|no|com|meu|o meu) (proprio )?bolso\M|\mmeu cartao\M|\mcartao pessoal\M|\mmeu custo\M|\mme reembols\w*|\mreembolso\M|\mreembolsar\M|\mdo meu pix\M|\mmeu pix\M|\mmeu dinheiro\M|\mpaguei eu\M|\meu que paguei\M';
  _company := _w ~ '\m(empresa|firma) (pagou|paga)\M|\m(cartao|pix|conta) da (empresa|peformake|ellcazo)\M';
  _in := _w ~ '\m(recebi|recebido|recebida|recebemos|recebimento|entrada|entrou|caiu|pagou|pagaram|depositou|deposito|vendi|venda|faturou)\M';
  _out := _pocket or _w ~ '\m(paguei|pagamos|gastei|gastamos|gasto|gastos|despesa|saida|comprei|compramos|compra|transferi|abasteci)\M';
  -- "o cliente pagou" é entrada; "paguei"/"gastei" é saída. Os dois juntos: não dá para ter certeza.
  if _in and not _out then _kind := 'entrada';
  elsif _out and not _in then _kind := 'saida';
  end if;

  -- Categoria por palavra (dicionário inicial). As regras aprendidas do Caixa são vistas depois, por empresa.
  for _r in select * from (values
    (1, '\m(gasolina|combustivel|etanol|alcool|diesel|abasteci|abastecimento|abastecer|posto)\M', 'Deslocamento', 'Combustível'),
    (2, '\m(uber|99pop|99 pop|99 taxi|taxi|corrida|onibus|passagem|passagens|metro)\M', 'Deslocamento', 'Transporte'),
    (3, '\m(estacionamento|estacionei|estacionar|zona azul|pedagio)\M', 'Deslocamento', 'Estacionamento'),
    (4, '\m(comida|almoco|almocos|almocar|jantar|janta|lanche|lanches|cafe|marmita|marmitas|ifood|refeicao|refeicoes|pizza|salgados?)\M', 'Alimentação', 'Alimentação'),
    (5, '\m(canva|adobe|capcut|chatgpt|openai|figma|notion|envato|freepik|assinatura|google one|icloud|dropbox)\M', 'Ferramentas e assinaturas', 'Ferramentas'),
    (6, '\m(internet|energia|luz|celpe|aluguel|condominio|telefone|conta de agua)\M', 'Escritório e contas', 'Contas do escritório'),
    (7, '\m(freela|freelas|freelancer|diaria|diarias|cache)\M', 'Equipe', 'Freela'),
    (8, '\m(equipamento|equipamentos|camera|lente|microfone|tripe|cartao de memoria|bateria|baterias|iluminacao|ssd|hd externo|gimbal)\M', 'Equipamento', 'Equipamento'),
    (9, '\m(imposto|impostos|simples nacional|darf|guia do das)\M', 'Impostos', 'Impostos'),
    (10, '\m(tarifa|tarifas|taxa bancaria|taxa do banco)\M', 'Tarifas bancárias', 'Tarifa')
  ) d(o, re, cat, label) order by o loop
    _m := regexp_match(_w, _r.re);
    if _m is not null then _kw := _m[1]; _cat := _r.cat; _kwlabel := _r.label; exit; end if;
  end loop;
  if _kw is null and _n99 then _kw := '99'; _cat := 'Deslocamento'; _kwlabel := 'Transporte'; end if;
  if _kind is null and _kw is not null and not _in then _kind := 'saida'; end if;

  -- Empresa.
  if _w ~ '\mellcazo\M' then _unit := 'ellcazo';
  elsif _w ~ '\m(peformake|performake)\M' then _unit := 'peformake';
  end if;
  if _w ~ '\m(captacao|captacoes|gravacao|gravacoes|filmagem|ensaio|edicao de video)\M' then _hint := 'ellcazo'; end if;

  -- Descrição: o texto da pessoa sem o valor, sem a data e sem as palavras de comando.
  _desc := ' ' || regexp_replace(coalesce(_text, ''), '\s+', ' ', 'g') || ' ';
  if _best_raw is not null then
    _desc := regexp_replace(_desc, '(r\$ ?)?' || regexp_replace(regexp_replace(_best_raw, '^r\$ ?', ''), '([.$])', '\\\1', 'g') || '( ?(mil|k))?( ?(reais|real|conto|contos))?', ' ', 'i');
  end if;
  _desc := regexp_replace(_desc, '\m(do|no|com|meu|o meu) (próprio |proprio )?bolso\M|\mdo meu pix\M|\mme reembolsa\M', ' ', 'gi');
  _desc := regexp_replace(_desc, '\m(ellcazo|peformake|performake)\M', ' ', 'gi');
  _desc := regexp_replace(_desc, '\m(anteontem|ontem|hoje)\M|\mdia [0-3]?[0-9]\M|\m[0-3]?[0-9]/[01]?[0-9](/[0-9]{2,4})?\M|r\$|\m(reais)\M', ' ', 'gi');
  _desc := regexp_replace(_desc, '\s+', ' ', 'g');
  for _i in 1..6 loop
    _desc := regexp_replace(_desc, '^[\s:,.;!\-]*(paguei|pagamos|gastei|gastamos|gasto|despesa|saida|saída|comprei|compramos|compra|recebi|recebido|recebida|recebemos|entrada|entrou|caiu|pix|foi|de|do|da|dos|das|no|na|nos|nas|em|com|o|a|os|as|um|uma|pro|pra|para|pelo|pela)(\s+|$)', '', 'i');
  end loop;
  _desc := regexp_replace(_desc, '(\s+(de|do|da|no|na|em|com|pra|pro|para|e|o|a))+[\s.,;!]*$', '', 'i');
  _desc := trim(both ' .,;:!-' from _desc);
  if length(_desc) < 2 then
    _desc := coalesce(_kwlabel, case when _kind = 'entrada' then 'Entrada pelo WhatsApp' else 'Gasto pelo WhatsApp' end);
  end if;
  _desc := left(upper(left(_desc, 1)) || substr(_desc, 2), 200);

  return jsonb_build_object(
    'amount', _best, 'candidates', _cands, 'money_weight', greatest(_bw, 0),
    'kind', _kind, 'kind_explicit', (_in or _out),
    'date', coalesce(_date, _d), 'date_said', _date is not null,
    'unit', _unit, 'unit_hint', _hint,
    'pocket', _pocket, 'company_paid', _company,
    'keyword', _kw, 'keyword_label', _kwlabel, 'category', _cat,
    'description', _desc,
    'norm', regexp_replace(trim(public.fin_norm(_text)), '[^a-z0-9 ]+', ' ', 'g'));
end $$;
