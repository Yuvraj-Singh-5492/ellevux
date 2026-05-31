/* Ellevux shared header — refined floating glass nav.
   Self-contained: injects markup + styles, scroll-aware glass, mobile menu,
   and Supabase-aware auth buttons. No lucide dependency (inline SVG).
   Usage: <script src="nav.js"></script> just before </body>. */
(function () {
  "use strict";

  // Avoid double-injection
  if (document.getElementById("ellevux-header")) return;

  // ---- Inline SVGs (so we don't depend on lucide being loaded) ----
  var SVG = {
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    arrowUpRight: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>',
    menu: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  };

  // ---- Scroll-aware glass styling (injected, Tailwind-independent) ----
  var style = document.createElement("style");
  style.textContent = [
    "#ellevux-header{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;justify-content:center;padding:0 16px;font-family:'Inter',sans-serif;}",
    "#ellevux-header .ev-nav{margin-top:12px;width:100%;max-width:1152px;display:flex;align-items:center;justify-content:space-between;border-radius:16px;padding:0 16px;height:72px;border:1px solid transparent;background:transparent;transition:height .3s ease,background .3s ease,border-color .3s ease,box-shadow .3s ease;}",
    "#ellevux-header .ev-nav.scrolled{height:64px;background:rgba(0,0,0,.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-color:rgba(255,255,255,.1);box-shadow:0 8px 32px -12px rgba(0,0,0,.7);}",
    "@media (min-width:768px){#ellevux-header .ev-nav{padding:0 20px;}}",
    "#ellevux-header .ev-brand{display:flex;align-items:center;gap:10px;border-radius:8px;text-decoration:none;transition:transform .3s ease;}",
    "#ellevux-header .ev-brand:hover{transform:scale(1.03);}",
    "#ellevux-header .ev-brand{gap:8px;}",
    "#ellevux-header .ev-logo{height:28px;width:auto;display:block;}",
    "#ellevux-header .ev-wordmark{font-size:18px;font-weight:600;letter-spacing:-0.02em;line-height:1;color:#fff;}",
    "#ellevux-header a,#ellevux-header button{font-family:inherit;}",
    ".ev-link{padding:8px 12px;border-radius:8px;color:#888;font-size:14px;text-decoration:none;transition:color .2s,background .2s;}",
    ".ev-link:hover{color:#fff;background:rgba(255,255,255,.05);}",
    ".ev-link.active{color:#fff;}",
    ".ev-cta{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#000;padding:8px 12px 8px 16px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;transition:transform .2s,box-shadow .2s;}",
    ".ev-cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px -8px rgba(255,255,255,.4);}",
    ".ev-cta svg{transition:transform .2s;}",
    ".ev-cta:hover svg{transform:translateX(2px);}",
    ".ev-burger{display:none;width:40px;height:40px;align-items:center;justify-content:center;border-radius:8px;color:#fff;background:transparent;border:0;cursor:pointer;transition:background .2s;}",
    ".ev-burger:hover{background:rgba(255,255,255,.05);}",
    ".ev-desktop{display:none;align-items:center;}",
    "@media (min-width:768px){.ev-desktop{display:flex;}.ev-burger{display:none!important;}}",
    "@media (max-width:767px){.ev-burger{display:flex;}}",
    "#ellevux-mobile{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .25s ease;}",
    "#ellevux-mobile.open{opacity:1;pointer-events:auto;}",
    "#ellevux-mobile .ev-sheet{position:absolute;top:80px;left:16px;right:16px;background:rgba(10,10,10,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:12px;box-shadow:0 16px 48px -12px rgba(0,0,0,.8);transform:translateY(-12px);transition:transform .25s ease;}",
    "#ellevux-mobile.open .ev-sheet{transform:translateY(0);}",
    ".ev-mlink{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:12px;font-size:16px;color:#e6e6e6;text-decoration:none;transition:background .2s;}",
    ".ev-mlink:hover{background:rgba(255,255,255,.05);}",
    ".ev-mdivider{height:1px;background:rgba(255,255,255,.1);margin:8px 0;}",
    ".ev-mcta{display:flex;align-items:center;justify-content:center;gap:8px;background:#fff;color:#000;padding:12px 16px;border-radius:12px;font-weight:600;text-decoration:none;margin-top:4px;}",
    "#ellevux-header :focus-visible,#ellevux-mobile :focus-visible{outline:none;box-shadow:0 0 0 2px rgba(255,255,255,.4),0 0 0 4px #000;}"
  ].join("");
  document.head.appendChild(style);

  // ---- Determine current page for active-link highlighting ----
  var path = (location.pathname.split("/").pop() || "react_landing.html").toLowerCase();
  function isActive(href) { return href.toLowerCase() === path ? " active" : ""; }

  var LINKS = [
    { href: "docs.html", label: "Docs" },
    { href: "pricing.html", label: "Pricing" },
    { href: "changelog.html", label: "Changelog" }
  ];

  function deskLinks() {
    return LINKS.map(function (l) {
      return '<a class="ev-link' + isActive(l.href) + '" href="' + l.href + '">' + l.label + "</a>";
    }).join("");
  }
  function mobileLinks() {
    return LINKS.map(function (l) {
      return '<a class="ev-mlink" href="' + l.href + '">' + l.label + " " + SVG.arrowUpRight + "</a>";
    }).join("");
  }

  // ---- Build header ----
  var header = document.createElement("header");
  header.id = "ellevux-header";
  header.innerHTML =
    '<nav class="ev-nav">' +
      '<div style="display:flex;align-items:center;gap:32px;">' +
        '<a href="react_landing.html" aria-label="Ellevux home" class="ev-brand">' +
          '<img src="logo-icon.png" alt="" class="ev-logo">' +
          '<span class="ev-wordmark">ellevux</span>' +
        "</a>" +
        '<div class="ev-desktop" style="gap:4px;">' + deskLinks() + "</div>" +
      "</div>" +
      '<div class="ev-desktop" id="ellevux-auth" style="gap:8px;font-weight:500;"></div>' +
      '<button class="ev-burger" id="ellevux-burger" aria-label="Open menu" aria-expanded="false">' + SVG.menu + "</button>" +
    "</nav>";

  var mobile = document.createElement("div");
  mobile.id = "ellevux-mobile";
  mobile.innerHTML = '<div class="ev-sheet" id="ellevux-sheet"></div>';

  document.body.insertBefore(header, document.body.firstChild);
  document.body.appendChild(mobile);

  // ---- Auth-aware button rendering ----
  function authDesktop(loggedIn) {
    if (loggedIn) {
      return '<a class="ev-link" href="dashboard.html">Dashboard</a>' +
             '<a class="ev-cta" href="#" id="ev-signout">Sign Out ' + SVG.arrowRight + "</a>";
    }
    return '<a class="ev-link" href="login.html">Login</a>' +
           '<a class="ev-cta" href="signup.html">Get Started ' + SVG.arrowRight + "</a>";
  }
  function authMobile(loggedIn) {
    if (loggedIn) {
      return '<a class="ev-mlink" href="dashboard.html">Dashboard ' + SVG.arrowUpRight + "</a>" +
             '<a class="ev-mcta" href="#" id="ev-signout-m">Sign Out ' + SVG.arrowRight + "</a>";
    }
    return '<a class="ev-mlink" href="login.html">Login ' + SVG.arrowUpRight + "</a>" +
           '<a class="ev-mcta" href="signup.html">Get Started ' + SVG.arrowRight + "</a>";
  }

  function wireSignOut() {
    function out(e) {
      if (e) e.preventDefault();
      if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.signOut().then(function () { location.reload(); });
      }
    }
    var d = document.getElementById("ev-signout");
    var m = document.getElementById("ev-signout-m");
    if (d) d.addEventListener("click", out);
    if (m) m.addEventListener("click", out);
  }

  function renderAuth(loggedIn) {
    document.getElementById("ellevux-auth").innerHTML = authDesktop(loggedIn);
    document.getElementById("ellevux-sheet").innerHTML =
      mobileLinks() + '<div class="ev-mdivider"></div>' + authMobile(loggedIn);
    wireSignOut();
  }

  // Initial render (logged-out), then upgrade if a Supabase session exists.
  renderAuth(false);
  if (window.supabaseClient && window.supabaseClient.auth) {
    window.supabaseClient.auth.getSession().then(function (res) {
      var session = res && res.data ? res.data.session : null;
      renderAuth(!!session);
    }).catch(function () { /* stay logged-out */ });
  }

  // ---- Scroll glass ----
  var nav = header.querySelector(".ev-nav");
  function onScroll() {
    if (window.scrollY > 16) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---- Mobile menu toggle ----
  var burger = document.getElementById("ellevux-burger");
  function setMenu(open) {
    mobile.classList.toggle("open", open);
    burger.innerHTML = open ? SVG.close : SVG.menu;
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setMenu(!mobile.classList.contains("open")); });
  mobile.addEventListener("click", function (e) { if (e.target === mobile) setMenu(false); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
})();
