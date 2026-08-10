import { Hono } from "npm:hono@4";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("CLAUDE_MCP_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const mcp = new McpServer({ name: "peformake-mcp", version: "1.0.0" });

mcp.tool({
  name: "list_tables",
  description: "Lista todas as tabelas do schema public",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const { data, error } = await admin
      .from("information_schema.tables" as any)
      .select("table_name")
      .eq("table_schema", "public");
    if (error) {
      const { data: d2 } = await admin.rpc("pg_catalog_tables" as any).catch(() => ({ data: null }));
      return { content: [{ type: "text", text: JSON.stringify(d2 ?? { error: error.message }) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

mcp.tool({
  name: "query",
  description: "Seleciona linhas de uma tabela. Suporta filtros simples (coluna = valor), ordenação e limite.",
  inputSchema: {
    type: "object",
    properties: {
      table: { type: "string", description: "Nome da tabela" },
      select: { type: "string", description: "Colunas (default '*')" },
      filters: { type: "object", description: "{coluna: valor} para igualdade" },
      order_by: { type: "string" },
      ascending: { type: "boolean" },
      limit: { type: "number" },
    },
    required: ["table"],
  },
  handler: async (args: any) => {
    let q = admin.from(args.table).select(args.select ?? "*");
    if (args.filters) for (const [k, v] of Object.entries(args.filters)) q = q.eq(k, v as any);
    if (args.order_by) q = q.order(args.order_by, { ascending: args.ascending ?? true });
    if (args.limit) q = q.limit(args.limit);
    const { data, error } = await q;
    return { content: [{ type: "text", text: JSON.stringify(error ? { error: error.message } : data) }] };
  },
});

mcp.tool({
  name: "insert",
  description: "Insere uma ou mais linhas em uma tabela",
  inputSchema: {
    type: "object",
    properties: { table: { type: "string" }, rows: {} },
    required: ["table", "rows"],
  },
  handler: async (args: any) => {
    const { data, error } = await admin.from(args.table).insert(args.rows).select();
    return { content: [{ type: "text", text: JSON.stringify(error ? { error: error.message } : data) }] };
  },
});

mcp.tool({
  name: "update",
  description: "Atualiza linhas de uma tabela aplicando filtros de igualdade",
  inputSchema: {
    type: "object",
    properties: { table: { type: "string" }, values: { type: "object" }, filters: { type: "object" } },
    required: ["table", "values", "filters"],
  },
  handler: async (args: any) => {
    let q: any = admin.from(args.table).update(args.values);
    for (const [k, v] of Object.entries(args.filters)) q = q.eq(k, v);
    const { data, error } = await q.select();
    return { content: [{ type: "text", text: JSON.stringify(error ? { error: error.message } : data) }] };
  },
});

mcp.tool({
  name: "delete",
  description: "Remove linhas de uma tabela aplicando filtros de igualdade",
  inputSchema: {
    type: "object",
    properties: { table: { type: "string" }, filters: { type: "object" } },
    required: ["table", "filters"],
  },
  handler: async (args: any) => {
    let q: any = admin.from(args.table).delete();
    for (const [k, v] of Object.entries(args.filters)) q = q.eq(k, v);
    const { data, error } = await q.select();
    return { content: [{ type: "text", text: JSON.stringify(error ? { error: error.message } : data) }] };
  },
});

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, mcp-session-id, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

app.options("/*", (c) => new Response(null, { headers: corsHeaders }));

const transport = new StreamableHttpTransport();
const handler = transport.bind(mcp);

app.all("/*", async (c) => {
  const auth = c.req.header("authorization") ?? "";
  const apiKey = c.req.header("x-api-key") ?? auth.replace(/^Bearer\s+/i, "");
  if (apiKey !== API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const res = await handler(c.req.raw);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

Deno.serve(app.fetch);
