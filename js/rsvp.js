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

    // Prefill the name from the gate so guests don't retype it. The gate
    // stores it uppercased; keep that so the upsert key stays stable.
    if (window.guest) {
      if (window.guest.first) first.value = window.guest.first;
      if (window.guest.last) last.value = window.guest.last;
    }

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
      data.set("email", form.querySelector("#rsvp-email").value.trim());
      data.set("phone", form.querySelector("#rsvp-phone").value.trim());
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
