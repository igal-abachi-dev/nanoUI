import { initDirectives } from "./directives";
import { flushWork } from "./microtaskBatcher";

export interface RouteComponent {
  render: (
    data?: any,
    actionResult?: any,
    params?: Record<string, string>
  ) => {
    html: string;
    onMount?: () => (() => void) | void;
  };
  loader?: (params: Record<string, string>) => Promise<any>;
  action?: (
    formData: FormData,
    params: Record<string, string>
  ) => Promise<{ redirectTo?: string } | void>;
  errorComponent?: (
    error: unknown,
    data: any,
    params: Record<string, string>
  ) => string;
}

export interface RouterInit {
  routes: {
    path: string;
    component: RouteComponent;
  }[];
  rootSelector?: string;
  navSelector?: string;
  loadingComponent?: () => string;
  notFoundComponent?: (path: string) => string;
  prefetch?: boolean;
}
// --- nanoRouter.js ---

type NavigationState = "idle" | "loading" | "submitting";

let navigationState = "idle";
const setNavigationState = (state: NavigationState) => {
  navigationState = state;
  document.body.dataset.navigation = state;
};

// Utility: match route with dynamic params
function matchPath(
  routePath: string,
  currentPath: string
): Record<string, string> | null {
  const routeParts = routePath.replace(/^\/+|\/+$/g, "").split("/");
  const pathParts = currentPath.replace(/^\/+|\/+$/g, "").split("/");
  if (routeParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(":")) {
      params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (routeParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export function createRouter({
  routes,
  rootSelector = "#root",
  navSelector = ".nav__link",
  loadingComponent = () =>
    `<div class="loading"><span class="spinner"></span> Loading...</div>`,
  notFoundComponent = (path: string) =>
    `<h1 class="not-found">404 - Page Not Found</h1><p class="about-text">No route matches "<b>${path}</b>".</p>`,
  prefetch = true,
}: RouterInit): { navigate: (to: string) => void } {
  const root = document.querySelector(rootSelector)!;
  let lastCleanup: null | (() => void) = null;

  function navigate(to: string) {
    history.pushState({}, "", to);
    flushWork(() => renderMatch(to));
  }

  function updateActiveNav(path: string) {
    document.querySelectorAll(navSelector).forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === path);
    });
  }

  // --- PATCH: renderMatch now supports params, redirect, and new match logic ---
  async function renderMatch(path: string, actionResult?: any) {
    updateActiveNav(path);

    // Find matching route and params
    let matchedParams = {};
    let match = null;
    for (const r of routes) {
      const params = matchPath(r.path, path);
      if (params) {
        match = r;
        matchedParams = params;
        break;
      }
    }

    if (!match) {
      if (lastCleanup) lastCleanup();
      lastCleanup = null;
      root.innerHTML = notFoundComponent(path);
      setNavigationState("idle");
      return;
    }

    const comp = match.component; // <- Use .component, not direct fields
    let data, error;
    setNavigationState(
      actionResult ? "submitting" : comp.loader ? "loading" : "idle"
    );

    try {
      // Loader: pass params
      if (comp.loader) {
        if (lastCleanup) lastCleanup();
        lastCleanup = null;
        root.innerHTML = loadingComponent();
        data = await comp.loader(matchedParams);

        // Loader-level redirect support
        if (data && typeof data === "object" && data.redirectTo) {
          navigate(data.redirectTo);
          return;
        }
      }

      // Action-level redirect support
      if (actionResult && actionResult.redirectTo) {
        navigate(actionResult.redirectTo);
        return;
      }

      // Main render (pass data, actionResult, params)
      const component = comp.render(data, actionResult, matchedParams);
      root.innerHTML = component.html;
      initDirectives(root, component);
      if (typeof component.onMount === "function") {
        lastCleanup = component.onMount() || null;
      }
      setNavigationState("idle");
    } catch (err: unknown) {
      error = err;
      setNavigationState("idle");
      if (typeof comp.errorComponent === "function") {
        root.innerHTML = comp.errorComponent(error, data, matchedParams);
      } else {
        const errorMessage = err instanceof Error ? err.message : String(err);
        root.innerHTML = `<div class="error"><h2>Unexpected error</h2><pre>${errorMessage}</pre></div>`;
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
        for (const r of routes) {
          const href = link.getAttribute("href");
          if (href && matchPath(r.path, href) && r.component.loader) {
            const params = matchPath(r.path, href) || {};
            r.component.loader(params);
          }
        }
      }
    });
  }

  // --- PATCH: submit handler passes params and supports redirects ---
  document.addEventListener("submit", async (e) => {
    const form = e.target as HTMLFormElement;
    if (!form || form.method?.toLowerCase() !== "post") return;

    e.preventDefault();
    const href = window.location.pathname;
    let matchedParams = {};
    let match = null;
    for (const r of routes) {
      const params = matchPath(r.path, href);
      if (params) {
        match = r;
        matchedParams = params;
        break;
      }
    }
    if (match?.component.action) {
      setNavigationState("submitting");
      const formData = new FormData(form);
      try {
        const actionResult = await match.component.action(
          formData,
          matchedParams
        );
        flushWork(() => renderMatch(href, actionResult));
      } catch (error: unknown) {
        if (typeof match.component.errorComponent === "function") {
          root.innerHTML = match.component.errorComponent(
            error,
            null,
            matchedParams
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          root.innerHTML = `<div class="error"><h2>Action error</h2><pre>${errorMessage}</pre></div>`;
        }
        setNavigationState("idle");
      }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    flushWork(() => renderMatch(window.location.pathname));
  });

  return { navigate };
}
