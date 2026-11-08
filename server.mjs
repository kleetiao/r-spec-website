import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { OAuth2Client } from "google-auth-library";
import { products } from "./public/products.js";

const port = Number(process.env.PORT || 3000);
const origin = new URL(process.env.PUBLIC_ORIGIN || "http://localhost:" + port).origin;
const secure = origin.startsWith("https:") ? "; Secure" : "";
const googleId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const google = new OAuth2Client(googleId);
const paypalId = process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim() || "";
const paypalSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET?.trim() || "";
const loginEnabled = Boolean(googleId);
const checkoutEnabled = Boolean(paypalId && paypalSecret);
const address = process.env.SHOP_ADDRESS?.trim() || "12 Rizal St., Bacolod";
const latitude = Number(process.env.SHOP_LATITUDE);
const longitude = Number(process.env.SHOP_LONGITUDE);
const hasShopPin = Boolean(process.env.SHOP_LATITUDE?.trim() && process.env.SHOP_LONGITUDE?.trim()) &&
  Number.isFinite(latitude) && Math.abs(latitude) <= 85 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
const sessions = new Map();
const authRequests = new Map();
const orders = new Map();
const attempts = new Map();
const sessionAge = 60 * 60;
const paypalBase = "https://api-m.sandbox.paypal.com";
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/store.js", ["store.js", "text/javascript; charset=utf-8"]],
  ["/products.js", ["products.js", "text/javascript; charset=utf-8"]],
]);

setInterval(() => {
  for (const map of [sessions, authRequests, orders, attempts]) {
    for (const [id, value] of map) {
      if (value.expires <= Date.now()) map.delete(id);
    }
  }
}, 60_000).unref();

function cookie(res, name, value, maxAge) {
  res.appendHeader("Set-Cookie", name + "=" + value + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + maxAge + secure);
}

function readCookie(req, name) {
  return req.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(name + "="))?.slice(name.length + 1);
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request too large.");
  }
  return JSON.parse(body);
}

function cartItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > products.length) return null;
  const seen = new Set();
  const selected = [];
  for (const item of items) {
    const product = products.find(product => product.badge === item?.id);
    const quantity = item?.quantity;
    if (!product || seen.has(product.badge) || !Number.isInteger(quantity) || quantity < 1 || quantity > 9) return null;
    seen.add(product.badge);
    selected.push({ id: product.badge, name: product.name, amount: product.amount, quantity });
  }
  return selected.sort((a, b) => a.id.localeCompare(b.id));
}

async function upstream(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
  const data = await response.json();
  if (!response.ok) throw new Error("Provider request failed.");
  return data;
}

