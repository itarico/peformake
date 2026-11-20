// DESLIGADA (Italo, 20/11: "não vamos usar nada da API"). O briefing em conversa roda no Claude com o conector do
// Supabase: botão "Conversar" no Briefing copia o pedido; regras em agent_instructions('briefing-conversa').
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
Deno.serve((request) => request.method === 'OPTIONS'
  ? new Response('ok', { headers: CORS })
  : new Response(JSON.stringify({ error: 'O briefing em conversa agora roda no Claude. Toque em Conversar e depois em Copiar e abrir o Claude.' }), { status: 410, headers: { ...CORS, 'Content-Type': 'application/json' } }))
