import { initDirectives } from "./directives";
import { flushWork } from "./microtaskBatcher";

export interface RouterInit {
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
  loadingComponent = () =>
    `<div class="loading"><span class="spinner"></span> Loading...</div>`,
  notFoundComponent = (path: string) =>
    `<h1 class="not-found">404 - Page Not Found</h1><p class="about-text">No route matches "<b>${path}</b>".</p>`,
  prefetch = true,
}: RouterInit): void {
  //return Router?
  const root = document.querySelector(rootSelector)!;
  let lastCleanup: null | (() => void) = null;

  function updateActiveNav(path: string) {
    document.querySelectorAll(navSelector).forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === path);
    });
  }

  async function renderMatch(path: string) {
    updateActiveNav(path);
    const match = routes.find((r) => r.path === path);
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
      initDirectives(root, component);
      if (typeof component.onMount === "function") {
        lastCleanup = component.onMount() || null;
      }
    } else {
      if (lastCleanup) lastCleanup();
      lastCleanup = null;
      const component = match.render();
      root.innerHTML = component.html;
      initDirectives(root, component);
      if (typeof component.onMount === "function") {
        lastCleanup = component.onMount() || null;
      }
    }
  }

  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest(
      "[data-link]"
    ) as HTMLElement | null;
    if (link) {
      e.preventDefault();
      const href = link.getAttribute("href")!;
      if (href !== window.location.pathname) {
        history.pushState({}, "", href);
        flushWork(() => renderMatch(href));
      }
    }
  });
  window.addEventListener("popstate", () => {
    flushWork(() => renderMatch(window.location.pathname));
  });
  if (prefetch) {
    document.addEventListener("mouseover", (e) => {
      const link = (e.target as HTMLElement).closest(
        "[data-link]"
      ) as HTMLElement | null;
      if (link) {
        const route = routes.find((r) => r.path === link.getAttribute("href"));
        if (route && route.loader) route.loader();
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    flushWork(() => renderMatch(window.location.pathname));
  });
}
