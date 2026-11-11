-- "Clientes sem CPF/CNPJ": conta só faturas que ainda vão vencer (hoje a 10 dias); as vencidas já aparecem como atraso.
-- (O arquivo 20261112140100 já está com a regra nova; isto só corrige o banco onde a versão anterior foi aplicada.)
do $$ declare s text; begin
  s := pg_get_functiondef('public.fin_dashboard(text,date)'::regprocedure);
  s := replace(s, 'f.status = ''pendente'' and f.due_date <= _today + 10 and nullif', 'f.status = ''pendente'' and f.due_date >= _today and f.due_date <= _today + 10 and nullif');
  execute s;
end $$;
