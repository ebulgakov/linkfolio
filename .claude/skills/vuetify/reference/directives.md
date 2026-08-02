# Vuetify built-in directives

These are Vuetify 3's built-in directives. They aren't components, so they don't show up in the component API lookup — this file is the reference for them instead. Each links to its full doc page for exhaustive options.

Import individually for tree-shaking, or globally register from `vuetify/directives`.

## v-ripple

Adds Material touch/click ripple feedback to an element. Many components (`v-btn`, tabs, list items) already include it.

```js
import { Ripple } from "vuetify/directives";
```

```html
<div v-ripple>Click me</div>
<div v-ripple.stop>Ripple without propagating to outer ripple elements</div>
<div v-ripple="{ class: 'text-red' }">Colored ripple</div>
```

Doc: https://vuetifyjs.com/en/directives/ripple/

## v-scroll

Calls a handler on scroll — of the window, the element itself, or a custom target.

```js
import { Scroll } from "vuetify/directives";
```

```html
<div v-scroll="onScroll">Window scroll</div>
<div v-scroll.self="onScroll">Own scroll</div>
<div v-scroll:#scrollable="onScroll">Custom target by selector</div>
```

Doc: https://vuetifyjs.com/en/directives/scroll/

## v-resize

Calls a handler when the window resizes.

```js
import { Resize } from "vuetify/directives";
```

```html
<div v-resize="onResize">{{ windowSize }}</div>
```

Doc: https://vuetifyjs.com/en/directives/resize/

## v-intersect

Wraps the Intersection Observer API — fires when the element enters/leaves the viewport. Used for lazy loading, infinite scroll, scroll-spy.

```js
import { Intersect } from "vuetify/directives";
```

```html
<div v-intersect="onIntersect">Watch me</div>
<div v-intersect="{ handler: onIntersect, options: { threshold: [0, 0.5, 1] } }">With options</div>
```

Doc: https://vuetifyjs.com/en/directives/intersect/

## v-touch

Adds swipe/touch gesture handlers.

```js
import { Touch } from "vuetify/directives";
```

```html
<div v-touch="{ left: onSwipeLeft, right: onSwipeRight }">Swipeable</div>
```

Doc: https://vuetifyjs.com/en/directives/touch/

## v-click-outside

Fires a handler when a click happens outside the bound element, without stopping propagation.

```js
import { ClickOutside } from "vuetify/directives";
```

```html
<div v-click-outside="onClickOutside">Close menu when clicking elsewhere</div>
```

Doc: https://vuetifyjs.com/en/directives/click-outside/

## v-tooltip

Attaches a tooltip to an element (functional alternative to the `v-tooltip` component wrapper).

```js
import { Tooltip } from "vuetify/directives";
```

```html
<button v-tooltip="'Save changes'">Save</button>
```

Doc: https://vuetifyjs.com/en/directives/tooltip/

## Global registration (all directives)

```js
import { createApp } from "vue";
import * as directives from "vuetify/directives";
import { createVuetify } from "vuetify";

const vuetify = createVuetify({ directives });
```

## Notes

- Vuetify 2 has a similar but not identical directive set (e.g. no `v-tooltip` directive, different import paths under `vuetify/lib/directives`). If the project is on Vuetify 2, check https://v2.vuetifyjs.com/en/directives/ instead of assuming this file applies as-is.
- For argument/modifier details beyond what's shown here, follow the doc link for that directive rather than guessing.
