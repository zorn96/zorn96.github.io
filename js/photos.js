/* Photo gallery.
 *
 * Static hosting can't list a directory, so the page reads
 * assets/photos/manifest.json — regenerate it with tools/build-photos.py
 * after adding or removing photos. Entries are already sorted by filename.
 */
(function () {
  "use strict";

  function render(grid, photos) {
    var fragment = document.createDocumentFragment();

    photos.forEach(function (photo, index) {
      var figure = document.createElement("figure");
      var img = document.createElement("img");

      img.src = photo.src;
      img.alt = "";
      // Reserving the real aspect ratio stops the grid jumping as images arrive.
      if (photo.w && photo.h) {
        img.width = photo.w;
        img.height = photo.h;
      }
      // The first row is likely above the fold; let the rest load lazily.
      img.loading = index < 4 ? "eager" : "lazy";
      img.decoding = "async";

      figure.appendChild(img);
      fragment.appendChild(figure);
    });

    grid.textContent = "";
    grid.appendChild(fragment);
  }

  function init() {
    var grid = document.querySelector("[data-photo-grid]");
    var status = document.querySelector("[data-photo-status]");
    if (!grid) return;

    fetch("assets/photos/manifest.json", { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("manifest " + response.status);
        return response.json();
      })
      .then(function (photos) {
        if (!photos.length) {
          if (status) status.textContent = "No photos yet — check back soon!";
          return;
        }
        if (status) status.remove();
        render(grid, photos);
      })
      .catch(function () {
        if (status) {
          status.textContent =
            "Photos couldn't be loaded. If you're viewing this from a file " +
            "rather than a web server, try http://localhost instead.";
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
