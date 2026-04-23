/* admin.js — full admin portal logic */

const fmt = n => 'Rs. ' + Number(n).toLocaleString();

// ── Auth guard
async function checkAuth() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) { window.location.href = '/nk-admin-login.html'; return; }
  const data = await res.json();
  document.getElementById('admin-user').textContent = data.username;
}

// ── Toast
function toast(msg, type = 'success') {
  const t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.style.borderColor = type === 'error' ? 'rgba(224,82,82,.4)' : 'var(--border-g)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Section navigation
function switchSection(name) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === name));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'section-' + name));
  document.getElementById('section-heading').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  if (name === 'dashboard') loadStats();
  if (name === 'inventory') loadProducts();
  if (name === 'orders')    loadOrders();
}
document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => switchSection(btn.dataset.section))
);

// ── Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/nk-admin-login.html';
});

// ════════════════════════════
// DASHBOARD
// ════════════════════════════
async function loadStats() {
  const res  = await fetch('/api/auth/stats');
  const data = await res.json();
  document.getElementById('stat-revenue').textContent  = fmt(data.totalRevenue);
  document.getElementById('stat-orders').textContent   = data.totalOrders;
  document.getElementById('stat-pending').textContent  = data.pendingOrders;
  document.getElementById('stat-products').textContent = data.totalProducts;
  renderRecentOrders(data.recentOrders || []);
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recent-orders-body');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:24px">No orders yet</td></tr>'; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><code style="color:var(--gold);font-size:12px">${o.id}</code></td>
      <td>${o.customer_name}</td>
      <td>${fmt(o.total)}</td>
      <td><span class="status-badge s-${o.status.toLowerCase()}">${o.status}</span></td>
      <td>${new Date(o.created_at).toLocaleDateString('en-PK')}</td>
    </tr>`).join('');
}

// ════════════════════════════
// INVENTORY
// ════════════════════════════
let allProducts = [];

async function loadProducts() {
  const res = await fetch('/api/products/admin/all');
  allProducts = await res.json();
  renderProducts();
}

function renderProducts() {
  const tbody = document.getElementById('products-body');
  if (!allProducts.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:24px">No products yet</td></tr>'; return; }
  tbody.innerHTML = allProducts.map(p => {
    const margin = p.price && p.cost_price ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0;
    const stockColor = p.stock <= 0 ? 'var(--danger)' : p.stock <= 5 ? 'var(--warn)' : 'var(--success)';
    return `<tr style="${p.hidden ? 'opacity:.45' : ''}">
      <td><img src="${p.image_url || '/images/logo.png'}" class="thumb" onerror="this.src='/images/logo.png'"></td>
      <td><strong>${p.name}</strong></td>
      <td>${fmt(p.price)}</td>
      <td style="color:var(--text-3)">${p.cost_price ? fmt(p.cost_price) : '—'}</td>
      <td><span style="color:${margin >= 40 ? 'var(--success)' : margin >= 20 ? 'var(--warn)' : 'var(--danger)'}">${p.cost_price ? margin + '%' : '—'}</span></td>
      <td><span style="color:${stockColor}">${p.stock}</span></td>
      <td>${p.hidden ? '<span class="status-badge s-canceled">Hidden</span>' : '<span class="status-badge s-completed">Active</span>'}</td>
      <td class="action-btns">
        <button class="act-btn act-edit" onclick="openProductForm('${p.id}')">Edit</button>
        <button class="act-btn ${p.hidden ? 'act-show' : 'act-hide'}" onclick="toggleHide('${p.id}',${p.hidden})">${p.hidden ? 'Show' : 'Hide'}</button>
      </td>
    </tr>`;
  }).join('');
}

async function toggleHide(id, currentHidden) {
  await fetch(`/api/products/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ hidden: currentHidden ? 0 : 1 }) });
  toast(currentHidden ? 'Product shown on storefront' : 'Product hidden from storefront');
  loadProducts();
}

