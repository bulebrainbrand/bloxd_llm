/// <reference types="@types/node" />

import {
  writeBloxdschem,
  type Schematic,
  splitSchematicByAxis,
  calcBlocksIndex,
} from "@bloxdjs/schematic";
import data from "../tokenizer.json" with { type: "json" };
import { calcMergePositionByStr } from "../src/memory/token.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  MERGE_CHUNK_X,
  MERGE_CHUNK_Y,
  MERGE_CHUNK_Z,
} from "../src/constants.ts";
const schematic: Schematic = {
  name: "merge",
  blockdatas: [],
  chunks: [{ pos: [0, 0, 0], blocks: Array(32 * 32 * 32).fill(0) }],
  size: [32, 32, 32],
  pos: [0, 0, 0],
};
const blockDatas: Map<
  `${number}|${number}|${number}`,
  (null | Record<string, number>)[]
> = new Map();
const pushBlockData = (
  x: number,
  y: number,
  z: number,
  slot: number,
  str: string,
  num: number,
) => {
  schematic.chunks[0].blocks[calcBlocksIndex(x, y, z)] = 204;
  const id = `${x}|${y}|${z}` as const;
  if (!blockDatas.has(id)) {
    const arr = new Array<null | Record<string, number>>(36).fill(null);
    arr[slot] = { [str]: num };
    blockDatas.set(id, arr);
    return;
  }
  const array = blockDatas.get(id)!;
  if (array[slot]) {
    array[slot][str] = num;
    blockDatas.set(id, array);
    return;
  }
  array[slot] = { [str]: num };
  blockDatas.set(id, array);
};
for (const [i, text] of data.model.merges.entries()) {
  const [x, y, z, slot] = calcMergePositionByStr(text);
  pushBlockData(
    x - MERGE_CHUNK_X,
    y - MERGE_CHUNK_Y,
    z - MERGE_CHUNK_Z,
    slot,
    text,
    i,
  );
}

for (const [key, arr] of blockDatas) {
  const [x, y, z] = key.split("|").map(Number) as [number, number, number];
  schematic.blockdatas.push({
    blockX: x,
    blockY: y,
    blockZ: z,
    blockdataStr: JSON.stringify({
      persisted: {
        chestStr: JSON.stringify(
          arr.map((obj) =>
            obj
              ? {
                  name: "Dirt",
                  amount: 1,
                  attributes: {
                    customAttributes: obj,
                  },
                }
              : null,
          ),
        ),
      },
    }),
  });
}

schematic.blockdatas.sort((a, b) => a.blockX - b.blockX);
schematic.blockdatas.sort((a, b) => a.blockY - b.blockY);
schematic.blockdatas.sort((a, b) => a.blockZ - b.blockZ);
const splited = splitSchematicByAxis(schematic, 4, "x");
mkdirSync("./schematic/merge", { recursive: true });
for (const [i, schem] of splited.entries()) {
  if (schem.blockdatas.length === 0) continue;
  writeFileSync(
    `./schematic/merge/${i + 1}.json`,
    JSON.stringify(schem, undefined, 2),
  );
  const result = writeBloxdschem(schem);
  writeFileSync(`./schematic/merge/${i + 1}.bloxdschem`, result);
}
