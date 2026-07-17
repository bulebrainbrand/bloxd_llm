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
import { BYTE_TO_CHAR } from "./byteObject.ts";
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
export function* calcTokenNumbersAndSetBlockData(
  str: string,
  writePos: Position,
): Generator<unknown, void, unknown> {
  const matchs = str.split(
    /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu,
  );
  const chars = matchs.map((str) =>
    encode(str)
      .map((num) => BYTE_TO_CHAR[num]!)
      .join(""),
  );
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
    result.push(tokenNumber);
    node = node.next;
  }
  yield* awaitWrite(writePos, JSON.stringify(result));
}

const encode = (string: string) => {
  const octets: number[] = [];
  const length = string.length;
  let i = 0;
  while (i < length) {
    var codePoint = string.codePointAt(i)!;
    var c = 0;
    var bits = 0;
    if (codePoint <= 0x0000007f) {
      c = 0;
      bits = 0x00;
    } else if (codePoint <= 0x000007ff) {
      c = 6;
      bits = 0xc0;
    } else if (codePoint <= 0x0000ffff) {
      c = 12;
      bits = 0xe0;
    } else if (codePoint <= 0x001fffff) {
      c = 18;
      bits = 0xf0;
    }
    octets.push(bits | (codePoint >> c));
    c -= 6;
    while (c >= 0) {
      octets.push(0x80 | ((codePoint >> c) & 0x3f));
      c -= 6;
    }
    i += codePoint >= 0x10000 ? 2 : 1;
  }
  return octets;
};
