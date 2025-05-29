# nanoUI

**nanoUI** is a fast, minimal SPA utility library for modern small/simple web sites and landing pages

---

### **nano UI exports:**

```html
import {createRouter,signal,batch,computed,effect} from 'nanoui';
```

## ✨ Features

- **SPA Router:**
  Full support for component-based route definitions, dynamic params, `loader`/`action`/`errorComponent`, and navigation interception.
- **Signal System:**
  Fine-grained reactivity for field/state management.
- **DOM Batcher:**
  Efficient microtask flush/batch rendering.
- **Directives:**
  Support for `[x-show]`, `@event`, and template interpolation (`{{ }}`).
- **Lifecycle:**
  Route-level `onMount` and automatic cleanup.
- **Prefetch, Error Boundaries, Navigation State:**
  Advanced features for robust SPAs.

---

## 🗂️ File Structure

```
src/
  router.ts              # Main SPA router implementation
  signals.ts             # Core signal system (reactivity)
  directives.ts          # Directives and template binding
  microtaskBatcher.ts    # DOM batching scheduler

package.json             # Library/package manifest
rollup.config.mjs        # Rollup bundler config (UMD, ESM)
tsconfig.json            # TypeScript config
```

---

### **SPA Router**

```html
<body>
  <div id="root"></div>
  <script type="module">
    import { createRouter } from "https://cdn.jsdelivr.net/npm/nanoui@1.0.0/dist/nanoui.esm.js";
    createRouter({
      routes: [
        { path: "/", component: (await import("./HomePage.js")).HomePage },
        { path: "/user/:id", component: (await import("./UserProfile.js")).UserProfile },
      ],
    });
  </script>
</body>

<script>
  export const HomePage = {
  render: () => ({
    html: `<h1>Welcome!</h1>`
  })
</script>
};
```

### **lightweight signals**

```html
<script>
  const count = new signal(0);
  const double = computed(() => count.value * 2);

  effect(() => {
    console.log("double is", double.value);
  });

  function reRun() {
    count.value++;
  }

  const a = new signal(1);
  const b = new signal(2);
  const sum = computed(() => a.value + b.value);

  effect(() => console.log("Sum:", sum.value)); // Logs: Sum: 3
  a.value = 5; // Logs: Sum: 7
  b.value = 3; // Logs: Sum: 8
</script>
```

---

### **CDN import (Global UMD):**

```html
<script src="https://cdn.jsdelivr.net/npm/nanoui@1.0.0/dist/nanoui.umd.min.js"></script>
<script>
  NanoUI.greet("World");
</script>
```

### **CDN import (ESM Module):**

```html
<script type="module">
  import { greet } from "https://cdn.jsdelivr.net/npm/nanoui@1.0.0/dist/nanoui.esm.js";
  greet("World");
</script>
```
