/** Uniform integer in [1, sides], using the browser's crypto RNG. */
export function rollDie(sides: number): number {
  const buf = new Uint32Array(1);
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x100000000 / sides) * sides;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return (buf[0] % sides) + 1;
}

export function uid(): string {
  return crypto.randomUUID();
}
