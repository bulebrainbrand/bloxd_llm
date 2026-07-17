"use codeblock{testTokenize}";
import { awaitRead } from "../memory/base.ts";
import { calcTokenNumbersAndSetBlockData } from "../memory/token.ts";
import { queueGenerator } from "../tick.ts";
const [x, y, z] = thisPos;

function* testTokenize() {
  yield* calcTokenNumbersAndSetBlockData("the apple", [x, y + 2, z]);
  console.log(yield* awaitRead([x, y + 2, z]));
}

queueGenerator(testTokenize());
