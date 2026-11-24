-- WhatsApp do cliente (Fase 1, Wasender): as mensagens dos números dos clientes chegam com account_id; as da Peformake
-- chegam sem. Financeiro pelo WhatsApp, Guia do Italo e NPS só leem as da Peformake (antes uma conversa do cliente podia
-- virar lançamento, tarefa do Italo ou nota de NPS). O lead do cliente (wa_lead_on_message) e o comercial já separavam.
create or replace trigger fin_from_whatsapp after insert on public.whatsapp_messages
for each row when (new.account_id is null) execute function public.fin_from_whatsapp();
create or replace trigger fin_wa_on_message after insert on public.whatsapp_messages
for each row when (new.account_id is null) execute function public.fin_wa_on_message();
create or replace trigger fin_wa_on_transcribed after update of transcribed_at on public.whatsapp_messages
for each row when (old.transcribed_at is null and new.transcribed_at is not null and new.account_id is null) execute function public.fin_wa_on_transcribed();
create or replace trigger guia_from_whatsapp after insert on public.whatsapp_messages
for each row when (new.account_id is null) execute function public.guia_from_whatsapp();
create or replace trigger guia_from_whatsapp_audio after update of body on public.whatsapp_messages
for each row when (new.account_id is null) execute function public.guia_from_whatsapp_audio();
create or replace trigger whatsapp_messages_nps after insert on public.whatsapp_messages
for each row when (new.account_id is null) execute function public.nps_on_message();
