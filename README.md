# NinjaPipe Agent Plugin (unofficial)

> **Unofficial community plugin.** Not affiliated with, endorsed by, or maintained by NinjaPipe.

An [Agent Plugin](https://agent-plugins.org) that wraps the [NinjaPipe CRM API](https://docs.ninjapipe.app/api-docs). It ships a zero-dependency Node.js stdio MCP server and a small skill, so agents can look up and manage your NinjaPipe data.

## Tools

| Tool | What it does |
|---|---|
| `list_contacts` / `get_contact` | Search contacts by name, email, or phone, or fetch one |
| `list_deals` / `get_deal` | Deals |
| `list_products` / `get_product` | Products |
| `list_budgets` / `get_budget`, `list_budget_expenses` | Budgets and their expenses |
| `list_projects` / `get_project`, `list_project_tasks` | Projects and their tasks |
| `list_orders` / `get_order` | Orders |
| `list_lists` / `get_list`, `list_list_members` | Lists and their members |
| `list_workspace_members` | Team members (useful for `owner_id` / `assigned_to`) |
| `create_contact` / `update_contact` | Write tools: change live CRM data |

List tools accept `search`, `status`, `page`, `limit` (max 100), `sort_by`, and `sort_order`. Responses come back as `{data, pagination:{page,limit,total,pages}}`.

## Setup

1. Create an API key in NinjaPipe (workspace settings → API). It starts with `np_`. Use a read-only key if you only need lookups.
2. Export it before starting your agent client:
   ```sh
   export NINJAPIPE_API_KEY=np_...
   ```
3. Install the plugin in any Agent Plugins compatible client. You need Node.js 18 or newer.

Optional: set `NINJAPIPE_BASE_URL` (default `https://www.ninjapipe.app/api`).

## Notes

- The NinjaPipe rate limit is 100 requests per minute. A 429 response is reported back to the agent.
- The docs list no delete tools and no companies endpoint, so neither is included.

## License

MIT
