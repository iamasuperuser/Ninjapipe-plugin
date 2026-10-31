---
name: ninjapipe
description: Use when the user asks about their NinjaPipe CRM - finding or looking up contacts, deals, products, budgets, projects, orders or lists, or adding/updating a contact.
---
# NinjaPipe

Use the `ninjapipe` MCP tools.

- Find people: `list_contacts` with `search` (name/email/phone), then `get_contact` by id.
- Other records: `list_deals`, `list_products`, `list_budgets`, `list_projects`, `list_orders`, `list_lists` + matching `get_*`; children via `list_budget_expenses`, `list_project_tasks`, `list_list_members`.
- Owners/assignees: `list_workspace_members`.
- Lists return `{data, pagination:{page,limit,total,pages}}`; page with `page`/`limit` (max 100).
- `create_contact` / `update_contact` change live data: confirm the exact change with the user first.
- Rate limit is 100 requests/min; avoid paging through everything unless asked.
