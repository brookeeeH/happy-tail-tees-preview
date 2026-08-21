# Happy Tail Tees — Saturday Square Setup

## Purpose

Connect Angelica's verified Happy Tail Tees Square location to the protected owner portal without sharing passwords or creating a second inventory source.

## Before connection

- Confirm Angelica is signed into the correct Square business account herself.
- Confirm the exact Square location used for Happy Tail Tees sales.
- Export or preserve the current Square catalog before any write authorization.
- Keep the integration in Square Sandbox until catalog mapping and checkout tests pass.
- Confirm the Cloudflare D1 database and private KV image namespace are healthy.
- Store `SESSION_SECRET`, `OWNER_CODE_HASH`, and later `SQUARE_ACCESS_TOKEN` as Worker secrets only.
- Give Angelica her private owner code through an appropriate private channel; do not email or commit it.

## Existing-site reconciliation

For every current website product:

1. Match it to exactly one Square item ID or mark it genuinely missing.
2. Match every color/size option to exactly one Square variation ID.
3. Compare website price and quantity with Square.
4. Upload the approved primary photo to the matched Square item.
5. Preserve the website slug and display category separately from the Square IDs.
6. Block duplicates, ambiguous matches, and unmatched variations for review.

## Acceptance tests

- Angelica signs in and signs out of the owner portal.
- Fundraiser mode turns on with a required name and optional message.
- The public storefront displays the active fundraiser automatically.
- Turning fundraiser mode off removes it from checkout.
- Angelica saves a product draft with at least one variation.
- Unsupported, oversized, or missing photos fail closed.
- A valid approved photo uploads privately and remains unavailable from the public image route while the product is a draft.
- Staging requires an approved photo.
- Square item/variation write is followed by exact read-back.
- One low-stock Sandbox checkout decrements the correct Square variation.
- One simulated POS/event adjustment updates the website through a verified Square webhook.
- A failed Square call leaves the product unpublished with a useful owner-facing error and audit record.

## Potholder source package

Preserved at `../Approved-Brand-Assets/Potholders.zip` with seven supplied images:

- All American Dog Mom Pot Holder
- America 250 Years Pot Holder
- Blue Quilted Pot Holder
- Embroidered Pot Holder
- Green Quilted Pot Holder
- Patriotic Quilted Pot Holder
- Red Quilted Pot Holder

Price and inventory were not included in the email or filename package. Keep all seven in Draft until Angelica confirms whether they are distinct products or variations, their price, exact quantities, fulfillment type, and tax treatment.
