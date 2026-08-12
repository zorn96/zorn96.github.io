/* RSVP form handling.
 *
 * Posts responses to a Google Apps Script Web App (see
 * tools/rsvp-apps-script.gs) which upserts a row in a private Google Sheet,
 * keyed on name + email. Submitting again with the same name and email
 * updates the existing row instead of adding a new one.
 *
 * Apps Script returns a permissive Access-Control-Allow-Origin header on its
 * final response, and this posts a "simple" form-encoded request (no custom
 * headers, so no CORS preflight) — which means the browser can read the JSON
 * reply and confirm the row was actually saved before thanking the guest.
 */
(function () {
  "use strict";

  // ---- Configure these two before going live -----------------------------
  // Paste the deployed Web App URL (ends in /exec). Until it's set, the form
  // validates and previews but tells the guest submissions aren't open yet.
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbymDKv4tlgRkyrbXK2wY6Qo6PACIrHCu9_IWBIPEuoP6fa5XEGD8gy2yZjwp5JLh9ur/exec";
  // Must match SHARED_TOKEN in the Apps Script. Any long random string.
  var TOKEN = "da2e3146-52ef-42f6-aec8-adf0256bba9c-3cf7a0f9-6108-456a-9945-faa13f10243d";
  // ------------------------------------------------------------------------

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // Normalize a phone number for uniform submission:
  //  - a country code of 1 (a leading "+1", or a bare 11-digit number
  //    beginning with 1) is dropped, leaving the 10 national digits;
  //  - a US/Canada 10-digit number is formatted as "(xxx)xxx-xxxx";
  //  - anything else (a non-1 country code, or more than 10 digits) just has
  //    its spaces, dashes, and parentheses stripped, keeping any leading "+".
  function formatPhone(raw) {
    var trimmed = String(raw || "").trim();
    if (!trimmed) return "";
    var hasPlus = trimmed.charAt(0) === "+";
    var digits = trimmed.replace(/\D/g, "");

    function tenDigit(d) {
      return "(" + d.slice(0, 3) + ")" + d.slice(3, 6) + "-" + d.slice(6);
    }

    // Country code 1 -> drop it and format the remaining 10 digits.
    if (digits.length === 11 && digits.charAt(0) === "1") {
      return tenDigit(digits.slice(1));
    }
    // No country code, exactly 10 digits.
    if (!hasPlus && digits.length === 10) {
      return tenDigit(digits);
    }
    // Non-1 country code, or an unusual length: strip separators, keep "+".
    return (hasPlus ? "+" : "") + digits;
  }

  ready(function () {
    var form = document.querySelector(".rsvp-form");
    if (!form) return;

    var successBox = document.querySelector(".rsvp-success");
    var successMsg = document.querySelector(".rsvp-success-msg");
    var editBtn = document.querySelector(".rsvp-edit");
    var status = form.querySelector(".rsvp-status");
    var submit = form.querySelector(".rsvp-submit");

    var first = form.querySelector("#rsvp-first");
    var last = form.querySelector("#rsvp-last");
    var emailEl = form.querySelector("#rsvp-email");
    var phoneEl = form.querySelector("#rsvp-phone");

    // Prefill the name from the gate so guests don't retype it. The gate
    // stores it uppercased; keep that so the upsert key stays stable.
    if (window.guest) {
      if (window.guest.first) first.value = window.guest.first;
      if (window.guest.last) last.value = window.guest.last;
    }

    // Require at least 10 digits, counting only digits so formatting
    // characters (spaces, dashes, parens, +) don't pad the length. Feeding
    // it through setCustomValidity lets the browser's own validation UI and
    // the firstInvalid() pass below handle it.
    function validatePhone() {
      var digits = phoneEl.value.replace(/\D/g, "");
      phoneEl.setCustomValidity(
        !phoneEl.value.trim() || digits.length >= 10
          ? ""
          : "Please enter a phone number with at least 10 digits."
      );
    }
    phoneEl.addEventListener("input", validatePhone);

    // Require text before and after "@", plus a dot-separated domain after it.
    // Native type="email" allows "name@localhost" (no dot), so we tighten it.
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function validateEmail() {
      var value = emailEl.value.trim();
      emailEl.setCustomValidity(
        !value || EMAIL_RE.test(value)
          ? ""
          : "Please enter a valid email address, like name@example.com."
      );
    }
    emailEl.addEventListener("input", validateEmail);

    function setStatus(message, isError) {
      status.textContent = message || "";
      status.classList.toggle("is-error", !!isError);
    }

    function firstInvalid() {
      // Native validity check, but only over the visible controls.
      var controls = form.querySelectorAll("input, textarea, select");
      for (var i = 0; i < controls.length; i++) {
        var el = controls[i];
        if (el.offsetParent === null && el.type !== "radio") continue; // hidden
        if (!el.checkValidity()) return el;
      }
      return null;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setStatus("");

      validateEmail();
      validatePhone();
      var bad = firstInvalid();
      if (bad) {
        bad.reportValidity();
        return;
      }

      if (!ENDPOINT) {
        setStatus(
          "RSVPs aren't open just yet — please check back soon!",
          true
        );
        return;
      }

      var attending = form.querySelector('input[name="attending"]:checked');

      var data = new URLSearchParams();
      data.set("token", TOKEN);
      data.set("first", first.value.trim());
      data.set("last", last.value.trim());
      data.set("email", emailEl.value.trim());
      // Reflect the normalized number back into the field, then submit it.
      phoneEl.value = formatPhone(phoneEl.value);
      data.set("phone", phoneEl.value);
      data.set("attending", attending ? attending.value : "");

      submit.disabled = true;
      setStatus("Sending your RSVP…");

      // Passing a URLSearchParams body makes fetch send a simple
      // form-encoded request; default (cors) mode lets us read the reply.
      fetch(ENDPOINT, { method: "POST", body: data })
        .then(function (response) {
          return response.json();
        })
        .then(function (result) {
          if (!result || !result.ok) {
            throw new Error((result && result.error) || "failed");
          }
          var declined = attending && attending.value === "No";
          successMsg.textContent = declined
            ? "We're so sorry you can't make it, but thank you for letting us know. You can change your response any time by returning to this page."
            : "You're on the list — we can't wait to celebrate with you! You can update your response any time by returning to this page.";
          form.hidden = true;
          successBox.hidden = false;
          successBox.scrollIntoView({ behavior: "smooth", block: "start" });
        })
        .catch(function () {
          submit.disabled = false;
          setStatus(
            "Sorry — we couldn't save your RSVP just then. Please try again, or email us at azariaplusmelina@gmail.com.",
            true
          );
        });
    });

    if (editBtn) {
      editBtn.addEventListener("click", function () {
        successBox.hidden = true;
        form.hidden = false;
        setStatus("");
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  });
})();
