# bp-listings

Airbnb-style listings + map widget built with vanilla JavaScript and CSS.

Current version: **1.0.5**

## Overview

`bp-listings` renders a listings grid and interactive map in one widget container.
It is framework-agnostic, distributed as standalone JS/CSS, and uses Leaflet for map rendering.

`bp-listings` does not bundle a search UI. Search is integrated through the consumer-controlled
`renderSearchSlot` hook, which lets you mount your own widget above the listings grid and drive
result updates through `setListings()`.

## Features

- Standalone UMD distribution (`ListingsMap.init(...)`)
- Auto-loads Leaflet CSS/JS when `window.L` is not present
- Listings cards with image carousel and badges
- Favorite toggle with callback
- Click-through callback for listing cards
- Sort controls (`default`, `price-asc`, `price-desc`)
- Optional pagination with configurable page size
- Show/hide map toggle and fullscreen map action
- Marker-to-card and card-to-marker highlighting behavior
- Consumer-controlled search slot renderer with optional cleanup
- Runtime methods to update listings and navigate map/pagination state

## Installation

### npm

```bash
npm install @braudypedrosa/bp-listings
```

```js
import '@braudypedrosa/bp-listings';
import '@braudypedrosa/bp-listings/styles';
```

### Browser

```html
<link rel="stylesheet" href="./listings-map.css" />
<script src="./listings-map.js"></script>
```

## Quick Start

```html
<div id="widget" style="width:100%;height:100vh;"></div>
<script>
  const widget = ListingsMap.init({
    container: '#widget',
    currency: '₱',
    mapOptions: { center: [14.58, 121.05], zoom: 12 },
    listings: [
      {
        id: '1',
        title: 'Apartment in Quezon City',
        price: 13689,
        pricePeriod: 'for 5 nights',
        lat: 14.628,
        lng: 121.055,
        images: ['photo-1.jpg', 'photo-2.jpg']
      }
    ],
    onFavorite: (listing, isFavorited) => {
      console.log(listing.id, isFavorited);
    },
    onListingClick: (listing) => {
      console.log('clicked', listing.id);
    },
  });
</script>
```

## Listing Data Schema

Each listing object can include:

- `id: string` required
- `title: string` required
- `price: number | string` required
- `lat: number` required
- `lng: number` required
- `subtitle?: string`
- `details?: string`
- `dates?: string`
- `pricePeriod?: string`
- `tag?: string`
- `rating?: number`
- `reviewCount?: number`
- `badge?: string` for labels such as `Guest favorite` or `Superhost`
- `images?: string[]`
- `favorited?: boolean`

### Recommended Consumer-side `searchData`

When you integrate external search through `renderSearchSlot`, the recommended consumer-side shape is:

```js
{
  searchData: {
    location?: string | string[],
    availability?: Array<{ start: string, end: string }>,
    fields?: Record<string, string | string[]>,
    filters?: Record<string, string | string[] | number>
  }
}
```

Important:

- this is a docs/demo convention only
- `bp-listings` does not parse or enforce `searchData`
- matching remains consumer-owned

## Config Options

- `container: HTMLElement | string` required
- `listings: Array<Listing>` default `[]`
- `currency: string` default `'$'`
- `mapOptions.center: [number, number]` default `[14.55, 121.03]`
- `mapOptions.zoom: number` default `12`
- `tileUrl: string` OpenStreetMap by default
- `tileAttribution: string`
- `showMapToggle: boolean` default `true`
- `showSort: boolean` default `true`
- `showPagination: boolean` default `true`
- `pageSize: number` default `12`; explicit `0` or any non-positive value disables paging
- `renderSearchSlot: (containerEl: HTMLElement, listingsWidget: ListingsMapWidget) => void | (() => void)`
- `onFavorite: (listing, isFavorited) => void`
- `onListingClick: (listing) => void`
- `onMapMoveEnd: ({bounds, center, zoom}) => void`

`renderSearchSlot` rules:

