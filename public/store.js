import { products } from "./products.js";

const money = amount => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount / 100);

const art = {
  wheel: `<svg class="product-visual" viewBox="0 0 200 200" fill="none" aria-hidden="true"><circle cx="100" cy="100" r="77" fill="#0a0b0b" stroke="#858980" stroke-width="5"/><circle cx="100" cy="100" r="60" fill="#1b1d1e" stroke="#383b37" stroke-width="5"/><g stroke="#b5b9af" stroke-width="8" stroke-linecap="round"><path d="M100 43v46M100 111v46M43 100h46M111 100h46M60 60l32 32M108 108l32 32M140 60l-32 32M92 108l-32 32"/></g><circle cx="100" cy="100" r="21" fill="#6a6e65" stroke="#d0d2c9" stroke-width="4"/><circle cx="100" cy="100" r="7" fill="#222"/></svg>`,
  splitter: `<svg class="product-visual" viewBox="0 0 200 200" fill="none" aria-hidden="true"><path d="M32 111 52 67l20-15h57l25 23 15 38-18 24H47l-15-26Z" fill="#242725" stroke="#a2a69c" stroke-width="4"/><path d="m51 111 21-38 14-8h46l17 13 10 30-11 12H61l-10-9Z" fill="#50534c"/><path d="M42 120h124l-13 16H54l-12-16Z" fill="#ff5b28"/><path d="M72 137h65l9 8H64l8-8Z" fill="#181a19" stroke="#7b7e76" stroke-width="3"/></svg>`,
  spring: `<svg class="product-visual" viewBox="0 0 200 200" fill="none" aria-hidden="true"><path d="M78 35h44M84 44h32M80 156h40M85 166h30" stroke="#aaada4" stroke-width="7" stroke-linecap="round"/><path d="m86 47 28 11-28 12 28 12-28 12 28 12-28 12 28 12-28 12 28 12" stroke="#ff5b28" stroke-width="9" stroke-linejoin="round"/><path d="M100 42v119" stroke="#858980" stroke-width="5"/><path d="M75 43h50M74 160h52" stroke="#ddd" stroke-width="5"/></svg>`,
  mirror: `<svg class="product-visual" viewBox="0 0 200 200" fill="none" aria-hidden="true"><path d="M66 60c15-13 46-17 70-4 17 9 28 26 25 43-2 13-16 22-31 29l-29 15c-13 7-29 6-38-3-10-10-12-27-12-43 0-15 4-28 15-37Z" fill="#272a28" stroke="#adb0a6" stroke-width="4"/><path d="M76 68c13-10 38-12 56-2 12 7 19 19 17 30-2 9-13 16-25 22l-26 14c-9 5-18 4-24-2-7-7-8-20-8-32 0-13 2-23 10-30Z" fill="#41443f" stroke="#62665e" stroke-width="3"/><path d="m86 79 44-8M78 96l66-13M81 112l53-11" stroke="#7f837a" stroke-width="3" opacity=".8"/><path d="M60 120 42 146l19 4 22-29" fill="#ff5b28"/></svg>`,
};
const productGrid = document.getElementById("products");
let toastTimer;
function renderProducts(category = "all") {
  const shown = products.filter(
    (item) => category === "all" || item.category === category,
  );
  productGrid.innerHTML = shown.length
    ? shown
        .map(
          (item) =>
            `<article class="product-card"><div class="product-art">${art[item.art]}</div><div class="product-info"><div class="product-type">${item.type} / RS-${item.badge}</div><div class="product-name">${item.name}</div><div class="product-bottom"><span class="price">${money(item.amount)}</span><button class="add-button" type="button" aria-label="Add ${item.name} to bag" data-add="${item.badge}">+</button></div></div></article>`,
        )
        .join("")
    : `<div class="no-results">No parts in this category yet.</div>`;
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
document.querySelector(".filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  document
    .querySelectorAll(".filter")
    .forEach((filter) =>
      filter.classList.toggle("active", filter === button),
    );
  renderProducts(button.dataset.filter);
});

