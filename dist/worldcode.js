"use strict";
"use worldcode";
(() => {
  // .bloxd/src/tick.ts
  var generators = [];
  var count = 0;
  globalThis.tick = () => {
    if (generators.length === 0) return;
    while (true) {
      if (api.isNearInterrupt()) return;
      if (count >= generators.length) count = 0;
      generators[count].next();
    }
  };

  // .bloxd/src/memory/base.ts
  var writeData = (pos, data) => {
    api.setBlockData(...pos, {
      persisted: {
        shared: {
          data
        }
      }
    });
  };
  var readData = (pos) => {
    return api.getBlockData(...pos)?.persisted?.shared?.data;
  };
  function* awaitLoad(pos) {
    while (!api.isBlockInLoadedChunk(...pos)) yield api.getBlock(pos);
  }
  function* awaitRead(pos) {
    yield* awaitLoad(pos);
    return readData(pos);
  }
  globalThis.__b_m__["0"]["awaitRead"] = awaitRead;
  function* awaitWrite(pos, data) {
    yield* awaitLoad(pos);
    writeData(pos, data);
  }

  // .bloxd/src/utils.ts
  function xorHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  // .bloxd/src/memory/token.ts
  var calcTokenPositionByStr = (str) => {
    const hash = xorHash(str);
    return [(hash & 31) + 96, (hash >>> 5 & 31) + 32, (hash >>> 10 & 31) + 96];
  };
  var calcMergePositionByStr = (str) => {
    const hash = xorHash(str);
    return [(hash & 31) + 96, (hash >>> 5 & 31) + 64, (hash >>> 10 & 31) + 96];
  };
  function* readToken(str) {
    const result = yield* awaitRead(calcTokenPositionByStr(str));
    return result?.[str];
  }
  function* readMerge(str) {
    const result = yield* awaitRead(calcMergePositionByStr(str));
    return result?.[str];
  }
  var TokenNode = class {
    value;
    prev = null;
    next = null;
    constructor(value) {
      this.value = value;
    }
  };
  function* setTokenNumbers(str, writePos) {
    const words = str.replaceAll(" ", "\u0120");
    const chars = Array.from(words);
    if (chars.length === 0) {
      yield* awaitWrite(writePos, []);
      return;
    }
    const head = new TokenNode(chars[0]);
    let current = head;
    for (let i = 1; i < chars.length; i++) {
      const node2 = new TokenNode(chars[i]);
      current.next = node2;
      node2.prev = current;
      current = node2;
    }
    while (true) {
      let bestRank = Infinity;
      let bestLeft = null;
      let node2 = head;
      while (node2 && node2.next) {
        const pair = node2.value + " " + node2.next.value;
        const rank = yield* readMerge(pair);
        if (rank !== void 0 && rank < bestRank) {
          bestRank = rank;
          bestLeft = node2;
        }
        node2 = node2.next;
      }
      if (bestLeft === null) {
        break;
      }
      const right = bestLeft.next;
      bestLeft.value = bestLeft.value + right.value;
      bestLeft.next = right.next;
      if (right.next) {
        right.next.prev = bestLeft;
      }
    }
    const result = [];
    let node = head;
    while (node) {
      const tokenNumber = yield* readToken(node.value);
      if (tokenNumber === void 0) throw new TypeError(`unexpected token key: ${node.value}. this does not include vocab! maybe wrong merger or register token vocab`);
      result.push();
      node = node.next;
    }
    yield* awaitWrite(writePos, result);
  }
  globalThis.__b_m__["1"]["setTokenNumbers"] = setTokenNumbers;
})();