- `containerEl` is the mounted slot host rendered above the listings grid
- `listingsWidget` is the active `bp-listings` instance
- if the callback returns a function, `bp-listings` calls it during `destroy()`
- legacy usage that only accepts `(containerEl)` still works

## Using `bp-search-widget` with `renderSearchSlot`

This is the official integration model:

- keep `bp-listings` focused on rendering cards, markers, sorting, and pagination
- mount `BPSearchWidget` inside `renderSearchSlot`
- keep the full `allListings` dataset outside the widget
- filter externally on `BPSearchWidget.onSearch`
- push the filtered subset back into `bp-listings` with `setListings(filteredListings)`

This pattern requires a bundler or dev server that can resolve npm packages and SCSS style imports.

```js
import '@braudypedrosa/bp-listings';
import '@braudypedrosa/bp-listings/styles';
import '@braudypedrosa/bp-calendar/styles';
import '@braudypedrosa/bp-search-widget/styles';
import { BPSearchWidget } from '@braudypedrosa/bp-search-widget';

const allListings = [
  {
    id: 'villa-ocean',
    title: 'Ocean-view villa in Batangas',
    price: 21450,
    lat: 13.7565,
    lng: 120.9414,
    images: ['villa-1.jpg'],
    searchData: {
      location: ['Batangas', 'Nasugbu', 'Beachfront'],
      availability: [{ start: '2030-04-10', end: '2030-04-30' }],
      fields: {
        'bp-guests': '6',
      },
      filters: {
        'bp-bedrooms': 4,
        'bp-view': 'Ocean',
        'bp-amenities': ['Pool', 'Spa'],
      },
    },
  },
  {
    id: 'cabin-ridge',
    title: 'Ridge cabin outside Tagaytay',
    price: 11800,
    lat: 14.1153,
    lng: 120.9625,
    images: ['cabin-1.jpg'],
    searchData: {
      location: ['Tagaytay', 'Ridge'],
      availability: [{ start: '2030-04-01', end: '2030-04-18' }],
      fields: {
        'bp-guests': '4',
      },
      filters: {
        'bp-bedrooms': 2,
        'bp-view': 'Garden',
        'bp-amenities': ['Pet Friendly'],
      },
    },
  },
];

const fieldDefinitions = [
  {
    key: 'bp-guests',
    label: 'Guests',
    type: 'select',
    options: ['2', '4', '6'],
    position: 'end',
  },
];

const filterDefinitions = [
  {
    key: 'bp-bedrooms',
    label: 'Bedrooms',
    type: 'counter',
    min: 0,
    max: 8,
    defaultValue: 0,
    width: '24%',
  },
  {
    key: 'bp-view',
    label: 'View',
    type: 'select',
    options: ['Ocean', 'Garden', 'City'],
    width: '28%',
  },
  {
    key: 'bp-amenities',
    label: 'Amenities',
    type: 'checkbox',
    options: ['Pool', 'Spa', 'Gym', 'Pet Friendly'],
    width: '48%',
  },
];

const fieldTypeMap = new Map(
  [...fieldDefinitions, ...filterDefinitions].map((field) => [field.key, field.type])
);

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const normalizeStringArray = (value) =>
  toArray(value).map((entry) => normalizeString(entry)).filter(Boolean);

const matchesSubstring = (haystackValue, needleValue) => {
  const needle = normalizeString(needleValue);
  if (!needle) return true;
  return normalizeStringArray(haystackValue).some((value) => value.includes(needle));
};

const matchesExact = (haystackValue, needleValue) => {
  const needle = normalizeString(needleValue);
  if (!needle) return true;
  return normalizeStringArray(haystackValue).some((value) => value === needle);
};

const matchesAllChoices = (haystackValue, needleValues) => {
  const selectedValues = normalizeStringArray(needleValues);
  if (selectedValues.length === 0) return true;
  const availableValues = new Set(normalizeStringArray(haystackValue));
  return selectedValues.every((value) => availableValues.has(value));
};

const matchesCounter = (haystackValue, needleValue) => {
  const numericNeedle = Number(needleValue);
  const numericHaystack = Number(haystackValue);
  if (!Number.isFinite(numericNeedle)) return true;
  if (!Number.isFinite(numericHaystack)) return false;
  return numericHaystack >= numericNeedle;
};

const isValidDateString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const matchesAvailability = (availability, checkIn, checkOut) => {
  if (!Array.isArray(availability) || !isValidDateString(checkIn) || !isValidDateString(checkOut)) {
    return false;
  }

  return availability.some((windowRange) => (
    windowRange &&
    isValidDateString(windowRange.start) &&
    isValidDateString(windowRange.end) &&
    windowRange.start <= checkIn &&
    windowRange.end >= checkOut
  ));
};

const matchValues = (type, listingValue, submittedValue) => {
  if (type === 'checkbox') return matchesAllChoices(listingValue, submittedValue);
  if (type === 'select' || type === 'radio') return matchesExact(listingValue, submittedValue);
  if (type === 'counter') return matchesCounter(listingValue, submittedValue);
  return matchesSubstring(listingValue, submittedValue);
};

const matchListing = (listing, payload) => {
  const searchData = listing.searchData || {};
  const fieldValues = searchData.fields || {};
  const filterValues = searchData.filters || {};

  if (!matchesSubstring(searchData.location, payload.location)) {
    return false;
  }

  if (payload.checkIn && payload.checkOut) {
    if (!matchesAvailability(searchData.availability, payload.checkIn, payload.checkOut)) {
      return false;
    }
  }

  for (const [key, value] of Object.entries(payload.customFields || {})) {
    if (!matchValues(fieldTypeMap.get(key), fieldValues[key], value)) {
      return false;
    }
  }

  for (const [key, value] of Object.entries(payload.filters || {})) {
    if (!matchValues(fieldTypeMap.get(key), filterValues[key], value)) {
      return false;
    }
  }

  return true;
};

const listingsWidget = ListingsMap.init({
  container: '#widget',
  listings: allListings,
  renderSearchSlot: (containerEl, widget) => {
    const searchWidget = new BPSearchWidget(containerEl, {
      fields: fieldDefinitions,
      filters: filterDefinitions,
      calendarOptions: {
        startDate: new Date('2030-03-01T00:00:00'),
        monthsToShow: 2,
        datepickerPlacement: 'auto',
      },
      onSearch: (payload) => {
        const filteredListings = allListings.filter((listing) => matchListing(listing, payload));
        widget.setListings(filteredListings);
      },
    });

    return () => {
      searchWidget.destroy();
    };
  },
});

document.querySelector('#reset-listings').addEventListener('click', () => {
  listingsWidget.setListings(allListings);
});
```

