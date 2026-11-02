// Makes an unguessable gallery code like "k7f2q9xw3p".
// No 0/o/1/l/i, so it's easy to read out loud at a party.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newGalleryId(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length)); // secure random numbers
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}