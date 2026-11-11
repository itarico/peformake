-- Texto do freela: "no dia 30" (mensal) ou "nos dias 15 e 30" (quinzenal).
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.staff_contract_compose(uuid,text)'::regprocedure);
  d := replace(d, $x$'. Os pagamentos são feitos nos dias ' || case when _m.pay_schedule = 'quinzenal' then '15 e 30' else '30' end || ' de cada mês, por PIX.'$x$,
                  $x$'. Os pagamentos são feitos ' || case when _m.pay_schedule = 'quinzenal' then 'nos dias 15 e 30' else 'no dia 30' end || ' de cada mês, por PIX.'$x$);
  execute d;
end $do$;
