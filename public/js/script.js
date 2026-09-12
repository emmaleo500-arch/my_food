(function(){
  var DAYS = {
    monday: {
      label: "Monday",
      dish: "Rice &amp; stew, with fish, chicken or meat",
      desc: "Our stew simmers all morning. Tell us your protein and we'll plate it hot for pickup or delivery.",
      quote: "\"Rice and stew like it's cooked at home.\""
    },
    tuesday: {
      label: "Tuesday",
      dish: "Banku with okro stew",
      desc: "Made oiled or oil-free, whichever you prefer — just mention it when you order.",
      quote: "\"The oil-free okro is my Tuesday ritual.\""
    },
    wednesday: {
      label: "Wednesday",
      dish: "Jollof rice with chicken",
      desc: "Smoky, well-spiced jollof with a well-seasoned chicken piece on the side.",
      quote: "\"Best jollof for miles around Afienya.\""
    },
    thursday: {
      label: "Thursday",
      dish: "Tuo zaafi",
      desc: "Soft tuo zaafi served with your choice of soup — ask us what's on for the day.",
      quote: "\"Reminds me exactly of home.\""
    },
    friday: {
      label: "Friday",
      dish: "Fried rice with chicken",
      desc: "A well-loved way to close the week — seasoned fried rice with grilled chicken.",
      quote: "\"My Friday treat, every time.\""
    }
  };

  var tabs = document.querySelectorAll('.day-tab');
  var dayLabel = document.getElementById('menuDayLabel');
  var dishName = document.getElementById('menuDishName');
  var dishDesc = document.getElementById('menuDishDesc');
  var quoteEl = document.getElementById('menuQuote');
  var orderThisBtn = document.getElementById('orderThisBtn');

  function setDay(key){
    var d = DAYS[key];
    if(!d) return;
    dayLabel.textContent = d.label;
    dishName.innerHTML = d.dish;
    dishDesc.textContent = d.desc;
    quoteEl.innerHTML = d.quote + "<small>— A regular customer</small>";
    orderThisBtn.textContent = "Order " + d.label + "'s plate";
    tabs.forEach(function(t){
      var active = t.getAttribute('data-day') === key;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    var radio = document.getElementById('day-' + key);
    if(radio) radio.checked = true;
    updateTicket();
  }

  tabs.forEach(function(t){
    t.addEventListener('click', function(){ setDay(t.getAttribute('data-day')); });
  });

  document.querySelectorAll('input[name="orderDay"]').forEach(function(r){
    r.addEventListener('change', updateTicket);
  });

  /* quantity stepper */
  var qtyValue = document.getElementById('qtyValue');
  var qtyInput = document.getElementById('qtyInput');
  var qty = 1;
  document.getElementById('qtyMinus').addEventListener('click', function(){
    qty = Math.max(1, qty - 1);
    qtyValue.textContent = qty; qtyInput.value = qty; updateTicket();
  });
  document.getElementById('qtyPlus').addEventListener('click', function(){
    qty = Math.min(20, qty + 1);
    qtyValue.textContent = qty; qtyInput.value = qty; updateTicket();
  });

  /* pickup vs delivery toggles address field */
  var addressField = document.getElementById('addressField');
  document.querySelectorAll('input[name="fulfilment"]').forEach(function(r){
    r.addEventListener('change', function(){
      addressField.style.display = (r.value === 'Delivery' && r.checked) ? 'block' : 'none';
      updateTicket();
    });
  });

  ['protein','fullName','phone','notes','address'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', updateTicket);
  });

  function updateTicket(){
    var ticketBody = document.getElementById('ticketBody');
    var checkedDay = document.querySelector('input[name="orderDay"]:checked');
    var fulfil = document.querySelector('input[name="fulfilment"]:checked');
    var protein = document.getElementById('protein').value.trim();
    var name = document.getElementById('fullName').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var address = document.getElementById('address').value.trim();

    if(!checkedDay){
      ticketBody.innerHTML = '<p class="ticket-empty">Choose a day to start your order.</p>';
      return;
    }

    var rows = '';
    rows += ticketRow('Dish', checkedDay.value.split(' — ')[1] || checkedDay.value);
    rows += ticketRow('Quantity', qty + (qty > 1 ? ' plates' : ' plate'));
    if(protein) rows += ticketRow('Preference', protein);
    rows += ticketRow('Fulfilment', fulfil ? fulfil.value : '—');
    if(fulfil && fulfil.value === 'Delivery' && address) rows += ticketRow('Deliver to', address);
    if(name) rows += ticketRow('Name', name);
    if(phone) rows += ticketRow('Phone', phone);

    ticketBody.innerHTML = rows;
  }

  function ticketRow(label, value){
    return '<div class="ticket-row"><span>' + label + '</span><b>' + escapeHtml(value) + '</b></div>';
  }
  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  updateTicket();

  /* mobile nav toggle */
  var header = document.getElementById('siteHeader');
  var navToggle = document.getElementById('navToggle');
  navToggle.addEventListener('click', function(){
    var open = header.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('header nav a, .header-cta a').forEach(function(a){
    a.addEventListener('click', function(){ header.classList.remove('open'); });
  });

  /* form submission — sends to the Node backend at /api/order */
  var form = document.getElementById('orderForm');
  var statusEl = document.getElementById('formStatus');
  var submitBtn = document.getElementById('submitBtn');
  var KITCHEN_EMAIL = "nkrumahvida61@gmail.com";

  function buildMailto(data){
    var lines = [
      "New order from " + data.fullName,
      "Day / dish: " + data.orderDay,
      "Quantity: " + data.quantity,
      "Preference: " + (data.protein || "—"),
      "Fulfilment: " + data.fulfilment,
    ];
    if(data.fulfilment === 'Delivery') lines.push("Delivery address: " + (data.address || "—"));
    lines.push("Phone: " + data.phone);
    if(data.notes) lines.push("Notes: " + data.notes);
    var body = encodeURIComponent(lines.join('\n'));
    var subject = encodeURIComponent("New order — BBN'S Local Food (" + data.fullName + ")");
    return "mailto:" + KITCHEN_EMAIL + "?subject=" + subject + "&body=" + body;
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    statusEl.className = 'form-status show pending';
    statusEl.textContent = 'Sending your order…';
    submitBtn.disabled = true;

    var fd = new FormData(form);
    var data = Object.fromEntries(fd.entries());

    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(res){
      return res.json().then(function(body){
        if(!res.ok) throw new Error(body.error || 'Request failed');
        return body;
      });
    }).then(function(){
      statusEl.className = 'form-status show ok';
      statusEl.textContent = "Order sent! We'll confirm your pickup or delivery time by phone or WhatsApp shortly.";
      submitBtn.disabled = false;
      form.reset();
      qty = 1; qtyValue.textContent = 1; qtyInput.value = 1;
      addressField.style.display = 'none';
      setDay('monday');
    }).catch(function(){
      statusEl.className = 'form-status show err';
      statusEl.innerHTML = 'We could not reach the kitchen server. Please tap below to send the order by email directly, or message us on <a href="https://wa.me/233240736581" target="_blank" rel="noopener">WhatsApp</a>.' +
        '<br><a class="btn btn-gold" style="margin-top:10px;" href="' + buildMailto(data) + '">Open email to send order</a>';
      submitBtn.disabled = false;
    });
  });
})();
