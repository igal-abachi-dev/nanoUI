function capitalize(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

//missing functionality , shared layout component between routes , nested components , nested routes

//todo , mount cleanup weakmap registry , return code , instead of v-model usage
//for render route

export function initDirectives(root: Element, ctx: Record<string, any>) {
  // v-model
  root.querySelectorAll<HTMLInputElement>("[v-model]").forEach((input) => {
    const key = input.getAttribute("v-model")!;
    if (!ctx[key]) return;
    input.value = ctx[key]?.();
    input.addEventListener("input", (e) =>
      ctx[`set${capitalize(key)}`]?.((e.target as HTMLInputElement).value)
    );
    ctx[key].subscribe?.((v: any) => {
      input.value = v;
    });
  });
  // v-show
  root.querySelectorAll<HTMLElement>("[v-show]").forEach((el) => {
    const expr = el.getAttribute("v-show")!;
    const update = () => {
      el.style.display = ctx[expr]?.() ? "" : "none";
    };
    ctx[expr]?.subscribe?.(update);
    update();
  });
  // @event
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("@")) {
        const event = attr.name.slice(1);
        const handlerName = attr.value.replace("()", "");
        el.addEventListener(event, ctx[handlerName].bind(ctx));
      }
    });
  });
  // Mustache {{ expr }}
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/{{\s*([\w\d_]+)\s*}}/g, (_, expr) => {
      if (typeof ctx[expr] === "function") return ctx[expr]();
      if (ctx[expr] !== undefined) return ctx[expr];
      return "";
    });
  });
}
