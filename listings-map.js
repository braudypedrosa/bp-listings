/**
 * ListingsMap - Airbnb-style Listings + Map Widget
 * A standalone vanilla JavaScript library.
 * Dependencies: Leaflet (loaded automatically if not present)
 *
 * Usage:
 *   ListingsMap.init({
 *     container: '#my-container',
 *     listings: [...],
 *     mapOptions: { center: [14.55, 121.03], zoom: 12 },
 *     currency: '₱',
 *     renderSearchSlot: (containerEl) => {
 *       // Render your own search UI (shortcode, library, etc.) into containerEl
 *     },
 *     onFavorite: (listing, isFavorited) => {},
 *     onListingClick: (listing) => {},
 *   });
 */
(function (root, factory) {
  /* UMD: AMD / CommonJS / Browser global */
  if (typeof root["define"] === "function" && root["define"].amd) {
    root["define"]([], factory);
  } else if (typeof root["module"] === "object" && root["module"].exports) {
    root["module"].exports = factory();
  } else {
    root.ListingsMap = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ==========================================
  // SVG Icons
  // ==========================================
  var ICONS = {
    chevronLeft:
      '<svg viewBox="0 0 16 16"><polyline points="10 3 5 8 10 13"/></svg>',
    chevronRight:
      '<svg viewBox="0 0 16 16"><polyline points="6 3 11 8 6 13"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" class="lm-heart-outline"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    star: '<svg viewBox="0 0 16 16"><path d="M8 0l2.47 5.01L16 5.82l-4 3.9.94 5.51L8 12.49 3.06 15.23 4 9.72 0 5.82l5.53-.81z"/></svg>',
    expand:
      '<svg viewBox="0 0 16 16"><polyline points="4 1 1 1 1 4"/><polyline points="12 1 15 1 15 4"/><polyline points="4 15 1 15 1 12"/><polyline points="12 15 15 15 15 12"/></svg>',
    mapPin:
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14s-5-4.58-5-7.5a5 5 0 0 1 10 0C13 9.42 8 14 8 14z"/><circle cx="8" cy="6.5" r="1.5"/></svg>',
    chevronDown:
      '<svg viewBox="0 0 16 16"><polyline points="3 6 8 11 13 6"/></svg>',
    trophy: "&#127942;",
  };

  // ==========================================
  // Helpers
  // ==========================================
  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "html") {
          node.innerHTML = attrs[key];
        } else if (key === "text") {
          node.textContent = attrs[key];
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    return node;
  }

  function formatPrice(amount, currency) {
    if (typeof amount === "string") return currency + amount;
    return (
      currency + amount.toLocaleString("en-US", { maximumFractionDigits: 0 })
    );
  }

  function loadLeaflet(callback) {
    if (window.L) {
      callback();
      return;
    }
    // Load CSS
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    // Load JS
    var script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = callback;
    document.head.appendChild(script);
  }

  // ==========================================
  // Carousel Component
  // ==========================================
  function Carousel(images) {
    var self = this;
    self.index = 0;
    self.images = images || [];

    self.el = el("div", "lm-carousel");
    self.track = el("div", "lm-carousel-track");

    self.images.forEach(function (src) {
      var slide = el("div", "lm-carousel-slide");
      var img = el("img", null, { src: src, alt: "Property photo", loading: "lazy" });
      slide.appendChild(img);
      self.track.appendChild(slide);
    });

    self.el.appendChild(self.track);

    // Prev / Next buttons
    if (self.images.length > 1) {
      self.btnPrev = el("button", "lm-carousel-btn lm-carousel-btn-prev", {
        html: ICONS.chevronLeft,
        "aria-label": "Previous image",
      });
      self.btnNext = el("button", "lm-carousel-btn lm-carousel-btn-next", {
        html: ICONS.chevronRight,
        "aria-label": "Next image",
      });

      self.btnPrev.addEventListener("click", function (e) {
        e.stopPropagation();
        self.go(self.index - 1);
      });
      self.btnNext.addEventListener("click", function (e) {
        e.stopPropagation();
        self.go(self.index + 1);
      });

      self.el.appendChild(self.btnPrev);
      self.el.appendChild(self.btnNext);

      // Dots
      self.dotsContainer = el("div", "lm-carousel-dots");
      self.dots = [];
      self.images.forEach(function (_, i) {
        var dot = el("button", "lm-carousel-dot" + (i === 0 ? " lm-carousel-dot-active" : ""), {
          "aria-label": "Go to image " + (i + 1),
        });
        dot.addEventListener("click", function (e) {
          e.stopPropagation();
          self.go(i);
        });
        self.dots.push(dot);
        self.dotsContainer.appendChild(dot);
      });
      self.el.appendChild(self.dotsContainer);
    }

    self.update();
  }

  Carousel.prototype.go = function (i) {
    if (i < 0 || i >= this.images.length) return;
    this.index = i;
    this.update();
  };

  Carousel.prototype.update = function () {
    this.track.style.transform = "translateX(-" + this.index * 100 + "%)";
    if (this.btnPrev) {
      this.btnPrev.disabled = this.index === 0;
    }
    if (this.btnNext) {
      this.btnNext.disabled = this.index === this.images.length - 1;
    }
    if (this.dots) {
      var self = this;
      this.dots.forEach(function (dot, i) {
        if (i === self.index) {
          dot.classList.add("lm-carousel-dot-active");
        } else {
          dot.classList.remove("lm-carousel-dot-active");
        }
      });
    }
  };

  // ==========================================
  // ListingCard Component
  // ==========================================
  function ListingCard(listing, options) {
    var self = this;
    self.listing = listing;
    self.options = options;
    self.favorited = listing.favorited || false;

    self.el = el("div", "lm-card");
    self.el.setAttribute("data-listing-id", listing.id);

    // Carousel
    self.carousel = new Carousel(listing.images || []);
    self.el.appendChild(self.carousel.el);

    // Badge
    if (listing.badge) {
      var badgeClass = "lm-badge ";
      var badgeText = String(listing.badge);
      var isMinStay =
        badgeText.toLowerCase().indexOf("minimum stay") !== -1;

      if (badgeText === "Guest favorite") {
        badgeClass += "lm-badge-guest-favorite";
      } else if (badgeText === "Superhost") {
        badgeClass += "lm-badge-superhost";
      } else if (isMinStay) {
        badgeClass += "lm-badge-minstay";
      } else {
        badgeClass += "lm-badge-guest-favorite";
      }

      var badgeContent = "";
      if (badgeText === "Guest favorite") {
        badgeContent =
          '<span class="lm-badge-icon">' +
          ICONS.trophy +
          "</span> " +
          badgeText;
      } else {
        badgeContent = badgeText;
      }

      var badge = el("div", badgeClass, { html: badgeContent });
      self.carousel.el.appendChild(badge);
    }

    // Heart button
    self.heartBtn = el(
      "button",
      "lm-heart-btn" + (self.favorited ? " lm-heart-btn-active" : ""),
      { html: ICONS.heart, "aria-label": "Save to wishlist" }
    );
    self.heartBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      self.favorited = !self.favorited;
      if (self.favorited) {
        self.heartBtn.classList.add("lm-heart-btn-active");
      } else {
        self.heartBtn.classList.remove("lm-heart-btn-active");
      }
      if (options.onFavorite) {
        options.onFavorite(listing, self.favorited);
      }
    });
    self.carousel.el.appendChild(self.heartBtn);

    // Card Info
    var info = el("div", "lm-card-info");

    // Header row (title + rating)
    var header = el("div", "lm-card-header");
    var title = el("div", "lm-card-title", { text: listing.title || "" });
    header.appendChild(title);

    if (listing.rating) {
      var rating = el("div", "lm-card-rating");
      rating.innerHTML =
        ICONS.star +
        " " +
        listing.rating +
        (listing.reviewCount
          ? ' <span class="lm-card-rating-count">(' +
            listing.reviewCount +
            ")</span>"
          : "");
      header.appendChild(rating);
    }
    info.appendChild(header);

    // Subtitle
    if (listing.subtitle) {
      info.appendChild(
        el("div", "lm-card-subtitle", { text: listing.subtitle })
      );
    }

    // Details (bedrooms, beds)
    if (listing.details) {
      info.appendChild(
        el("div", "lm-card-details", { text: listing.details })
      );
    }

    // Dates
    if (listing.dates) {
      info.appendChild(el("div", "lm-card-dates", { text: listing.dates }));
    }

    // Price
    if (listing.price !== undefined) {
      var priceContainer = el("div", "lm-card-price");
      var priceValue = formatPrice(listing.price, options.currency || "");
      priceContainer.innerHTML =
        '<span class="lm-card-price-value">' +
        priceValue +
        "</span>" +
        (listing.pricePeriod
          ? ' <span class="lm-card-price-period">' +
            listing.pricePeriod +
            "</span>"
          : "");
      info.appendChild(priceContainer);
    }

    // Tag (e.g. "Free cancellation")
    if (listing.tag) {
      info.appendChild(el("div", "lm-card-tag", { text: listing.tag }));
    }

    self.el.appendChild(info);

    // Click handler
    self.el.addEventListener("click", function () {
      if (options.onListingClick) {
        options.onListingClick(listing);
      }
    });
  }

  ListingCard.prototype.setActive = function (active) {
    if (active) {
      this.el.classList.add("lm-card-active");
    } else {
      this.el.classList.remove("lm-card-active");
    }
  };

  // ==========================================
  // Main Widget
  // ==========================================
  function ListingsMapWidget(config) {
    var self = this;
    self.config = Object.assign(
      {
        container: null,
        listings: [],
        currency: "$",
        mapOptions: {
          center: [14.55, 121.03],
          zoom: 12,
        },
        tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        tileAttribution:
          '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        showMapToggle: true,
        showSort: true,
        showPagination: true,
        pageSize: 0, // 0 = no pagination
        renderSearchSlot: null, // callback: function(containerEl) { ... } — render your own search UI
        onFavorite: null,
        onListingClick: null,
        onMapMoveEnd: null,
      },
      config
    );

    self.cards = [];
    self.markers = [];
    self.activeListingId = null;
    self.map = null;
    self._mapVisible = true;
    self._sortOrder = "default";
    self._currentPage = 1;
    self._originalListings = self.config.listings.slice();

    self._init();
  }

  ListingsMapWidget.prototype._init = function () {
    var self = this;
    var container =
      typeof self.config.container === "string"
        ? document.querySelector(self.config.container)
        : self.config.container;

    if (!container) {
      console.error(
        "ListingsMap: Container not found:",
        self.config.container
      );
      return;
    }

    self.container = container;
    container.innerHTML = "";
    container.classList.add("lm-widget");

    // Listings panel
    self.listingsPanel = el("div", "lm-listings-panel");

    // Toolbar
    if (self.config.showMapToggle || self.config.showSort) {
      self._renderToolbar();
    }

    // Search slot: let consumer render their own search UI
    if (self.config.renderSearchSlot) {
      self._searchSlot = el("div", "lm-search-slot");
      self.listingsPanel.appendChild(self._searchSlot);
      self.config.renderSearchSlot(self._searchSlot);
    }

    self.listingsGrid = el("div", "lm-listings-grid");
    self.listingsPanel.appendChild(self.listingsGrid);

    // Pagination container
    self.paginationContainer = el("div", "lm-pagination");
    self.listingsPanel.appendChild(self.paginationContainer);

    container.appendChild(self.listingsPanel);

    // Map panel
    self.mapPanel = el("div", "lm-map-panel");
    self.mapContainer = el("div", "lm-map-container");
    self.mapPanel.appendChild(self.mapContainer);

    // Expand button
    var expandBtn = el("button", "lm-map-expand-btn", {
      html: ICONS.expand,
      "aria-label": "Expand map",
    });
    expandBtn.addEventListener("click", function () {
      self._toggleFullscreenMap();
    });
    self.mapPanel.appendChild(expandBtn);

    container.appendChild(self.mapPanel);

    // Render listings
    self._renderListings();

    // Load Leaflet then init map
    loadLeaflet(function () {
      self._initMap();
    });
  };

  // ==========================================
  // Toolbar: Map Toggle + Sort
  // ==========================================
  ListingsMapWidget.prototype._renderToolbar = function () {
    var self = this;
    self.toolbar = el("div", "lm-toolbar");

    // Left side: sort
    var left = el("div", "lm-toolbar-left");

    if (self.config.showSort) {
      var sortWrap = el("div", "lm-sort-wrapper");
      self.sortSelect = el("select", "lm-sort-select", { "aria-label": "Sort listings" });
      var options = [
        { value: "default", label: "Sort: Default" },
        { value: "price-asc", label: "Price: Low to High" },
        { value: "price-desc", label: "Price: High to Low" },
      ];
      options.forEach(function (opt) {
        var option = el("option", null, { value: opt.value, text: opt.label });
        self.sortSelect.appendChild(option);
      });
      self.sortSelect.addEventListener("change", function () {
        self._sortOrder = self.sortSelect.value;
        self._currentPage = 1;
        self._sortListings();
        self._renderListings();
      });
      sortWrap.appendChild(self.sortSelect);
      left.appendChild(sortWrap);
    }

    self.toolbar.appendChild(left);

    // Right side: map toggle
    var right = el("div", "lm-toolbar-right");

    if (self.config.showMapToggle) {
      self.mapToggleBtn = el("button", "lm-toggle-map-btn", {
        "aria-label": "Toggle map",
      });
      self.mapToggleBtn.innerHTML = ICONS.mapPin + " <span>Show map</span>";
      self._updateToggleLabel();
      self.mapToggleBtn.addEventListener("click", function () {
        self.toggleMap();
      });
      right.appendChild(self.mapToggleBtn);
    }

    self.toolbar.appendChild(right);
    self.listingsPanel.appendChild(self.toolbar);
  };

  ListingsMapWidget.prototype._updateToggleLabel = function () {
    if (!this.mapToggleBtn) return;
    var span = this.mapToggleBtn.querySelector("span");
    if (span) {
      span.textContent = this._mapVisible ? "Hide map" : "Show map";
    }
  };

  // ==========================================
  // Sort Logic
  // ==========================================
  ListingsMapWidget.prototype._sortListings = function () {
    var self = this;
    if (self._sortOrder === "default") {
      self.config.listings = self._originalListings.slice();
    } else if (self._sortOrder === "price-asc") {
      self.config.listings = self._originalListings.slice().sort(function (a, b) {
        return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      });
    } else if (self._sortOrder === "price-desc") {
      self.config.listings = self._originalListings.slice().sort(function (a, b) {
        return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      });
    }
  };

  // ==========================================
  // Pagination Helpers
  // ==========================================
  ListingsMapWidget.prototype._getPagedListings = function () {
    var self = this;
    var all = self.config.listings;
    if (!self.config.pageSize || self.config.pageSize <= 0) return all;
    var start = (self._currentPage - 1) * self.config.pageSize;
    return all.slice(start, start + self.config.pageSize);
  };

  ListingsMapWidget.prototype._getTotalPages = function () {
    var self = this;
    if (!self.config.pageSize || self.config.pageSize <= 0) return 1;
    return Math.ceil(self.config.listings.length / self.config.pageSize) || 1;
  };

  ListingsMapWidget.prototype._renderPagination = function () {
    var self = this;
    if (!self.paginationContainer) return;
    self.paginationContainer.innerHTML = "";

    var totalPages = self._getTotalPages();
    if (!self.config.showPagination || !self.config.pageSize || self.config.pageSize <= 0 || totalPages <= 1) return;

    var page = self._currentPage;

    // Prev button
    var prev = el("button", "lm-pagination-btn lm-pagination-btn-arrow", {
      html: ICONS.chevronLeft,
      "aria-label": "Previous page",
    });
    if (page <= 1) prev.disabled = true;
    prev.addEventListener("click", function () {
      if (page > 1) self.goToPage(page - 1);
    });
    self.paginationContainer.appendChild(prev);

    // Page numbers with ellipsis
    var pages = self._getPageNumbers(page, totalPages);
    pages.forEach(function (p) {
      if (p === "...") {
        var dots = el("span", "lm-pagination-ellipsis", { text: "..." });
        self.paginationContainer.appendChild(dots);
      } else {
        var btn = el("button", "lm-pagination-btn" + (p === page ? " lm-pagination-btn-active" : ""), {
          text: String(p),
          "aria-label": "Page " + p,
        });
        btn.addEventListener("click", function () {
          self.goToPage(p);
        });
        self.paginationContainer.appendChild(btn);
      }
    });

    // Next button
    var next = el("button", "lm-pagination-btn lm-pagination-btn-arrow", {
      html: ICONS.chevronRight,
      "aria-label": "Next page",
    });
    if (page >= totalPages) next.disabled = true;
    next.addEventListener("click", function () {
      if (page < totalPages) self.goToPage(page + 1);
    });
    self.paginationContainer.appendChild(next);
  };

  ListingsMapWidget.prototype._getPageNumbers = function (current, total) {
    if (total <= 7) {
      var arr = [];
      for (var i = 1; i <= total; i++) arr.push(i);
      return arr;
    }
    // Always show first, last, and 2 around current
    var pages = [1];
    if (current > 3) pages.push("...");
    for (var j = Math.max(2, current - 1); j <= Math.min(total - 1, current + 1); j++) {
      pages.push(j);
    }
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  // ==========================================
  // Listings Rendering
  // ==========================================
  ListingsMapWidget.prototype._renderListings = function () {
    var self = this;
    self.listingsGrid.innerHTML = "";
    self.cards = [];

    if (!self.config.listings || self.config.listings.length === 0) {
      var noResults = el("div", "lm-no-results");
      noResults.innerHTML =
        '<div class="lm-no-results-title">No results found</div><div>Try adjusting your search or filters.</div>';
      self.listingsGrid.appendChild(noResults);
      self._renderPagination();
      return;
    }

    var pagedListings = self._getPagedListings();

    pagedListings.forEach(function (listing) {
      var card = new ListingCard(listing, {
        currency: self.config.currency,
        onFavorite: self.config.onFavorite,
        onListingClick: function (l) {
          self._highlightListing(l.id);
          if (self.config.onListingClick) {
            self.config.onListingClick(l);
          }
        },
      });

      // Hover: highlight map marker
      card.el.addEventListener("mouseenter", function () {
        self._highlightMarker(listing.id);
      });
      card.el.addEventListener("mouseleave", function () {
        self._unhighlightMarker(listing.id);
      });

      self.cards.push(card);
      self.listingsGrid.appendChild(card.el);
    });

    // Pagination
    self._renderPagination();
  };

  ListingsMapWidget.prototype._initMap = function () {
    var self = this;
    var L = window.L;

    self.map = L.map(self.mapContainer, {
      center: self.config.mapOptions.center,
      zoom: self.config.mapOptions.zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(self.map);

    L.tileLayer(self.config.tileUrl, {
      attribution: self.config.tileAttribution,
      maxZoom: 19,
    }).addTo(self.map);

    // Price markers (use typeof so lat/lng 0 are valid)
    self.markers = [];
    self.config.listings.forEach(function (listing) {
      var hasCoords =
        typeof listing.lat === "number" &&
        typeof listing.lng === "number" &&
        !Number.isNaN(listing.lat) &&
        !Number.isNaN(listing.lng);
      if (hasCoords) {
        var priceLabel = formatPrice(
          listing.price,
          self.config.currency || ""
        );
        var icon = L.divIcon({
          className: "",
          html: '<div class="lm-price-marker" data-listing-id="' + listing.id + '">' + priceLabel + "</div>",
          iconSize: null,
          iconAnchor: [0, 0],
        });

        var marker = L.marker([listing.lat, listing.lng], { icon: icon }).addTo(
          self.map
        );

        // Popup
        var popupHtml =
          '<div class="lm-map-popup">' +
          (listing.images && listing.images[0]
            ? '<img class="lm-popup-img" src="' +
              listing.images[0] +
              '" alt="' +
              (listing.title || "") +
              '">'
            : "") +
          '<div class="lm-popup-body">' +
          '<div class="lm-popup-title">' +
          (listing.title || "") +
          "</div>" +
          '<div class="lm-popup-price"><strong>' +
          priceLabel +
          "</strong>" +
          (listing.pricePeriod ? " " + listing.pricePeriod : "") +
          "</div>" +
          "</div></div>";

        marker.bindPopup(popupHtml, {
          closeButton: true,
          className: "lm-map-popup",
          maxWidth: 270,
          offset: [0, -5],
        });

        marker.on("click", function () {
          self._highlightListing(listing.id);
          self._scrollToCard(listing.id);
        });

        // Store reference
        marker._listingId = listing.id;
        self.markers.push(marker);
      }
    });

    // Fit bounds if we have markers
    if (self.markers.length > 0) {
      var group = L.featureGroup(self.markers);
      self.map.fitBounds(group.getBounds().pad(0.1));
    }

    // Recompute map size after layout (fixes blank map when container height is from flex/min-height)
    setTimeout(function () {
      if (self.map) self.map.invalidateSize();
    }, 100);
    setTimeout(function () {
      if (self.map) self.map.invalidateSize();
    }, 350);

    // Map move event
    if (self.config.onMapMoveEnd) {
      self.map.on("moveend", function () {
        var bounds = self.map.getBounds();
        self.config.onMapMoveEnd({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          center: [self.map.getCenter().lat, self.map.getCenter().lng],
          zoom: self.map.getZoom(),
        });
      });
    }
  };

  ListingsMapWidget.prototype._highlightMarker = function (id) {
    this.markers.forEach(function (m) {
      if (m._listingId === id) {
        var el = m.getElement();
        if (el) {
          var pill = el.querySelector(".lm-price-marker");
          if (pill) pill.classList.add("lm-price-marker-active");
        }
      }
    });
  };

  ListingsMapWidget.prototype._unhighlightMarker = function (id) {
    this.markers.forEach(function (m) {
      if (m._listingId === id) {
        var el = m.getElement();
        if (el) {
          var pill = el.querySelector(".lm-price-marker");
          if (pill) pill.classList.remove("lm-price-marker-active");
        }
      }
    });
  };

  ListingsMapWidget.prototype._highlightListing = function (id) {
    this.cards.forEach(function (card) {
      card.setActive(card.listing.id === id);
    });
    this.markers.forEach(function (m) {
      var el = m.getElement();
      if (el) {
        var pill = el.querySelector(".lm-price-marker");
        if (pill) {
          if (m._listingId === id) {
            pill.classList.add("lm-price-marker-active");
          } else {
            pill.classList.remove("lm-price-marker-active");
          }
        }
      }
    });
  };

  ListingsMapWidget.prototype._scrollToCard = function (id) {
    var self = this;
    // If pagination is active, check if listing is on current page
    if (self.config.pageSize && self.config.pageSize > 0) {
      var idx = -1;
      for (var i = 0; i < self.config.listings.length; i++) {
        if (self.config.listings[i].id === id) { idx = i; break; }
      }
      if (idx >= 0) {
        var targetPage = Math.floor(idx / self.config.pageSize) + 1;
        if (targetPage !== self._currentPage) {
          self._currentPage = targetPage;
          self._renderListings();
        }
      }
    }
    var target = self.listingsGrid.querySelector(
      '[data-listing-id="' + id + '"]'
    );
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  ListingsMapWidget.prototype._toggleFullscreenMap = function () {
    var panel = this.mapPanel;
    if (panel.style.position === "fixed") {
      panel.style.position = "";
      panel.style.top = "";
      panel.style.left = "";
      panel.style.right = "";
      panel.style.bottom = "";
      panel.style.zIndex = "";
      panel.style.width = "";
      this.listingsPanel.style.display = "";
    } else {
      panel.style.position = "fixed";
      panel.style.top = "0";
      panel.style.left = "0";
      panel.style.right = "0";
      panel.style.bottom = "0";
      panel.style.zIndex = "9999";
      panel.style.width = "100%";
      this.listingsPanel.style.display = "none";
    }
    if (this.map) {
      var self = this;
      setTimeout(function () {
        self.map.invalidateSize();
      }, 100);
    }
  };

  // ==========================================
  // Public API
  // ==========================================
  /**
   * Update the listings data and re-render
   */
  ListingsMapWidget.prototype.setListings = function (listings) {
    this._originalListings = listings.slice();
    this._currentPage = 1;
    this._sortOrder = "default";
    if (this.sortSelect) this.sortSelect.value = "default";
    this.config.listings = listings;
    this._renderListings();

    // Remove old markers
    var self = this;
    if (self.map) {
      self.markers.forEach(function (m) {
        self.map.removeLayer(m);
      });
      self.markers = [];

      // Re-add markers (use typeof so lat/lng 0 are valid), including popups
      var L = window.L;
      listings.forEach(function (listing) {
        var hasCoords =
          typeof listing.lat === "number" &&
          typeof listing.lng === "number" &&
          !Number.isNaN(listing.lat) &&
          !Number.isNaN(listing.lng);
        if (!hasCoords) {
          return;
        }

        var priceLabel = formatPrice(
          listing.price,
          self.config.currency || ""
        );

        var icon = L.divIcon({
          className: "",
          html:
            '<div class="lm-price-marker" data-listing-id="' +
            listing.id +
            '">' +
            priceLabel +
            "</div>",
          iconSize: null,
          iconAnchor: [0, 0],
        });

        var marker = L.marker([listing.lat, listing.lng], {
          icon: icon,
        }).addTo(self.map);

        // Popup content mirrors _initMap so behavior is consistent
        var popupHtml =
          '<div class="lm-map-popup">' +
          (listing.images && listing.images[0]
            ? '<img class="lm-popup-img" src="' +
              listing.images[0] +
              '" alt="' +
              (listing.title || "") +
              '">'
            : "") +
          '<div class="lm-popup-body">' +
          '<div class="lm-popup-title">' +
          (listing.title || "") +
          "</div>" +
          '<div class="lm-popup-price"><strong>' +
          priceLabel +
          "</strong>" +
          (listing.pricePeriod ? " " + listing.pricePeriod : "") +
          "</div>" +
          "</div></div>";

        marker.bindPopup(popupHtml, {
          closeButton: true,
          className: "lm-map-popup",
          maxWidth: 270,
          offset: [0, -5],
        });

        marker.on("click", function () {
          self._highlightListing(listing.id);
          self._scrollToCard(listing.id);
        });

        marker._listingId = listing.id;
        self.markers.push(marker);
      });

      if (self.markers.length > 0) {
        var group = L.featureGroup(self.markers);
        self.map.fitBounds(group.getBounds().pad(0.1));
      }
    }
  };

  /**
   * Pan the map to a specific listing
   */
  ListingsMapWidget.prototype.panToListing = function (id) {
    var self = this;
    self.markers.forEach(function (m) {
      if (m._listingId === id) {
        self.map.setView(m.getLatLng(), self.map.getZoom(), { animate: true });
        m.openPopup();
      }
    });
    self._highlightListing(id);
    self._scrollToCard(id);
  };

  /**
   * Toggle map panel visibility
   */
  ListingsMapWidget.prototype.toggleMap = function () {
    var self = this;
    self._mapVisible = !self._mapVisible;
    if (self._mapVisible) {
      self.container.classList.remove("lm-map-hidden");
    } else {
      self.container.classList.add("lm-map-hidden");
    }
    self._updateToggleLabel();
    // Invalidate map size after CSS transition
    if (self.map && self._mapVisible) {
      setTimeout(function () {
        self.map.invalidateSize();
      }, 350);
    }
  };

  /**
   * Go to a specific page
   */
  ListingsMapWidget.prototype.goToPage = function (n) {
    var self = this;
    var total = self._getTotalPages();
    if (n < 1) n = 1;
    if (n > total) n = total;
    self._currentPage = n;
    self._renderListings();
    // Scroll listings panel to top
    if (self.listingsPanel) {
      self.listingsPanel.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /**
   * Destroy the widget
   */
  ListingsMapWidget.prototype.destroy = function () {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
      this.container.classList.remove("lm-widget");
    }
  };



  // ==========================================
  // Factory
  // ==========================================
  return {
    /**
     * Initialize a new ListingsMap widget
     * @param {Object} config
     * @returns {ListingsMapWidget}
     */
    init: function (config) {
      return new ListingsMapWidget(config);
    },

    /** Version */
    version: "1.0.0",
  };
});
