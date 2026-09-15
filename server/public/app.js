const fallbackProducts = [
  {
    _id: 'local-1',
    name: 'Cloud Runner',
    description: 'Featherlight runners made for daily city miles.',
    category: 'Sneakers',
    price: 3499,
    stock: 18,
    imageURL: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'
  },
  {
    _id: 'local-2',
    name: 'Everyday Carry',
    description: 'A clean, spacious bag for work, gym, and weekends.',
    category: 'Accessories',
    price: 1899,
    stock: 12,
    imageURL: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80'
  },
  {
    _id: 'local-3',
    name: 'Studio Headphones',
    description: 'Warm sound, precise detail, and all-day comfort.',
    category: 'Electronics',
    price: 5999,
    stock: 7,
    imageURL: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'
  }
];

const state = {
  authMode: 'login',
  token: localStorage.getItem('hype_token') || '',
  user: JSON.parse(localStorage.getItem('hype_user') || 'null'),
  products: [],
  cart: JSON.parse(localStorage.getItem('hype_cart') || '[]'),
  orders: JSON.parse(localStorage.getItem('hype_orders') || '[]')
};
let selectedImageData = '';

const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(value).replace('₹', 'INR ');

function roleLabel(role) {
  return role === 'buyer' ? 'User' : role.charAt(0).toUpperCase() + role.slice(1);
}

function setMessage(message) {
  $('#auth-message').textContent = message || '';
}

function saveSession(payload) {
  state.token = payload.token;
  state.user = payload.user;
  localStorage.setItem('hype_token', state.token);
  localStorage.setItem('hype_user', JSON.stringify(state.user));
}

function saveCart() {
  localStorage.setItem('hype_cart', JSON.stringify(state.cart));
}

function saveOrders() {
  localStorage.setItem('hype_orders', JSON.stringify(state.orders));
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 6000);
}

function showApp() {
  $('#auth-page').hidden = true;
  $('#app-page').hidden = false;
  $('#session-label').textContent = `${roleLabel(state.user.role)} session - ${state.user.name || state.user.email}`;
  renderAll();
}

function showAuth() {
  $('#auth-page').hidden = false;
  $('#app-page').hidden = true;
}

async function authRequest(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.authMode === mode);
  });
  document.querySelectorAll('.signup-only').forEach(node => {
    node.hidden = mode !== 'signup';
    const input = node.querySelector('input');
    if (input) input.required = mode === 'signup';
  });
  $('#auth-submit').textContent = mode === 'signup' ? 'Create account' : 'Login';
  setMessage('');
}

async function handleAuth(event) {
  event.preventDefault();
  setMessage('');
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setMessage('Enter a valid email address.');
    return;
  }
  const selectedRole = form.get('role');
  const payload = {
    email,
    password: form.get('password')
  };
  if (state.authMode === 'signup') {
    payload.name = form.get('name');
    payload.role = selectedRole;
  }

  try {
    const data = await authRequest(state.authMode === 'signup' ? '/api/auth/register' : '/api/auth/login', payload);
    if (data.user.role !== selectedRole) {
      throw new Error(`This account is registered as ${roleLabel(data.user.role)}. Select that role to continue.`);
    }
    saveSession(data);
    showApp();
    showToast(`${state.authMode === 'signup' ? 'Account created' : 'Signed in'} successfully.`);
  } catch (error) {
    setMessage(error.message);
    showToast(error.message);
  }
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Catalog unavailable');
    state.products = await response.json();
    $('#status').hidden = true;
    showToast(`${state.products.length} products loaded.`);
  } catch (error) {
    state.products = fallbackProducts;
    $('#status').textContent = 'Using demo products while the API warms up.';
    $('#status').hidden = false;
    showToast('Catalog unavailable. Showing demo products.');
  }
  updateCategories();
  renderAll();
}

function updateCategories() {
  const categories = [...new Set(state.products.map(product => product.category))].sort();
  const select = $('#category-filter');
  const current = select.value;
  select.replaceChildren(new Option('All', ''));
  categories.forEach(category => select.append(new Option(category, category)));
  select.value = categories.includes(current) ? current : '';
}

