(function () {
  var KITCHEN_EMAIL = "nkrumahvida61@gmail.com";

  /* ---------- mobile nav ---------- */
  var header = document.getElementById('siteHeader');
  var navToggle = document.getElementById('navToggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('header nav a, .header-cta a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('open'); });
    });
  }

  /* ---------- cart state ---------- */
  var cart = {};

  function formatPrice(n) {
    return '₵' + Number(n).toFixed(2);
  }

  function saveCart() {
    sessionStorage.setItem('bbnsShopCart', JSON.stringify(cart));
  }

  function loadCart() {
    try {
      var stored = sessionStorage.getItem('bbnsShopCart');
      if (stored) cart = JSON.parse(stored) || {};
    } catch (e) { cart = {}; }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  loadCart();

  /* ---------- load products ---------- */
  var productGrid = document.getElementById('productGrid');
  var allProducts = [];

  function loadProducts() {
    productGrid.innerHTML = '<p class="ticket-empty">Loading the shop…</p>';
    fetch('/api/products')
      .then(function (res) { return res.json(); })
      .then(function (products) {
        allProducts = products || [];
        renderCategory('all');
      })
      .catch(function () {
        productGrid.innerHTML = '<p class="cart-empty">We could not load the shop right now. Try refreshing, or message us on <a href="https://wa.me/233240736581">WhatsApp</a>.</p>';
      });
  }

  /* ---------- category tabs ---------- */
  var catTabs = document.querySelectorAll('.cat-tab');
  function renderCategory(cat) {
    catTabs.forEach(function (t) {
      var active = t.getAttribute('data-cat') === cat;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    var visible = cat === 'all' ? allProducts : allProducts.filter(function (p) { return p.category === cat; });
    if (!visible.length) {
      productGrid.innerHTML = '<p class="cart-empty">No products in this category yet. Check back soon!</p>';
      return;
    }

    productGrid.innerHTML = '';
    visible.forEach(function (p) {
      productGrid.appendChild(createProductCard(p));
    });
  }

  catTabs.forEach(function (t) {
    t.addEventListener('click', function () { renderCategory(t.getAttribute('data-cat')); });
  });

  /* ---------- product card ---------- */
  function createProductCard(p) {
    var card = document.createElement('div');
    card.className = 'product-card' + (p.available === false ? ' unavailable' : '');
    card.setAttribute('data-id', p.id);

    var imgUrl = p.image || 'assets/food.jpg';

    card.innerHTML =
      '<div class="product-img">' +
        '<img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(p.name) + '">' +
      '</div>' +
      '<div class="product-body">' +
        '<span class="cat-badge">' + escapeHtml(p.category) + '</span>' +
        '<h3>' + escapeHtml(p.name) + '</h3>' +
        (p.desc ? '<p>' + escapeHtml(p.desc) + '</p>' : '') +
        '<div class="product-price">₵' + Number(p.price).toFixed(2) + '<small> per ' + escapeHtml(p.unit || 'piece') + '</small></div>' +
        '<div class="product-qty">' +
          '<button type="button" class="qty-minus" aria-label="Decrease">-</button>' +
          '<span class="qty-val">1</span>' +
          '<button type="button" class="qty-plus" aria-label="Increase">+</button>' +
        '</div>' +
        '<button type="button" class="btn btn-add" data-action="add">Add to order slip</button>' +
      '</div>';

    /* qty controls */
    var qty = 1;
    var minus = card.querySelector('.qty-minus');
    var plus = card.querySelector('.qty-plus');
    var qtyVal = card.querySelector('.qty-val');

    function setQty(n) { qty = Math.max(1, n); qtyVal.textContent = qty; }
    minus.addEventListener('click', function () { setQty(qty - 1); });
    plus.addEventListener('click', function () { setQty(qty + 1); });

    /* add to cart */
    var addBtn = card.querySelector('[data-action="add"]');
    addBtn.classList.add('not-added');
    addBtn.addEventListener('click', function () {
      if (p.available === false) return;
      addToCart(p.id, p, qty);
      setQty(1);
      updateCart();
      renderCartItem(p.id);
    });

    return card;
  }

  /* ---------- cart operations ---------- */
  function addToCart(id, product, amount) {
    if (cart[id]) {
      cart[id].qty += amount;
    } else {
      cart[id] = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        unit: product.unit || 'piece',
        image: (product.image || 'assets/food.jpg'),
        qty: amount
      };
    }
    saveCart();
  }

  function removeFromCart(id) {
    delete cart[id];
    saveCart();
    updateCart();
  }

  function changeQty(id, delta) {
    if (!cart[id]) return;
    cart[id].qty = Math.max(1, cart[id].qty + delta);
    saveCart();
    updateCart();
  }

  function cartCount() {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id].qty; }, 0);
  }

  function cartTotal() {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id].price * cart[id].qty; }, 0);
  }

  /* ---------- update cart UI ---------- */
  var cartList = document.getElementById('cartList');
  var cartTotalEl = document.getElementById('cartTotal');
  var ticketBody = document.getElementById('ticketBody');
  var ticketTotalEl = document.getElementById('ticketTotal');
  var checkoutBtn = document.getElementById('checkoutBtn');

  function updateCart() {
    var keys = Object.keys(cart);
    if (!keys.length) {
      cartList.innerHTML = '<p class="cart-empty">Your order slip is empty. Add some chop or dress from the shop above.</p>';
      ticketBody.innerHTML = '<p class="ticket-empty">Add items from the shop.</p>';
      cartTotalEl.textContent = formatPrice(0);
      ticketTotalEl.textContent = formatPrice(0);
      checkoutBtn.disabled = true;
      return;
    }

    var rows = '';
    keys.forEach(function (id) {
      var item = cart[id];
      var subtotal = item.price * item.qty;
      rows +=
        '<div class="cart-item">' +
          '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '">' +
          '<span class="cart-item-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="cart-item-meta">₵' + item.price.toFixed(2) + ' × ' + item.qty + '</span>' +
          '<div class="cart-item-qty">' +
            '<button type="button" class="sm-minus" data-id="' + id + '" aria-label="Decrease">−</button>' +
            '<span>' + item.qty + '</span>' +
            '<button type="button" class="sm-plus" data-id="' + id + '" aria-label="Increase">+</button>' +
          '</div>' +
          '<span class="cart-item-meta" style="text-align:right;font-family:\'Baloo 2\';font-weight:700;">₵' + subtotal.toFixed(2) + '</span>' +
          '<button type="button" class="cart-item-remove" data-id="' + id + '" aria-label="Remove">✕</button>' +
        '</div>';
    });
    cartList.innerHTML = rows;
    cartTotalEl.textContent = formatPrice(cartTotal());

    /* ticket (sidebar) */
    var ticketRows = '';
    keys.forEach(function (id) {
      var item = cart[id];
      ticketRows +=
        '<div class="ticket-row"><span>' + escapeHtml(item.name) + ' × ' + item.qty + '</span>' +
        '<b>₵' + (item.price * item.qty).toFixed(2) + '</b></div>';
    });
    ticketBody.innerHTML = ticketRows;
    ticketTotalEl.textContent = formatPrice(cartTotal());

    checkoutBtn.disabled = false;

    /* wire up remove / qty buttons */
    document.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.onclick = function () { removeFromCart(btn.getAttribute('data-id')); };
    });
    document.querySelectorAll('.sm-minus').forEach(function (btn) {
      btn.onclick = function () { changeQty(btn.getAttribute('data-id'), -1); };
    });
    document.querySelectorAll('.sm-plus').forEach(function (btn) {
      btn.onclick = function () { changeQty(btn.getAttribute('data-id'), 1); };
    });
  }

  function renderCartItem(id) {
    var card = document.querySelector('.product-card[data-id="' + id + '"]');
    if (card) {
      var addBtn = card.querySelector('[data-action="add"]');
      addBtn.classList.remove('not-added');
      addBtn.classList.add('added');
      addBtn.textContent = 'Added';
    }
  }

  /* ---------- address toggle ---------- */
  var addressField = document.getElementById('addressField');
  document.querySelectorAll('input[name="fulfilment"]').forEach(function (r) {
    r.addEventListener('change', function () {
      addressField.style.display = (r.value === 'Delivery' && r.checked) ? 'block' : 'none';
    });
  });

  /* ---------- checkout ---------- */
  var checkoutForm = document.getElementById('checkoutForm');
  var statusEl = document.getElementById('checkoutStatus');
  var checkoutSubmitBtn = document.getElementById('checkoutBtn');

  checkoutForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!cartCount()) {
      statusEl.className = 'form-status show err';
      statusEl.textContent = 'Add something to your order first.';
      return;
    }

    var items = Object.keys(cart).map(function (id) {
      var i = cart[id];
      return { id: i.id, name: i.name, price: i.price, qty: i.qty };
    });

    statusEl.className = 'form-status show pending';
    statusEl.textContent = 'Sending your order…';
    checkoutSubmitBtn.disabled = true;

    var fd = new FormData(checkoutForm);
    var data = Object.fromEntries(fd.entries());
    data.items = JSON.stringify(items);

    fetch('/api/shop-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.error || 'Request failed');
          return body;
        });
      })
      .then(function () {
        statusEl.className = 'form-status show ok';
        statusEl.textContent = "Order sent! We'll confirm your pickup or delivery time by phone or WhatsApp shortly.";
        checkoutSubmitBtn.disabled = false;
        checkoutForm.reset();
        addressField.style.display = 'none';
        /* reset added buttons */
        document.querySelectorAll('.btn-add').forEach(function (b) {
          b.classList.add('not-added'); b.classList.remove('added');
          b.textContent = 'Add to order slip';
        });
        /* clear cart */
        cart = {}; saveCart(); updateCart();
      })
      .catch(function () {
        statusEl.className = 'form-status show err';
        statusEl.innerHTML =
          'We could not reach the kitchen server. Please tap below to send the order by email directly, or message us on ' +
          '<a href="https://wa.me/233240736581" target="_blank" rel="noopener">WhatsApp</a>.';
        checkoutSubmitBtn.disabled = false;
      });
  });

  /* ---------- admin ---------- */
  var adminGate = document.getElementById('adminGate');
  var adminFormWrap = document.getElementById('adminFormWrap');
  var adminPasswordInput = document.getElementById('adminPassword');
  var adminLoginBtn = document.getElementById('adminLoginBtn');
  var adminMsg = document.getElementById('adminMsg');

  function isAdminAuthed() {
    return sessionStorage.getItem('bbnsShopAdmin') === 'yes';
  }

  function showAdminForm() {
    adminGate.style.display = 'none';
    adminFormWrap.style.display = 'block';
  }

  function hideAdminForm() {
    adminGate.style.display = 'block';
    adminFormWrap.style.display = 'none';
  }

  if (isAdminAuthed()) {
    showAdminForm();
  }

  adminLoginBtn.addEventListener('click', function () {
    var pwd = adminPasswordInput.value.trim();
    if (!pwd) return;
    adminMsg.className = 'admin-msg pending';
    adminMsg.textContent = 'Checking…';

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.error || 'Wrong password');
          return body;
        });
      })
      .then(function () {
        sessionStorage.setItem('bbnsShopAdmin', 'yes');
        sessionStorage.setItem('bbnsShopAdminPwd', pwd);
        adminMsg.className = 'admin-msg ok';
        adminMsg.textContent = 'Logged in! The product form is now available below.';
        showAdminForm();
      })
      .catch(function (err) {
        adminMsg.className = 'admin-msg err';
        adminMsg.textContent = err.message;
      });
  });

  /* ---------- product upload ---------- */
  var adminForm = document.getElementById('adminForm');
  var imagePreview = document.getElementById('imagePreview');
  var productStatus = document.getElementById('productStatus');
  var productSubmitBtn = document.getElementById('productSubmitBtn');

  document.getElementById('productImage').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) { imagePreview.style.display = 'none'; return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      imagePreview.src = ev.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  adminForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var pwd = sessionStorage.getItem('bbnsShopAdminPwd') || adminPasswordInput.value;
    if (!pwd) {
      productStatus.className = 'form-status show err';
      productStatus.textContent = 'Please log in first.';
      return;
    }

    var fd = new FormData(adminForm);

    productStatus.className = 'form-status show pending';
    productStatus.textContent = 'Saving product…';
    productSubmitBtn.disabled = true;

    fetch('/api/products', {
      method: 'POST',
      headers: { 'x-admin-password': pwd },
      body: fd
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.error || 'Request failed');
          return body;
        });
      })
      .then(function () {
        productStatus.className = 'form-status show ok';
        productStatus.textContent = 'Product added! It now shows in the shop above.';
        productSubmitBtn.disabled = false;
        adminForm.reset();
        imagePreview.style.display = 'none';
        imagePreview.src = '';
        loadProducts();
      })
      .catch(function (err) {
        productStatus.className = 'form-status show err';
        productStatus.textContent = err.message;
        productSubmitBtn.disabled = false;
      });
  });

  /* ---------- init ---------- */
  loadProducts();
  updateCart();
})();
