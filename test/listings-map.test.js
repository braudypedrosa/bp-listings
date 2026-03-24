import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';

const listingsMapSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/bp-listings.js'),
  'utf8'
).replace("import './bp-listings.scss';\n\n", '');
const listingsMapStyles = fs.readFileSync(
  path.resolve(process.cwd(), 'src/bp-listings.scss'),
  'utf8'
);
const sharedResetClass = ['bp', 'widget', 'reset'].join('-');
const legacySelectClass = ['bp', 'ui', 'select'].join('-');
const legacySelectEvent = `${['bp', 'ui'].join('-')}:select:change`;

function buildLeafletStub(window) {
  const mapInstances = [];

  const L = {
    map(container, options) {
      const map = {
        container,
        options,
        removed: false,
        removedLayers: [],
        fitBoundsCalls: [],
        handlers: {},
        zoom: options.zoom,
        center: { lat: options.center[0], lng: options.center[1] },
        remove() {
          this.removed = true;
        },
        setView(latlng, zoom) {
          this.center = { lat: latlng.lat, lng: latlng.lng };
          this.zoom = zoom;
        },
        getZoom() {
          return this.zoom;
        },
        getBounds() {
          return {
            getNorth: () => 1,
            getSouth: () => -1,
            getEast: () => 1,
            getWest: () => -1,
          };
        },
        getCenter() {
          return this.center;
        },
        fitBounds(bounds) {
          this.fitBoundsCalls.push(bounds);
        },
        invalidateSize() {},
        on(event, handler) {
          this.handlers[event] = handler;
        },
        removeLayer(layer) {
          this.removedLayers.push(layer);
        },
      };

      mapInstances.push(map);
      return map;
    },
    control: {
      zoom() {
        return {
          addTo() {
            return this;
          },
        };
      },
    },
    tileLayer() {
      return {
        addTo() {
          return this;
        },
      };
    },
    divIcon(options) {
      return options;
    },
    marker(latlng, options) {
      return {
        latlng,
        options,
        listeners: {},
        zIndexOffset: 0,
        addTo(map) {
          this.map = map;
          const element = window.document.createElement('div');
          element.innerHTML = options.icon.html;
          this.element = element;
          return this;
        },
        bindPopup(html) {
          this.popupHtml = html;
          return this;
        },
        on(event, handler) {
          this.listeners[event] = handler;
          return this;
        },
        getElement() {
          return this.element;
        },
        getLatLng() {
          return { lat: latlng[0], lng: latlng[1] };
        },
        openPopup() {
          this.popupOpened = true;
        },
        closePopup() {
          this.popupOpened = false;
        },
        setZIndexOffset(offset) {
          this.zIndexOffset = offset;
        },
      };
    },
    featureGroup(markers) {
      return {
        getBounds() {
          return {
            pad() {
              return { markers };
            },
          };
        },
      };
    },
  };

  return { L, mapInstances };
}

function createEnvironment() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="widget"></div></body></html>', {
    runScripts: 'outside-only',
    url: 'http://localhost/',
  });
  const { window } = dom;
  const { L, mapInstances } = buildLeafletStub(window);
  const observers = [];

  class IntersectionObserverStub {
    constructor(callback) {
      this.callback = callback;
      this.observed = [];
      this.disconnected = false;
      observers.push(this);
    }

    observe(target) {
      this.observed.push(target);
    }

    disconnect() {
      this.disconnected = true;
      this.observed = [];
    }

    trigger(isIntersecting = true) {
      this.callback(
        this.observed.map((target) => ({
          target,
          isIntersecting,
        }))
      );
    }
  }

  window.L = L;
  window.IntersectionObserver = IntersectionObserverStub;
  window.Element.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
  window.eval(listingsMapSource);

  return {
    dom,
    window,
    ListingsMap: window.ListingsMap,
    mapInstances,
    observers,
  };
}

