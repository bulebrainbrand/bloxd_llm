"use worldcode";
import { awaitRead, awaitWrite } from "./base.ts";
import { type Position } from "../types.ts";
import { xorHash } from "../utils.ts";
import {
  MERGE_CHUNK_X,
  MERGE_CHUNK_Y,
  MERGE_CHUNK_Z,
  TOKEN_CHUNK_X,
  TOKEN_CHUNK_Y,
  TOKEN_CHUNK_Z,
} from "../constants.ts";
export const calcTokenPositionByStr = (str: string): Position => {
  const hash = xorHash(str);
  return [
    (hash & 31) + TOKEN_CHUNK_X,
    ((hash >>> 5) & 31) + TOKEN_CHUNK_Y,
    ((hash >>> 10) & 31) + TOKEN_CHUNK_Z,
  ];
};

export const calcMergePositionByStr = (str: string): Position => {
  const hash = xorHash(str);
  return [
    (hash & 31) + MERGE_CHUNK_X,
    ((hash >>> 5) & 31) + MERGE_CHUNK_Y,
    ((hash >>> 10) & 31) + MERGE_CHUNK_Z,
  ];
};
/**
 *
 * @param str
 * @returns
 */
function* readToken(
  str: string,
): Generator<unknown, number | undefined, unknown> {
  const result = JSON.parse(yield* awaitRead(calcTokenPositionByStr(str)));
  return (result as { [str]?: number })?.[str];
}

function* readMerge(
  str: string,
): Generator<unknown, number | undefined, unknown> {
  const result = JSON.parse(yield* awaitRead(calcMergePositionByStr(str)));
  return (result as { [str]?: number })?.[str];
}

class TokenNode {
  value: string;
  prev: TokenNode | null = null;
  next: TokenNode | null = null;

  constructor(value: string) {
    this.value = value;
  }
}

/**
 *
 * @param str
 * @param writePos - number[]として書き込む
 */
export function* setTokenNumbers(
  str: string,
  writePos: Position,
): Generator<unknown, void, unknown> {
  const words = str.replaceAll(" ", "Ġ");
  const chars = Array.from(words);
  if (chars.length === 0) {
    yield* awaitWrite(writePos, "[]");
    return;
  }
  const head = new TokenNode(chars[0]);
  let current = head;
  for (let i = 1; i < chars.length; i++) {
    const node = new TokenNode(chars[i]);
    current.next = node;
    node.prev = current;
    current = node;
  }
  while (true) {
    let bestRank = Infinity;
    let bestLeft: TokenNode | null = null;

    let node: TokenNode | null = head;
    while (node && node.next) {
      const pair = node.value + " " + node.next.value;
      const rank = yield* readMerge(pair);

      if (rank !== undefined && rank < bestRank) {
        bestRank = rank;
        bestLeft = node;
      }
      node = node.next;
    }
    if (bestLeft === null) {
      break;
    }
    const right = bestLeft.next!;
    bestLeft.value = bestLeft.value + right.value;
    bestLeft.next = right.next;
    if (right.next) {
      right.next.prev = bestLeft;
    }
  }
  const result: number[] = [];
  let node: TokenNode | null = head;
  while (node) {
    const tokenNumber = yield* readToken(node.value);
    if (tokenNumber === undefined)
      throw new TypeError(
        `unexpected token key: ${node.value}. this does not include vocab! maybe wrong merger or register token vocab`,
      );
    result.push();
    node = node.next;
  }
  yield* awaitWrite(writePos, JSON.stringify(result));
}
