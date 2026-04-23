/* ── main.js — storefront logic ── */

const fmt = n => 'Rs. ' + Number(n).toLocaleString();

// ── Toast
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── Cart badge
function updateBadge() {
  const badge = document.getElementById('cart-badge');
  const count = Cart.count();
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
}

// ── Render cart drawer
function renderDrawer() {
  const list    = document.getElementById('cart-items-list');
  const empty   = document.getElementById('cart-empty-state');
  const footer  = document.getElementById('cart-footer');
  const subtotalEl = document.getElementById('drawer-subtotal');
  const totalEl    = document.getElementById('drawer-total');
  const items = Cart.get();

  list.innerHTML = '';
  if (items.length === 0) {
    empty.style.display  = 'flex';
    footer.style.display = 'none';
    return;
  }
  empty.style.display  = 'none';
  footer.style.display = 'flex';

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="ci-img"><img src="${item.image || '/images/placeholder.jpg'}" alt="${item.name}" onerror="this.src='/images/logo.png'"></div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
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
  subtotalEl.textContent = fmt(sub);
  totalEl.textContent    = fmt(sub + 300);

  // Qty controls
  list.querySelectorAll('.ci-qty-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id  = e.currentTarget.dataset.id;
      const act = e.currentTarget.dataset.action;
      const item = Cart.get().find(i => i.id === id);
      if (!item) return;
      Cart.update(id, act === 'inc' ? Math.min(item.qty + 1, item.stock || 99) : item.qty - 1);
      renderDrawer();
      updateBadge();
    });
  });
  list.querySelectorAll('.ci-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      Cart.remove(e.currentTarget.dataset.id);
      renderDrawer();
      updateBadge();
    });
  });
}

// ── Open / close cart drawer
function openCart()  { document.getElementById('cart-drawer').classList.add('open'); document.getElementById('cart-overlay').classList.add('active'); renderDrawer(); }
function closeCart() { document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('active'); }

document.getElementById('cart-open-btn').addEventListener('click', openCart);
document.getElementById('cart-close-btn').addEventListener('click', closeCart);
document.getElementById('cart-overlay').addEventListener('click', closeCart);

// ── Stock badge helper
function stockBadge(stock) {
  if (stock <= 0)  return '<span class="card-stock stock-out">Sold Out</span>';
  if (stock <= 5)  return `<span class="card-stock stock-low">Only ${stock} left</span>`;
  return '<span class="card-stock stock-in">In Stock</span>';
}

// ── Render product cards
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  if (products.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:60px">No products available yet.</p>';
    return;
  }
  products.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${i * 80}ms`;
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${p.image_url || ''}" alt="${p.name}" loading="lazy" onerror="this.parentElement.style.background='linear-gradient(135deg,var(--bg-elev),var(--bg-card))'">
        ${stockBadge(p.stock)}
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-desc">${p.description}</div>
        <div class="card-footer">
          <div class="card-price">${fmt(p.price)}</div>
          <button class="card-add" data-id="${p.id}" aria-label="Add ${p.name} to cart" ${p.stock <= 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>`;
    // Open modal on card click (not on add button)
    card.addEventListener('click', e => {
      if (!e.target.closest('.card-add')) openModal(p);
    });
    // Quick-add to cart
    card.querySelector('.card-add').addEventListener('click', e => {
      e.stopPropagation();
      Cart.add(p, 1);
      updateBadge();
      showToast(`✓ ${p.name} added to cart`);
    });
    grid.appendChild(card);
  });
}

// ── Product Modal
let currentProduct = null;
let currentQty     = 1;

function openModal(p) {
  currentProduct = p;
  currentQty     = 1;
  document.getElementById('modal-img').src       = p.image_url || '';
  document.getElementById('modal-img').alt       = p.name;
  document.getElementById('modal-name').textContent  = p.name;
  document.getElementById('modal-price').textContent = fmt(p.price);
  document.getElementById('modal-desc').textContent  = p.description;
  document.getElementById('modal-notes').textContent = p.notes || '';
  document.getElementById('qty-val').textContent     = 1;

  const stockEl = document.getElementById('modal-stock');
  if (p.stock <= 0)      stockEl.className = 'stock-dot dot-out', stockEl.textContent = 'Sold Out';
  else if (p.stock <= 5) stockEl.className = 'stock-dot dot-low', stockEl.textContent = `Only ${p.stock} left`;
  else                   stockEl.className = 'stock-dot dot-in',  stockEl.textContent = 'In Stock';

  document.getElementById('modal-add-btn').disabled = p.stock <= 0;
  document.getElementById('product-modal').classList.add('active');
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('active');
  document.getElementById('modal-overlay').classList.remove('active');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', closeModal);

document.getElementById('qty-minus').addEventListener('click', () => {
  if (currentQty > 1) { currentQty--; document.getElementById('qty-val').textContent = currentQty; }
});
document.getElementById('qty-plus').addEventListener('click', () => {
  if (currentProduct && currentQty < currentProduct.stock) { currentQty++; document.getElementById('qty-val').textContent = currentQty; }
});
document.getElementById('modal-add-btn').addEventListener('click', () => {
  if (!currentProduct) return;
  Cart.add(currentProduct, currentQty);
  updateBadge();
  showToast(`✓ ${currentProduct.name} × ${currentQty} added to cart`);
  closeModal();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCart(); } });

// ── Search & Fetch products
let allProducts = [];

function setupSearch() {
  const searchInput = document.getElementById('product-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderProducts(allProducts);
      return;
    }

    const filtered = allProducts.filter(p => {
      const n = (p.name || '').toLowerCase();
      const nt = (p.notes || '').toLowerCase();
      const d = (p.description || '').toLowerCase();
      return n.includes(term) || nt.includes(term) || d.includes(term);
    });

    renderProducts(filtered);
  });
}

async function loadProducts() {
  try {
    const res  = await fetch('/api/products');
    allProducts = await res.json();
    renderProducts(allProducts);
    setupSearch();
  } catch (err) {
    document.getElementById('product-grid').innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:var(--danger);padding:60px">Failed to load products. Please refresh.</p>';
  }
}

// ── Init
updateBadge();
loadProducts();
