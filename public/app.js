(function () {
  "use strict";

  var site = null;
  var cart = JSON.parse(localStorage.getItem("nexora_cart") || "[]");

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function money(value) {
    return "৳" + Number(value || 0).toLocaleString("en-BD");
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (match) {
      var map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return map[match];
    });
  }

  function product(id) {
    return (site && site.products || []).find(function (item) {
      return item.id === id;
    });
  }

  function saveCart() {
    localStorage.setItem("nexora_cart", JSON.stringify(cart));
  }

  function cartTotal() {
    return cart.reduce(function (sum, item) {
      return sum + Number(item.price || 0) * Number(item.qty || 0);
    }, 0);
  }

  function toast(message, isError) {
    var node = qs("#toast");
    if (!node) return;
    node.textContent = message;
    node.className = "toast show" + (isError ? " error" : "");
    window.setTimeout(function () {
      node.className = "toast";
    }, 2200);
  }

  function updateChrome() {
    if (!site) return;
    var settings = site.settings || {};
    var whatsapp = "https://wa.me/" + (settings.whatsapp || "");

    var count = cart.reduce(function (sum, item) {
      return sum + Number(item.qty || 0);
    }, 0);

    var cartCount = qs("#cartCount");
    if (cartCount) cartCount.textContent = count;

    var headerWa = qs("#headerWA");
    if (headerWa) headerWa.href = whatsapp;

    var agentWa = qs("#agentWA");
    if (agentWa) agentWa.href = whatsapp;

    var agentCall = qs("#agentCall");
    if (agentCall) agentCall.href = "tel:" + (settings.phone || "");

    var agentMessenger = qs("#agentMessenger");
    if (agentMessenger) agentMessenger.href = settings.messenger || "#";

    var tagline = qs("#footerTagline");
    if (tagline) tagline.textContent = settings.tagline || "";

    var phone = qs("#footerPhone");
    if (phone) {
      phone.textContent = settings.phone || "—";
      phone.href = "tel:" + (settings.phone || "");
    }

    var email = qs("#footerEmail");
    if (email) {
      email.textContent = settings.email || "—";
      email.href = "mailto:" + (settings.email || "");
    }

    var address = qs("#footerAddress");
    if (address) address.textContent = settings.address || "";

    var socialRow = qs("#socialRow");
    if (socialRow) {
      var icons = { facebook: "f", instagram: "◎", tiktok: "♪", youtube: "▶", whatsapp: "◉" };
      socialRow.innerHTML = Object.keys(settings.socials || {}).map(function (key) {
        return "<a class='social' href='" + esc(settings.socials[key] || "#") + "' target='_blank' rel='noopener'>" +
          esc(icons[key] || "•") + "</a>";
      }).join("");
    }
  }

  function addToCart(id) {
    var p = product(id);
    if (!p) return;

    var row = cart.find(function (item) {
      return item.id === id;
    });

    if (row) {
      row.qty = Math.min(20, Number(row.qty || 0) + 1);
    } else {
      cart.push({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        image: p.image || "",
        qty: 1
      });
    }

    saveCart();
    updateChrome();
    toast("Added to cart");
  }

  function renderCart() {
    var container = qs("#cartPageItems");
    var totalNode = qs("#cartPageTotal");
    if (!container) return;

    if (!cart.length) {
      container.innerHTML = "<div class='emptyState'><h2>Your cart is empty.</h2><a class='btn primary' href='/shop'>Browse products ↗</a></div>";
      if (totalNode) totalNode.textContent = money(0);
      return;
    }

    container.innerHTML = cart.map(function (item) {
      return "<div class='cartRow'>" +
        "<img src='" + esc(item.image) + "' alt='" + esc(item.name) + "'>" +
        "<div><strong>" + esc(item.name) + "</strong><span>" + money(item.price) + " each</span></div>" +
        "<div class='qty'>" +
        "<button data-cart-minus='" + esc(item.id) + "'>−</button>" +
        "<input data-cart-input='" + esc(item.id) + "' value='" + Number(item.qty || 1) + "' inputmode='numeric'>" +
        "<button data-cart-plus='" + esc(item.id) + "'>+</button>" +
        "</div>" +
        "<strong>" + money(Number(item.price || 0) * Number(item.qty || 0)) + "</strong>" +
        "<button class='removeBtn' data-cart-remove='" + esc(item.id) + "' aria-label='Remove'>×</button>" +
        "</div>";
    }).join("");

    if (totalNode) totalNode.textContent = money(cartTotal());

    qsa("[data-cart-minus]").forEach(function (button) {
      button.onclick = function () {
        changeQuantity(button.getAttribute("data-cart-minus"), -1);
      };
    });

    qsa("[data-cart-plus]").forEach(function (button) {
      button.onclick = function () {
        changeQuantity(button.getAttribute("data-cart-plus"), 1);
      };
    });

    qsa("[data-cart-input]").forEach(function (input) {
      input.onchange = function () {
        var row = cart.find(function (item) {
          return item.id === input.getAttribute("data-cart-input");
        });
        if (!row) return;
        row.qty = Math.max(1, Math.min(20, Number(input.value) || 1));
        saveCart();
        renderCart();
        renderCheckout();
        updateChrome();
      };
    });

    qsa("[data-cart-remove]").forEach(function (button) {
      button.onclick = function () {
        var id = button.getAttribute("data-cart-remove");
        cart = cart.filter(function (item) {
          return item.id !== id;
        });
        saveCart();
        renderCart();
        renderCheckout();
        updateChrome();
      };
    });
  }

  function renderCheckout() {
    var summary = qs("#checkoutSummary");
    var totalNode = qs("#checkoutTotal");
    if (!summary || !totalNode) return;

    summary.innerHTML = cart.length
      ? cart.map(function (item) {
          return "<div class='sumRow'><span>" + esc(item.name) + " × " + item.qty +
            "</span><b>" + money(Number(item.price || 0) * Number(item.qty || 0)) + "</b></div>";
        }).join("")
      : "<p class='muted'>Your cart is empty.</p>";

    totalNode.textContent = money(cartTotal());
  }

  function changeQuantity(id, delta) {
    var row = cart.find(function (item) {
      return item.id === id;
    });
    if (!row) return;

    row.qty = Number(row.qty || 0) + delta;
    if (row.qty <= 0) {
      cart = cart.filter(function (item) {
        return item.id !== id;
      });
    } else {
      row.qty = Math.min(20, row.qty);
    }

    saveCart();
    renderCart();
    renderCheckout();
    updateChrome();
  }

  function bindProducts() {
    qsa("[data-add]").forEach(function (button) {
      button.onclick = function () {
        addToCart(button.getAttribute("data-add"));
      };
    });
  }

  function renderShop() {
    var grid = qs("#shopProducts");
    if (!grid) return;

    var queryNode = qs("#shopSearch");
    var categoryNode = qs("#categoryFilter");
    var sortNode = qs("#sort");

    var query = String(queryNode && queryNode.value || "").toLowerCase().trim();
    var category = String(categoryNode && categoryNode.value || "");
    var sort = String(sortNode && sortNode.value || "featured");

    var items = (site.products || []).filter(function (item) {
      var haystack = [
        item.name,
        item.brand,
        item.category,
        item.description
      ].join(" ").toLowerCase();

      return (!query || haystack.indexOf(query) !== -1) &&
        (!category || item.category === category);
    });

    if (sort === "low") {
      items.sort(function (a, b) { return Number(a.price || 0) - Number(b.price || 0); });
    }
    if (sort === "high") {
      items.sort(function (a, b) { return Number(b.price || 0) - Number(a.price || 0); });
    }

    if (!items.length) {
      grid.innerHTML = "<div class='emptyState'><h3>No matching products.</h3></div>";
      return;
    }

    grid.innerHTML = items.map(function (item) {
      return "<article class='productCard'>" +
        "<a class='productImage' href='/product/" + encodeURIComponent(item.id) + "'>" +
        "<span class='badge'>" + esc(item.badge || "Featured") + "</span>" +
        "<img src='" + esc(item.image || "") + "' alt='" + esc(item.name) + "' loading='lazy'></a>" +
        "<div class='productBody'><div class='muted'>" + esc(item.brand || "") + " · " + esc(item.category || "") + "</div>" +
        "<h3><a href='/product/" + encodeURIComponent(item.id) + "'>" + esc(item.name) + "</a></h3>" +
        "<div class='rating'>★★★★★ <span>" + esc(item.rating || 5) + "</span></div>" +
        "<div class='price'>" + money(item.price) + " <del>" + money(item.oldPrice || item.price) + "</del></div>" +
        "<div class='cardActions'><button class='smallBtn primaryBtn' data-add='" + esc(item.id) + "'>Add to cart</button>" +
        "<a class='smallBtn' href='/product/" + encodeURIComponent(item.id) + "'>View</a></div></div></article>";
    }).join("");

    bindProducts();
  }

  function runSearch() {
    var input = qs("#searchPageInput");
    var output = qs("#searchResults");
    if (!input || !output) return;

    var query = input.value.toLowerCase().trim();
    if (!query) {
      output.innerHTML = "";
      return;
    }

    var results = [];
    (site.products || []).forEach(function (item) {
      var text = [item.name, item.brand, item.category, item.description].join(" ").toLowerCase();
      if (text.indexOf(query) !== -1) {
        results.push(
          "<a class='searchItem' href='/product/" + encodeURIComponent(item.id) + "'>" +
          "<span>PRODUCT</span><h3>" + esc(item.name) + "</h3>" +
          "<p>" + esc(item.description || "") + "</p></a>"
        );
      }
    });

    (site.services || []).forEach(function (item) {
      var text = [item.title, item.description].join(" ").toLowerCase();
      if (text.indexOf(query) !== -1) {
        results.push(
          "<a class='searchItem' href='/services'>" +
          "<span>SERVICE</span><h3>" + esc(item.title) + "</h3>" +
          "<p>" + esc(item.description || "") + "</p></a>"
        );
      }
    });

    output.innerHTML = results.length
      ? results.join("")
      : "<div class='emptyState'><h3>No results.</h3></div>";
  }

  function submitOrder(event) {
    event.preventDefault();
    var notice = qs("#checkoutNotice");
    if (!cart.length) {
      if (notice) {
        notice.textContent = "Your cart is empty.";
        notice.className = "notice error";
      }
      return;
    }

    var form = new FormData(event.target);

    fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customer: {
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          address: form.get("address")
        },
        payment: form.get("payment"),
        items: cart
      })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || "Order failed");

        if (notice) {
          notice.textContent = "Order " + result.data.orderId + " received. We will contact you.";
          notice.className = "notice success";
        }

        cart = [];
        saveCart();
        renderCart();
        renderCheckout();
        updateChrome();
      })
      .catch(function (error) {
        if (notice) {
          notice.textContent = error.message;
          notice.className = "notice error";
        }
      });
  }

  function submitContact(event) {
    event.preventDefault();
    var notice = qs("#contactNotice");
    fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || "Unable to send");
        if (notice) {
          notice.textContent = "Thanks. Your message has been received.";
          notice.className = "notice success";
        }
        event.target.reset();
      })
      .catch(function (error) {
        if (notice) {
          notice.textContent = error.message;
          notice.className = "notice error";
        }
      });
  }

  function submitChat(event) {
    event.preventDefault();
    var input = qs("#chatInput");
    var body = qs("#chatBody");
    if (!input || !body) return;

    var message = input.value.trim();
    if (!message) return;

    body.insertAdjacentHTML("beforeend", "<div class='msg user'>" + esc(message) + "</div>");
    input.value = "";

    fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: message })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        body.insertAdjacentHTML("beforeend", "<div class='msg ai'>" + esc(data.reply || "I’m here to help.") + "</div>");
        body.scrollTop = body.scrollHeight;
      })
      .catch(function () {
        body.insertAdjacentHTML("beforeend", "<div class='msg ai'>Network issue. Please use WhatsApp or Contact.</div>");
      });
  }

  function generateBuild() {
    var budgetNode = qs("#builderBudget");
    var output = qs("#buildResult");
    if (!budgetNode || !output) return;

    var budget = Number(budgetNode.value || 0);
    var picks = (site.products || [])
      .slice()
      .sort(function (a, b) {
        return Math.abs(Number(a.price || 0) - budget / 3) -
          Math.abs(Number(b.price || 0) - budget / 3);
      })
      .slice(0, 3);

    output.innerHTML = "<div class='eyebrow'>YOUR RECOMMENDATION</div>" +
      "<h2>Starter setup for " + money(budget) + "</h2>" +
      "<div class='buildLines'>" +
      picks.map(function (item) {
        return "<div><span>" + esc(item.name) + "</span><b>" + money(item.price) + "</b></div>";
      }).join("") +
      "</div><p>Final compatibility should be confirmed before purchase.</p>";
  }

  function bindPage() {
    var menu = qs("#menuBtn");
    var nav = qs("#nav");
    if (menu && nav) {
      menu.onclick = function () {
        nav.classList.toggle("open");
      };
    }

    var agent = qs("#agentBtn");
    var agentWrap = qs("#agent");
    if (agent && agentWrap) {
      agent.onclick = function () {
        agentWrap.classList.toggle("open");
      };
    }

    var chatFab = qs("#chatFab");
    var chat = qs("#chat");
    if (chatFab && chat) {
      chatFab.onclick = function () {
        chat.classList.toggle("open");
      };
    }

    var closeChat = qs("#closeChat");
    if (closeChat && chat) {
      closeChat.onclick = function () {
        chat.classList.remove("open");
      };
    }

    var chatForm = qs("#chatForm");
    if (chatForm) chatForm.onsubmit = submitChat;

    var contactForm = qs("#contactForm");
    if (contactForm) contactForm.onsubmit = submitContact;

    var checkoutForm = qs("#checkoutForm");
    if (checkoutForm) checkoutForm.onsubmit = submitOrder;

    var searchInput = qs("#searchPageInput");
    var searchButton = qs("#searchPageBtn");
    if (searchInput) searchInput.oninput = runSearch;
    if (searchButton) searchButton.onclick = runSearch;

    var shopSearch = qs("#shopSearch");
    var shopCategory = qs("#categoryFilter");
    var sort = qs("#sort");
    if (shopSearch) shopSearch.oninput = renderShop;
    if (shopCategory) shopCategory.onchange = renderShop;
    if (sort) sort.onchange = renderShop;

    var buildButton = qs("#generateBuild");
    if (buildButton) buildButton.onclick = generateBuild;

    qsa("[data-budget]").forEach(function (button) {
      button.onclick = function () {
        var budget = qs("#builderBudget");
        if (budget) budget.value = button.getAttribute("data-budget");
        generateBuild();
      };
    });

    bindProducts();
    renderShop();
    renderCart();
    renderCheckout();
  }

  function render() {
    var app = qs("#app");
    if (!app) {
      updateChrome();
      bindPage();
      return;
    }
    updateChrome();
    bindPage();
  }

  document.addEventListener("DOMContentLoaded", function () {
    fetch("/api/site")
      .then(function (response) {
        if (!response.ok) throw new Error("Site data unavailable");
        return response.json();
      })
      .then(function (data) {
        site = data;
        render();
      })
      .catch(function () {
        var app = qs("#app");
        if (app) {
          app.innerHTML = "<section class='section'><div class='wrap'><div class='emptyState'><h2>Store data unavailable.</h2></div></div></section>";
        }
      });
  });
})();
