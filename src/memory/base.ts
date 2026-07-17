"use worldcode";
import type { Position } from "../types.ts";

export const writeData = (pos: Position, data: string) => {
  api.setBlockData(...pos, { persisted: { shared: { text: data } } });
};

export const readData = (pos: Position): string | undefined => {
  return api.getBlockData(...pos)?.persisted?.shared?.text;
};
export function* awaitLoad(pos: Position) {
  while (!api.isBlockInLoadedChunk(...pos)) yield api.getBlock(pos);
}

export function* transactionWrite(
  pos: Position,
  factory: (arg: string | undefined) => string,
): Generator<string, void, unknown> {
  const value = yield* awaitRead(pos);
  const result = factory(value);
  // alrealy loaded chunk, so i can write instantly
  writeData(pos, result);
}

export function* awaitRead(pos: Position) {
  yield* awaitLoad(pos);
  return readData(pos);
}

export function* awaitWrite(pos: Position, data: string) {
  yield* awaitLoad(pos);
  writeData(pos, data);
}

const EVERY_LOAD_CHUNK: Position[] = [
  [32, 32, 32],
  [32, 64, 32],
];

export const loadChunks = () => {
  for (const pos of EVERY_LOAD_CHUNK) {
    if (api.isBlockInLoadedChunk(...pos)) api.getBlock(pos);
  }
};
