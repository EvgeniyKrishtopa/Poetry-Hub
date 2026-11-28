import { createHmac } from "node:crypto";

// RFC 6238 with the authenticator-app defaults: SHA-1, a 30 second step, six digits.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_BITS = 5;
const BYTE_BITS = 8;
const STEP_SECONDS = 30;
const MS_IN_SECOND = 1000;
const COUNTER_BYTES = 8;
const CODE_DIGITS = 6;
const OFFSET_MASK = 0x0f;
const SIGN_MASK = 0x7fffffff;

function decodeBase32(secret: string): Buffer {
  const bits = [...secret]
    .map((character) => BASE32_ALPHABET.indexOf(character).toString(2).padStart(BASE32_BITS, "0"))
    .join("");
  const byteCount = Math.floor(bits.length / BYTE_BITS);
  const bytes = Array.from({ length: byteCount }, (_, index) =>
    Number.parseInt(bits.slice(index * BYTE_BITS, (index + 1) * BYTE_BITS), 2),
  );
  return Buffer.from(bytes);
}

/** The code an authenticator app would show for `secret` right now. */
export function currentTotpCode(secret: string): string {
  const step = Math.floor(Date.now() / MS_IN_SECOND / STEP_SECONDS);
  const counter = Buffer.alloc(COUNTER_BYTES);
  counter.writeBigUInt64BE(BigInt(step));
  const key = decodeBase32(secret);
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest.readUInt8(digest.length - 1) & OFFSET_MASK;
  const number = digest.readUInt32BE(offset) & SIGN_MASK;
  return String(number % 10 ** CODE_DIGITS).padStart(CODE_DIGITS, "0");
}