function filteredProducts() {
  const query = $('#search').value.trim().toLowerCase();
  const category = $('#category-filter').value;
  const maxPrice = Number($('#max-price').value);
  const stockOnly = $('#stock-only').checked;
  return state.products.filter(product => {
    const matchesSearch = [product.name, product.category, product.description].some(value => String(value).toLowerCase().includes(query));
    const matchesCategory = !category || product.category === category;
    const matchesPrice = Number(product.price) <= maxPrice;
    const matchesStock = !stockOnly || Number(product.stock) > 0;
    return matchesSearch && matchesCategory && matchesPrice && matchesStock;
  });
}

function renderProducts() {
  const grid = $('#product-grid');
  const template = $('#product-card');
  const products = filteredProducts();
  grid.replaceChildren();
  $('#result-count').textContent = `${products.length} results`;

  products.forEach(product => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('img').src = product.imageURL;
    node.querySelector('img').alt = product.name;
    node.querySelector('.category').textContent = product.category;
    node.querySelector('h3').textContent = product.name;
    node.querySelector('.description').textContent = product.description;
    node.querySelector('strong').textContent = money(product.price);
    node.querySelector('.image-button').addEventListener('click', () => openProduct(product));
    node.querySelector('.product-foot button').addEventListener('click', () => addToCart(product));
    grid.append(node);
  });
}

function openProduct(product) {
  $('#product-detail').innerHTML = `
    <div class="detail">
      <img src="${product.imageURL}" alt="${product.name}">
      <div class="detail-copy">
        <p class="category">${product.category}</p>
        <h2>${product.name}</h2>
        <p class="rating">Rating 4.6 | In stock: ${product.stock}</p>
        <p>${product.description}</p>
        <h2>${money(product.price)}</h2>
        <button class="primary" type="button" id="detail-add">Add to cart</button>
      </div>
    </div>
  `;
  $('#detail-add').addEventListener('click', () => {
    addToCart(product);
    $('#product-dialog').close();
  });
  $('#product-dialog').showModal();
  showToast(`${product.name} details opened.`);
}

function addToCart(product) {
  const existing = state.cart.find(item => item._id === product._id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ ...product, quantity: 1 });
  saveCart();
  renderCart();
  showToast(`${product.name} added to cart.`);
}

function changeQty(id, delta) {
  state.cart = state.cart.map(item => item._id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item);
  saveCart();
  renderCart();
  const item = state.cart.find(entry => entry._id === id);
  if (item) showToast(`${item.name} quantity updated to ${item.quantity}.`);
}

