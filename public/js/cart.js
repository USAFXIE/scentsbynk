// Cart state — shared across all pages via localStorage
const CART_KEY = 'nk_cart';

const Cart = {
  get()          { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); },
  save(c)        { localStorage.setItem(CART_KEY, JSON.stringify(c)); },
  count()        { return this.get().reduce((s,i) => s + i.qty, 0); },
  subtotal()     { return this.get().reduce((s,i) => s + i.price * i.qty, 0); },
  clear()        { localStorage.removeItem(CART_KEY); },

  add(product, qty = 1) {
    const cart = this.get();
    const ex = cart.find(i => i.id === product.id);
    const maxQty = product.stock || 99;
    if (ex) ex.qty = Math.min(ex.qty + qty, maxQty);
    else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image_url || product.image || '', stock: product.stock, qty });
    this.save(cart);
    return cart;
  },

  update(id, qty) {
    const cart = this.get().map(i => i.id === id ? { ...i, qty } : i).filter(i => i.qty > 0);
    this.save(cart);
    return cart;
  },

  remove(id) {
    const cart = this.get().filter(i => i.id !== id);
    this.save(cart);
    return cart;
  }
};
