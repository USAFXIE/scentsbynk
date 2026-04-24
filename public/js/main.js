/* ── main.js — Storefront Logic ── */

const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString();

// ── Toast
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── Cart Badge
function updateBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = Cart.count();
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
}

// ── Render Cart Drawer
function renderDrawer() {
  const list = document.getElementById('cart-items-list');
  const empty = document.getElementById('cart-empty-state');
  const footer = document.getElementById('cart-footer');
  const subtotalEl = document.getElementById('drawer-subtotal');
  const totalEl = document.getElementById('drawer-total');
  if (!list || !empty || !footer) return;

  const items = Cart.get();

  list.innerHTML = '';
  if (items.length === 0) {
    empty.style.display = 'flex';
    footer.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  footer.style.display = 'flex';

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="ci-img">
        <img src="${item.image || './images/logo.png'}" alt="${item.name}" onerror="this.src='./images/logo.png'">
      </div>
      <div class="ci-info">
        <div class="ci-name">${item.name || 'Product'}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        <div class="ci-controls">
          <button class="ci-qty-btn" data-id="${item.id}" data-action="dec">−</button>
          <span class="ci-qty">${item.qty}</span>
          <button class="ci-qty-btn" data-id="${item.id}" data-action="inc">+</button>
          <button class="ci-remove" data-id="${item.id}" aria-label="Remove">×</button>
        </div>
      </div>`;
    list.appendChild(div);
  });

  const sub = Cart.subtotal();
  if (subtotalEl) subtotalEl.textContent = fmt(sub);
  if (totalEl) totalEl.textContent = fmt(sub + 300);

  // Qty events
  list.querySelectorAll('.ci-qty-btn').forEach(btn => {
    btn.onclick = (e) => {
      const id = e.currentTarget.dataset.id;
      const act = e.currentTarget.dataset.action;
      const item = Cart.get().find(i => i.id === id);
      if (!item) return;
      Cart.update(id, act === 'inc' ? Math.min(item.qty + 1, item.stock || 99) : item.qty - 1);
      renderDrawer();
      updateBadge();
    };
  });
  list.querySelectorAll('.ci-remove').forEach(btn => {
    btn.onclick = (e) => {
      Cart.remove(e.currentTarget.dataset.id);
      renderDrawer();
      updateBadge();
    };
  });
}

// ── Cart Drawer Controls
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('active');
  renderDrawer();
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('active');
}

const cartOpenBtn = document.getElementById('cart-open-btn');
const cartCloseBtn = document.getElementById('cart-close-btn');
const cartOverlay = document.getElementById('cart-overlay');

if (cartOpenBtn) cartOpenBtn.onclick = openCart;
if (cartCloseBtn) cartCloseBtn.onclick = closeCart;
if (cartOverlay) cartOverlay.onclick = closeCart;

// ── Stock Badge
function stockBadge(stock = 0) {
  if (stock <= 0) return '<span class="card-stock stock-out">Sold Out</span>';
  if (stock <= 5) return `<span class="card-stock stock-low">Only ${stock} left</span>`;
  return '<span class="card-stock stock-in">In Stock</span>';
}

// ── Render Products
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  const spinner = document.getElementById('loading-spinner');
  if (!grid) return;
  if (spinner) spinner.style.display = 'none';

  grid.innerHTML = '';
  if (!products || products.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:60px">No products found.</p>';
    return;
  }

  products.forEach((p, i) => {
    // Fallback: Supabase field is 'image', but handle image_url just in case
    const imgUrl = p.image || p.image_url || './images/logo.png';
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${i * 60}ms`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${imgUrl}" alt="${p.name || 'Fragrance'}" loading="lazy" onerror="this.src='./images/logo.png'">
        ${stockBadge(p.stock)}
      </div>
      <div class="card-body">
        <div class="card-name">${p.name || 'Unknown Fragrance'}</div>
        <div class="card-desc">${p.description || 'Premium scent by NK. SCENTS'}</div>
        <div class="card-footer">
          <div class="card-price">${fmt(p.price)}</div>
          <button class="card-add" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;

    card.onclick = (e) => {
      if (!e.target.classList.contains('card-add')) openModal(p);
    };

    card.querySelector('.card-add').onclick = (e) => {
      e.stopPropagation();
      Cart.add(p, 1);
      updateBadge();
      showToast(`✓ Added ${p.name} to cart`);
    };

    grid.appendChild(card);
  });
}

