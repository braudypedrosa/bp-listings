import './bp-listings.scss';

/**
 * ListingsMap - Airbnb-style Listings + Map Widget
 * A standalone vanilla JavaScript library.
 * Dependencies: Leaflet (loaded automatically if not present)
 *
 * Usage:
 *   ListingsMap.init({
 *     container: '#my-container',
 *     listings: [...],
 *     mapOptions: { center: [14.55, 121.03], zoom: 15 },
 *     currency: '₱',
 *     renderSearchSlot: (containerEl, widget) => {
 *       // Render your own search UI (shortcode, library, etc.) into containerEl
 *       // Optionally return a cleanup function
 *     },
 *     onFavorite: (listing, isFavorited) => {},
 *     onListingClick: (listing) => {},
 *   });
 */
(function (root, factory) {
  /* UMD: AMD / CommonJS / Browser global */
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ListingsMap = factory();
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof self !== "undefined"
      ? self
      : this,
  function () {
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
    grid:
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>',
    list:
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/></svg>',
    chevronUp:
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 10 8 5 13 10"/></svg>',
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

  function createBadgeElement(badgeValue, extraClassName) {
    if (!badgeValue) {
      return null;
    }

    var badgeText = String(badgeValue);
    var badgeClass = "lm-badge ";
    var isMinStay = badgeText.toLowerCase().indexOf("minimum stay") !== -1;

    if (badgeText === "Guest favorite") {
      badgeClass += "lm-badge-guest-favorite";
    } else if (badgeText === "Superhost") {
      badgeClass += "lm-badge-superhost";
    } else if (isMinStay) {
      badgeClass += "lm-badge-minstay";
    } else {
      badgeClass += "lm-badge-guest-favorite";
    }

    if (extraClassName) {
      badgeClass += extraClassName;
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

    return el("div", badgeClass, { html: badgeContent });
  }

  function createRatingElement(listing, extraClassName) {
    if (!listing.rating) {
      return null;
    }

    var rating = el("div", "lm-card-rating" + (extraClassName || ""));
    rating.innerHTML =
      ICONS.star +
      " " +
      listing.rating +
      (listing.reviewCount
        ? ' <span class="lm-card-rating-count">(' +
          listing.reviewCount +
          ")</span>"
        : "");
    return rating;
  }

  function createPriceElement(listing, currency) {
    if (listing.price === undefined) {
      return null;
    }

    var priceContainer = el("div", "lm-card-price");
    var priceValue = formatPrice(listing.price, currency || "");
    priceContainer.innerHTML =
      '<span class="lm-card-price-value">' +
      priceValue +
      "</span>" +
      (listing.pricePeriod
        ? ' <span class="lm-card-price-period">' +
          listing.pricePeriod +
          "</span>"
        : "");
    return priceContainer;
  }

  function createMapPopupHtml(listing, priceLabel) {
    return (
      '<div class="lm-map-popup">' +
      (listing.images && listing.images[0]
        ? '<img class="lm-popup-img" src="' +
          listing.images[0] +
          '" alt="' +
          (listing.title || "") +
          '">'
        : "") +
      '<div class="lm-popup-body">' +
      '<div class="lm-popup-header">' +
      '<div class="lm-popup-title">' +
      (listing.title || "") +
      "</div>" +
      (listing.rating
        ? '<div class="lm-popup-rating">' +
          ICONS.star +
          " " +
          listing.rating +
          (listing.reviewCount
            ? ' <span class="lm-popup-rating-count">(' +
              listing.reviewCount +
              ")</span>"
            : "") +
          "</div>"
        : "") +
      "</div>" +
      (listing.subtitle
        ? '<div class="lm-popup-subtitle">' + listing.subtitle + "</div>"
        : "") +
      (listing.details
        ? '<div class="lm-popup-details">' + listing.details + "</div>"
        : "") +
      (listing.dates
        ? '<div class="lm-popup-dates">' + listing.dates + "</div>"
        : "") +
      '<div class="lm-popup-price"><strong>' +
      priceLabel +
      "</strong>" +
      (listing.pricePeriod ? " " + listing.pricePeriod : "") +
      "</div>" +
      "</div></div>"
    );
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function normalizeString(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim().toLowerCase();
  }

  function normalizeStringArray(value) {
    return toArray(value).map(function (entry) {
      return normalizeString(entry);
    }).filter(Boolean);
  }

  function matchesSubstring(sourceValue, queryValue) {
    var query = normalizeString(queryValue);
    if (!query) return true;
    return normalizeStringArray(sourceValue).some(function (entry) {
      return entry.indexOf(query) !== -1;
    });
  }

  function matchesExact(sourceValue, queryValue) {
    var query = normalizeString(queryValue);
    if (!query) return true;
    return normalizeStringArray(sourceValue).some(function (entry) {
      return entry === query;
    });
  }

  function matchesAllChoices(sourceValue, queryValue) {
    var requested = normalizeStringArray(queryValue);
    var available;

    if (requested.length === 0) return true;
    available = new Set(normalizeStringArray(sourceValue));
    return requested.every(function (entry) {
      return available.has(entry);
    });
  }

  function matchesCounter(sourceValue, queryValue) {
    var requested;
    var available;

    if (queryValue === null || queryValue === undefined || queryValue === "") {
      return true;
    }

    requested = Number(queryValue);
    available = Number(sourceValue);

    if (!Number.isFinite(requested)) return true;
    if (!Number.isFinite(available)) return false;
    return available >= requested;
  }

  function isValidDateString(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function matchesAvailability(availability, checkIn, checkOut) {
    if (!checkIn && !checkOut) return true;

    if (
      !Array.isArray(availability) ||
      !isValidDateString(checkIn) ||
      !isValidDateString(checkOut)
    ) {
      return false;
    }

    return availability.some(function (range) {
      return (
        range &&
        isValidDateString(range.start) &&
        isValidDateString(range.end) &&
        range.start <= checkIn &&
        range.end >= checkOut
      );
    });
  }

  function buildFieldTypeMap(config) {
    var map = {};
    var fieldDescriptors = Array.isArray(config && config.fields) ? config.fields : [];
    var filterDescriptors = Array.isArray(config && config.filters) ? config.filters : [];

    fieldDescriptors.concat(filterDescriptors).forEach(function (descriptor) {
      if (descriptor && descriptor.key && descriptor.type) {
        map[descriptor.key] = descriptor.type;
      }
    });

    return map;
  }

  function matchSearchValue(type, listingValue, submittedValue) {
    if (type === "checkbox") return matchesAllChoices(listingValue, submittedValue);
    if (type === "select" || type === "radio") return matchesExact(listingValue, submittedValue);
    if (type === "counter") return matchesCounter(listingValue, submittedValue);
    return matchesSubstring(listingValue, submittedValue);
  }

  function createSearchDataMatcher(config) {
    var fieldTypeMap = buildFieldTypeMap(config);

    return function matchListingToSearchPayload(listing, payload) {
      var searchData = (listing && listing.searchData) || {};
      var fieldValues = searchData.fields || {};
      var filterValues = searchData.filters || {};
      var customFields = (payload && payload.customFields) || {};
      var filters = (payload && payload.filters) || {};
      var key;

      if (!matchesSubstring(searchData.location, payload && payload.location)) {
        return false;
      }

      if (!matchesAvailability(searchData.availability, payload && payload.checkIn, payload && payload.checkOut)) {
        return false;
      }

      for (key in customFields) {
        if (Object.prototype.hasOwnProperty.call(customFields, key)) {
          if (!matchSearchValue(fieldTypeMap[key], fieldValues[key], customFields[key])) {
            return false;
          }
        }
      }

      for (key in filters) {
        if (Object.prototype.hasOwnProperty.call(filters, key)) {
          if (!matchSearchValue(fieldTypeMap[key], filterValues[key], filters[key])) {
            return false;
          }
        }
      }

      return true;
    };
  }

  function filterListingsBySearchData(listings, payload, config) {
    var matcher = createSearchDataMatcher(config);
    return toArray(listings).filter(function (listing) {
      return matcher(listing, payload || {});
    });
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

    if (listing.badge) {
      self.carousel.el.appendChild(createBadgeElement(listing.badge));
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
    var title = el("div", "lm-card-title", { text: listing.title || "" });
    var subtitle = listing.subtitle
      ? el("div", "lm-card-subtitle", { text: listing.subtitle })
      : null;
    var priceContainer = createPriceElement(listing, options.currency || "");
    var header = el("div", "lm-card-header");
    var rating = createRatingElement(listing);

    header.appendChild(title);
    if (rating) {
      header.appendChild(rating);
    }
    info.appendChild(header);

    if (subtitle) {
      info.appendChild(subtitle);
    }

    if (listing.details) {
      info.appendChild(
        el("div", "lm-card-details", { text: listing.details })
      );
    }

    if (listing.dates) {
      info.appendChild(el("div", "lm-card-dates", { text: listing.dates }));
    }

    if (priceContainer) {
      info.appendChild(priceContainer);
    }

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
          zoom: 15,
        },
        tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        tileAttribution:
          '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        showMapToggle: true,
        showSort: true,
        showPagination: true,
        viewMode: "grid", // "grid" | "list"
        stickyMap: false, // true keeps map pinned while page scrolls
        pageSize: 12, // explicit values <= 0 disable pagination
        paginationMode: "pages", // "pages" | "infinite"
        fullHeightMap: false, // true makes widget fill viewport height
        minDesktopColumns: 3,
        maxDesktopColumns: 8,
        markerFocusZoom: 15,
        markerFocusCenter: null, // [lat, lng] when you want a fixed center target
        renderSearchSlot: null, // callback: function(containerEl, widget) { ... } — optionally return a cleanup function
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
    self._viewMode = self._resolveViewMode(self.config.viewMode);
    self.config.viewMode = self._viewMode;
    self._stickyMap = Boolean(self.config.stickyMap);
    self.config.stickyMap = self._stickyMap;
    self._sortOrder = "default";
    self._currentPage = 1;
    self._paginationMode = self._resolvePaginationMode(self.config.paginationMode);
    self.config.paginationMode = self._paginationMode;
    self._fullHeightMap = Boolean(self.config.fullHeightMap);
    self.config.fullHeightMap = self._fullHeightMap;
    self._visibleCount = 0;
    self._originalListings = self.config.listings.slice();
    self._searchSlot = null;
    self._searchSlotCleanup = null;
    self._isDestroyed = false;
    self._nativeSortChangeHandler = null;
    self._listingsScrollHandler = null;
    self._windowResizeHandler = null;
    self._infiniteScrollObserver = null;
    self._infiniteScrollSentinel = null;

    self._resetPaginationState();

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
    if (self._fullHeightMap) {
      container.classList.add("lm-widget-full-height");
    }
    if (self._stickyMap) {
      container.classList.add("lm-map-sticky");
    }
    self._syncViewModeControls();

    // Listings panel
    self.listingsPanelShell = el("div", "lm-listings-panel-shell");
    self.listingsPanel = el("div", "lm-listings-panel");
    self.listingsPanelShell.appendChild(self.listingsPanel);
    self.stickyControls = el("div", "lm-sticky-controls");
    self.listingsPanel.appendChild(self.stickyControls);

    // Toolbar
    if (self.config.showMapToggle || self.config.showSort) {
      self._renderToolbar();
    }

    container.appendChild(self.listingsPanelShell);

    self.listingsGrid = el("div", "lm-listings-grid");
    self.paginationContainer = el("div", "lm-pagination");

    // Search slot: let consumer render their own search UI
    if (self.config.renderSearchSlot) {
      self._searchSlot = el("div", "lm-search-slot");
      self.stickyControls.appendChild(self._searchSlot);
      var cleanup = self.config.renderSearchSlot(self._searchSlot, self);
      if (typeof cleanup === "function") {
        self._searchSlotCleanup = cleanup;
      }
    }

    self.listingsPanel.appendChild(self.listingsGrid);
    self._infiniteScrollSentinel = el("div", "lm-infinite-sentinel", {
      "aria-hidden": "true",
    });
    self.listingsPanel.appendChild(self._infiniteScrollSentinel);
    self.listingsPanel.appendChild(self.paginationContainer);
    self.backToTopBtn = el("button", "lm-back-to-top", {
      type: "button",
      "aria-label": "Back to top",
      html: ICONS.chevronUp,
    });
    self.backToTopBtn.addEventListener("click", function () {
      self._scrollToListingsTop();
    });
    self.listingsPanelShell.appendChild(self.backToTopBtn);
    self._listingsScrollHandler = function () {
      self._updateBackToTopVisibility();
    };
    self._scrollListenerTarget = self._stickyMap ? window : self.listingsPanel;
    self._scrollListenerTarget.addEventListener("scroll", self._listingsScrollHandler);
    self._updateBackToTopVisibility();
    self._windowResizeHandler = function () {
      self._updateDynamicGridColumns();
      if (self._stickyMap) {
        self._updateBackToTopPosition();
      }
    };
    window.addEventListener("resize", self._windowResizeHandler);

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

  ListingsMapWidget.prototype._getListingsPanelWidth = function () {
    if (this.listingsPanel && this.listingsPanel.clientWidth > 0) {
      return this.listingsPanel.clientWidth;
    }
    if (this.container && this.container.clientWidth > 0) {
      return this.container.clientWidth;
    }
    if (
      this.listingsPanel &&
      typeof this.listingsPanel.getBoundingClientRect === "function"
    ) {
      var panelWidth = this.listingsPanel.getBoundingClientRect().width;
      if (panelWidth > 0) {
        return panelWidth;
      }
    }
    return 1200;
  };

  ListingsMapWidget.prototype._getTargetGridColumns = function () {
    var viewportWidth =
      typeof window !== "undefined" && typeof window.innerWidth === "number"
        ? window.innerWidth
        : 1200;
    var isDesktop = viewportWidth > 960;
    var panelWidth = this._getListingsPanelWidth();
    var minCardWidth = isDesktop ? 280 : viewportWidth > 640 ? 260 : 220;
    var rawColumns = Math.max(1, Math.floor(panelWidth / minCardWidth));

    if (isDesktop) {
      var minDesktopColumns = Number(this.config.minDesktopColumns);
      var maxDesktopColumns = Number(this.config.maxDesktopColumns);
      var safeMinDesktopColumns = Number.isFinite(minDesktopColumns)
        ? Math.max(1, Math.floor(minDesktopColumns))
        : 3;
      var safeMaxDesktopColumns = Number.isFinite(maxDesktopColumns)
        ? Math.max(safeMinDesktopColumns, Math.floor(maxDesktopColumns))
        : 8;
      return Math.max(safeMinDesktopColumns, Math.min(safeMaxDesktopColumns, rawColumns));
    }

    return Math.max(1, Math.min(2, rawColumns));
  };

  ListingsMapWidget.prototype._updateDynamicGridColumns = function () {
    if (!this.listingsGrid) {
      return;
    }
    if (this._viewMode === "list") {
      this.listingsGrid.style.gridTemplateColumns = "repeat(1, minmax(0, 1fr))";
      return;
    }
    var columns = this._getTargetGridColumns();
    this.listingsGrid.style.gridTemplateColumns =
      "repeat(" + columns + ", minmax(0, 1fr))";
  };

  ListingsMapWidget.prototype._updateBackToTopVisibility = function () {
    if (!this.backToTopBtn) {
      return;
    }
    var shouldShow;
    if (this._stickyMap && this.container) {
      var rect = this.container.getBoundingClientRect();
      shouldShow = rect.top < -180;
    } else if (this.listingsPanel) {
      shouldShow = this.listingsPanel.scrollTop > 180;
    } else {
      return;
    }
    this.backToTopBtn.classList.toggle("lm-back-to-top-visible", shouldShow);
    if (this._stickyMap) {
      this._updateBackToTopPosition();
    }
  };

  /**
   * Reposition the back-to-top button when stickyMap is on so it stays
   * anchored to the bottom-right of the listings panel (fixed positioning).
   */
  ListingsMapWidget.prototype._updateBackToTopPosition = function () {
    if (!this.backToTopBtn || !this._stickyMap || !this.listingsPanelShell) {
      return;
    }
    var rect = this.listingsPanelShell.getBoundingClientRect();
    this.backToTopBtn.style.right =
      window.innerWidth - rect.right + 16 + "px";
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
      var options = [
        { value: "default", label: "Sort: Default" },
        { value: "price-asc", label: "Price: Low to High" },
        { value: "price-desc", label: "Price: High to Low" },
      ];

      self.sortSelect = el("select", "lm-sort-select", { "aria-label": "Sort listings" });
      options.forEach(function (opt) {
        var option = el("option", null, { value: opt.value, text: opt.label });
        self.sortSelect.appendChild(option);
      });
      self.sortSelect.value = self._sortOrder;
      self._nativeSortChangeHandler = function () {
        self._applySortOrder(self.sortSelect.value);
      };
      self.sortSelect.addEventListener("change", self._nativeSortChangeHandler);
      sortWrap.appendChild(self.sortSelect);

      left.appendChild(sortWrap);
    }

    self.toolbar.appendChild(left);

    // Right side: view toggle + map toggle
    var right = el("div", "lm-toolbar-right");
    self._renderViewToggle(right);

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
    if (self.stickyControls) {
      self.stickyControls.appendChild(self.toolbar);
    } else {
      self.listingsPanel.appendChild(self.toolbar);
    }
  };

  ListingsMapWidget.prototype._renderViewToggle = function (target) {
    var self = this;
    self.viewToggle = el("div", "lm-view-toggle-group", {
      role: "group",
      "aria-label": "Listing view mode",
    });
    self.gridViewBtn = el("button", "lm-view-toggle-btn", {
      html: ICONS.grid,
      "aria-label": "Grid view",
      type: "button",
    });
    self.listViewBtn = el("button", "lm-view-toggle-btn", {
      html: ICONS.list,
      "aria-label": "List view",
      type: "button",
    });

    self.gridViewBtn.addEventListener("click", function () {
      self.setViewMode("grid");
    });
    self.listViewBtn.addEventListener("click", function () {
      self.setViewMode("list");
    });

    self.viewToggle.appendChild(self.gridViewBtn);
    self.viewToggle.appendChild(self.listViewBtn);
    target.appendChild(self.viewToggle);
    self._syncViewModeControls();
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

  ListingsMapWidget.prototype._applySortOrder = function (value) {
    this._sortOrder = value || "default";
    this._resetPaginationState();
    this._sortListings();
    this._renderListings();
    this._syncSortControl();
  };

  ListingsMapWidget.prototype._syncSortControl = function () {
    if (!this.sortSelect) {
      return;
    }

    this.sortSelect.value = this._sortOrder;
  };

  // ==========================================
  // Pagination Helpers
  // ==========================================
  ListingsMapWidget.prototype._resolvePaginationMode = function (value) {
    return value === "infinite" ? "infinite" : "pages";
  };

  ListingsMapWidget.prototype._resolveViewMode = function (value) {
    return value === "list" ? "list" : "grid";
  };

  ListingsMapWidget.prototype._syncViewModeControls = function () {
    if (!this.container) {
      return;
    }

    this.container.classList.toggle("lm-view-list", this._viewMode === "list");
    this.container.classList.toggle("lm-view-grid", this._viewMode !== "list");

    if (this.gridViewBtn) {
      var gridActive = this._viewMode === "grid";
      this.gridViewBtn.classList.toggle("lm-view-toggle-btn-active", gridActive);
      this.gridViewBtn.setAttribute("aria-pressed", gridActive ? "true" : "false");
    }

    if (this.listViewBtn) {
      var listActive = this._viewMode === "list";
      this.listViewBtn.classList.toggle("lm-view-toggle-btn-active", listActive);
      this.listViewBtn.setAttribute("aria-pressed", listActive ? "true" : "false");
    }
  };

  ListingsMapWidget.prototype._isInfinitePaginationMode = function () {
    return this._paginationMode === "infinite";
  };

  ListingsMapWidget.prototype._isFinitePageSize = function () {
    return Boolean(this.config.pageSize && this.config.pageSize > 0);
  };

  ListingsMapWidget.prototype._resetPaginationState = function () {
    this._currentPage = 1;
    if (this._isInfinitePaginationMode() && this._isFinitePageSize()) {
      this._visibleCount = this.config.pageSize;
      return;
    }
    this._visibleCount = 0;
  };

  ListingsMapWidget.prototype._hasMoreInfiniteListings = function () {
    if (!this._isInfinitePaginationMode() || !this._isFinitePageSize()) {
      return false;
    }
    return this._visibleCount < this.config.listings.length;
  };

  ListingsMapWidget.prototype._loadMoreInfiniteListings = function () {
    if (!this._hasMoreInfiniteListings()) {
      return;
    }

    this._visibleCount = Math.min(
      this.config.listings.length,
      this._visibleCount + this.config.pageSize
    );
    this._renderListings();
  };

  ListingsMapWidget.prototype._updateInfiniteScrollObserver = function () {
    var self = this;

    self._teardownInfiniteScrollObserver();

    if (
      !self._infiniteScrollSentinel ||
      !self._isInfinitePaginationMode() ||
      !self._isFinitePageSize() ||
      !self._hasMoreInfiniteListings() ||
      typeof window.IntersectionObserver !== "function"
    ) {
      return;
    }

    var observerRoot = self._stickyMap ? null : (self.listingsPanel || null);
    self._infiniteScrollObserver = new window.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            self._loadMoreInfiniteListings();
          }
        });
      },
      {
        root: observerRoot,
        rootMargin: "0px 0px 240px 0px",
        threshold: 0.01,
      }
    );

    self._infiniteScrollObserver.observe(self._infiniteScrollSentinel);
  };

  ListingsMapWidget.prototype._teardownInfiniteScrollObserver = function () {
    if (!this._infiniteScrollObserver) {
      return;
    }
    this._infiniteScrollObserver.disconnect();
    this._infiniteScrollObserver = null;
  };

  ListingsMapWidget.prototype._getPagedListings = function () {
    var self = this;
    var all = self.config.listings;
    if (!self._isFinitePageSize()) return all;
    if (self._isInfinitePaginationMode()) {
      var visibleCount = self._visibleCount > 0 ? self._visibleCount : self.config.pageSize;
      return all.slice(0, visibleCount);
    }
    var start = (self._currentPage - 1) * self.config.pageSize;
    return all.slice(start, start + self.config.pageSize);
  };

  ListingsMapWidget.prototype._getTotalPages = function () {
    var self = this;
    if (!self._isFinitePageSize()) return 1;
    return Math.ceil(self.config.listings.length / self.config.pageSize) || 1;
  };

  ListingsMapWidget.prototype._renderPagination = function () {
    var self = this;
    if (!self.paginationContainer) return;
    self.paginationContainer.innerHTML = "";

    var totalPages = self._getTotalPages();
    if (
      !self.config.showPagination ||
      !self._isFinitePageSize() ||
      self._isInfinitePaginationMode() ||
      totalPages <= 1
    ) return;

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
      if (self._infiniteScrollSentinel) {
        self._infiniteScrollSentinel.style.display = "none";
      }
      self._teardownInfiniteScrollObserver();
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
    self._updateDynamicGridColumns();
    if (self._infiniteScrollSentinel) {
      self._infiniteScrollSentinel.style.display =
        self._isInfinitePaginationMode() && self._isFinitePageSize() ? "" : "none";
    }
    self._updateInfiniteScrollObserver();
  };

  ListingsMapWidget.prototype._rebuildMarkers = function () {
    var self = this;

    if (!self.map) {
      return;
    }

    self.markers.forEach(function (m) {
      self.map.removeLayer(m);
    });
    self.markers = [];

    // Re-add markers (use typeof so lat/lng 0 are valid), including popups
    var L = window.L;
    self.config.listings.forEach(function (listing) {
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

      var popupHtml = createMapPopupHtml(listing, priceLabel);

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: "lm-map-popup",
        maxWidth: 270,
        offset: [0, -5],
      });

      self._bindMarkerInteractions(marker, listing);

      marker._listingId = listing.id;
      self.markers.push(marker);
    });

    if (self.markers.length > 0) {
      var group = L.featureGroup(self.markers);
      self.map.fitBounds(group.getBounds().pad(0.1));
    }
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

        var popupHtml = createMapPopupHtml(listing, priceLabel);

        marker.bindPopup(popupHtml, {
          closeButton: true,
          className: "lm-map-popup",
          maxWidth: 270,
          offset: [0, -5],
        });

        self._bindMarkerInteractions(marker, listing);

        // Store reference
        marker._listingId = listing.id;
        self.markers.push(marker);
      }
    });

    self._refreshMapViewport();

    // Recompute map size after layout (fixes blank map when container height is from flex/min-height)
    setTimeout(function () {
      self._refreshMapViewport();
    }, 100);
    setTimeout(function () {
      self._refreshMapViewport();
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

  ListingsMapWidget.prototype._unhighlightMarker = function (id) {
    this.markers.forEach(function (m) {
      if (m._listingId === id) {
        if (typeof m.closePopup === "function") {
          m.closePopup();
        }
        if (typeof m.setZIndexOffset === "function") {
          m.setZIndexOffset(0);
        }
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

  ListingsMapWidget.prototype._bindMarkerInteractions = function (marker, listing) {
    var self = this;

    marker.on("click", function () {
      self._centerAndZoomToMarker(marker);
      self._highlightListing(listing.id);
      self._scrollToCard(listing.id);
    });

    marker.on("mouseover", function () {
      self._focusMarkerOnHover(marker, listing.id);
    });

    marker.on("mouseout", function () {
      self._resetMarkerHoverState(marker);
    });
  };

  ListingsMapWidget.prototype._focusMarkerOnHover = function (marker, listingId) {
    if (!marker) {
      return;
    }

    if (typeof marker.setZIndexOffset === "function") {
      marker.setZIndexOffset(1000);
    }

    if (typeof marker.openPopup === "function") {
      marker.openPopup();
    }

    this._highlightListing(listingId);
  };

  ListingsMapWidget.prototype._centerMapToMarker = function (marker) {
    var self = this;
    if (!self.map || !marker || typeof marker.getLatLng !== "function") {
      return;
    }

    var zoom = typeof self.map.getZoom === "function"
      ? self.map.getZoom()
      : self.config.mapOptions.zoom;

    self.map.setView(marker.getLatLng(), zoom, { animate: true });
  };

  ListingsMapWidget.prototype._resetMarkerHoverState = function (marker) {
    if (!marker) {
      return;
    }

    if (typeof marker.setZIndexOffset === "function") {
      marker.setZIndexOffset(0);
    }
  };

  ListingsMapWidget.prototype._highlightMarker = function (id) {
    var self = this;
    this.markers.forEach(function (m) {
      if (m._listingId === id) {
        self._focusMarkerOnHover(m, id);
        self._centerMapToMarker(m);
        var el = m.getElement();
        if (el) {
          var pill = el.querySelector(".lm-price-marker");
          if (pill) pill.classList.add("lm-price-marker-active");
        }
      }
    });
  };

  ListingsMapWidget.prototype._centerAndZoomToMarker = function (marker) {
    var self = this;
    if (!self.map || !marker || typeof marker.getLatLng !== "function") {
      return;
    }

    var markerLatLng = marker.getLatLng();
    var configuredCenter = self.config.markerFocusCenter;
    var hasFixedCenter = Array.isArray(configuredCenter)
      && configuredCenter.length >= 2
      && typeof configuredCenter[0] === "number"
      && typeof configuredCenter[1] === "number"
      && !Number.isNaN(configuredCenter[0])
      && !Number.isNaN(configuredCenter[1]);

    var targetCenter = hasFixedCenter
      ? { lat: configuredCenter[0], lng: configuredCenter[1] }
      : markerLatLng;

    var configuredZoom = Number(self.config.markerFocusZoom);
    var defaultZoom = typeof self.map.getZoom === "function"
      ? self.map.getZoom()
      : self.config.mapOptions.zoom;
    var targetZoom = Number.isFinite(configuredZoom)
      ? Math.max(1, Math.min(19, configuredZoom))
      : defaultZoom;

    self.map.setView(targetCenter, targetZoom, { animate: true });
  };

  ListingsMapWidget.prototype._setInfiniteVisiblePage = function (pageNumber) {
    var total = this.config.listings.length;
    var clampedPage = pageNumber < 1 ? 1 : pageNumber;
    var targetVisibleCount = clampedPage * this.config.pageSize;
    this._visibleCount = Math.min(total, targetVisibleCount);
  };

  ListingsMapWidget.prototype._setPage = function (pageNumber) {
    this._currentPage = pageNumber;
    if (this._isInfinitePaginationMode() && this._isFinitePageSize()) {
      this._setInfiniteVisiblePage(pageNumber);
    }
  };

  ListingsMapWidget.prototype._syncPaginationStateFromList = function () {
    if (!this._isInfinitePaginationMode() || !this._isFinitePageSize()) {
      return;
    }
    if (this._visibleCount <= 0) {
      this._visibleCount = this.config.pageSize;
    }
    if (this._visibleCount > this.config.listings.length) {
      this._visibleCount = this.config.listings.length;
    }
  };

  ListingsMapWidget.prototype._scrollToListingsTop = function () {
    if (this._stickyMap && this.container) {
      var rect = this.container.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top,
        behavior: "smooth",
      });
    } else if (this.listingsPanel) {
      this.listingsPanel.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  ListingsMapWidget.prototype._renderPageAndScroll = function () {
    this._renderListings();
    this._scrollToListingsTop();
  };

  ListingsMapWidget.prototype._ensurePaginationState = function () {
    if (this._isInfinitePaginationMode()) {
      this._syncPaginationStateFromList();
    }
  };

  ListingsMapWidget.prototype._scrollToCard = function (id) {
    var self = this;
    // If pagination is active, ensure target card is rendered first.
    if (self._isFinitePageSize()) {
      var idx = -1;
      for (var i = 0; i < self.config.listings.length; i++) {
        if (self.config.listings[i].id === id) { idx = i; break; }
      }
      if (idx >= 0) {
        if (self._isInfinitePaginationMode()) {
          var targetVisibleCount =
            Math.ceil((idx + 1) / self.config.pageSize) * self.config.pageSize;
          var nextVisibleCount = Math.min(
            self.config.listings.length,
            targetVisibleCount
          );
          if (nextVisibleCount > self._visibleCount) {
            self._visibleCount = nextVisibleCount;
            self._renderListings();
          }
        } else {
          var targetPage = Math.floor(idx / self.config.pageSize) + 1;
          if (targetPage !== self._currentPage) {
            self._currentPage = targetPage;
            self._renderListings();
          }
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
        self._refreshMapViewport();
      }, 100);
    }
  };

  ListingsMapWidget.prototype._refreshMapViewport = function () {
    var self = this;
    if (!self.map) {
      return;
    }

    self.map.invalidateSize();

    if (self.markers && self.markers.length > 0) {
      var L = window.L;
      var group = L.featureGroup(self.markers);
      self.map.fitBounds(group.getBounds().pad(0.1));
      return;
    }

    self.map.setView(self.config.mapOptions.center, self.config.mapOptions.zoom, {
      animate: false,
    });
  };

  // ==========================================
  // Public API
  // ==========================================
  /**
   * Update the listings data and re-render
   */
  ListingsMapWidget.prototype.setListings = function (listings) {
    this._originalListings = listings.slice();
    this._resetPaginationState();
    this.config.listings = listings.slice();
    this._sortListings();
    this._ensurePaginationState();
    this._syncSortControl();
    this._renderListings();
    this._rebuildMarkers();
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
    self._updateDynamicGridColumns();
    // Invalidate map size after CSS transition
    if (self.map && self._mapVisible) {
      self._refreshMapViewport();
      setTimeout(function () {
        self._refreshMapViewport();
      }, 100);
      setTimeout(function () {
        self._refreshMapViewport();
      }, 350);
    }
  };

  /**
   * Switch listing presentation mode
   */
  ListingsMapWidget.prototype.setViewMode = function (mode) {
    var nextMode = this._resolveViewMode(mode);
    if (nextMode === this._viewMode) {
      return;
    }

    this._viewMode = nextMode;
    this.config.viewMode = nextMode;
    this._syncViewModeControls();
    this._updateDynamicGridColumns();
  };

  /**
   * Go to a specific page
   */
  ListingsMapWidget.prototype.goToPage = function (n) {
    var self = this;
    var total = self._getTotalPages();
    if (n < 1) n = 1;
    if (n > total) n = total;
    self._setPage(n);
    self._renderPageAndScroll();
  };

  /**
   * Destroy the widget
   */
  ListingsMapWidget.prototype.destroy = function () {
    if (this._isDestroyed) {
      return;
    }

    this._isDestroyed = true;
    if (this._searchSlotCleanup) {
      var cleanup = this._searchSlotCleanup;
      this._searchSlotCleanup = null;
      cleanup();
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.sortSelect && this._nativeSortChangeHandler) {
      this.sortSelect.removeEventListener("change", this._nativeSortChangeHandler);
      this._nativeSortChangeHandler = null;
    }
    if (this._scrollListenerTarget && this._listingsScrollHandler) {
      this._scrollListenerTarget.removeEventListener("scroll", this._listingsScrollHandler);
      this._listingsScrollHandler = null;
      this._scrollListenerTarget = null;
    }
    if (this._windowResizeHandler) {
      window.removeEventListener("resize", this._windowResizeHandler);
      this._windowResizeHandler = null;
    }
    this._teardownInfiniteScrollObserver();
    if (this.container) {
      this.container.innerHTML = "";
      this.container.classList.remove("lm-widget");
    }
    this._searchSlot = null;
    this.listingsPanelShell = null;
    this.stickyControls = null;
    this.sortSelect = null;
    this.backToTopBtn = null;
    this.gridViewBtn = null;
    this.listViewBtn = null;
    this.viewToggle = null;
    this._infiniteScrollSentinel = null;
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

    createSearchDataMatcher: createSearchDataMatcher,

    filterListingsBySearchData: filterListingsBySearchData,

    /** Version */
    version: "1.0.3",
  };
});
