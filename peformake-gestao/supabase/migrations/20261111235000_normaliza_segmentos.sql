-- Segmentos dos clientes: junta variações da mesma coisa e padroniza a escrita (só UPDATE; nenhum cliente é apagado).
-- Antes → depois: Estética, Estética / Beleza → Estética e beleza; Construção, Construção Civil → Construção civil;
-- industria → Indústria; ÓTICA → Ótica; Serviços Gerais → Serviços gerais.
with m(de, para) as (values
  ('estética', 'Estética e beleza'), ('estetica', 'Estética e beleza'), ('estética / beleza', 'Estética e beleza'),
  ('estética e beleza', 'Estética e beleza'), ('estetica e beleza', 'Estética e beleza'),
  ('construção', 'Construção civil'), ('construcao', 'Construção civil'), ('construção civil', 'Construção civil'),
  ('industria', 'Indústria'), ('indústria', 'Indústria'), ('ótica', 'Ótica'), ('otica', 'Ótica'),
  ('serviços gerais', 'Serviços gerais'))
update public.clients c set segment = m.para
from m where lower(trim(c.segment)) = m.de and c.segment is distinct from m.para;
