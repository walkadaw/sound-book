// A type alias rather than an interface: Trystero only sends values assignable to its JSON type.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type HostProof = { key: string; signature: string };

/** The presentation's key: the room id is its fingerprint, and only the presentation can sign with it. */
export interface HostKey {
  roomId: string;
  prove(nonce: string, peerId: string): Promise<HostProof>;
}

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGNATURE = { name: 'ECDSA', hash: 'SHA-256' };
// 128 bits of the hash: as hard to guess as a random room id of that length
const FINGERPRINT_BYTES = 16;

/**
 * Everyone who sees the QR code on the screen gets the room id, so a secret in it would prove nothing. The id is
 * the fingerprint of a public key instead, and the presentation proves it holds the private one.
 */
export async function createHostKey(): Promise<HostKey> {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(ALGORITHM, false, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
  const key = toBase64Url(raw);

  return {
    roomId: await fingerprint(raw),
    prove: async (nonce, peerId) => {
      const signature = await crypto.subtle.sign(SIGNATURE, privateKey, challenge(nonce, peerId));

      return { key, signature: toBase64Url(new Uint8Array(signature)) };
    },
  };
}

/**
 * Checks that the answer to this device's challenge comes from the presentation of the room. The signature covers
 * the id of the device that asked, so another peer cannot pass the presentation's answer to its own challenge on.
 */
export async function verifyHostProof(
  roomId: string,
  nonce: string,
  selfId: string,
  proof: HostProof,
): Promise<boolean> {
  try {
    const raw = fromBase64Url(proof.key);

    if ((await fingerprint(raw)) !== roomId) {
      return false;
    }

    const publicKey = await crypto.subtle.importKey('raw', raw, ALGORITHM, false, ['verify']);

    return await crypto.subtle.verify(SIGNATURE, publicKey, fromBase64Url(proof.signature), challenge(nonce, selfId));
  } catch {
    // a proof that is not even well formed
    return false;
  }
}

export function newNonce(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

async function fingerprint(raw: Uint8Array<ArrayBuffer>): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));

  return toBase64Url(hash.slice(0, FINGERPRINT_BYTES));
}

function challenge(nonce: string, peerId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${nonce}:${peerId}`);
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
