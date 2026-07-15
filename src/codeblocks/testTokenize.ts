"use codeblock{testTokenize}";
import { awaitRead } from "../memory/base";
import { setTokenNumbers } from "../memory/token";
const [x, y, z] = thisPos;

function* testTokenize() {
  yield* setTokenNumbers("the apple", [x, y + 2, z]);
  console.log(yield* awaitRead([x, y + 2, z]));
}
