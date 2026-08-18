# Happy Tail Tees Website Mockup — Product-First Hybrid

Created by BOAZ on 2026-08-17 and rebalanced on 2026-08-18 into a product-first storefront. The revision keeps selected Brand Tree context without turning the store into a personal evaluation.

## 2026-08-18 Hybrid Revision

- Leads with shopping, new products, availability, and checkout expectations.
- Adds video-derived dog-shirt products with unconfirmed facts locked from checkout.
- Keeps Angelica's compassion and service themes in a shorter founder section.
- Adds a draft **Happy Tail Stories** area for adoptions, foster dogs, gotcha days, and customer stories.
- Uses two Facebook screenshots supplied by Brooke as draft examples only; Angelica must approve photos and final story copy before publication.

The original `Website-Mockup/` and dated snapshot remain unchanged. This sibling version demonstrates how approved Brand Tree context changes a website without changing product facts, inventory assumptions, or the existing Happy Tail Tees visual assets.

## Brand Tree Impact Applied

- Repositioned the hero around compassion for animals rather than generic pet enthusiasm.
- Made transparency and dependable organization visible in the shopping experience.
- Added a customer promise: animals at the center, honest availability, and practical growth.
- Reframed Angelica's story around “Turning care into organized action.”
- Added gentle encouragement and second-chance language grounded directly in Angelica's answers.
- Added a boundary against rescue, medical, therapeutic, or animal-care claims.
- Shifted calls to action from urgency alone toward relationship, purpose, and growth.
- Preserved HTT's aqua/gray logo direction; no Leslie Burris colors, fonts, botanical artwork, or program styling were copied.

## Purpose

This is a static, interactive mockup—not a live store. It demonstrates a simpler long-term sales model built around Angelica's Facebook speed videos and premade inventory:

1. Angelica creates/receives finished shirts and records a short Facebook drop video.
2. Each shirt/color/size is entered once in Square as a real variation with its actual quantity.
3. The website displays only available variations.
4. Online checkout and in-person/event sales decrement the same Square inventory.
5. Sold-out sizes stop accepting orders without manual website editing.

## Mockup Features

- Mobile-first homepage and product catalog
- “Latest drop” presentation tied to Facebook videos
- Two real Happy Tail products and their validated 2026-08-04 quantities
- Bookmark Pen Holder product from Angelica's existing-site screenshot; price and quantity remain explicitly unconfirmed pending Square setup
- Size-level availability and price differences
- Working product dialog, category filters, cart drawer, and mock checkout message
- Facebook-group link supplied by Brooke
- Clear mockup labels so no one mistakes it for a live store

## Production Recommendation

Use Square as the inventory, catalog, order, customer, and payment source of truth. The lowest-maintenance production path should be evaluated first in this order:

1. Square Online with the Happy Tail domain and a theme adapted from this mockup.
2. A branded front-end connected to Square catalog/checkout only if Square Online cannot match the approved customer experience.
3. Avoid maintaining a second independent catalog or inventory database.

The current mockup intentionally has no Square credentials, API calls, live checkout, taxes, shipping rules, analytics, customer data, or deployment.

## Before Production

- Obtain Angelica's written approval of scope and the review/testimonial exchange.
- Confirm she owns and can access the domain and Square account.
- Export/preserve the existing ZenBusiness/Duda catalog before any migration.
- Confirm Square catalog completeness, location, SKUs, variants, stock, taxes, pickup, shipping, returns, and notification settings.
- Decide whether items are premade-only, made-to-order, or both; never represent made-to-order stock as premade inventory.
- Test one event/POS sale and one online order against the same low-stock variation.
- Validate confirmation, fulfillment, cancellation, refund, sold-out, and restock flows.
- Obtain Angelica's approval before publishing her photos, story, Facebook link, reviews, or business claims.

## Planned Raw-Video Listing Test

Angelica will provide one original Facebook speed-video file for a controlled proof of concept. The target is a simple owner-facing menu/button workflow:

1. Upload one raw product video.
2. Extract candidate products, clear still frames, and spoken product facts.
3. Present each proposed listing for human review and correction.
4. Require confirmed name, category, price, variation, quantity, fulfillment status, and Square item match.
5. Create or update only approved Square-backed website listings.
6. Preserve an audit record of what the video suggested, what Angelica approved, and what was published.

No video-derived listing should auto-publish. Unclear prices, quantities, sizes, colors, duplicate matches, or poor images must fail closed for review.

## Run Locally

Open `index.html` directly, or serve this folder with a local static web server.
