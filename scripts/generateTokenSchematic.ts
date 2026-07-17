/// <reference types="@types/node" />

import {
  writeBloxdschem,
  type Schematic,
  splitSchematicByAxis,
  calcBlocksIndex,
} from "@bloxdjs/schematic";
import data from "../tokenizer.json" with { type: "json" };
import {
  calcMergePositionByStr,
  calcTokenPositionByStr,
} from "../src/memory/token.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  TOKEN_CHUNK_X,
  TOKEN_CHUNK_Y,
  TOKEN_CHUNK_Z,
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
  Record<string, number>
> = new Map();
const pushBlockData = (
  x: number,
  y: number,
  z: number,
  str: string,
  num: number,
) => {
  schematic.chunks[0].blocks[calcBlocksIndex(x, y, z)] = 1510;
  const id = `${x}|${y}|${z}` as const;
  if (blockDatas.has(id)) {
    const object = blockDatas.get(id)!;
    object[str] = num;
    blockDatas.set(id, object);
  } else {
    blockDatas.set(id, { [str]: num });
  }
};
for (const [i, text] of Object.entries(data.model.vocab)) {
  const [x, y, z] = calcTokenPositionByStr(i);
  pushBlockData(
    x - TOKEN_CHUNK_X,
    y - TOKEN_CHUNK_Y,
    z - TOKEN_CHUNK_Z,
    i,
    text,
  );
}

for (const [key, object] of blockDatas) {
  const [x, y, z] = key.split("|").map(Number) as [number, number, number];
  schematic.blockdatas.push({
    blockX: x,
    blockY: y,
    blockZ: z,
    blockdataStr: JSON.stringify({
      persisted: {
        shared: {
          text: JSON.stringify(object),
          uncensoredText: JSON.stringify(object),
          textSize: 0,
        },
        author: "ZlzvebAKbQPWuyiA8_08q",
        builder: "ZlzvebAKbQPWuyiA8_08q",
        builderCanEditCode: true,
      },
    }),
  });
}

schematic.blockdatas.sort((a, b) => a.blockX - b.blockX);
schematic.blockdatas.sort((a, b) => a.blockY - b.blockY);
schematic.blockdatas.sort((a, b) => a.blockZ - b.blockZ);
const splited = splitSchematicByAxis(schematic, 4, "x");
mkdirSync("./schematic/token", { recursive: true });
for (const [i, schem] of splited.entries()) {
  writeFileSync(
    `./schematic/token/${i + 1}.json`,
    JSON.stringify(schem, undefined, 2),
  );
  const result = writeBloxdschem(schem);
  writeFileSync(`./schematic/token/${i + 1}.bloxdschem`, result);
}
