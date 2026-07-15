/// <reference types="@bloxdjs/api" />
"use worldcode";
let generators: Generator<unknown, unknown, unknown>[] = [];
let count = 0;
globalThis.tick = () => {
  if (generators.length === 0) return;
  while (true) {
    if (api.isNearInterrupt()) return;
    if (count >= generators.length) count = 0;
    generators[count].next();
  }
};

export const queueGenerator = (iter: Generator<unknown, unknown, unknown>) => {
  generators.push(iter);
};
