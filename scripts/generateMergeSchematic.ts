/// <reference types="@types/node" />

import { writeBloxdschem, type Schematic } from "@bloxdjs/schematic";
import data from "../tokenizer.json" with { type: "json" };
import { calcMergePositionByStr } from "../src/memory/token.ts";
import { writeFileSync } from "node:fs";
const schematic: Schematic = {
  name: "merge",
  blockdatas: [],
  chunks: [{ pos: [0, 0, 0], blocks: Array(32 * 32 * 32).fill(3) }],
  size: [32, 32, 32],
  pos: [0, 0, 0],
};
const blockDatas: Map<
  `${number}|${number}|${number}`,
  Record<string, number>
> = new Map();
const pushBlockData = (
  x: number,
  y: number,
  z: number,
  str: string,
  num: number,
) => {
  const id = `${x}|${y}|${z}` as const;
  if (blockDatas.has(id)) {
    const object = blockDatas.get(id)!;
    object[str] = num;
    blockDatas.set(id, object);
  } else {
    blockDatas.set(id, { [str]: num });
  }
};
for (const [i, text] of data.model.merges.entries()) {
  const [x, y, z] = calcMergePositionByStr(text);
  pushBlockData(x - 96, y - 64, z - 96, text, i);
}

for (const [key, object] of blockDatas) {
  const [x, y, z] = key.split("|").map(Number) as [number, number, number];
  schematic.blockdatas.push({
    blockX: x,
    blockY: y,
    blockZ: z,
    blockdataStr: `{persisted:{shared:{data:${JSON.stringify(object)}}}}`,
  });
}

const result = writeBloxdschem(schematic);
writeFileSync("./schematic/merge.bloxdschem", result);