function buildListings() {
  return [
    {
      id: 'listing-1',
      title: 'Ocean Villa',
      rating: '4.95',
      reviewCount: 28,
      subtitle: 'Entire villa in Batangas',
      details: '3 bedrooms · 4 beds · 3 baths',
      dates: 'Jun 12-15',
      price: 320,
      pricePeriod: 'per night',
      lat: 14.55,
      lng: 121.02,
      images: ['one.jpg'],
    },
    {
      id: 'listing-2',
      title: 'Garden Cabin',
      rating: '4.82',
      reviewCount: 14,
      subtitle: 'Cabin in Tagaytay',
      details: '2 bedrooms · 2 beds · 1 bath',
      dates: 'Jun 18-20',
      price: 180,
      pricePeriod: 'per night',
      lat: 14.56,
      lng: 121.03,
      images: ['two.jpg'],
    },
    {
      id: 'listing-3',
      title: 'City Loft',
      subtitle: 'Loft in Makati',
      details: '1 bedroom · 1 bed · 1 bath',
      dates: 'Jul 2-5',
      price: 240,
      pricePeriod: 'per night',
      lat: 14.57,
      lng: 121.04,
      images: ['three.jpg'],
    },
    {
      id: 'listing-4',
      title: 'Beach House',
      rating: '5.0',
      reviewCount: 8,
      subtitle: 'Beachfront home in Zambales',
      details: '4 bedrooms · 5 beds · 4 baths',
      dates: 'Aug 1-4',
      price: 410,
      pricePeriod: 'per night',
      lat: 14.58,
      lng: 121.05,
      images: ['four.jpg'],
    },
  ];
}

function buildManyListings(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `listing-${index + 1}`,
    title: `Listing ${index + 1}`,
    price: 100 + index,
    pricePeriod: 'per night',
    lat: 14.5 + (index * 0.01),
    lng: 121.0 + (index * 0.01),
    images: [`image-${index + 1}.jpg`],
  }));
}

function getRenderedTitles(container) {
  return Array.from(container.querySelectorAll('.lm-card-title')).map((node) => node.textContent);
}

function setSort(widget, window, value) {
  widget.sortSelect.value = value;
  widget.sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
}

