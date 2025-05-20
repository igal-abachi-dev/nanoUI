// src/nanoui.ts

//todo add example usage html that uses the lib


export type Signal<T> = [
  () => T,
  (nv: T) => void
] & {
  subscribe: (fn: (val: T) => void) => void;
};
//tiny signals
export function signal<T>(val: T): Signal<T> {
  let v = val;
  const subs: Array<(val: T) => void> = [];
  function get() { return v; }
  function set(nv: T) { v = nv; subs.forEach(f => f(v)); }
  (get as any).subscribe = (fn: (val: T) => void) => subs.push(fn);
  return [get, set] as Signal<T>;
}

// Microtask DOM batcher
let dirty = false;
export function scheduleFlush(fn: () => void): void {
  if (!dirty) {
    dirty = true;
    Promise.resolve().then(() => { fn(); dirty = false; });
  }
}

export function capitalize(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

//todo , mount cleanup weakmap registry , return code , instead of v-model usage
//for render route

export function bindDirectives(root: Element, ctx: Record<string, any>) {
  // v-model
  root.querySelectorAll<HTMLInputElement>("[v-model]").forEach(input => {
    const key = input.getAttribute("v-model")!;
    if (!ctx[key]) return;
    input.value = ctx[key]?.();
    input.addEventListener("input", e => ctx[`set${capitalize(key)}`]?.((e.target as HTMLInputElement).value));
    ctx[key].subscribe?.((v: any) => { input.value = v; });
  });
  // v-show
  root.querySelectorAll<HTMLElement>("[v-show]").forEach(el => {
    const expr = el.getAttribute("v-show")!;
    const update = () => { el.style.display = ctx[expr]?.() ? "" : "none"; };
    ctx[expr]?.subscribe?.(update); update();
  });
  // @event
  root.querySelectorAll<HTMLElement>("*").forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith("@")) {
        const event = attr.name.slice(1);
        const handlerName = attr.value.replace("()", "");
        el.addEventListener(event, ctx[handlerName].bind(ctx));
      }
    });
  });
  // Mustache {{ expr }}
  root.querySelectorAll<HTMLElement>("*").forEach(el => {
    el.innerHTML = el.innerHTML.replace(/{{\s*([\w\d_]+)\s*}}/g, (_, expr) => {
      if (typeof ctx[expr] === "function") return ctx[expr]();
      if (ctx[expr] !== undefined) return ctx[expr];
      return "";
    });
  });
}

export interface RouterOptions {
  routes: {
    path: string;
    render: (data?: any) => any;
    loader?: () => Promise<any>;
  }[];
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
  notFoundComponent = (path: string) => `<h1 class="not-found">404 - Page Not Found</h1><p class="about-text">No route matches "<b>${path}</b>".</p>`,
  prefetch = true
}: RouterOptions): void {
  const root = document.querySelector(rootSelector)!;

  let lastCleanup: null | (() => void) = null;

  function updateActiveNav(path: string) {
    document.querySelectorAll(navSelector).forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === path);
    });
  }

  async function renderRoute(path: string) {
    updateActiveNav(path);
    const match = routes.find(r => r.path === path);
    if (!match) {
      if (lastCleanup) lastCleanup();
      lastCleanup = null;
      root.innerHTML = notFoundComponent(path);
      return;
    }
    if (match.loader) {
      if (lastCleanup) lastCleanup();
      lastCleanup = null;
      root.innerHTML = loadingComponent();
      const data = await match.loader();
      const component = match.render(data);
      root.innerHTML = component.html;
      bindDirectives(root, component);
      if (typeof component.onMount === "function") {
        lastCleanup = component.onMount() || null;
      }
    } else {
      if (lastCleanup) lastCleanup();
      lastCleanup = null;
      const component = match.render();
      root.innerHTML = component.html;
      bindDirectives(root, component);
      if (typeof component.onMount === "function") {
        lastCleanup = component.onMount() || null;
      }
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
