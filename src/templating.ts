// Component interface
interface Component {
  //data from fetch loader , action is after form submit , params are route/inline component params
  render: (data?: any, action?: any, params?: Record<string, any>) => TemplateResult;
}

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

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

// template.js
export function html(strings: TemplateStringsArray, ...values: Array<string | TemplateResult | null | undefined>): TemplateResult {
  let out = "";
  const mounts: Array<() => (() => void) | void> = [];

  strings.forEach((str: string, i: number) => {
    out += str;
    if (i < values.length) {
      const v = values[i];
      if (v && typeof (v as TemplateResult).html === "string") {
        // v is a { html, onMount } object
        out += (v as TemplateResult).html;
        if (typeof (v as TemplateResult).onMount === "function") {
          mounts.push((v as TemplateResult).onMount!);
        }
      } else if (typeof v === "string") {
        // Escape plain strings for safety
        out += escapeHtml(v);
      } else {
        out += String(v ?? "");
      }
    }
  });

  return {
    html: out,
    onMount: () => {
      const cleans = mounts.map(fn => fn());
      return () => cleans.forEach(c => c && c());
    }
  };
}

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