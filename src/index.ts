// src/index.ts (or src/vanilla-spa.ts)
// nanoUI core

// 1. Tiny signals: Per-field reactivity
export type Signal<T> = [
  () => T,
  (nv: T) => void
] & {
  subscribe: (fn: (val: T) => void) => void;
};

export function signal<T>(val: T): Signal<T> {
  let v = val;
  const subs: Array<(val: T) => void> = [];
  function get() { return v; }
  function set(nv: T) { v = nv; subs.forEach(f => f(v)); }
  (get as any).subscribe = (fn: (val: T) => void) => subs.push(fn);
  // TypeScript can't natively extend array, so use cast
  return [get, set] as Signal<T>;
}

// 2. Microtask DOM batcher
let dirty = false;
function scheduleFlush(fn: () => void): void {
  if (!dirty) {
    dirty = true;
    Promise.resolve().then(() => { fn(); dirty = false; });
  }
}

// 3. Mount/cleanup registry for component roots
const mountMap = new WeakMap<Element, () => void>();

// 4. DOM utility: Walk and upgrade directives in subtree
function upgradeDirectives(el: Element, ctx: Record<string, any>): void {
  // v-model
  el.querySelectorAll<HTMLInputElement>("[v-model]").forEach(input => {
    const key = input.getAttribute("v-model")!;
    input.value = ctx[key]?.();
    input.addEventListener("input", e => ctx[`set${capitalize(key)}`]?.((e.target as HTMLInputElement).value));
    ctx[key]?.subscribe?.((v: any) => { input.value = v; });
  });
  // v-show
  el.querySelectorAll<HTMLElement>("[v-show]").forEach(node => {
    const expr = node.getAttribute("v-show")!;
    const update = () => { node.style.display = ctx[expr]?.() ? "" : "none"; };
    ctx[expr]?.subscribe?.(update); update();
  });
  // :class
  el.querySelectorAll<HTMLElement>("[v-data], [v-model], [v-show], [@click], [:class]").forEach(node => {
    if (node.hasAttribute(":class")) {
      const expr = node.getAttribute(":class")!;
      const update = () => node.className = ctx[expr]?.() || "";
      ctx[expr]?.subscribe?.(update); update();
    }
  });
  // @event (e.g., @click)
  Array.from(el.querySelectorAll("*")).forEach(node => {
    Array.from(node.attributes).forEach(attr => {
      if (attr.name.startsWith("@")) {
        const event = attr.name.slice(1);
        const handlerName = attr.value.replace("()", "");
        node.addEventListener(event, ctx[handlerName]);
      }
    });
  });
}

// Helper to capitalize, for setX
function capitalize(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

// 5. Component: instantiate, run onMount (w/ cleanup), wire signals
export function mountComponent(el: Element, compFn: () => Record<string, any>): void {
  const ctx = compFn();
  let cleanup: void | (() => void);
  if (typeof ctx.onMount === "function") {
    cleanup = ctx.onMount();
  }
  upgradeDirectives(el, ctx);
  mountMap.set(el, () => { if (typeof cleanup === "function") cleanup(); });
}

// 6. Boot: walk DOM and instantiate v-data components
export function bootComponents(root: Element = document.body): void {
  root.querySelectorAll<HTMLElement>("[v-data]").forEach(el => {
    const expr = el.getAttribute("v-data")!;
    // @ts-ignore: Assume global function by name
    const compFn = (window as any)[expr.split("(")[0]];
    mountComponent(el, compFn);
  });
}

// 7. SPA Router with loader support and batching
export interface Route {
  path: string;
  render: (data?: any) => string;
  loader?: () => Promise<any>;
}

export interface RouterOptions {
  routes: Route[];
  rootSelector?: string;
  navSelector?: string;
  loadingComponent?: () => string;
  notFoundComponent?: (path: string) => string;
  prefetch?: boolean;
}

export function createRouter({
  routes,
  rootSelector = "#content",
  navSelector = ".nav__link",
  loadingComponent = () => `<div class="loading"><span class="spinner"></span> Loading...</div>`,
  notFoundComponent = (path: string) => `<h1 class="not-found">404 - Not Found</h1><p>No route matches "<b>${path}</b>"</p>`,
  prefetch = true
}: RouterOptions): void {
  const root = document.querySelector(rootSelector)!;

  function updateActiveNav(path: string) {
    document.querySelectorAll(navSelector).forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === path);
    });
  }

  function cleanupRoots() {
    root.querySelectorAll("[v-data]").forEach(el => {
      const cleanup = mountMap.get(el);
      if (cleanup) cleanup();
      mountMap.delete(el);
    });
  }

  async function renderRoute(path: string) {
    updateActiveNav(path);
    const match = routes.find(r => r.path === path);
    if (!match) {
      cleanupRoots();
      root.innerHTML = notFoundComponent(path);
      bootComponents(root);
      return;
    }
    if (match.loader) {
      cleanupRoots();
      root.innerHTML = loadingComponent();
      const data = await match.loader();
      root.innerHTML = match.render(data);
      bootComponents(root);
    } else {
      cleanupRoots();
      root.innerHTML = match.render();
      bootComponents(root);
    }
  }

  document.addEventListener("click", e => {
    const link = (e.target as HTMLElement).closest("[data-link]") as HTMLElement | null;
    if (link) {
      e.preventDefault();
      const href = link.getAttribute("href")!;
      if (href !== window.location.pathname) {
        history.pushState({}, '', href);
        scheduleFlush(() => renderRoute(href));
      }
    }
  });

  window.addEventListener("popstate", () => scheduleFlush(() => renderRoute(window.location.pathname)));

  if (prefetch) {
    document.addEventListener("mouseover", e => {
      const link = (e.target as HTMLElement).closest("[data-link]") as HTMLElement | null;
      if (link) {
        const route = routes.find(r => r.path === link.getAttribute("href"));
        if (route && route.loader) route.loader();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => scheduleFlush(() => renderRoute(window.location.pathname)));
}