function removeFromCart(id) {
  const item = state.cart.find(entry => entry._id === id);
  state.cart = state.cart.filter(item => item._id !== id);
  saveCart();
  renderCart();
  if (item) showToast(`${item.name} removed from cart.`);
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  $('#cart-count').textContent = count;
  $('#cart-total').textContent = money(total);
  $('#metric-cart').textContent = count;

  const list = $('#cart-items');
  list.replaceChildren();
  if (!state.cart.length) {
    const empty = document.createElement('article');
    empty.className = 'status';
    empty.textContent = 'Your cart is empty.';
    list.append(empty);
    return;
  }

  state.cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <img src="${item.imageURL}" alt="${item.name}">
      <div>
        <h3>${item.name}</h3>
        <p>${money(item.price)} each</p>
      </div>
      <div class="qty">
        <button type="button" data-dec>-</button>
        <strong>${item.quantity}</strong>
        <button type="button" data-inc>+</button>
        <button class="remove" type="button" data-remove>Remove</button>
      </div>
    `;
    row.querySelector('[data-dec]').addEventListener('click', () => changeQty(item._id, -1));
    row.querySelector('[data-inc]').addEventListener('click', () => changeQty(item._id, 1));
    row.querySelector('[data-remove]').addEventListener('click', () => removeFromCart(item._id));
    list.append(row);
  });
}

async function placeOrder(event) {
  event.preventDefault();
  $('#checkout-message').textContent = '';
  if (!state.cart.length) {
    try {
      const storedCart = JSON.parse(localStorage.getItem('hype_cart') || '[]');
      if (Array.isArray(storedCart) && storedCart.length) {
        state.cart = storedCart;
        renderCart();
      }
    } catch {
      state.cart = [];
    }
  }
  if (!state.cart.length) {
    $('#checkout-message').textContent = 'Add at least one product before checkout.';
    showToast('Your cart is empty. Add a product before checkout.');
    return;
  }
  const form = new FormData(event.currentTarget);
  const checkoutCart = state.cart.map(item => ({ ...item }));
  const countryCode = String(form.get('countryCode') || '');
  const phone = String(form.get('phone') || '').replace(/\D/g, '');
  if (!/^\+[1-9]\d{0,3}$/.test(countryCode) || !/^\d{6,14}$/.test(phone)) {
    $('#checkout-message').textContent = 'Enter a valid country code and a phone number with 6 to 14 digits.';
    showToast('Enter a valid country code and phone number.');
    return;
  }
  const mongoId = /^[a-f\d]{24}$/i;
  const apiItems = state.token ? checkoutCart.filter(item => mongoId.test(item._id)) : [];
  if (!state.token || apiItems.length !== checkoutCart.length) {
    $('#checkout-message').textContent = 'Refresh the catalog and sign in before placing an order in the database.';
    showToast('Refresh the catalog and sign in before checkout.');
    return;
  }

  let response;
  try {
    response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify({
        items: apiItems.map(item => ({ productId: item._id, quantity: item.quantity })),
        delivery: {
          address: form.get('address'),
          contact: `${countryCode}${phone}`
        },
        paymentResult: 'success'
      })
    });
  } catch {
    $('#checkout-message').textContent = 'The server is unavailable. Your cart was not changed.';
    showToast('The server is unavailable. Order was not placed.');
    return;
  }
  const apiOrder = await response.json().catch(() => ({}));
  if (!response.ok) {
    $('#checkout-message').textContent = apiOrder.message || 'Order payment could not be saved.';
    showToast(apiOrder.message || 'Order payment could not be saved.');
    return;
  }

  const order = {
    backendId: apiOrder._id,
    id: `ORD-${apiOrder._id}`,
    createdAt: new Date().toLocaleString(),
    total: state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    items: state.cart.map(item => ({ productId: item._id, name: item.name, quantity: item.quantity, imageURL: item.imageURL })),
    delivery: {
      address: form.get('address'),
      contact: `${countryCode}${phone}`
    },
    status: apiOrder.status || 'pending'
  };

  state.orders = [order, ...state.orders];
  state.cart = [];
  saveOrders();
  saveCart();
  event.currentTarget.reset();
  $('#cart-drawer').hidden = true;
  setView('orders');
  renderAll();
  const confirmation = `Order confirmed. Payment saved for ${order.id}.`;
  $('#orders-notification').textContent = confirmation;
  $('#orders-notification').hidden = false;
  showToast(confirmation);
}

async function cancelOrder(order) {
  if (!window.confirm(`Cancel ${order.id}?`)) return;
  if (order.backendId && state.token) {
    const response = await fetch(`/api/orders/${order.backendId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${state.token}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(data.message || 'Unable to cancel this order.');
      return;
    }
  }
  order.status = 'Cancelled';
  order.items.forEach(item => {
    const product = state.products.find(entry => entry._id === item.productId);
    if (product) product.stock += item.quantity;
  });
  saveOrders();
  renderOrders();
  renderProducts();
  showToast('Order cancelled and inventory restored.');
}

