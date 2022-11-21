// Adapted from https://github.com/feross/buffer

import { decode, encode, fromUint8Array, toUint8Array } from "js-base64";

import { bytes32 } from "./@types/basic";

function checkInt(buf: Uint8Array, value: number, offset: number, ext: number, max: number, min: number): void {
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
  if (offset + ext > buf.length) throw new RangeError("Index out of range");
}

export function writeUIntLE(
  buf: Uint8Array,
  value: number,
  offset: number,
  byteLength: number,
  noAssert?: boolean
): Uint8Array {
  value = +value;
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(buf, value, offset, byteLength, maxBytes, 0);
  }

  let mul = 1;
  let i = 0;
  buf[offset] = value & 0xff;
  while (++i < byteLength && (mul *= 0x100)) {
    buf[offset + i] = (value / mul) & 0xff;
  }

  return buf;
}

function checkOffset(offset: number, ext: number, length: number): void {
  if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
  if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
}

export function readUIntLE(buf: Uint8Array, offset: number, byteLength: number, noAssert?: boolean): number {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, buf.length);

  let val = buf[offset];
  let mul = 1;
  let i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += buf[offset + i] * mul;
  }

  return val;
}

// Serializes input parameters to a base64 string for exposure through QR code (used by WakuPairing)
export function toQr(
  applicationName: string,
  applicationVersion: string,
  shardId: string,
  ephemeralKey: bytes32,
  committedStaticKey: bytes32
): string {
  let qr = encode(applicationName) + ":";
  qr += encode(applicationVersion) + ":";
  qr += encode(shardId) + ":";
  qr += fromUint8Array(ephemeralKey) + ":";
  qr += fromUint8Array(committedStaticKey);

  return qr;
}

// Deserializes input string in base64 to the corresponding (applicationName, applicationVersion, shardId, ephemeralKey, committedStaticKey)
export function fromQr(qr: string): {
  applicationName: string;
  applicationVersion: string;
  shardId: string;
  ephemeralKey: bytes32;
  committedStaticKey: bytes32;
} {
  const values = qr.split(":");

  if (values.length != 5) throw new Error("invalid qr string");

  const applicationName = decode(values[0]);
  const applicationVersion = decode(values[1]);
  const shardId = decode(values[2]);
  const ephemeralKey = toUint8Array(values[3]);
  const committedStaticKey = toUint8Array(values[4]);

  return { applicationName, applicationVersion, shardId, ephemeralKey, committedStaticKey };
}
