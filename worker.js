const COOKIE = "htt_owner_session";
const SESSION_SECONDS = 60 * 60 * 8;
const SQUARE_VERSION = "2026-07-15";
const encoder = new TextEncoder();

const json = (status, value) => Response.json(value, { status, headers: {
  "cache-control": "no-store", "x-content-type-options": "nosniff"
}});

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized + "===".slice((normalized.length + 3) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function digest(value) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function equal(left, right) {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

function cookie(request, name) {
  for (const item of (request.headers.get("cookie") || "").split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

async function session(request, env) {
  const raw = cookie(request, COOKIE);
  const split = raw.lastIndexOf(".");
  if (split < 1 || !env.SESSION_SECRET) return null;
  const payload = raw.slice(0, split);
  if (!equal(raw.slice(split + 1), await sign(env.SESSION_SECRET, payload))) return null;
  try {
    const value = JSON.parse(new TextDecoder().decode(decodeBase64url(payload)));
    return value.expires > Date.now() && value.actor ? value : null;
  } catch { return null; }
}

async function newSession(actor, secret) {
  const payload = base64url(encoder.encode(JSON.stringify({ actor, expires: Date.now() + SESSION_SECONDS * 1000 })));
  return `${payload}.${await sign(secret, payload)}`;
}

function safeText(value, max = 200) {
  const result = String(value ?? "").trim();
  if (result.length > max) throw Object.assign(new Error(`Text exceeds ${max} characters.`), { status: 400 });
  return result;
}

function parseVariations(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw Object.assign(new Error("At least one variation is required."), { status: 400 });
  const seen = new Set();
  return value.map((item, index) => {
    const name = safeText(item?.name, 100);
    const priceCents = Number(item?.priceCents);
    const quantity = Number(item?.quantity);
    if (!name || seen.has(name.toLowerCase())) throw Object.assign(new Error(`Variation ${index + 1} needs a unique name.`), { status: 400 });
    if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 10000000) throw Object.assign(new Error(`Variation ${name} has an invalid price.`), { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) throw Object.assign(new Error(`Variation ${name} has an invalid quantity.`), { status: 400 });
    seen.add(name.toLowerCase());
    return { name, priceCents, quantity, squareVariationId: safeText(item?.squareVariationId, 100) || null };
  });
}

async function audit(env, actor, action, entityType, entityId, detail = {}) {
  await env.STORE_DB.prepare("INSERT INTO audit_log (actor, action, entity_type, entity_id, detail_json) VALUES (?, ?, ?, ?, ?)")
    .bind(actor, action, entityType, entityId, JSON.stringify(detail)).run();
}

function normalizeProduct(row) {
  return { ...row, variations: JSON.parse(row.variations_json), variations_json: undefined };
}

async function squareRequest(env, path, init = {}) {
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) throw Object.assign(new Error("Square is not connected. Complete the authorized setup first."), { status: 409 });
  const environment = env.SQUARE_ENVIRONMENT === "production" ? "connect.squareup.com" : "connect.squareupsandbox.com";
  const response = await fetch(`https://${environment}${path}`, { ...init, headers: {
    Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`, "Square-Version": SQUARE_VERSION,
    "Content-Type": "application/json", ...(init.headers || {})
  }});
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.errors?.[0]?.detail || `Square returned HTTP ${response.status}.`), { status: 502 });
  return body;
}

async function squareHealth(env) {
  const configured = Boolean(env.SQUARE_ACCESS_TOKEN && env.SQUARE_LOCATION_ID);
  if (!configured) return { configured: false, connected: false, mode: "draft-only" };
  const result = await squareRequest(env, `/v2/locations/${encodeURIComponent(env.SQUARE_LOCATION_ID)}`);
  return { configured: true, connected: true, mode: env.SQUARE_ENVIRONMENT || "sandbox", location: result.location?.name || "Verified location" };
}

async function handlePublic(url, env) {
  if (url.pathname === "/api/storefront/settings") {
    const row = await env.STORE_DB.prepare("SELECT fundraiser_enabled, fundraiser_name, fundraiser_message, updated_at FROM store_settings WHERE id = 1").first();
    return json(200, { fundraiser: { enabled: Boolean(row?.fundraiser_enabled), name: row?.fundraiser_name || "", message: row?.fundraiser_message || "" } });
  }
  if (url.pathname.startsWith("/api/storefront/images/")) {
    const key = decodeURIComponent(url.pathname.slice("/api/storefront/images/".length));
    if (!key || key.includes("..")) return json(400, { error: "Invalid image key." });
    const published = await env.STORE_DB.prepare("SELECT id,image_type FROM product_drafts WHERE image_key=? AND status='published'").bind(key).first();
    if (!published) return json(404, { error: "Image not found." });
    const object = await env.PRODUCT_IMAGES.get(key, { type: "arrayBuffer" });
    if (!object) return json(404, { error: "Image not found." });
    return new Response(object, { headers: { "content-type": published.image_type || "application/octet-stream", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
  }
  return null;
}

async function handleOwner(request, url, env, actor) {
  if (request.method === "GET" && url.pathname.startsWith("/api/owner/images/")) {
    const key = decodeURIComponent(url.pathname.slice("/api/owner/images/".length));
    if (!key || key.includes("..")) return json(400, { error: "Invalid image key." });
    const owned = await env.STORE_DB.prepare("SELECT id,image_type FROM product_drafts WHERE image_key=?").bind(key).first();
    if (!owned) return json(404, { error: "Image not found." });
    const object = await env.PRODUCT_IMAGES.get(key, { type: "arrayBuffer" });
    if (!object) return json(404, { error: "Image not found." });
    return new Response(object, { headers: { "content-type": owned.image_type || "application/octet-stream", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  }
  if (request.method === "GET" && url.pathname === "/api/owner/bootstrap") {
    const [settings, products, square] = await Promise.all([
      env.STORE_DB.prepare("SELECT * FROM store_settings WHERE id = 1").first(),
      env.STORE_DB.prepare("SELECT * FROM product_drafts ORDER BY display_order, updated_at DESC").all(),
      squareHealth(env).catch(error => ({ configured: true, connected: false, mode: "error", error: error.message }))
    ]);
    return json(200, { actor, settings: { fundraiserEnabled: Boolean(settings.fundraiser_enabled), fundraiserName: settings.fundraiser_name, fundraiserMessage: settings.fundraiser_message }, products: products.results.map(normalizeProduct), square });
  }
  if (request.method === "PUT" && url.pathname === "/api/owner/settings") {
    const body = await request.json();
    const enabled = Boolean(body.fundraiserEnabled);
    const name = safeText(body.fundraiserName, 120);
    const message = safeText(body.fundraiserMessage, 300);
    if (enabled && !name) return json(400, { error: "Enter the active fundraiser name before turning fundraiser mode on." });
    await env.STORE_DB.prepare("UPDATE store_settings SET fundraiser_enabled=?, fundraiser_name=?, fundraiser_message=?, updated_at=CURRENT_TIMESTAMP, updated_by=? WHERE id=1")
      .bind(enabled ? 1 : 0, name, message, actor).run();
    await audit(env, actor, "settings.updated", "store", "settings", { enabled, name });
    return json(200, { ok: true });
  }
  if (request.method === "POST" && url.pathname === "/api/owner/products") {
    const body = await request.json();
    const id = safeText(body.id, 80) || crypto.randomUUID();
    const name = safeText(body.name, 160);
    const description = safeText(body.description, 2000);
    const category = safeText(body.category, 60);
    const fulfillment = safeText(body.fulfillment, 30);
    const variations = parseVariations(body.variations);
    if (!name || !category || !["premade", "made_to_order", "both"].includes(fulfillment)) return json(400, { error: "Name, category, and fulfillment are required." });
    const existing = await env.STORE_DB.prepare("SELECT image_key, image_type, square_item_id FROM product_drafts WHERE id=?").bind(id).first();
    await env.STORE_DB.prepare(`INSERT INTO product_drafts (id,name,description,category,fulfillment,image_key,image_type,square_item_id,variations_json,status,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,'draft',?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,fulfillment=excluded.fulfillment,variations_json=excluded.variations_json,status='draft',last_error=NULL,updated_at=CURRENT_TIMESTAMP,updated_by=excluded.updated_by`)
      .bind(id, name, description, category, fulfillment, existing?.image_key || null, existing?.image_type || null, existing?.square_item_id || null, JSON.stringify(variations), actor).run();
    await audit(env, actor, existing ? "product.updated" : "product.created", "product", id, { name, variations: variations.length });
    return json(200, { ok: true, id });
  }
  if (request.method === "POST" && /^\/api\/owner\/products\/[^/]+\/photo$/u.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split("/")[4]);
    const product = await env.STORE_DB.prepare("SELECT id,image_key FROM product_drafts WHERE id=?").bind(id).first();
    if (!product) return json(404, { error: "Save the product before uploading its photo." });
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size) return json(400, { error: "Choose a photo." });
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type) || file.size > 15 * 1024 * 1024) return json(415, { error: "Use a JPEG, PNG, or WebP image no larger than 15 MB." });
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
    const key = `products/${id}/${crypto.randomUUID()}.${extension}`;
    await env.PRODUCT_IMAGES.put(key, await file.arrayBuffer(), { metadata: { contentType: file.type } });
    await env.STORE_DB.prepare("UPDATE product_drafts SET image_key=?,image_type=?,status='draft',updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE id=?").bind(key, file.type, actor, id).run();
    if (product.image_key && product.image_key !== key) await env.PRODUCT_IMAGES.delete(product.image_key);
    await audit(env, actor, "product.photo_uploaded", "product", id, { key, bytes: file.size, type: file.type });
    return json(200, { ok: true, imageUrl: `/api/owner/images/${encodeURIComponent(key)}` });
  }
  if (request.method === "POST" && /^\/api\/owner\/products\/[^/]+\/stage$/u.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split("/")[4]);
    const product = await env.STORE_DB.prepare("SELECT * FROM product_drafts WHERE id=?").bind(id).first();
    if (!product) return json(404, { error: "Product not found." });
    if (!product.image_key) return json(400, { error: "Upload an approved product photo first." });
    await env.STORE_DB.prepare("UPDATE product_drafts SET status='ready_for_square',updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE id=?").bind(actor, id).run();
    await audit(env, actor, "product.staged", "product", id, { squareItemId: product.square_item_id || null });
    return json(200, { ok: true, message: env.SQUARE_ACCESS_TOKEN ? "Ready for guarded Square reconciliation." : "Saved for Square setup; nothing was published." });
  }
  if (request.method === "GET" && url.pathname === "/api/owner/square/health") return json(200, await squareHealth(env));
  return json(404, { error: "Owner endpoint not found." });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const publicResponse = await handlePublic(url, env);
    if (publicResponse) return publicResponse;

    if (url.pathname === "/owner/login" && request.method === "POST") {
      if (!env.SESSION_SECRET || !env.OWNER_CODE_HASH) return json(503, { error: "Owner authentication is not configured." });
      const form = await request.formData();
      if (!equal(await digest(String(form.get("code") || "").trim()), env.OWNER_CODE_HASH)) return new Response("Owner code not recognized.", { status: 401 });
      const value = await newSession(env.OWNER_LABEL || "owner", env.SESSION_SECRET);
      return new Response(null, { status: 303, headers: { location: "/owner/", "set-cookie": `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`, "cache-control": "no-store" } });
    }
    if (url.pathname === "/owner/logout") return new Response(null, { status: 303, headers: { location: "/owner/login.html", "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } });

    const publicOwnerAsset = (request.method === "GET" || request.method === "HEAD") &&
      (url.pathname === "/owner/login" || url.pathname === "/owner/login.html" || url.pathname === "/owner/styles.css");
    if (publicOwnerAsset) return env.ASSETS.fetch(request);
    const ownerRoute = url.pathname === "/owner" || url.pathname.startsWith("/owner/") || url.pathname.startsWith("/api/owner/");
    if (ownerRoute) {
      const active = await session(request, env);
      if (!active) {
        if (url.pathname.startsWith("/api/")) return json(401, { error: "Owner sign-in required." });
        return Response.redirect(new URL("/owner/login.html", request.url), 302);
      }
      if (url.pathname.startsWith("/api/")) {
        try { return await handleOwner(request, url, env, active.actor); }
        catch (error) { console.error(error); return json(error.status || 500, { error: error.status ? error.message : "The request could not be completed." }); }
      }
    }
    return env.ASSETS.fetch(request);
  }
};