// ── Product Modal
let currentProduct = null;
let currentQty = 1;

function openModal(p) {
  currentProduct = p;
  currentQty = 1;

  const img = document.getElementById('modal-img');
  const name = document.getElementById('modal-name');
  const price = document.getElementById('modal-price');
  const desc = document.getElementById('modal-desc');
  const notes = document.getElementById('modal-notes');
  const qtyVal = document.getElementById('qty-val');
  const stockDot = document.getElementById('modal-stock');
  const addBtn = document.getElementById('modal-add-btn');

  if (img) {
    img.src = p.image || p.image_url || './images/logo.png';
    img.onerror = () => { img.src = './images/logo.png'; };
  }
  if (name) name.textContent = p.name || '';
  if (price) price.textContent = fmt(p.price);
  if (desc) desc.textContent = p.description || 'No description available.';
  if (notes) {
    notes.textContent = p.notes || 'Notes not specified.';
    document.getElementById('modal-notes-wrap').style.display = p.notes ? 'block' : 'none';
  }
  if (qtyVal) qtyVal.textContent = 1;

  if (stockDot) {
    if (p.stock <= 0) {
      stockDot.className = 'stock-dot dot-out';
      stockDot.textContent = 'Sold Out';
    } else if (p.stock <= 5) {
      stockDot.className = 'stock-dot dot-low';
      stockDot.textContent = `Only ${p.stock} left`;
    } else {
      stockDot.className = 'stock-dot dot-in';
      stockDot.textContent = 'In Stock';
    }
  }

  if (addBtn) addBtn.disabled = p.stock <= 0;

  document.getElementById('product-modal').classList.add('active');
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('active');
  document.getElementById('modal-overlay').classList.remove('active');
}

const modalClose = document.getElementById('modal-close');
const modalOverlay = document.getElementById('modal-overlay');
if (modalClose) modalClose.onclick = closeModal;
if (modalOverlay) modalOverlay.onclick = closeModal;

document.getElementById('qty-minus').onclick = () => {
  if (currentQty > 1) {
    currentQty--;
    document.getElementById('qty-val').textContent = currentQty;
  }
};
document.getElementById('qty-plus').onclick = () => {
  const max = (currentProduct && currentProduct.stock) || 99;
  if (currentQty < max) {
    currentQty++;
    document.getElementById('qty-val').textContent = currentQty;
  }
};
document.getElementById('modal-add-btn').onclick = () => {
  if (!currentProduct) return;
  Cart.add(currentProduct, currentQty);
  updateBadge();
  showToast(`✓ Added ${currentQty} ${currentProduct.name} to cart`);
  closeModal();
};

// ── Search Logic
let allProducts = [];

function setupSearch() {
  const searchInput = document.getElementById('product-search');
  if (!searchInput) return;

  searchInput.oninput = (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderProducts(allProducts);
      return;
    }
    const filtered = allProducts.filter(p => {
      const n = (p.name || '').toLowerCase();
      const d = (p.description || '').toLowerCase();
      const nt = (p.notes || '').toLowerCase();
      return n.includes(term) || d.includes(term) || nt.includes(term);
    });
    renderProducts(filtered);
  };
}

// ── Fetch Products
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Fetch failed');
    allProducts = await res.json();
    console.log("Loaded products:", allProducts);
    renderProducts(allProducts);
    setupSearch();
  } catch (err) {
    console.error("Supabase load error:", err);
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--danger);padding:60px">Failed to load products. Please check your connection.</p>';
    }
  }
}

// ── Initialization
document.addEventListener('DOMContentLoaded', () => {
  updateBadge();
  loadProducts();
});

// ESC key to close everything
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeCart();
  }
});
