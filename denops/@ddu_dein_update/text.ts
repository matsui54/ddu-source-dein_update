const textDecoder = new TextDecoder();

export function decode(arr: BufferSource): string {
  return textDecoder.decode(arr);
}
