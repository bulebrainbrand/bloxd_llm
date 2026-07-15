"use worldcode";
export function xorHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
  }
  return hash >>> 0; // 符号なしの32bit整数に変換
}
