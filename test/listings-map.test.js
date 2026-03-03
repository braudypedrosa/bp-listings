import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';

const listingsMapSource = fs.readFileSync(
  path.resolve(process.cwd(), 'listings-map.js'),
  'utf8'
);
const listingsMapStyles = fs.readFileSync(
  path.resolve(process.cwd(), 'listings-map.css'),
  'utf8'
);

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

  window.L = L;
  window.Element.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
  window.eval(listingsMapSource);

  return {
    dom,
    window,
    ListingsMap: window.ListingsMap,
    mapInstances,
  };
}

function buildListings() {
  return [
    {
      id: 'listing-1',
      title: 'Ocean Villa',
      price: 320,
      pricePeriod: 'per night',
      lat: 14.55,
      lng: 121.02,
      images: ['one.jpg'],
    },
    {
      id: 'listing-2',
      title: 'Garden Cabin',
      price: 180,
      pricePeriod: 'per night',
      lat: 14.56,
      lng: 121.03,
      images: ['two.jpg'],
    },
    {
      id: 'listing-3',
      title: 'City Loft',
      price: 240,
      pricePeriod: 'per night',
      lat: 14.57,
      lng: 121.04,
      images: ['three.jpg'],
    },
    {
      id: 'listing-4',
      title: 'Beach House',
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

  it('uses auto-fit minmax for the desktop map-hidden grid rule', () => {
    expect(listingsMapStyles).toContain(
      '.lm-widget.lm-map-hidden .lm-listings-grid {\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));'
    );
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
});
