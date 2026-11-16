# Photo and settings access review

## Rule
Seller photo files can only be listed, signed, uploaded, or deleted by their owner. Shoppers can view published product photo links and the active shop's public delivery terms. Only admins can change store settings.

## Surfaces checked
| Surface | Code reviewed | Result |
| --- | --- | --- |
| Seller products, gallery upload, preview, reorder, remove | merchant route; merchant.functions | Upload/sign uses the authenticated user's folder; database reads/writes are merchant-scoped. Removing a gallery entry edits the product, not another user's storage files. |
| Storage listing, signing, upload, deletion | Live storage.objects policies | All client operations are owner-folder scoped; anonymous reads are no longer allowed. No UPDATE policy exists. |
| Search, categories, offers, public store | Corresponding routes; market.functions; market; ProductCard | Public reads require active products and approved merchants; images use published URLs, not storage listing/signing. |
| Product page and thumbnails | product.$id route | Uses public product fetch and the product's published gallery URLs. |
| Home banners, deals, suggestions | index route; catalog; Carousels | Bundled house-catalog photos; no private-storage access. |
| Recently viewed | recently-viewed; index | Reuses previously published product URLs stored in the shopper's browser; does not create file-access permissions. |
| Favorites and cart | favorites/cart routes; cart provider | Seller products resolve through the same public active-product fetch; photos use published URLs. |
| AI assistant | assistant route; assistant.functions | Resolves recommendations to the bundled house catalog; no seller storage access. |
| Checkout, coupon quote, placing orders | checkout route; orders.functions; checkout.server | Uses active shop settings via id=1; no file listing or signing. Order writes remain authenticated and server-authoritative. |
| Public settings, cart totals, order summary | settings.functions; settings.server; cart; OrderSummary | Reads only id=1 through the publishable client. |
| Admin settings and ledgers | admin route; admin.functions | Settings writes require authenticated admin role and target id=1. Ledger uses public payout hold settings without widening file access. |
| Seller earnings and withdrawals | merchant route; merchant.functions | Uses id=1 settings and authenticated merchant-scoped records. |
| Database earnings/withdrawal helpers | Live merchant_available_balance, guard_withdrawal_insert/update definitions | Balance calculation reads payout hold days from id=1; helpers do not access photo storage. |
| Approval/ownership helpers | Live owns_merchant, merchant_is_approved definitions | Caller ownership and approved-store predicates support existing product visibility rules. |
| Shopper orders | orders route; listMyOrders | Uses stored order prices/shipping; no private photo storage access. |
| Header, footer, seller alerts | SiteHeader; SiteFooter; seller-alerts | No photo listing/signing. Alerts subscribe to merchant-filtered order lines, not storage or settings changes. |
| Background jobs | Repository-wide storage/settings searches | No photo or settings background job implementation found in this repository; hosted job configuration was not checked. |

## Runtime verification
- Signed-out public store: all product photos rendered successfully.
- Anonymous listing of a known seller photo folder returned zero files.
- Signed-in owner: listed 12 own files and created a working short-lived signed download URL.
- Signed-in owner's listing of a different folder returned zero files.
- Basic security rescan: no issues found; this excludes deep code analysis.
- Existing pricing and merchant-summary tests: six passed.
- SQL role regression script is retained in src/test/storage-access.sql, but direct execution was blocked by unavailable database credentials. Browser and live-policy checks succeeded instead.

No additional violation of the selected photo/settings access rules was found. No settled records, settings values, example data, or unrelated permissions were changed during this sweep. Existing published signed URLs remain usable by design; this is not a revocation of previously shared links.