(function () {
  "use strict";
  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/[^\/]*(\?.*)?$/, "") : "/";
  var indexUrl = base + "search-index.json";
  var siteRoot = new URL("../", base).pathname;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) { return String(s || "").toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i"); }
  function href(u) {
    if (/^https?:/i.test(u)) return u;
    return siteRoot.replace(/\/$/, "") + "/" + String(u || "").replace(/^\//, "");
  }

  // Point all search forms (name=s) to the local site root.
  function wireSearchForms() {
    var inputs = document.querySelectorAll('input[name="s"]');
    for (var i = 0; i < inputs.length; i++) {
      var f = inputs[i].form;
      if (f) { f.setAttribute("action", siteRoot); f.setAttribute("method", "get"); }
    }
  }

  function excerpt(text, terms) {
    text = String(text || "").replace(/\s+/g, " ").trim();
    var low = norm(text), pos = -1;
    for (var i = 0; i < terms.length && pos < 0; i++) pos = low.indexOf(terms[i]);
    var start = Math.max(0, pos - 80);
    var out = text.slice(start, start + 260);
    return (start > 0 ? "… " : "") + out + (start + 260 < text.length ? " …" : "");
  }

  function container() {
    return document.querySelector("main#main, main, #primary, .site-content .content-area, #content");
  }

  function render(q, results, err) {
    var c = container();
    if (!c) return;
    document.title = "\u201C" + q + "\u201D için arama sonuçları | Uyuyan Güzel";
    var h = '<div class="separate-containers"><header class="page-header" aria-label="Sayfa">' +
      '<h1 class="page-title">Arama Sonuçları: <span>' + esc(q) + "</span></h1></header>";
    if (err) {
      h += '<div class="inside-article"><div class="entry-content"><p>Arama dizini yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.</p></div></div>';
    } else if (!results.length) {
      h += '<div class="inside-article"><div class="entry-content"><p>Üzgünüz, arama kriterlerinize uygun bir sonuç bulunamadı. Lütfen farklı anahtar kelimelerle tekrar deneyin.</p></div></div>';
    } else {
      var terms = norm(q).split(/\s+/).filter(Boolean);
      results.forEach(function (r) {
        h += '<article class="post type-post"><div class="inside-article"><header class="entry-header">' +
          '<h2 class="entry-title"><a href="' + esc(href(r.url)) + '" rel="bookmark">' + esc(r.title) + "</a></h2></header>" +
          '<div class="entry-summary"><p>' + esc(excerpt(r.text, terms)) + "</p></div></div></article>";
      });
    }
    h += "</div>";
    c.innerHTML = h;
    window.scrollTo(0, 0);
  }

  function runSearch() {
    var q = new URLSearchParams(location.search).get("s");
    if (q === null) return;
    q = q.trim();
    var inputs = document.querySelectorAll('input[name="s"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].value = q;
    fetch(indexUrl, { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var terms = norm(q).split(/\s+/).filter(Boolean);
        if (!terms.length) return render(q, []);
        var scored = [];
        (data || []).forEach(function (d) {
          var t = norm(d.title), b = norm(d.text), s = 0;
          for (var i = 0; i < terms.length; i++) {
            var inT = t.indexOf(terms[i]) >= 0, inB = b.indexOf(terms[i]) >= 0;
            if (!inT && !inB) return;
            s += (inT ? 10 : 0) + (inB ? 1 : 0);
          }
          scored.push({ d: d, s: s });
        });
        scored.sort(function (a, b) { return b.s - a.s; });
        render(q, scored.slice(0, 50).map(function (x) { return x.d; }));
      })
      .catch(function () { render(q, [], true); });
  }

  // Server-only forms: comments, contact, newsletter. Never claim delivery.
  function disableServerForms() {
    var forms = document.querySelectorAll("form");
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      if (f.querySelector('input[name="s"]')) continue;
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var form = e.currentTarget;
        var msg = form.querySelector(".static-adapter-notice");
        if (!msg) {
          msg = document.createElement("p");
          msg.className = "static-adapter-notice";
          msg.setAttribute("role", "status");
          msg.style.cssText = "margin:1em 0;padding:10px 15px;background:var(--base-2,#f7f8f9);border-left:3px solid var(--accent,#954f04);color:var(--contrast,#090909);";
          form.appendChild(msg);
        }
        msg.textContent = "Bu sitenin statik kopyasında form gönderimi desteklenmiyor. Mesajınız gönderilmedi.";
      }, true);
    }
  }

  // Fallback mobile menu toggle only if the original theme script is absent.
  function menuFallback() {
    setTimeout(function () {
      if (window.generateMenuToggle || document.querySelector('script#generate-menu-js')) return;
      var btns = document.querySelectorAll(".menu-toggle");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", function (e) {
          var nav = e.currentTarget.closest(".main-navigation");
          if (!nav) return;
          var open = nav.classList.toggle("toggled");
          e.currentTarget.setAttribute("aria-expanded", open ? "true" : "false");
        });
      }
    }, 0);
  }

  function init() { wireSearchForms(); disableServerForms(); menuFallback(); runSearch(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
