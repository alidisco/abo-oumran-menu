// Menu items exact to the restaurant poster (prices in L.L)
const MENU_ITEMS = [
  { id: "hummus-madkouk", name: "حمص مدقوق", price: 200000, category: "plates" },
  { id: "hummus-tahina", name: "حمص بطحينة", price: 200000, category: "plates" },
  { id: "foul-hamod", name: "فول بحامض", price: 200000, category: "plates" },
  { id: "foul-tahina", name: "فول بطحينة", price: 200000, category: "plates" },
  { id: "fatteh", name: "فتة", price: 250000, category: "plates" },
  { id: "malayzie", name: "ماليزية", price: 250000, category: "plates", isNew: true },
  { id: "box-half", name: "علبة نص كيلو", price: 180000, category: "boxes" },
  { id: "box-kilo", name: "علبة كيلو", price: 350000, category: "boxes" },
  { id: "safri-plate", name: "صحن سفري", price: 250000, category: "boxes" },
  { id: "juice", name: "عصير", price: 50000, category: "drinks" },
];

// Restaurant phone in international format for WhatsApp (Lebanon 03/478350 -> 9613478350)
const WHATSAPP_NUMBER = "9613478350";
const STORAGE_KEY = "abo_oumran_cart_v1";

let activeCategory = "all";
let cart = loadCart();

const menuListEl = document.getElementById("menuList");
const topCartCountEl = document.getElementById("topCartCount");
const stickyCartBarEl = document.getElementById("stickyCartBar");
const stickyCountEl = document.getElementById("stickyCount");
const stickyTotalEl = document.getElementById("stickyTotal");
const cartOverlayEl = document.getElementById("cartOverlay");
const cartDrawerEl = document.getElementById("cartDrawer");
const emptyCartStateEl = document.getElementById("emptyCartState");
const cartItemsListEl = document.getElementById("cartItemsList");
const checkoutFormEl = document.getElementById("checkoutForm");
const drawerFooterEl = document.getElementById("drawerFooter");
const drawerTotalEl = document.getElementById("drawerTotal");
const addressFieldEl = document.getElementById("addressField");
const toastEl = document.getElementById("toast");

let toastTimer = null;

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore storage errors in private browsing
  }
}

function getCartEntries() {
  return MENU_ITEMS.filter((item) => (cart[item.id] || 0) > 0).map((item) => ({
    ...item,
    qty: cart[item.id],
    subtotal: item.price * cart[item.id],
  }));
}

function getCartTotals() {
  const entries = getCartEntries();
  const totalQty = entries.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = entries.reduce((sum, item) => sum + item.subtotal, 0);
  return { entries, totalQty, totalPrice };
}

function updateQuantity(itemId, delta) {
  const nextQty = (cart[itemId] || 0) + delta;
  if (nextQty <= 0) {
    delete cart[itemId];
  } else {
    cart[itemId] = nextQty;
  }
  saveCart();
  renderAll();
}

function removeFromCart(itemId) {
  delete cart[itemId];
  saveCart();
  renderAll();
}

function clearCart() {
  cart = {};
  saveCart();
  renderAll();
  showToast("تم تفريغ السلة");
}

function formatPrice(amount) {
  return `${amount.toLocaleString("en-US")}L.L`;
}

function formatArabicCount(count) {
  if (count === 1) return "صنف واحد";
  if (count === 2) return "صنفان";
  if (count >= 3 && count <= 10) return `${count} أصناف`;
  return `${count} صنف`;
}

function renderMenu() {
  const itemsToShow =
    activeCategory === "all"
      ? MENU_ITEMS
      : MENU_ITEMS.filter((item) => item.category === activeCategory);

  menuListEl.innerHTML = "";

  itemsToShow.forEach((item) => {
    const qty = cart[item.id] || 0;
    const li = document.createElement("li");
    li.className = `menu-item${qty > 0 ? " in-cart" : ""}`;

    const infoDiv = document.createElement("div");
    infoDiv.className = "item-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "item-name";
    nameSpan.textContent = item.name;
    infoDiv.appendChild(nameSpan);

    if (item.isNew) {
      const badge = document.createElement("span");
      badge.className = "new-badge";
      badge.textContent = "جديدنا";
      infoDiv.appendChild(badge);
    }

    const priceSpan = document.createElement("span");
    priceSpan.className = "item-price";
    priceSpan.dir = "ltr";
    priceSpan.textContent = formatPrice(item.price);

    const controlsDiv = document.createElement("div");
    controlsDiv.className = "item-controls";

    if (qty === 0) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "add-btn";
      addBtn.textContent = "+ أضف للسلة";
      addBtn.addEventListener("click", () => {
        updateQuantity(item.id, 1);
        showToast(`تمت إضافة ${item.name} إلى السلة`);
      });
      controlsDiv.appendChild(addBtn);
    } else {
      controlsDiv.appendChild(createStepper(item.id, qty, item.name));
    }

    li.append(infoDiv, priceSpan, controlsDiv);
    menuListEl.appendChild(li);
  });
}

