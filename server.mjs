#!/usr/bin/env node
// Zero-dependency stdio MCP server for the NinjaPipe API.
import { createInterface } from "node:readline";
const BASE = process.env.NINJAPIPE_BASE_URL || "https://www.ninjapipe.app/api";

// Domain: list resources share {data:[...], pagination:{page,limit,total,pages}}.
const RESOURCES = {
  contacts: "Search in name, email, phone",
  deals: "Search deals by name",
  products: "Search in name, description, SKU",
  budgets: "Search in name and description",
  projects: "Search projects",
  orders: "Search orders",
  lists: "Search lists",
};
const listSchema = (desc) => ({
  type: "object",
  properties: {
    search: { type: "string", description: desc },
    status: { type: "string", description: "Filter by status" },
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    sort_by: { type: "string", description: "e.g. created_at, updated_at, name" },
    sort_order: { type: "string", enum: ["asc", "desc"] },
  },
});
const idSchema = (n) => ({ type: "object", properties: { id: { type: "string", description: `${n} UUID` } }, required: ["id"] });
const contactBody = {
  first_name: { type: "string" }, last_name: { type: "string" }, email: { type: "string" },
  phone: { type: "string" }, status: { type: "string", description: "Default Active" },
  owner_id: { type: "string" }, assigned_to: { type: "string", description: "Team member UUID, email or display name" },
  company_id: { type: "string" }, fields: { type: "object", description: "Custom fields" },
};

const tools = [];
const handlers = {};
for (const [r, desc] of Object.entries(RESOURCES)) {
  const one = r.replace(/s$/, "");
  tools.push({ name: `list_${r}`, description: `List or search NinjaPipe ${r} (paginated).`, inputSchema: listSchema(desc), annotations: { readOnlyHint: true } });
  handlers[`list_${r}`] = (a) => api("GET", `/${r}`, a);
  tools.push({ name: `get_${one}`, description: `Get one NinjaPipe ${one} by id.`, inputSchema: idSchema(one), annotations: { readOnlyHint: true } });
  handlers[`get_${one}`] = (a) => api("GET", `/${r}/${encodeURIComponent(a.id)}`);
}
tools.push({ name: "list_budget_expenses", description: "List expenses of a budget.", inputSchema: { type: "object", properties: { budget_id: { type: "string" }, page: { type: "integer" }, limit: { type: "integer" } }, required: ["budget_id"] }, annotations: { readOnlyHint: true } });
handlers.list_budget_expenses = ({ budget_id, ...q }) => api("GET", `/budgets/${encodeURIComponent(budget_id)}/expenses`, q);
tools.push({ name: "list_project_tasks", description: "List tasks of a project.", inputSchema: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] }, annotations: { readOnlyHint: true } });
handlers.list_project_tasks = ({ project_id }) => api("GET", `/projects/${encodeURIComponent(project_id)}/tasks`);
tools.push({ name: "list_list_members", description: "List members (contacts) of a list.", inputSchema: { type: "object", properties: { list_id: { type: "string" }, limit: { type: "integer" } }, required: ["list_id"] }, annotations: { readOnlyHint: true } });
handlers.list_list_members = ({ list_id, limit = 25 }) => api("GET", `/lists/${encodeURIComponent(list_id)}/members`, { limit, expand: true });
tools.push({ name: "list_workspace_members", description: "List team members of the workspace (for owner_id / assigned_to).", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } });
handlers.list_workspace_members = () => api("GET", "/workspace/members");
tools.push({ name: "create_contact", description: "Create a contact. Writes live CRM data; confirm with the user first.", inputSchema: { type: "object", properties: contactBody }, annotations: { readOnlyHint: false, destructiveHint: false } });
handlers.create_contact = (a) => api("POST", "/contacts", undefined, a);
tools.push({ name: "update_contact", description: "Update a contact (only passed fields change). Writes live CRM data; confirm with the user first.", inputSchema: { type: "object", properties: { id: { type: "string" }, ...contactBody }, required: ["id"] }, annotations: { readOnlyHint: false, destructiveHint: false } });
handlers.update_contact = ({ id, ...b }) => api("PUT", `/contacts/${encodeURIComponent(id)}`, undefined, b);

async function api(method, path, query, body) {
  const key = process.env.NINJAPIPE_API_KEY;
  if (!key) throw new Error("NINJAPIPE_API_KEY is not set");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const hint = res.status === 401 ? " (check NINJAPIPE_API_KEY)" : res.status === 429 ? " (rate limit 100/min; wait and retry)" : "";
    throw new Error(`NinjaPipe ${method} ${path} -> ${res.status}${hint}: ${text.slice(0, 500)}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

const send = (m) => process.stdout.write(JSON.stringify(m) + "\n");
const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg; try { msg = JSON.parse(line); } catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  const { id, method, params } = msg;
  if (id === undefined) return; // notification
  try {
    if (method === "initialize") return send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "ninjapipe", version: "0.1.0" } } });
    if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
    if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools } });
    if (method === "tools/call") {
      const h = handlers[params?.name];
      if (!h) return send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool ${params?.name}` } });
      try {
        const out = await h(params.arguments || {});
        return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: typeof out === "object" ? out : undefined } });
      } catch (e) { return send({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: String(e.message || e) }] } }); }
    }
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (e) { send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(e) } }); }
});