// ── Product Form Modal
function openProductForm(id = null) {
  const form = document.getElementById('product-form');
  form.reset();
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('upload-text').textContent   = 'Click to upload image';
  document.getElementById('edit-product-id').value     = '';
  document.getElementById('product-form-title').textContent = id ? 'Edit Product' : 'Add Product';

  if (id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('edit-product-id').value = p.id;
    document.getElementById('pf-name').value   = p.name;
    document.getElementById('pf-price').value  = p.price;
    document.getElementById('pf-cost').value   = p.cost_price;
    document.getElementById('pf-stock').value  = p.stock;
    document.getElementById('pf-desc').value   = p.description;
    document.getElementById('pf-notes').value  = p.notes;
    document.getElementById('pf-image-url').value = p.image_url;
    if (p.image_url) {
      const prev = document.getElementById('img-preview');
      prev.src = p.image_url;
      prev.style.display = 'block';
      document.getElementById('upload-text').textContent = 'Click to change image';
    }
  }
  document.getElementById('product-form-overlay').classList.add('active');
  document.getElementById('product-form-modal').classList.add('active');
}
function closeProductForm() {
  document.getElementById('product-form-overlay').classList.remove('active');
  document.getElementById('product-form-modal').classList.remove('active');
}
document.getElementById('add-product-btn').addEventListener('click', () => openProductForm(null));
document.getElementById('product-form-close').addEventListener('click', closeProductForm);
document.getElementById('product-form-cancel').addEventListener('click', closeProductForm);
document.getElementById('product-form-overlay').addEventListener('click', closeProductForm);

// Image upload
document.getElementById('upload-area').addEventListener('click', () => document.getElementById('pf-image').click());
document.getElementById('pf-image').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const fd = new FormData(); fd.append('image', file);
  try {
    const res  = await fetch('/api/upload', { method:'POST', body: fd });
    const data = await res.json();
    document.getElementById('pf-image-url').value = data.url;
    const prev = document.getElementById('img-preview');
    prev.src = data.url; prev.style.display = 'block';
    document.getElementById('upload-text').textContent = file.name;
    toast('Image uploaded');
  } catch { toast('Image upload failed', 'error'); }
});

document.getElementById('product-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id    = document.getElementById('edit-product-id').value;
  const body  = {
    name:       document.getElementById('pf-name').value,
    price:      parseFloat(document.getElementById('pf-price').value),
    cost_price: parseFloat(document.getElementById('pf-cost').value || 0),
    stock:      parseInt(document.getElementById('pf-stock').value || 0),
    description:document.getElementById('pf-desc').value,
    notes:      document.getElementById('pf-notes').value,
    image_url:  document.getElementById('pf-image-url').value,
  };
  const url    = id ? `/api/products/${id}` : '/api/products';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  if (res.ok) { toast(id ? 'Product updated' : 'Product created'); closeProductForm(); loadProducts(); }
  else        { toast('Save failed', 'error'); }
});

// ════════════════════════════
// ORDERS
// ════════════════════════════
let allOrders = [];

async function loadOrders() {
  const res = await fetch('/api/orders');
  allOrders = await res.json();
  renderOrders();
}

document.getElementById('order-filter').addEventListener('change', renderOrders);

function renderOrders() {
  const filter = document.getElementById('order-filter').value;
  const orders = filter ? allOrders.filter(o => o.status === filter) : allOrders;
  const tbody  = document.getElementById('orders-body');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:24px">No orders found</td></tr>'; return; }
  tbody.innerHTML = orders.map(o => {
    const itemsSummary = Array.isArray(o.items) ? o.items.map(i => `${i.name} ×${i.qty}`).join(', ') : '';
    const waLink = `https://wa.me/${o.contact1.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${o.customer_name}, your NK. SCENTS order ${o.id} is being processed!`)}`;
    return `<tr>
      <td><code style="color:var(--gold);font-size:12px">${o.id}</code></td>
      <td><strong>${o.customer_name}</strong></td>
      <td>${o.contact1}</td>
      <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${itemsSummary}">${itemsSummary}</td>
      <td style="color:var(--gold)">${fmt(o.total)}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
          ${['Pending','Delayed','Completed','Canceled'].map(s => `<option${s===o.status?' selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${new Date(o.created_at).toLocaleDateString('en-PK')}</td>
      <td class="action-btns">
        <button class="act-btn act-detail" onclick="openOrderDetail('${o.id}')">View</button>
        <button class="act-btn act-invoice" onclick="window.open('/api/orders/${o.id}/invoice','_blank')">Invoice</button>
        <a class="act-btn act-wa" href="${waLink}" target="_blank" rel="noopener">WA</a>
      </td>
    </tr>`;
  }).join('');
}

