"use worldcode";
import { awaitLoad, awaitWrite } from "./base.ts";
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
type SlotPosition = [number, number, number, number];
function* readData(x: number, y: number, z: number, slot: number) {
  yield* awaitLoad([x, y, z]);
  const blockData: { persisted: { chestStr: string } } | undefined =
    api.getBlockData(x, y, z);
  if (blockData?.persisted.chestStr) {
    const parsed: {
      name: string;
      amount: number;
      attributes: { customAttributes: any };
    }[] = JSON.parse(blockData.persisted.chestStr);
    return parsed[slot].attributes.customAttributes;
  }
}
export const calcTokenPositionByStr = (str: string): SlotPosition => {
  const hash = xorHash(str);
  return [
    (hash & 15) + TOKEN_CHUNK_X,
    ((hash >>> 4) & 15) + TOKEN_CHUNK_Y,
    ((hash >>> 8) & 15) + TOKEN_CHUNK_Z,
    (hash >>> 12) & 31,
  ];
};

export const calcMergePositionByStr = (str: string): SlotPosition => {
  const hash = xorHash(str);
  return [
    (hash & 15) + MERGE_CHUNK_X,
    ((hash >>> 4) & 15) + MERGE_CHUNK_Y,
    ((hash >>> 8) & 15) + MERGE_CHUNK_Z,
    (hash >>> 12) & 31,
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
  const result = yield* readData(...calcTokenPositionByStr(str));
  return result?.[str];
}

function* readMerge(
  str: string,
): Generator<unknown, number | undefined, unknown> {
  const result = yield* readData(...calcMergePositionByStr(str));
  return result?.[str];
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
  const matchs = str.match(
    /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu,
  );
  if (matchs === null) throw new TypeError(`${str} is not parsable`);
  const words = matchs.map((str) =>
    encode(str)
      .map((num) => BYTE_TO_CHAR[num]!)
      .join(""),
  );
  if (words.length === 0) {
    yield* awaitWrite(writePos, "[]");
    return;
  }
  const tokens: number[] = [];
  for (const chars of words) {
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
    let node: TokenNode | null = head;
    while (node) {
      const tokenNumber = yield* readToken(node.value);
      if (tokenNumber === undefined)
        throw new TypeError(
          `unexpected token key: ${node.value}. this does not include vocab! maybe wrong merger or register token vocab`,
        );
      tokens.push(tokenNumber);
      node = node.next;
    }
  }
  yield* awaitWrite(writePos, JSON.stringify(tokens));
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