function renderOrders() {
  const list = $('#orders-list');
  list.replaceChildren();
  if (!state.orders.length) {
    const empty = document.createElement('article');
    empty.textContent = 'No orders yet. Add products to your cart and place an order.';
    list.append(empty);
    return;
  }
  state.orders.forEach(order => {
    const node = document.createElement('article');
    node.innerHTML = `
      <h3>${order.id} - ${order.status}</h3>
      <p>${order.createdAt}</p>
      <p>${order.items.map(item => `${item.name} x ${item.quantity}`).join(', ')}</p>
      <div class="order-footer">
        <strong>${money(order.total)}</strong>
        ${['Confirmed', 'confirmed', 'Pending', 'pending'].includes(order.status) ? '<button class="secondary cancel-order" type="button">Cancel order</button>' : ''}
      </div>
    `;
    const cancelButton = node.querySelector('.cancel-order');
    if (cancelButton) cancelButton.addEventListener('click', () => cancelOrder(order));
    list.append(node);
  });
}

function renderMetrics() {
  $('#metric-products').textContent = state.products.length;
  $('#metric-orders').textContent = state.orders.length;
  $('#metric-role').textContent = state.user ? roleLabel(state.user.role) : 'Guest';
}

function setView(view) {
  ['store', 'orders', 'seller', 'admin'].forEach(name => {
    const node = $(`#${name}-view`);
    if (node) node.hidden = name !== view;
  });
  $('#cart-drawer').hidden = view !== 'cart';
  if (view === 'store') $('#catalog').scrollIntoView({ behavior: 'smooth' });
  showToast(`${view.charAt(0).toUpperCase() + view.slice(1)} opened.`);
}

function renderAll() {
  renderProducts();
  renderCart();
  renderOrders();
  renderMetrics();
}

document.querySelectorAll('[data-auth-mode]').forEach(button => {
  button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

$('#auth-form').addEventListener('submit', handleAuth);
$('#logout').addEventListener('click', () => {
  localStorage.removeItem('hype_token');
  localStorage.removeItem('hype_user');
  state.token = '';
  state.user = null;
  showAuth();
  showToast('You have been signed out.');
});

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => setView(button.dataset.view));
});
document.querySelectorAll('[data-scroll]').forEach(button => {
  button.addEventListener('click', () => $(`#${button.dataset.scroll}`).scrollIntoView({ behavior: 'smooth' }));
});

['#search', '#category-filter', '#max-price', '#stock-only'].forEach(selector => {
  $(selector).addEventListener('input', () => {
    $('#price-label').textContent = `Up to ${money(Number($('#max-price').value))}`;
    renderProducts();
  });
});

$('#clear-filters').addEventListener('click', () => {
  $('#search').value = '';
  $('#category-filter').value = '';
  $('#max-price').value = '10000';
  $('#stock-only').checked = false;
  $('#price-label').textContent = `Up to ${money(10000)}`;
  renderProducts();
  showToast('Filters cleared.');
});

$('#product-image').addEventListener('change', event => {
  const file = event.currentTarget.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    selectedImageData = String(reader.result);
    $('#image-name').textContent = file.name;
    $('#image-preview').src = selectedImageData;
    $('#image-preview').hidden = false;
    showToast(`${file.name} selected for upload.`);
  });
  reader.readAsDataURL(file);
});

$('#seller-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const imageURL = selectedImageData || form.get('imageURL');
  if (!imageURL) {
    showToast('Choose a product image or enter an image URL.');
    return;
  }
  state.products = [{
    _id: 'local-' + Date.now(),
    name: form.get('name'),
    category: form.get('category'),
    description: form.get('description'),
    price: Number(form.get('price')),
    stock: Number(form.get('stock')),
    imageURL
  }, ...state.products];
  event.currentTarget.reset();
  selectedImageData = '';
  $('#image-name').textContent = 'Choose an image from this PC';
  $('#image-preview').hidden = true;
  updateCategories();
  setView('store');
  renderAll();
  showToast(`${form.get('name')} added to inventory.`);
});

$('#checkout-form').addEventListener('submit', placeOrder);
$('.dialog-close').addEventListener('click', () => $('#product-dialog').close());

setAuthMode('login');
loadProducts();
if (state.user && state.token) showApp();