const byId = id => document.getElementById(id);
const bagDialog = byId("bagDialog");
const loginDialog = byId("loginDialog");
const checkoutButton = byId("checkoutButton");
let profile;
let checkoutEnabled = false;
let openingCheckout = false;
const cart = new Map();

try {
  const saved = JSON.parse(sessionStorage.getItem("rspec-bag") || "{}");
  for (const { badge } of products) {
    const quantity = saved[badge];
    if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 9) cart.set(badge, quantity);
  }
} catch {
  // The bag also works for the current page when storage is unavailable.
}

function saveCart() {
  byId("cartCount").textContent = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  try {
    sessionStorage.setItem("rspec-bag", JSON.stringify(Object.fromEntries(cart)));
  } catch {
    // The in-memory bag is still available.
  }
}

function renderBag() {
  const list = byId("bagItems");
  let total = 0;
  list.replaceChildren();
  for (const product of products) {
    const quantity = cart.get(product.badge);
    if (!quantity) continue;
    const subtotal = product.amount * quantity;
    total += subtotal;
    const row = document.createElement("li");
    row.textContent = product.name + " · " + money(subtotal);
    const label = document.createElement("label");
    label.textContent = "Quantity (0 removes)";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "9";
    input.value = quantity;
    input.setAttribute("aria-label", "Quantity for " + product.name + " (0 removes)");
    input.addEventListener("change", () => {
      const next = input.valueAsNumber;
      if (!Number.isInteger(next) || next < 0 || next > 9) {
        input.value = cart.get(product.badge);
        return;
      }
      if (next === 0) cart.delete(product.badge);
      else cart.set(product.badge, next);
      saveCart();
      renderBag();
      const focusTarget = byId(input.id) || bagDialog.querySelector(".close-dialog");
      focusTarget.focus();
    });
    input.id = "quantity-" + product.badge;
    label.append(input);
    row.append(label);
    list.append(row);
  }
  byId("bagTotal").textContent = cart.size ? "Subtotal " + money(total) : "Your bag is empty.";
  checkoutButton.disabled = !checkoutEnabled || !cart.size || openingCheckout;
}

productGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const id = button.dataset.add;
  const quantity = cart.get(id) || 0;
  if (quantity === 9) return showToast("You can add up to 9 of this part.");
  cart.set(id, quantity + 1);
  saveCart();
  showToast("Added to your bag.");
});

byId("bagButton").addEventListener("click", () => {
  renderBag();
  byId("bagStatus").textContent = checkoutEnabled
    ? "PayPal Sandbox checkout uses test funds."
    : "Online checkout is being prepared.";
  bagDialog.showModal();
});