async function paypal(path, method = "GET", body, requestId) {
  const token = await upstream(paypalBase + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(paypalId + ":" + paypalSecret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!token.access_token) throw new Error("PayPal credentials could not be verified.");
  return upstream(paypalBase + path, {
    method,
    headers: {
      Authorization: "Bearer " + token.access_token,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function createOrder(order) {
  const data = await paypal("/v2/checkout/orders", "POST", {
    intent: "CAPTURE",
    purchase_units: [{
      custom_id: order.reference,
      amount: {
        currency_code: "PHP",
        value: (order.total / 100).toFixed(2),
        breakdown: { item_total: { currency_code: "PHP", value: (order.total / 100).toFixed(2) } },
      },
      items: order.items.map(item => ({
        name: item.name,
        quantity: String(item.quantity),
        unit_amount: { currency_code: "PHP", value: (item.amount / 100).toFixed(2) },
      })),
    }],
    payment_source: { paypal: { experience_context: {
      brand_name: "R Spec Parts Marketing",
      user_action: "PAY_NOW",
      return_url: origin + "/?paypal=approved&reference=" + order.reference,
      cancel_url: origin + "/?paypal=cancelled",
    } } },
  }, order.reference);
  const approval = data.links?.find(link => ["payer-action", "approve"].includes(link.rel));
  const url = new URL(approval?.href || "");
  if (!data.id || url.origin !== "https://www.sandbox.paypal.com") throw new Error("PayPal did not return a sandbox approval link.");
  order.id = data.id;
  order.approval = url.href;
  return { url: order.approval };
}

async function captureOrder(order) {
  // Retrying uses the same request ID. A verified response is also retained locally.
  let data = await paypal("/v2/checkout/orders/" + encodeURIComponent(order.id));
  if (data.status !== "COMPLETED") {
    await paypal("/v2/checkout/orders/" + encodeURIComponent(order.id) + "/capture", "POST", {}, "capture-" + order.reference);
    data = await paypal("/v2/checkout/orders/" + encodeURIComponent(order.id));
  }
  const unit = data.purchase_units?.[0];
  const captures = unit?.payments?.captures || [];
  const paid = captures.filter(capture => capture.status === "COMPLETED");
  const total = paid.reduce((sum, capture) => sum + Math.round(Number(capture.amount?.value) * 100), 0);
  if (data.id !== order.id || data.status !== "COMPLETED" || data.purchase_units?.length !== 1 ||
      unit.custom_id !== order.reference || !paid.length ||
      paid.some(capture => capture.amount?.currency_code !== "PHP") || total !== order.total) {
    throw new Error("Payment is awaiting confirmation. Check the PayPal sandbox activity and retry.");
  }
  order.result = { status: "COMPLETED", orderId: order.id, items: order.items.map(({ id, quantity }) => ({ id, quantity })) };
  return order.result;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    const path = url.pathname;
    const sessionId = readCookie(req, "rspec_session");
    let browserId = readCookie(req, "rspec_browser");

    if (req.method === "GET" && files.has(path)) {
      const [file, type] = files.get(path);
      const bytes = await readFile(new URL("./public/" + file, import.meta.url));
      res.writeHead(200, {
        "Content-Type": type, "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache", "Referrer-Policy": "strict-origin-when-cross-origin",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      });
      return res.end(bytes);
    }

    if (req.method === "GET" && path === "/api/config") {
      if (!/^[a-f0-9-]{36}$/.test(browserId || "")) {
        browserId = randomUUID();
        cookie(res, "rspec_browser", browserId, 3 * sessionAge);
      }
      const session = sessions.get(sessionId);
      return json(res, 200, {
        loginEnabled, checkoutEnabled, address,
        map: { latitude: hasShopPin ? latitude : 10.6765, longitude: hasShopPin ? longitude : 122.9509, exact: hasShopPin },
        profile: session?.expires > Date.now() ? session.profile : null,
      });
    }

    if (req.method === "GET" && path === "/api/login/google") {
      if (!loginEnabled) return json(res, 503, { error: "Google login needs a web client ID." });
      authRequests.delete(readCookie(req, "rspec_google_nonce"));
      const nonce = randomUUID();
      authRequests.set(nonce, { expires: Date.now() + 600_000 });
      cookie(res, "rspec_google_nonce", nonce, 600);
      return json(res, 200, { clientId: googleId, nonce });
    }

    if (req.method !== "POST") return json(res, 404, { error: "Page not found." });
    if (req.headers.origin !== origin) return json(res, 403, { error: "Open the site at " + origin + " and try again." });
    if (path === "/api/logout") {
      sessions.delete(sessionId);
      cookie(res, "rspec_session", "", 0);
      return json(res, 200, {});
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return json(res, 415, { error: "Expected JSON." });
    let body;
    try { body = await readJson(req); }
    catch { return json(res, 400, { error: "Invalid request." }); }

    if (path === "/api/login/google") {
      if (!loginEnabled) return json(res, 503, { error: "Google login needs a web client ID." });
      const nonce = readCookie(req, "rspec_google_nonce");
      const request = authRequests.get(nonce);
      if (!request || request.expires <= Date.now()) {
        return json(res, 401, { error: "Your login request expired. Close the dialog and try again." });
      }
      if (typeof body?.credential !== "string" || !body.credential) {
        return json(res, 400, { error: "Google did not send a sign-in credential." });
      }

      let user;
      try {
        const ticket = await google.verifyIdToken({ idToken: body.credential, audience: googleId });
        user = ticket.getPayload();
      } catch {
        return json(res, 401, { error: "Google login could not be verified. Please try again." });
      }
      if (!user?.sub || user.nonce !== nonce || request.expires <= Date.now() || !authRequests.delete(nonce)) {
        return json(res, 401, { error: "Your login request expired. Close the dialog and try again." });
      }

      const profile = {
        name: user.name || "R-Spec member",
        picture: /^https:\/\/[^/]+\.googleusercontent\.com\//i.test(user.picture || "") ? user.picture : "",
      };
      sessions.delete(sessionId);
      const newId = randomUUID();
      sessions.set(newId, { profile, expires: Date.now() + sessionAge * 1000 });
      cookie(res, "rspec_session", newId, sessionAge);
      cookie(res, "rspec_google_nonce", "", 0);
      return json(res, 200, { profile });
    }

    if (path === "/api/checkout") {
      const items = cartItems(body?.items);
      if (!items) return json(res, 400, { error: "Choose 1 to 9 units of each selected product." });
      if (!checkoutEnabled) return json(res, 503, { error: "PayPal checkout needs sandbox credentials in the project settings." });
      if (!/^[a-f0-9-]{36}$/.test(browserId || "")) return json(res, 400, { error: "Reload the page and try again." });
      const key = browserId + JSON.stringify(items);
      let order = attempts.get(key);
      if (!order || order.expires <= Date.now() || order.result) {
        order = {
          reference: randomUUID(), browserId, items, total: items.reduce((sum, item) => sum + item.amount * item.quantity, 0),
          expires: Date.now() + 3 * sessionAge * 1000,
        };
        attempts.set(key, order);
        orders.set(order.reference, order);
      }
      if (order.approval) return json(res, 200, { url: order.approval });
      if (!order.creating) order.creating = createOrder(order).finally(() => { order.creating = null; });
      return json(res, 200, await order.creating);
    }

    if (path === "/api/paypal/capture") {
      const order = orders.get(body?.reference);
      if (!order || order.expires <= Date.now() || order.browserId !== browserId || order.id !== body?.orderId) {
        return json(res, 400, { error: "This checkout session has expired. Check PayPal sandbox activity for the payment status." });
      }
      if (order.result) return json(res, 200, order.result);
      if (!order.capturing) order.capturing = captureOrder(order).finally(() => { order.capturing = null; });
      return json(res, 200, await order.capturing);
    }
    return json(res, 404, { error: "Page not found." });
  } catch {
    return json(res, 502, { error: "The provider could not complete this request. Check the sandbox credentials and try again." });
  }
}).listen(port, "127.0.0.1", () => console.log("R-Spec is ready at " + origin));
