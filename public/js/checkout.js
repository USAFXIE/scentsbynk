/* checkout.js — cart page logic */

const DELIVERY = 300;
const fmt = n => 'Rs. ' + Number(n).toLocaleString();

function renderCartPage() {
  const items    = Cart.get();
  const itemsEl  = document.getElementById('cart-page-items');
  const emptyEl  = document.getElementById('empty-state');
  const contentEl= document.getElementById('cart-content');
  const summItems= document.getElementById('summary-items');
  const subtotalEl= document.getElementById('summary-subtotal');
  const totalEl  = document.getElementById('summary-total');

  if (items.length === 0) {
    emptyEl.style.display  = 'block';
    contentEl.style.display= 'none';
    return;
  }
  emptyEl.style.display  = 'none';
  contentEl.style.display= 'grid';

  // Cart items list
  itemsEl.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-page-item';
    div.innerHTML = `
      <div class="cpi-img"><img src="${item.image || ''}" alt="${item.name}" onerror="this.src='/images/logo.png'"></div>
      <div class="cpi-info">
        <div class="cpi-name">${item.name}</div>
        <div class="cpi-unit">${fmt(item.price)} each</div>
        <div class="cpi-row">
          <div class="qty-control">
            <button class="qty-btn" data-id="${item.id}" data-action="dec">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-id="${item.id}" data-action="inc">+</button>
          </div>
          <div class="cpi-total">${fmt(item.price * item.qty)}</div>
          <button class="cpi-remove" data-id="${item.id}">Remove</button>
        </div>
      </div>`;
    itemsEl.appendChild(div);
  });

  // Qty controls
  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id  = e.currentTarget.dataset.id;
      const act = e.currentTarget.dataset.action;
      const item = Cart.get().find(i => i.id === id);
      if (!item) return;
      Cart.update(id, act === 'inc' ? Math.min(item.qty + 1, item.stock || 99) : item.qty - 1);
      renderCartPage();
    });
  });
  itemsEl.querySelectorAll('.cpi-remove').forEach(btn => {
    btn.addEventListener('click', e => { Cart.remove(e.currentTarget.dataset.id); renderCartPage(); });
  });

  // Summary
  summItems.innerHTML = items.map(i =>
    `<div class="summary-row"><span>${i.name} × ${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`
  ).join('');

  const sub = Cart.subtotal();
  subtotalEl.textContent = fmt(sub);
  totalEl.textContent    = fmt(sub + DELIVERY);
}

// Place order
document.getElementById('place-order-btn').addEventListener('click', async () => {
  const items = Cart.get();
  if (items.length === 0) return;

  const form = document.getElementById('checkout-form');
  const name   = form.customer_name.value.trim();
  const phone  = form.contact1.value.trim();
  const phone2 = form.contact2.value.trim();
  const addr   = form.address.value.trim();
  const postal = form.postal_code.value.trim();

  if (!name || !phone || !addr || !postal) {
    alert('Please fill in all required fields.');
    return;
  }

  const btn = document.getElementById('place-order-btn');
  btn.disabled     = true;
  btn.textContent  = 'Placing Order…';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name,
        contact1: phone,
        contact2: phone2,
        address: addr,
        postal_code: postal,
        items: items.map(i => ({ id: i.id, qty: i.qty }))
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');

    // Success
    Cart.clear();
    document.getElementById('success-order-id').textContent = data.id;

    if (data.waLink) {
      document.getElementById('wa-btn').href = data.waLink;
    } else {
      document.getElementById('wa-btn').style.display = 'none';
    }

    document.getElementById('success-overlay').classList.add('active');
  } catch (err) {
    alert('Error: ' + err.message);
    btn.disabled    = false;
    btn.textContent = 'Place Order';
  }
});

// Init
renderCartPage();
