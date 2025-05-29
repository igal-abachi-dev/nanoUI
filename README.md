# nanoUI

**nanoUI** is a fast, minimal SPA utility library for modern small/simple web sites and landing pages

---
### **nano UI exports:**
```html
import {createRouter,signal,batch,computed,effect} from 'nanoui';
```

### **CDN import (Global UMD):**

```html
<script src="https://cdn.jsdelivr.net/npm/nanoui@1.0.0/dist/nanoui.umd.min.js"></script>
<script>
  NanoUI.greet('World');
</script>
```

### **CDN import (ESM Module):**

```html
<script type="module">
  import { greet } from 'https://cdn.jsdelivr.net/npm/nanoui@1.0.0/dist/nanoui.esm.js';
  greet('World');
</script>
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