describe('bp-listings UMD runtime', () => {
  it('passes a connected search slot host and the widget instance to renderSearchSlot', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    let receivedContainer = null;
    let receivedWidget = null;
    let isConnected = false;

    const widget = ListingsMap.init({
      container,
      listings: buildListings(),
      renderSearchSlot(slotContainer, instance) {
        receivedContainer = slotContainer;
        receivedWidget = instance;
        isConnected = window.document.body.contains(slotContainer);
      },
    });

    expect(receivedContainer).not.toBeNull();
    expect(receivedWidget).toBe(widget);
    expect(isConnected).toBe(true);
    expect(container.querySelector('.lm-search-slot')).toBe(receivedContainer);
  });

  it('calls cleanup returned from renderSearchSlot during destroy', () => {
    const { ListingsMap, window } = createEnvironment();
    const cleanup = { calls: 0 };
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      renderSearchSlot() {
        return () => {
          cleanup.calls += 1;
        };
      },
    });

    widget.destroy();

    expect(cleanup.calls).toBe(1);
  });

  it('supports synchronous setListings calls from renderSearchSlot during mount', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');

    ListingsMap.init({
      container,
      listings: buildListings(),
      renderSearchSlot(_slotContainer, widget) {
        widget.setListings(buildListings().slice(0, 2));
      },
    });

    expect(getRenderedTitles(container)).toEqual(['Ocean Villa', 'Garden Cabin']);
  });

  it('runs search slot cleanup only once when destroy is called repeatedly', () => {
    const { ListingsMap, window } = createEnvironment();
    const cleanup = { calls: 0 };
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      renderSearchSlot() {
        return () => {
          cleanup.calls += 1;
        };
      },
    });

    widget.destroy();
    widget.destroy();

    expect(cleanup.calls).toBe(1);
  });

  it('destroys cleanly when renderSearchSlot does not return cleanup', () => {
    const { ListingsMap, window } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      renderSearchSlot(slotContainer) {
        slotContainer.textContent = 'mounted';
      },
    });

    widget.destroy();

    expect(window.document.querySelector('#widget').innerHTML).toBe('');
  });

  it('defaults to 12 listings per page when pageSize is omitted', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(13),
    });

    expect(widget.config.pageSize).toBe(12);
    expect(widget._getTotalPages()).toBe(2);
    expect(getRenderedTitles(container)).toHaveLength(12);
  });

  it('defaults pagination mode to page buttons', () => {
    const { ListingsMap, window } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildManyListings(13),
    });

    expect(widget.config.paginationMode).toBe('pages');
    expect(widget._paginationMode).toBe('pages');
  });

  it('applies viewport-height mode when fullHeightMap is enabled', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(5),
      fullHeightMap: true,
    });

    expect(widget.config.fullHeightMap).toBe(true);
    expect(container.classList.contains('lm-widget-full-height')).toBe(true);
  });

  it('applies sticky-map class when stickyMap is enabled', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');

    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(5),
      stickyMap: true,
    });

    expect(widget.config.stickyMap).toBe(true);
    expect(container.classList.contains('lm-map-sticky')).toBe(true);
  });

  it('uses viewport as IntersectionObserver root when stickyMap + infinite are combined', () => {
    const { ListingsMap, window, observers } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(20),
      pageSize: 5,
      paginationMode: 'infinite',
      stickyMap: true,
    });

    expect(observers.length).toBeGreaterThanOrEqual(1);

    const lastObs = observers[observers.length - 1];
    expect(lastObs.observed.length).toBe(1);

    expect(getRenderedTitles(container)).toHaveLength(5);

    lastObs.trigger(true);
    expect(getRenderedTitles(container)).toHaveLength(10);

    const nextObs = observers[observers.length - 1];
    nextObs.trigger(true);
    expect(getRenderedTitles(container)).toHaveLength(15);

    widget.destroy();
  });

  it('attaches scroll listener to window when stickyMap is on for back-to-top', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(20),
      pageSize: 0,
      stickyMap: true,
    });

    expect(widget._scrollListenerTarget).toBe(window);
    expect(widget.backToTopBtn.classList.contains('lm-back-to-top-visible')).toBe(false);

    widget.destroy();
  });

  it('scrolls window to container top instead of panel scrollTo when stickyMap is on', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(20),
      pageSize: 0,
      stickyMap: true,
    });

    let windowScrollTarget = null;
    window.scrollTo = ({ top }) => {
      windowScrollTarget = top;
    };

    widget._scrollToListingsTop();
    expect(windowScrollTarget).not.toBeNull();

    widget.destroy();
  });

  it('defaults to grid view mode and exposes icon-only view toggles', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(5),
    });

    expect(widget.config.viewMode).toBe('grid');
    expect(container.classList.contains('lm-view-grid')).toBe(true);
    expect(container.classList.contains('lm-view-list')).toBe(false);
    expect(widget.gridViewBtn).not.toBeNull();
    expect(widget.listViewBtn).not.toBeNull();
    expect(widget.gridViewBtn.getAttribute('aria-pressed')).toBe('true');
    expect(widget.listViewBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('switches between grid and list mode via API and toggle buttons', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(7),
    });

    widget.setViewMode('list');
    expect(widget.config.viewMode).toBe('list');
    expect(container.classList.contains('lm-view-list')).toBe(true);
    expect(widget.listingsGrid.style.gridTemplateColumns).toContain('repeat(1, minmax(0, 1fr))');

    widget.gridViewBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(widget.config.viewMode).toBe('grid');
    expect(container.classList.contains('lm-view-grid')).toBe(true);
    expect(widget.gridViewBtn.getAttribute('aria-pressed')).toBe('true');
    expect(widget.listViewBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('supports infinite pagination mode with pageSize as chunk size', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(13),
      pageSize: 5,
      paginationMode: 'infinite',
    });

    expect(widget.config.paginationMode).toBe('infinite');
    expect(getRenderedTitles(container)).toHaveLength(5);
    expect(container.querySelector('.lm-pagination').innerHTML).toBe('');
  });

  it('loads more cards when the infinite-scroll sentinel intersects', () => {
    const { ListingsMap, window, observers } = createEnvironment();
    const container = window.document.querySelector('#widget');
    ListingsMap.init({
      container,
      listings: buildManyListings(13),
      pageSize: 5,
      paginationMode: 'infinite',
    });

    expect(getRenderedTitles(container)).toHaveLength(5);
    expect(observers).toHaveLength(1);

    observers[0].trigger(true);
    expect(getRenderedTitles(container)).toHaveLength(10);

    observers[1].trigger(true);
    expect(getRenderedTitles(container)).toHaveLength(13);
  });

  it('disables pagination when pageSize is explicitly 0', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(13),
      pageSize: 0,
    });

    expect(widget._getTotalPages()).toBe(1);
    expect(getRenderedTitles(container)).toHaveLength(13);
    expect(container.querySelector('.lm-pagination').innerHTML).toBe('');
  });

  it('still honors explicit small page sizes such as 2', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(13),
      pageSize: 2,
    });

    expect(widget.config.pageSize).toBe(2);
    expect(widget._getTotalPages()).toBe(7);
    expect(getRenderedTitles(container)).toHaveLength(2);
  });

  it('preserves sort mode when setListings is called', () => {
    const { ListingsMap, window } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      pageSize: 2,
    });

    setSort(widget, window, 'price-asc');
    widget.setListings(buildListings().slice(0, 3));

    expect(widget._sortOrder).toBe('price-asc');
    expect(widget.sortSelect.value).toBe('price-asc');
  });

  it('reapplies ascending price sort to a new subset', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildListings(),
      pageSize: 0,
    });

    setSort(widget, window, 'price-asc');
    widget.setListings([
      buildListings()[0],
      buildListings()[2],
      buildListings()[1],
    ]);

    expect(getRenderedTitles(container)).toEqual(['Garden Cabin', 'City Loft', 'Ocean Villa']);
  });

  it('reapplies descending price sort to a new subset', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildListings(),
      pageSize: 0,
    });

    setSort(widget, window, 'price-desc');
    widget.setListings([
      buildListings()[2],
      buildListings()[1],
      buildListings()[3],
    ]);

    expect(getRenderedTitles(container)).toEqual(['Beach House', 'City Loft', 'Garden Cabin']);
  });

  it('resets pagination to page 1 while preserving sort on setListings', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildListings(),
      pageSize: 1,
    });

    setSort(widget, window, 'price-asc');
    widget.goToPage(3);
    widget.setListings([
      buildListings()[0],
      buildListings()[1],
      buildListings()[2],
    ]);

    expect(widget._currentPage).toBe(1);
    expect(widget._sortOrder).toBe('price-asc');
    expect(getRenderedTitles(container)).toEqual(['Garden Cabin']);
  });

  it('resets the infinite visible chunk on setListings while preserving sort', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(13),
      pageSize: 4,
      paginationMode: 'infinite',
    });

    setSort(widget, window, 'price-desc');
    widget.goToPage(2);
    expect(getRenderedTitles(container)).toHaveLength(8);

    widget.setListings(buildManyListings(10));
    expect(widget._sortOrder).toBe('price-desc');
    expect(getRenderedTitles(container)).toHaveLength(4);
  });

  it('resets infinite visible chunk after sort changes', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(13),
      pageSize: 4,
      paginationMode: 'infinite',
    });

    widget.goToPage(2);
    expect(getRenderedTitles(container)).toHaveLength(8);

    setSort(widget, window, 'price-asc');
    expect(getRenderedTitles(container)).toHaveLength(4);
  });

  it('rebuilds markers from the new subset after setListings', () => {
    const { ListingsMap, window, mapInstances } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      pageSize: 0,
    });
    const map = mapInstances[0];
    const subset = [buildListings()[2], buildListings()[0]];

    widget.setListings(subset);

    expect(map.removedLayers).toHaveLength(4);
    expect(widget.markers).toHaveLength(2);
    expect(widget.markers.map((marker) => marker._listingId)).toEqual(['listing-3', 'listing-1']);
  });

  it('uses fixed marker focus zoom and center on marker click', () => {
    const { ListingsMap, window, mapInstances } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      pageSize: 0,
      markerFocusZoom: 16,
      markerFocusCenter: [14.42, 121.01],
    });
    const map = mapInstances[0];
    const marker = widget.markers[1];

    expect(map.zoom).toBe(15);
    marker.listeners.click();

    expect(map.center).toEqual({ lat: 14.42, lng: 121.01 });
    expect(map.zoom).toBe(16);
  });

  it('defaults marker focus center to the clicked listing coordinates', () => {
    const { ListingsMap, window, mapInstances } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      pageSize: 0,
      markerFocusZoom: 15,
    });
    const map = mapInstances[0];
    const marker = widget.markers[1];

    marker.listeners.click();

    expect(map.center).toEqual({ lat: marker.latlng[0], lng: marker.latlng[1] });
    expect(map.zoom).toBe(15);
  });

  it('brings marker to front and opens popup on hover', () => {
    const { ListingsMap, window } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      pageSize: 0,
    });
    const marker = widget.markers[0];

    marker.listeners.mouseover();
    expect(marker.zIndexOffset).toBe(1000);
    expect(marker.popupOpened).toBe(true);

    marker.listeners.mouseout();
    expect(marker.zIndexOffset).toBe(0);
  });

  it('brings marker to front and opens popup when hovering a listing card', () => {
    const { ListingsMap, window, mapInstances } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      pageSize: 0,
    });
    const map = mapInstances[0];

    const firstCard = widget.cards[0].el;
    const firstMarker = widget.markers[0];
    const zoomBeforeHover = map.zoom;

    firstCard.dispatchEvent(new window.Event('mouseenter', { bubbles: true }));
    expect(firstMarker.zIndexOffset).toBe(1000);
    expect(firstMarker.popupOpened).toBe(true);
    expect(map.center).toEqual({ lat: firstMarker.latlng[0], lng: firstMarker.latlng[1] });
    expect(map.zoom).toBe(zoomBeforeHover);

    firstCard.dispatchEvent(new window.Event('mouseleave', { bubbles: true }));
    expect(firstMarker.zIndexOffset).toBe(0);
    expect(firstMarker.popupOpened).toBe(false);
  });

  it('includes rating, subtitle, details, and dates in the map popup card', () => {
    const { ListingsMap, window } = createEnvironment();
    const widget = ListingsMap.init({
      container: window.document.querySelector('#widget'),
      listings: buildListings(),
      pageSize: 0,
    });

    const popupHtml = widget.markers[0].popupHtml;

    expect(popupHtml).toContain('lm-popup-rating');
    expect(popupHtml).toContain('4.95');
    expect(popupHtml).toContain('Entire villa in Batangas');
    expect(popupHtml).toContain('3 bedrooms · 4 beds · 3 baths');
    expect(popupHtml).toContain('Jun 12-15');
  });

  it('setListings still paginates correctly under the 12-item default', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(4),
    });

    widget.goToPage(2);
    widget.setListings(buildManyListings(13));

    expect(widget.config.pageSize).toBe(12);
    expect(widget._currentPage).toBe(1);
    expect(widget._getTotalPages()).toBe(2);
    expect(getRenderedTitles(container)).toHaveLength(12);
  });

  it('expands rendered cards in infinite mode before scrolling to a marker-linked card', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(13),
      pageSize: 3,
      paginationMode: 'infinite',
    });

    expect(getRenderedTitles(container)).toHaveLength(3);

    widget.panToListing('listing-7');

    expect(getRenderedTitles(container)).toHaveLength(9);
    expect(getRenderedTitles(container)).toContain('Listing 7');
  });

  it('uses dynamic desktop grid columns between three and eight', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');

    window.innerWidth = 1366;
    const widget = ListingsMap.init({
      container,
      listings: buildListings(),
    });

    const initialDesktopColumns = Number(
      widget.listingsGrid.style.gridTemplateColumns.match(/repeat\((\d+),/)?.[1] || 0
    );
    expect(initialDesktopColumns).toBeGreaterThanOrEqual(3);
    expect(initialDesktopColumns).toBeLessThanOrEqual(8);

    Object.defineProperty(widget.listingsPanel, 'clientWidth', {
      value: 2600,
      configurable: true,
    });
    widget._updateDynamicGridColumns();
    expect(widget.listingsGrid.style.gridTemplateColumns).toContain('repeat(8, minmax(0, 1fr))');
  });

  it('allows custom desktop grid min and max columns via config', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    window.innerWidth = 1600;

    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(12),
      minDesktopColumns: 4,
      maxDesktopColumns: 6,
    });

    Object.defineProperty(widget.listingsPanel, 'clientWidth', {
      value: 900,
      configurable: true,
    });
    widget._updateDynamicGridColumns();
    expect(widget.listingsGrid.style.gridTemplateColumns).toContain('repeat(4, minmax(0, 1fr))');

    Object.defineProperty(widget.listingsPanel, 'clientWidth', {
      value: 3000,
      configurable: true,
    });
    widget._updateDynamicGridColumns();
    expect(widget.listingsGrid.style.gridTemplateColumns).toContain('repeat(6, minmax(0, 1fr))');
  });

  it('auto-adjusts grid columns on lower screens', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    window.innerWidth = 768;

    const widget = ListingsMap.init({
      container,
      listings: buildListings(),
    });

    expect(widget.listingsGrid.style.gridTemplateColumns).toContain('repeat(2, minmax(0, 1fr))');

    window.innerWidth = 480;
    Object.defineProperty(widget.listingsPanel, 'clientWidth', {
      value: 320,
      configurable: true,
    });
    widget._updateDynamicGridColumns();
    expect(widget.listingsGrid.style.gridTemplateColumns).toContain('repeat(1, minmax(0, 1fr))');
  });

  it('does not add the legacy shared reset class to the widget root', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');

    ListingsMap.init({
      container,
      listings: buildListings(),
    });

    expect(container.classList.contains(sharedResetClass)).toBe(false);
  });

  it('uses a native sort select and omits the legacy shared select path from the source stylesheet', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');

    ListingsMap.init({
      container,
      listings: buildListings(),
    });

    expect(container.querySelector('.lm-sort-select')).not.toBeNull();
    expect(container.querySelector(`.${legacySelectClass}`)).toBeNull();
    expect(listingsMapSource).not.toContain(legacySelectEvent);
    expect(listingsMapSource).not.toContain('BPUIComponents');
    expect(listingsMapSource).not.toContain(sharedResetClass);
    expect(listingsMapStyles).not.toContain(`.${legacySelectClass}`);
  });

  it('exports search-data helpers that match the documented payload convention', () => {
    const { ListingsMap } = createEnvironment();
    const listings = [
      {
        id: 'villa',
        title: 'Villa',
        searchData: {
          location: ['Batangas', 'Beachfront'],
          availability: [{ start: '2030-04-01', end: '2030-04-30' }],
          fields: {
            'bp-guests': '4',
          },
          filters: {
            'bp-bedrooms': 2,
            'bp-view': 'Ocean',
            'bp-amenities': ['Pool', 'Spa'],
          },
        },
      },
      {
        id: 'city',
        title: 'City',
        searchData: {
          location: ['Makati', 'CBD'],
          availability: [{ start: '2030-04-10', end: '2030-04-20' }],
          fields: {
            'bp-guests': '2',
          },
          filters: {
            'bp-bedrooms': 1,
            'bp-view': 'City',
            'bp-amenities': ['Gym'],
          },
        },
      },
    ];
    const payload = {
      location: 'bat',
      checkIn: '2030-04-12',
      checkOut: '2030-04-18',
      customFields: {
        'bp-guests': '4',
      },
      filters: {
        'bp-bedrooms': 2,
        'bp-view': 'Ocean',
        'bp-amenities': ['Pool'],
      },
    };
    const config = {
      fields: [{ key: 'bp-guests', type: 'select' }],
      filters: [
        { key: 'bp-bedrooms', type: 'counter' },
        { key: 'bp-view', type: 'select' },
        { key: 'bp-amenities', type: 'checkbox' },
      ],
    };

    const matcher = ListingsMap.createSearchDataMatcher(config);
    const results = ListingsMap.filterListingsBySearchData(listings, payload, config);

    expect(matcher(listings[0], payload)).toBe(true);
    expect(matcher(listings[1], payload)).toBe(false);
    expect(results.map((listing) => listing.id)).toEqual(['villa']);
  });

  it('still works without renderSearchSlot', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildListings(),
      pageSize: 2,
    });

    expect(container.querySelector('.lm-search-slot')).toBeNull();
    expect(getRenderedTitles(container)).toEqual(['Ocean Villa', 'Garden Cabin']);

    widget.destroy();

    expect(container.innerHTML).toBe('');
  });

  it('shows and uses back-to-top button while scrolling listings', () => {
    const { ListingsMap, window } = createEnvironment();
    const container = window.document.querySelector('#widget');
    const widget = ListingsMap.init({
      container,
      listings: buildManyListings(20),
      pageSize: 0,
    });

    expect(widget.backToTopBtn).not.toBeNull();
    expect(widget.backToTopBtn.classList.contains('lm-back-to-top-visible')).toBe(false);

    widget.listingsPanel.scrollTop = 240;
    widget.listingsPanel.dispatchEvent(new window.Event('scroll'));
    expect(widget.backToTopBtn.classList.contains('lm-back-to-top-visible')).toBe(true);

    let scrolledToTop = false;
    widget.listingsPanel.scrollTo = ({ top }) => {
      scrolledToTop = top === 0;
    };

    widget.backToTopBtn.dispatchEvent(new window.Event('click'));
    expect(scrolledToTop).toBe(true);
  });
});
