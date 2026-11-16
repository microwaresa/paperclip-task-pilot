<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Products come from two sources: the store's static catalog in `src/lib/catalog.ts` (string ids) and seller products in `merchant_products` (uuid ids, read via `src/lib/market.functions.ts` and mapped to the same `Product` shape). Why: the house catalog stays code-defined while sellers manage theirs.
- Orders are inserted only by the `placeOrder` server function, which recomputes prices from the catalog/seller rows, reserves seller stock via `take_stock`, and writes one `order_items` row per product; shoppers have SELECT-only access to their own orders. Why: the browser can't tamper with prices or stock.
- Cart and favorites are stored in the browser (`src/lib/cart.tsx`), not the database. Why: shopping works signed out; sign-in is required only at checkout.
- Delivery-fee rules live in `src/lib/pricing.ts` with tests in `pricing.test.ts`.
- AI shopping assistant: `getRecommendations` server fn (src/lib/assistant.functions.ts) calls Lovable AI Gateway from `src/lib/ai/recommend.server.ts` with the catalog in the prompt and a strict schema limited to catalog ids. Why: the model can only recommend real products; prices always come from the catalog.
- Admin: roles live in `user_roles` checked via `has_role`; the admin account is created only from /admin-login (signup metadata flag honored by a trigger only while no admin exists); admin server fns (src/lib/admin.functions.ts) verify the role and use the caller RLS client. Delivery fee/threshold live in the `store_settings` row, read server-side for order totals. Why: no privilege escalation, prices stay server-authoritative.
- Marketplace: sellers apply from /merchant (row starts `pending`, only admin can change `merchants.status` — enforced by trigger); sellers can only update `order_items.status` (column grant) one step forward; a trigger sets `orders.status` to the least-advanced line. Admin cancel returns seller stock. Why: sellers handle their own lines without touching prices or other sellers.
- Seller product photos live in the private `product-images` bucket (public buckets are blocked in this workspace); the app stores a long-lived signed URL in `image_url`.
