// Component interface
interface Component {
  //data from fetch loader , action is after form submit , params are route/inline component params
  render: (data?: any, action?: any, params?: Record<string, any>) => TemplateResult;
}

// interface TypedComponent<P = {}> {
//   render: (data?: any, action?: any, params?: P) => TemplateResult;
//   propTypes?: Record<keyof P, any>; // For runtime validation
// }

// Template result interface
interface TemplateResult {
  html: string;
  onMount?: () => (() => void) | void;
}

// This is a simple templating system for building components and rendering HTML.
// It allows you to define components with a render function that returns a template result.
// Components can be nested, and you can pass parameters to them.
// Components can also return a cleanup function to run when the component is removed from the DOM.
// This is similar to the JSX runtime but without the need for a build step.
// It is designed to be lightweight and easy to use

// h.js , light jsx runtime
export function h(comp: Component,
  params: Record<string, any> = {}): TemplateResult {
  // Call the component's render, ignoring data/action/params
  // If you need params later you can extend this signature.
  return comp.render(undefined,undefined, params);
}
//Limited templating - No loops, conditionals beyond x-show, or components
//No component system - Just page-level components in the router
/* interesting micro-framework that strikes a balance between functionality and size, though you'd need to be careful about XSS vulnerabilities with the innerHTML usage. */


  function escapeHtml(s:string) {
    return s.replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
    );
  }

// Base template literal function
export function html(strings: TemplateStringsArray, ...values: Array<string | TemplateResult | null | undefined>): TemplateResult {
  let out = "";
  const mounts: Array<() => (() => void) | void> = [];

  strings.forEach((str: string, i: number) => {
    out += str;
    if (i < values.length) {
      const v = values[i];
      if (v && typeof (v as TemplateResult).html === "string") {
        out += (v as TemplateResult).html;
        if (typeof (v as TemplateResult).onMount === "function") {
          mounts.push((v as TemplateResult).onMount!);
        }
      } else if (typeof v === "string") {
        out += escapeHtml(v);
      } else {
        out += String(v ?? "");
      }
    }
  });


  //Future: You may want to add DOM diffing or support for reactive signals (currently static).
  return {
    html: out,
    onMount: () => {
      const cleans = mounts.map(fn => fn());
      return () => cleans.forEach(c => c && c());
    }
  };
}

// Create a component-aware version of html
export function htmlWithComponents(components: Record<string, Component>) {
  function componentHtml(strings: TemplateStringsArray, ...values: Array<string | TemplateResult | null | undefined>): TemplateResult {
    let raw = "";
    strings.forEach((str: string, i: number) => {
      raw += str;
      if (i < values.length) raw += String(values[i] ?? "");
    });

    /*Component Discovery in htmlWithComponents
The regex approach works but has limitations:
// Current: only self-closing components
/<([A-Z]\w*)([^>]*)\/>/g


Does not support <Comp>children</Comp> or dynamic attributes yet.
// Consider supporting:
// <Component>children</Component>
// <Component attr={value} />
 */
    raw = raw.replace(/<([A-Z]\w*)([^>]*)\/>/g, (_, name: string, attrs: string) => {
      const Comp = components[name];
      if (!Comp) throw new Error(`Component "${name}" not found`);
      const props: Record<string, string> = {};
      attrs.trim().replace(/(\w+)="([^"]*)"/g, (_a: string, k: string, v: string) => {
        props[k] = v;
        return '';
      });
      const res = h(Comp, props);
      return res.html; // If you want full lifecycle, you should accumulate res.onMounts too.
    });

    const templateArray = Object.assign([raw], { raw: [raw] });
    return html(templateArray);
  }
  return componentHtml;
}

// Utility to convert string to DOM fragment
export function stringToDom(html: string): Element | null {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;//.content?



//No DocumentFragment support yet in stringToDom, so your current implementation is safe.
}

export function compileJSXRuntime(root: HTMLElement, componentMap: Record<string, Component> = {}): void {
  root.querySelectorAll("*").forEach(el => {
    const tag = el.tagName;
    if (!/^[A-Z]/.test(tag)) return;

    const comp = componentMap[tag] || componentMap[tag[0] + tag.slice(1).toLowerCase()];
    if (!comp?.render) return;

    const props: Record<string, any> = {};
    for (const attr of el.attributes) {
      props[attr.name] = attr.value;
    }

    const result = h(comp, props);
    const fragment = stringToDom(result.html);
    if (!fragment) return;
/*
The compileJSXRuntime function does a lot of DOM manipulation. Consider:

Batching DOM updates
Caching compiled components
Using DocumentFragment for multiple replacements
 */


    // Recursively compile children
    compileJSXRuntime(fragment as HTMLElement, componentMap);

    // Replace <MyComponent> with the new DOM nodes
    if (fragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      // Replace with all children
      el.replaceWith(...fragment.childNodes);
    } else {
      // Replace with single node
      el.replaceWith(fragment);
    }

    result.onMount?.();
  });
}

// export function map<T>(items: T[], fn: (item: T, index: number) => TemplateResult): TemplateResult {
//   const results = items.map(fn);
//   return {
//     html: results.map(r => r.html).join(''),
//     onMount: () => {
//       const cleanups = results.map(r => r.onMount?.()).filter(Boolean);
//       return () => cleanups.forEach(c => c?.());
//     }
//   };
//}

// Usage: html`${map(users, user => html`<li>${user.name}</li>`)}`

// export function when(condition: boolean, template: () => TemplateResult): TemplateResult {
//   return condition ? template() : { html: '', onMount: () => {} };
// }

// Usage: html`${when(isLoggedIn, () => html`<Dashboard />`)}`

/*
import { h } from "./h.js";
import { html } from "./template.js";
import { Component1 } from "./Component1.js";
import { Component2 } from "./Component2.js";

export const HomePage: Component = {
  render: () => html`
    <div>
      <h1>Welcome!</h1>
      <section class="widgets">
        ${h(Component1)}
        ${h(Component2)}
      </section>
    </div>
  `
};

const counter = new NanoUI.signal(0);

const route = {
  path: '/counter',
  component: {
    render: () => ({
      html: `
        <h1>Count: {{ count }}</h1>
        <button @click="increment">+</button>
        <input v-model="count" type="number">
      `,
      count: counter,
      setCount: (v) => counter.value = v,
      increment: () => counter.value++
    })
  }
};


// And a child component
export const Component1 = {
  render: () => html`
    <button>Click me</button>
  `
};

You can even parameterize:

export const Greet = {
  render: (_, __, { name }) => html`<span>Hello, ${name}!</span>`
};
// In parent:
html`${h(Greet, { name: "Alice" })}`

*/