async function api(path, body) {
  const options = body === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

checkoutButton.addEventListener("click", async () => {
  openingCheckout = true;
  checkoutButton.disabled = true;
  byId("bagStatus").textContent = "Opening PayPal Sandbox…";
  try {
    const items = [...cart].map(([id, quantity]) => ({ id, quantity }));
    const { url } = await api("/api/checkout", { items });
    location.assign(url);
  } catch (error) {
    byId("bagStatus").textContent = error.message || "Checkout is unavailable. Please try again.";
    openingCheckout = false;
    renderBag();
  }
});

function showProfile(user) {
  profile = user;
  byId("member").hidden = !user;
  byId("loginButton").textContent = user ? "My garage" : "Log in";
  byId("accountChip").classList.toggle("visible", Boolean(user?.picture));
  byId("accountName").textContent = user?.name || "";
  byId("profileName").textContent = user?.name || "";
  byId("profileInitial").textContent = user?.name?.charAt(0).toUpperCase() || "";
  const avatar = byId("profilePicture");
  const initial = byId("profileInitial");
  avatar.hidden = true;
  initial.hidden = false;
  avatar.onload = () => { avatar.hidden = false; initial.hidden = true; };
  avatar.onerror = () => { avatar.hidden = true; initial.hidden = false; };
  for (const image of [avatar, byId("accountPicture")]) {
    if (user?.picture) image.src = user.picture;
    else image.removeAttribute("src");
  }
}

byId("loginButton").addEventListener("click", () => {
  if (profile) {
    byId("member").scrollIntoView();
    byId("welcomeTitle").focus({ preventScroll: true });
    return;
  }
  loginDialog.showModal();
});

byId("logoutButton").addEventListener("click", async () => {
  try {
    await api("/api/logout", {});
    showProfile(null);
    byId("loginButton").focus();
  } catch (error) {
    byId("memberStatus").textContent = error.message;
  }
});

function setupMap({ address, map }) {
  byId("mapStatus").textContent = address + (map.exact ? "" : " · Map shows the Bacolod area. Shop pin awaiting confirmation.");
  const view = new URL("https://www.openstreetmap.org/search");
  view.searchParams.set("query", address);
  byId("directionsLink").href = view.href;
  byId("directionsLink").hidden = false;
  const extent = map.exact ? 0.006 : 0.025;
  const embed = new URL("https://www.openstreetmap.org/export/embed.html");
  embed.searchParams.set("bbox", [
    map.longitude - extent, map.latitude - extent,
    map.longitude + extent, map.latitude + extent,
  ].join(","));
  embed.searchParams.set("layer", "mapnik");
  if (map.exact) embed.searchParams.set("marker", map.latitude + "," + map.longitude);
  byId("storeMap").src = embed.href;
  byId("storeMap").title = map.exact ? "R Spec shop map" : "Bacolod area map";
  byId("storeMap").hidden = false;
}

function showNotice(message) {
  byId("paymentNotice").textContent = message;
  byId("paymentNotice").hidden = false;
}

const returnParams = new URL(location.href).searchParams;
const paypalResult = returnParams.get("paypal");
const orderId = returnParams.get("token");
const reference = returnParams.get("reference");
const loginResult = returnParams.get("login");
let capturePending = false;

async function confirmPayment() {
  if (capturePending) return;
  capturePending = true;
  byId("retryPayment").hidden = true;
  showNotice("Confirming your PayPal Sandbox payment…");
  try {
    const payment = await api("/api/paypal/capture", { reference, orderId });
    // Record before changing the bag so refresh cannot remove items a second time.
    const receiptKey = "rspec-receipt-" + payment.orderId;
    let alreadyApplied = true;
    try {
      alreadyApplied = sessionStorage.getItem(receiptKey) === "applied";
      sessionStorage.setItem(receiptKey, "applied");
    } catch {
      // Preserve the bag when storage cannot track whether this receipt was applied.
    }
    if (!alreadyApplied) {
      for (const item of payment.items) {
        const remaining = (cart.get(item.id) || 0) - item.quantity;
        if (remaining > 0) cart.set(item.id, remaining);
        else cart.delete(item.id);
      }
      saveCart();
      renderBag();
    }
    showNotice("PayPal Sandbox payment confirmed. Order " + payment.orderId + ".");
    history.replaceState(null, "", "/#shop");
  } catch (error) {
    showNotice(error.message || "Payment confirmation is unavailable. Check your PayPal Sandbox activity.");
    byId("retryPayment").hidden = false;
  } finally {
    capturePending = false;
  }
}

byId("retryPayment").addEventListener("click", confirmPayment);
byId("year").textContent = new Date().getFullYear();
saveCart();
renderProducts();
api("/api/config").then(config => {
  checkoutEnabled = config.checkoutEnabled;
  renderBag();
  showProfile(config.profile);
  byId("githubLogin").hidden = !config.loginEnabled;
  byId("loginStatus").textContent = config.loginEnabled
    ? "Continue with your GitHub account to open your garage."
    : "Member login is being prepared.";
  setupMap(config);
  if (paypalResult === "approved" && orderId && reference) confirmPayment();
  else if (paypalResult === "cancelled") showNotice("Checkout cancelled. Your bag is ready when you are.");
  else if (loginResult === "success" && config.profile) showToast("Welcome to your R Spec garage.");
  else if (["expired", "cancelled", "failed", "setup"].includes(loginResult)) {
    const messages = {
      expired: "Your login request expired. Please try again.",
      cancelled: "GitHub login cancelled. You can try again.",
      failed: "GitHub login could not be verified. Please try again.",
      setup: "Member login is being prepared.",
    };
    showNotice(messages[loginResult]);
  }
}).catch(() => {
  byId("mapStatus").textContent = "Shop information is temporarily unavailable. Please reload.";
});