## Public Methods

Returned widget instance exposes:

- `setListings(listings)` and preserves the current sort selection while resetting pagination to page 1
- `panToListing(id)`
- `toggleMap()`
- `goToPage(pageNumber)`
- `destroy()`

## Styling and Theming

All classes are scoped with `.lm-*`.

You can customize appearance via CSS variables on `.lm-widget`, including:

- typography via `--lm-font`
- text and border colors
- badge colors
- price marker colors
- radii

The included stylesheet is standalone and does not require a CSS framework.

When the map is hidden, the desktop listings grid auto-fits to the available width so wider layouts
can expand beyond the default 2-column split view.

## Local Demo

This repo includes a local demo at [index.html](/Users/braudypedorsa/Projects/libraries/bp-listings/index.html).

Run it with:

```bash
npm install
npm run dev
```

The local demo uses Vite only for development so it can resolve `@braudypedrosa/bp-search-widget`,
`@braudypedrosa/bp-calendar`, and their styles. The published `bp-listings` package format is unchanged.

## Notes

- Leaflet is loaded from `unpkg` automatically if it is not already available on the page.
- If your app already loads Leaflet, the widget reuses existing `window.L`.
- `bp-listings` does not include internal search/filter behavior.

## License

MIT

## Maintainer Workflow

For the reusable release workflow, versioning rules, and verification steps, see [RELEASING.md](https://github.com/braudypedrosa/bp-listings/blob/main/RELEASING.md).
