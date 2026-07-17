/// <reference types="@bloxdjs/api" />
"use worldcode";
let generators: Generator<unknown, unknown, unknown>[] = [];
let count = 0;
globalThis.tick = () => {
  try {
    if (generators.length === 0) return;
    while (true) {
      if (api.isNearInterrupt()) return;
      if (count >= generators.length) count = 0;
      const result = generators[count].next();
      if (result.done) {
        generators.splice(count, 1);
        if (generators.length === 0) break;
      }
    }
  } catch (error) {
    console.log((error as any)?.stack);
    throw error;
  }
};

export const queueGenerator = (iter: Generator<unknown, unknown, unknown>) => {
  generators.push(iter);
};
