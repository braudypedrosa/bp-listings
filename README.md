# bp-listings

Airbnb-style listings + map widget built with vanilla JavaScript and CSS.

Current version: **1.0.1**

## Overview

`bp-listings` renders a listings grid and interactive map in one widget container.
It is framework-agnostic, distributed as standalone JS/CSS, and uses Leaflet for map rendering.

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
- Consumer-controlled search slot renderer
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

- `id: string` (required)
- `title: string` (required)
- `price: number | string` (required)
- `lat: number` (required)
- `lng: number` (required)
- `subtitle?: string`
- `details?: string`
- `dates?: string`
- `pricePeriod?: string`
- `tag?: string`
- `rating?: number`
- `reviewCount?: number`
- `badge?: string` (e.g. `Guest favorite`, `Superhost`)
- `images?: string[]`
- `favorited?: boolean`

## Config Options

- `container: HTMLElement | string` (required)
- `listings: Array<Listing>` default `[]`
- `currency: string` default `'$'`
- `mapOptions.center: [number, number]` default `[14.55, 121.03]`
- `mapOptions.zoom: number` default `12`
- `tileUrl: string` (OpenStreetMap by default)
- `tileAttribution: string`
- `showMapToggle: boolean` default `true`
- `showSort: boolean` default `true`
- `showPagination: boolean` default `true`
- `pageSize: number` default `0` (`0` disables paging)
- `renderSearchSlot: (containerEl: HTMLElement) => void`
- `onFavorite: (listing, isFavorited) => void`
- `onListingClick: (listing) => void`
- `onMapMoveEnd: ({bounds, center, zoom}) => void`

## Public Methods

Returned widget instance exposes:

- `setListings(listings)`
- `panToListing(id)`
- `toggleMap()`
- `goToPage(pageNumber)`
- `destroy()`

## Styling and Theming

All classes are scoped with `.lm-*`.

You can customize appearance via CSS variables on `.lm-widget`, including:
- typography (`--lm-font`)
- text and border colors
- badge colors
- price marker colors
- radii

The included stylesheet is standalone and does not require a CSS framework.

## Notes

- Leaflet is loaded from `unpkg` automatically if it is not already available on the page.
- If your app already loads Leaflet, the widget reuses existing `window.L`.

## License

MIT

## Maintainer Workflow

Edit source files in this repository:
- `listings-map.js`
- `listings-map.css`

Then release updates by bumping `package.json` version, tagging (`vX.Y.Z`), and publishing.

Use one command:

```bash
npm run release:patch
# or: npm run release:minor
# or: npm run release:major
```

This command sequence will:
- verify you are on `main` with a clean working tree
- bump version and create a release commit + git tag
- push `main` and tags to GitHub
- publish the new version to npm
