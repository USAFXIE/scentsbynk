document.getElementById('place-order-btn').addEventListener('click', async () => {
  const items = Cart.get();
  if (!items.length) return;

  const form = document.getElementById('checkout-form');

  const name = form.customer_name.value.trim();
  const phone = form.contact1.value.trim();
  const phone2 = form.contact2.value.trim();
  const addr = form.address.value.trim();
  const postal = form.postal_code.value.trim();

  if (!name || !phone || !addr || !postal) {
    alert('Please fill all required fields');
    return;
  }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = 'Placing Order...';

  try {
    const total = Cart.subtotal() + 300;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name,
          phone,
          phone2,
          address: addr,
          postal
        },
        items,
        total
      })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Order failed');

    // success
    Cart.clear();

    document.getElementById('success-order-id').textContent =
      data.order?.[0]?.id || 'N/A';

    document.getElementById('success-overlay').classList.add('active');

  } catch (err) {
    alert('Error: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
});