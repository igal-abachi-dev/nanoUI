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
  root.querySelectorAll<HTMLElement>("[x-show]").forEach((el) => {
    const expr = el.getAttribute("x-show")!;
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

  // Mustache {{ expr }} with dot notation
  root.querySelectorAll("*").forEach((el) => {
    el.innerHTML = el.innerHTML.replace(/{{\s*([\w\d_.]+)\s*}}/g, (_, expr) => {
      const val = getVal(ctx, expr);
      return typeof val === "function" ? val() : val ?? "";
    });
  });
}

// Utility: safely resolve dot notation (e.g., "user.name.first")
function getVal(ctx: Record<string, any>, expr: string) {
  return expr
    .split(".")
    .reduce(
      (acc: any, key: string) =>
        (typeof acc === "function" ? acc() : acc)?.[key],
      ctx
    );
}
