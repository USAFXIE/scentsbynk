/* ── main.js — FIXED & CLEAN ── */

const fmt = n => 'Rs. ' + Number(n || 0).toLocaleString();

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

// ── Stock badge
function stockBadge(stock = 0) {
  if (stock <= 0) return '<span class="card-stock stock-out">Sold Out</span>';
  if (stock <= 5) return `<span class="card-stock stock-low">Only ${stock} left</span>`;
  return '<span class="card-stock stock-in">In Stock</span>';
}

// ── Render products
function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';

  if (!products || products.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px">No products available.</p>';
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';

    ```
card.innerHTML = `
      < div class="card-img-wrap" >
    <img src="${p.image || '/images/placeholder.jpg'}" alt="${p.name}" 
         onerror="this.src='/images/logo.png'">
    ${stockBadge(p.stock)}
  </div>
  <div class="card-body">
    <div class="card-name">${p.name || 'No name'}</div>
    <div class="card-desc">${p.description || ''}</div>
    <div class="card-footer">
      <div class="card-price">${fmt(p.price)}</div>
      <button class="card-add">+</button>
    </div>
  </div>
    `;

// open modal
card.addEventListener('click', e => {
  if (!e.target.classList.contains('card-add')) openModal(p);
});

// add to cart
card.querySelector('.card-add').addEventListener('click', e => {
  e.stopPropagation();
  Cart.add(p, 1);
  updateBadge();
  showToast(`${ p.name } added to cart`);
});

grid.appendChild(card);
```

  });
}

// ── Modal
let currentProduct = null;

function openModal(p) {
  currentProduct = p;

  document.getElementById('modal-img').src = p.image || '/images/placeholder.jpg';
  document.getElementById('modal-name').textContent = p.name || '';
  document.getElementById('modal-price').textContent = fmt(p.price);
  document.getElementById('modal-desc').textContent = p.description || '';
  document.getElementById('modal-notes').textContent = p.notes || '';

  document.getElementById('product-modal').classList.add('active');
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('active');
  document.getElementById('modal-overlay').classList.remove('active');
}

document.getElementById('modal-close').onclick = closeModal;
document.getElementById('modal-overlay').onclick = closeModal;

// ── Fetch products
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();

    ```
console.log("Loaded products:", data);

renderProducts(data);
```

  } catch (err) {
    console.error(err);
    document.getElementById('product-grid').innerHTML =
      '<p style="color:red;text-align:center">Failed to load products</p>';
  }
}

// ── Init
updateBadge();
loadProducts();
