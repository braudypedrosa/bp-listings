# bp-listings

A framework-agnostic listings grid and interactive map widget for vacation rental browsing, powered by Leaflet.

`bp-listings` focuses on presentation: cards, markers, sorting, pagination, and a search-slot area where you can mount your own search UI.

## Highlights

- listings grid and interactive map in one widget
- built-in sort control with `default`, `price-asc`, and `price-desc`
- optional pagination with configurable page size
- map toggle and fullscreen map action
- card-to-marker and marker-to-card highlighting
- favorite and listing-click callbacks
- consumer-controlled `renderSearchSlot` hook
- helper utilities for matching `searchData` payloads
- automatic Leaflet asset loading when `window.L` is not already present

## Installation

```bash
npm install github:braudypedrosa/bp-listings @fortawesome/fontawesome-free
```

## Usage

```js
import '@braudypedrosa/bp-listings';
import '@braudypedrosa/bp-listings/styles';

const widget = window.ListingsMap.init({
  container: '#widget',
  currency: '₱',
  mapOptions: { center: [14.58, 121.05], zoom: 12 },
  listings: [
    {
      id: 'listing-1',
      title: 'Apartment in Quezon City',
      price: 13689,
      pricePeriod: 'for 5 nights',
      lat: 14.628,
      lng: 121.055,
      images: ['photo-1.jpg', 'photo-2.jpg'],
    },
  ],
  onFavorite: (listing, isFavorited) => {
    console.log(listing.id, isFavorited);
  },
  onListingClick: (listing) => {
    console.log('clicked', listing.id);
  },
});
```

## Browser Global

The package registers:

- `window.ListingsMap`

## Listing Shape

Each listing can include:

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
- `badge?: string`
- `images?: string[]`
- `favorited?: boolean`
- `searchData?: { location?, availability?, fields?, filters? }`

## Options

- `container: HTMLElement | string` required
- `listings: Array<Listing>` default `[]`
- `currency: string` default `'$'`
- `mapOptions.center: [number, number]` default `[14.55, 121.03]`
- `mapOptions.zoom: number` default `12`
- `tileUrl: string` defaults to OpenStreetMap
- `tileAttribution: string`
- `showMapToggle: boolean` default `true`
- `showSort: boolean` default `true`
- `showPagination: boolean` default `true`
- `pageSize: number` default `12`
- `renderSearchSlot: (containerEl, widget) => void | (() => void)`
- `onFavorite: (listing, isFavorited) => void`
- `onListingClick: (listing) => void`
- `onMapMoveEnd: ({ north, south, east, west, center, zoom }) => void`

Explicit `pageSize: 0` or any non-positive value disables pagination.

## Instance API

The widget returned by `window.ListingsMap.init(...)` exposes:

- `setListings(listings)`
- `panToListing(id)`
- `toggleMap()`
- `goToPage(pageNumber)`
- `destroy()`

## Search Slot Integration

Use `renderSearchSlot` when you want to mount an external search UI above the listings grid.

Recommended flow:

1. Keep the full `allListings` dataset outside the widget.
2. Mount your search UI in `renderSearchSlot`.
3. Filter externally when the search changes.
4. Push the filtered subset back into `bp-listings` with `setListings(filteredListings)`.

Example with `bp-search-widget`:

```js
import '@braudypedrosa/bp-listings';
import '@braudypedrosa/bp-listings/styles';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@braudypedrosa/bp-calendar/styles';
import '@braudypedrosa/bp-search-widget';
import '@braudypedrosa/bp-search-widget/styles';

const { BPSearchWidget } = window;

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
];

const matchListing = window.ListingsMap.createSearchDataMatcher({
  fields: fieldDefinitions,
  filters: filterDefinitions,
});

window.ListingsMap.init({
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
```

## Search Data Helpers

Use these helpers when your listings carry a consumer-defined `searchData` object:

- `window.ListingsMap.createSearchDataMatcher({ fields, filters })`
- `window.ListingsMap.filterListingsBySearchData(listings, payload, config)`

Recommended `searchData` shape:

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

`bp-listings` does not enforce this schema automatically. The helpers are there when you want the documented matching behavior.