async function updateOrderStatus(id, status) {
  const res = await fetch(`/api/orders/${id}/status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) });
  if (res.ok) { toast(`Order ${id} → ${status}`); const o = allOrders.find(x => x.id === id); if(o) o.status = status; }
  else toast('Status update failed', 'error');
}

function openOrderDetail(id) {
  const o = allOrders.find(x => x.id === id); if (!o) return;
  const items = Array.isArray(o.items) ? o.items : [];
  document.getElementById('order-detail-content').innerHTML = `
    <div class="order-detail-grid">
      <div class="detail-group"><div class="detail-label">Customer</div><div class="detail-value">${o.customer_name}</div></div>
      <div class="detail-group"><div class="detail-label">Contact</div><div class="detail-value">${o.contact1}${o.contact2 ? ' / '+o.contact2 : ''}</div></div>
      <div class="detail-group" style="grid-column:1/-1"><div class="detail-label">Address</div><div class="detail-value">${o.address}, ${o.postal_code}</div></div>
      <div class="detail-group"><div class="detail-label">Status</div><div class="detail-value"><span class="status-badge s-${o.status.toLowerCase()}">${o.status}</span></div></div>
      <div class="detail-group"><div class="detail-label">Date</div><div class="detail-value">${new Date(o.created_at).toLocaleString('en-PK')}</div></div>
    </div>
    <table class="order-items-table">
      <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmt(i.price)}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody>
    </table>
    <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
      <div class="order-total-row"><span>Subtotal</span><span>${fmt(o.subtotal)}</span></div>
      <div class="order-total-row"><span>Delivery Fee</span><span>${fmt(o.delivery_fee)}</span></div>
      <div class="order-total-row order-total-final"><span>Total</span><span>${fmt(o.total)}</span></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-gold" style="padding:10px 20px;font-size:12px" onclick="window.open('/api/orders/${o.id}/invoice','_blank')">Print Invoice</button>
    </div>`;
  document.getElementById('order-detail-overlay').classList.add('active');
  document.getElementById('order-detail-modal').classList.add('active');
}

document.getElementById('order-detail-close').addEventListener('click', () => {
  document.getElementById('order-detail-overlay').classList.remove('active');
  document.getElementById('order-detail-modal').classList.remove('active');
});
document.getElementById('order-detail-overlay').addEventListener('click', () => {
  document.getElementById('order-detail-overlay').classList.remove('active');
  document.getElementById('order-detail-modal').classList.remove('active');
});

// ════════════════════════════
// SETTINGS
// ════════════════════════════
document.getElementById('change-pw-form').addEventListener('submit', async e => {
  e.preventDefault();
  const cur  = document.getElementById('cur-pw').value;
  const nw   = document.getElementById('new-pw').value;
  const conf = document.getElementById('confirm-pw').value;
  const msg  = document.getElementById('pw-msg');
  msg.className = 'admin-msg';

  if (nw !== conf) { msg.textContent = 'New passwords do not match'; msg.classList.add('msg-error'); return; }
  if (nw.length < 6) { msg.textContent = 'Password must be at least 6 characters'; msg.classList.add('msg-error'); return; }

  const res = await fetch('/api/auth/password', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ currentPassword:cur, newPassword:nw }) });
  if (res.ok) {
    msg.textContent = '✓ Password updated successfully';
    msg.classList.add('msg-success');
    e.target.reset();
  } else {
    const d = await res.json();
    msg.textContent = d.error || 'Update failed';
    msg.classList.add('msg-error');
  }
});

// ── Init
checkAuth();
loadStats();
