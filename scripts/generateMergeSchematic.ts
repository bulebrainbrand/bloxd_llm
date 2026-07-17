/// <reference types="@types/node" />

import {
  splitBloxdschem,
  writeBloxdschem,
  objectSchmeticToAvroSchematic,
  type Schematic,
  splitSchematicByAxis,
} from "@bloxdjs/schematic";
import data from "../tokenizer.json" with { type: "json" };
import { calcMergePositionByStr } from "../src/memory/token.ts";
import { writeFileSync } from "node:fs";
const schematic: Schematic = {
  name: "merge",
  blockdatas: [],
  chunks: [{ pos: [0, 0, 0], blocks: Array(32 * 32 * 32).fill(1510) }],
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
const splited = splitSchematicByAxis(schematic, 2, "x");
for (const [i, schem] of splited.entries()) {
  console.log(schem.chunks[0].blocks.length);
  writeFileSync(
    `./schematic/merge${i + 1}.json`,
    JSON.stringify(schem, undefined, 2),
  );
  const result = writeBloxdschem(schem);
  writeFileSync(`./schematic/merge${i + 1}.bloxdschem`, result);
}
