/* Shared chrome: navigation, footer, and the home-page countdown.
 * Injected from one place so the seven pages can't drift apart. */
(function () {
  "use strict";

  var PAGES = [
    ["Home", "home.html"],
    ["Travel", "travel.html"],
    ["Itinerary", "itinerary.html"],
    ["Things to Do", "things-to-do.html"],
    ["Photos", "photos.html"],
    ["RSVP", "rsvp.html"],
    ["Registry", "registry.html"]
  ];

  var WEDDING_DATE = new Date(2027, 9, 9); // 9 October 2027, local time

  function currentFile() {
    var path = window.location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  function buildNav() {
    var here = currentFile();

    var nav = document.createElement("nav");
    nav.className = "nav";
    nav.setAttribute("aria-label", "Main");

    var toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "nav-list");
    toggle.innerHTML = "<span></span>";

    var list = document.createElement("ul");
    list.className = "nav-list";
    list.id = "nav-list";

    PAGES.forEach(function (page) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = page[1];
      a.textContent = page[0];
      if (page[1] === here) a.setAttribute("aria-current", "page");
      li.appendChild(a);
      list.appendChild(li);
    });

    toggle.addEventListener("click", function () {
      var open = list.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Close the mobile menu on Escape so keyboard users aren't trapped.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && list.classList.contains("open")) {
        list.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });

    // Give the bar a background once it lifts off the top of the page.
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        nav.classList.toggle("nav--scrolled", window.scrollY > 8);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    nav.appendChild(toggle);
    nav.appendChild(list);

    var mount = document.querySelector("[data-nav]");
    if (mount) mount.replaceWith(nav);
    else document.body.insertBefore(nav, document.body.firstChild);
  }

  function buildFooter() {
    var footer = document.createElement("footer");
    footer.className = "footer";
    footer.innerHTML =
      "<h2>Questions</h2>" +
      "<p>If you have any questions please reach out to us at " +
        '<a href="mailto:azariaplusmelina@gmail.com">azariaplusmelina@gmail.com</a></p>' +
      '<a href="index.html" aria-label="Back to home">' +
        '<img class="monogram" src="assets/img/monogram.png" alt="" />' +
      "</a>";
    document.body.appendChild(footer);
  }

  function startCountdown() {
    var el = document.querySelector("[data-countdown]");
    if (!el) return;

    function render() {
      var now = new Date();
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var days = Math.round((WEDDING_DATE - today) / 86400000);

      if (days > 1) el.textContent = days.toLocaleString() + " days to go!";
      else if (days === 1) el.textContent = "1 day to go!";
      else if (days === 0) el.textContent = "Today's the day!";
      else el.textContent = "Married!";
    }

    render();
    setInterval(render, 60 * 60 * 1000);
  }

  function init() {
    buildNav();
    buildFooter();
    startCountdown();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
