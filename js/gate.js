/* Password gate.
 *
 * The passphrase itself is never stored — only the SHA-256 digest below.
 * Input is trimmed and lowercased before hashing, so the stored digest is
 * the digest of the lowercase passphrase.
 *
 * NOTE: this keeps the site out of casual view, but it is not real security.
 * Everything needed to render the pages is already in the browser. See
 * README.md for what this does and does not protect against.
 */
(function () {
  "use strict";

  var DIGEST = "f75f2aedcf37fb1945935a1bd35ac4eada1ff098d3648edc1732e14dc23a104c";
  var KEY = "am-unlocked";

  if (!document.documentElement.classList.contains("locked")) return;

  function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
      return Array.prototype.map
        .call(new Uint8Array(buf), function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function build() {
    var gate = document.createElement("div");
    gate.id = "gate";
    gate.innerHTML =
      '<div class="gate-box">' +
        '<img class="monogram" src="assets/img/monogram.png" alt="" />' +
        "<h1>Azaria &amp; Melina</h1>" +
        "<p>Please enter the password from your invitation.</p>" +
        '<form class="gate-form" autocomplete="off">' +
          '<label class="visually-hidden" for="gate-input">Password</label>' +
          '<div class="gate-field">' +
            '<input id="gate-input" type="password" name="password" placeholder="Password" ' +
              'autocapitalize="none" autocorrect="off" spellcheck="false" required />' +
            '<button type="button" class="gate-reveal" aria-pressed="false" ' +
              'aria-controls="gate-input" aria-label="Show password">' +
              '<svg class="eye-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M1.8 12S5.9 4.8 12 4.8 22.2 12 22.2 12 18.1 19.2 12 19.2 1.8 12 1.8 12Z"/>' +
                '<circle cx="12" cy="12" r="3.2"/></svg>' +
              '<svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M9.9 5.1A9.6 9.6 0 0 1 12 4.8c6.1 0 10.2 7.2 10.2 7.2a18 18 0 0 1-2.8 3.7"/>' +
                '<path d="M6.5 6.6A17.7 17.7 0 0 0 1.8 12S5.9 19.2 12 19.2a9.4 9.4 0 0 0 4-.9"/>' +
                '<path d="M9.8 9.8a3.2 3.2 0 0 0 4.4 4.4"/>' +
                '<path d="M3 3l18 18"/></svg>' +
            "</button>" +
          "</div>" +
          "<button type=\"submit\">Enter</button>" +
          '<p class="gate-error" role="status" aria-live="polite"></p>' +
        "</form>" +
      "</div>";

    document.body.appendChild(gate);

    var form = gate.querySelector("form");
    var input = gate.querySelector("input");
    var error = gate.querySelector(".gate-error");
    var reveal = gate.querySelector(".gate-reveal");

    input.focus();

    reveal.addEventListener("click", function () {
      var shown = reveal.getAttribute("aria-pressed") === "true";
      reveal.setAttribute("aria-pressed", String(!shown));
      reveal.setAttribute("aria-label", shown ? "Show password" : "Hide password");
      input.type = shown ? "password" : "text";
      input.focus();
    });

    // crypto.subtle only exists in a secure context (https / localhost).
    // Opening the files over file:// would otherwise fail silently.
    if (!window.crypto || !crypto.subtle) {
      error.textContent = "Please open this site over https.";
      input.disabled = true;
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      error.textContent = "";

      sha256Hex(input.value.trim().toLowerCase()).then(function (digest) {
        if (digest !== DIGEST) {
          error.textContent = "That password doesn't match. Please try again.";
          input.select();
          return;
        }

        try {
          localStorage.setItem(KEY, "1");
        } catch (e) {
          /* private browsing — unlock this page view only */
        }

        document.documentElement.classList.remove("locked");
        gate.remove();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
