"use worldcode";
import { awaitRead, awaitWrite, readData, transactionWrite } from "./base";
import { Position } from "../types";
import { xorHash } from "../utils";
export const calcTokenPositionByStr = (str: string): Position => {
  const hash = xorHash(str);
  return [
    (hash & 31) + 96,
    ((hash >>> 5) & 31) + 32,
    ((hash >>> 10) & 31) + 96,
  ];
};

export const calcMergePositionByStr = (str: string): Position => {
  const hash = xorHash(str);
  return [
    (hash & 31) + 96,
    ((hash >>> 5) & 31) + 64,
    ((hash >>> 10) & 31) + 96,
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
  const result = yield* awaitRead(calcTokenPositionByStr(str));
  return (result as { [str]?: number })?.[str];
}
function* writeToken(str: string, num: number) {
  yield* transactionWrite(calcTokenPositionByStr(str), (arg) => {
    arg ??= {};
    (arg as Record<string, number>)[str] = num;
    return arg;
  });
}

function* writeMerge(str: string, num: number) {
  yield* transactionWrite(calcMergePositionByStr(str), (arg) => {
    arg ??= {};
    (arg as Record<string, number>)[str] = num;
    return arg;
  });
}
function* readMerge(
  str: string,
): Generator<unknown, number | undefined, unknown> {
  const result = yield* awaitRead(calcMergePositionByStr(str));
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
    yield* awaitWrite(writePos, []);
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
  yield* awaitWrite(writePos, result);
}