function createStepper(itemId, qty, itemName) {
  const stepper = document.createElement("div");
  stepper.className = "qty-stepper";

  const plusBtn = document.createElement("button");
  plusBtn.type = "button";
  plusBtn.className = "qty-btn";
  plusBtn.textContent = "+";
  plusBtn.setAttribute("aria-label", `زيادة ${itemName}`);
  plusBtn.addEventListener("click", () => updateQuantity(itemId, 1));

  const qtyText = document.createElement("span");
  qtyText.className = "qty-value";
  qtyText.textContent = qty;

  const minusBtn = document.createElement("button");
  minusBtn.type = "button";
  minusBtn.className = "qty-btn minus";
  minusBtn.textContent = "−";
  minusBtn.setAttribute("aria-label", `إنقاص ${itemName}`);
  minusBtn.addEventListener("click", () => updateQuantity(itemId, -1));

  stepper.append(plusBtn, qtyText, minusBtn);
  return stepper;
}

function renderCartDrawer() {
  const { entries, totalQty, totalPrice } = getCartTotals();

  topCartCountEl.textContent = totalQty;
  stickyCountEl.textContent = formatArabicCount(totalQty);
  stickyTotalEl.textContent = formatPrice(totalPrice);
  drawerTotalEl.textContent = formatPrice(totalPrice);

  if (totalQty === 0) {
    stickyCartBarEl.classList.add("hidden");
    emptyCartStateEl.classList.remove("hidden");
    cartItemsListEl.classList.add("hidden");
    checkoutFormEl.classList.add("hidden");
    drawerFooterEl.classList.add("hidden");
    cartItemsListEl.innerHTML = "";
    return;
  }

  stickyCartBarEl.classList.remove("hidden");
  emptyCartStateEl.classList.add("hidden");
  cartItemsListEl.classList.remove("hidden");
  checkoutFormEl.classList.remove("hidden");
  drawerFooterEl.classList.remove("hidden");

  cartItemsListEl.innerHTML = "";
  entries.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "cart-item-row";

    const details = document.createElement("div");
    const title = document.createElement("div");
    title.className = "cart-item-title";
    title.textContent = entry.name;

    const meta = document.createElement("div");
    meta.className = "cart-item-meta";
    meta.textContent = `${entry.qty} × ${formatPrice(entry.price)} = ${formatPrice(entry.subtotal)}`;
    details.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "cart-item-actions";
    actions.appendChild(createStepper(entry.id, entry.qty, entry.name));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-item-btn";
    removeBtn.textContent = "🗑";
    removeBtn.setAttribute("aria-label", `حذف ${entry.name}`);
    removeBtn.addEventListener("click", () => removeFromCart(entry.id));

    actions.appendChild(removeBtn);
    li.append(details, actions);
    cartItemsListEl.appendChild(li);
  });
}

function renderAll() {
  renderMenu();
  renderCartDrawer();
}

function openCart() {
  cartOverlayEl.classList.remove("hidden");
  cartDrawerEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartOverlayEl.classList.add("hidden");
  cartDrawerEl.classList.add("hidden");
  document.body.style.overflow = "";
}

function buildOrderMessage() {
  const { entries, totalPrice } = getCartTotals();
  const orderType =
    document.querySelector('input[name="orderType"]:checked')?.value || "ديلفري";
  const name = document.getElementById("customerName").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const notes = document.getElementById("orderNotes").value.trim();

  const lines = ["السلام عليكم، طلب جديد من قائمة *مطعم أبو عمران*:", ""];
  entries.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name} × ${item.qty} = ${formatPrice(item.subtotal)}`);
  });
  lines.push("");
  lines.push(`*المجموع الكلي:* ${formatPrice(totalPrice)}`);
  lines.push(`*نوع الطلب:* ${orderType}`);
  if (name) lines.push(`*الاسم:* ${name}`);
  if (orderType === "ديلفري" && address) lines.push(`*العنوان:* ${address}`);
  if (notes) lines.push(`*ملاحظات:* ${notes}`);

  return lines.join("\n");
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2200);
}

// Category tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    renderMenu();
  });
});

// Cart drawer triggers
document.getElementById("openCartBtn").addEventListener("click", openCart);
document.getElementById("stickyOpenCartBtn").addEventListener("click", openCart);
document.getElementById("closeCartBtn").addEventListener("click", closeCart);
cartOverlayEl.addEventListener("click", closeCart);
document.getElementById("clearCartBtn").addEventListener("click", clearCart);

// Show/hide address field based on delivery vs pickup
document.querySelectorAll('input[name="orderType"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const isDelivery = radio.value === "ديلفري" && radio.checked;
    addressFieldEl.classList.toggle("hidden", !isDelivery);
  });
});

// Send via WhatsApp
document.getElementById("whatsappOrderBtn").addEventListener("click", () => {
  const { totalQty } = getCartTotals();
  if (totalQty === 0) return;
  const text = encodeURIComponent(buildOrderMessage());
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener");
});

// Copy order text
document.getElementById("copyOrderBtn").addEventListener("click", async () => {
  const { totalQty } = getCartTotals();
  if (totalQty === 0) return;
  const msg = buildOrderMessage();
  try {
    await navigator.clipboard.writeText(msg);
    showToast("تم نسخ تفاصيل الطلب");
  } catch {
    showToast("تعذر النسخ التلقائي");
  }
});

// Escape key closes drawer
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !cartDrawerEl.classList.contains("hidden")) {
    closeCart();
  }
});

renderAll();
