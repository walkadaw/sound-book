import { createHostKey, newNonce, verifyHostProof } from './host-key';

describe('host key', () => {
  it('should prove the presentation to the device that asked, and to no other', async () => {
    const key = await createHostKey();
    const nonce = newNonce();
    const proof = await key.prove(nonce, 'phone');

    expect(await verifyHostProof(key.roomId, nonce, 'phone', proof)).toBe(true);
    // passed on to another device, or to another challenge
    expect(await verifyHostProof(key.roomId, nonce, 'stranger', proof)).toBe(false);
    expect(await verifyHostProof(key.roomId, newNonce(), 'phone', proof)).toBe(false);
  });

  it('should not take the key of another room, or a proof that is not one', async () => {
    const [key, other] = await Promise.all([createHostKey(), createHostKey()]);
    const nonce = newNonce();
    const foreign = await other.prove(nonce, 'phone');

    expect(await verifyHostProof(key.roomId, nonce, 'phone', foreign)).toBe(false);
    expect(await verifyHostProof(key.roomId, nonce, 'phone', { key: '%%', signature: '' })).toBe(false);
  });

  it('should make a room id short enough for the QR code and safe in a link', async () => {
    const { roomId } = await createHostKey();

    expect(roomId).toMatch(/^[\w-]{22}$/);
  });
});
