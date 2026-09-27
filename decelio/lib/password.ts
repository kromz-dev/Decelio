import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = (await scrypt(password, salt, KEY_BYTES)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltHex || !keyHex || !/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(keyHex)) {
    return false;
  }
  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_BYTES) return false;
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), KEY_BYTES)) as Buffer;
  return timingSafeEqual(actual, expected);
}

/**
 * Hash factice, calculé une seule fois par processus (mémoïsé), au même
 * format que `hashPassword`. Sert à égaliser le temps de réponse de la
 * connexion : quand aucun compte ou aucun mot de passe ne correspond, on
 * vérifie quand même contre ce hash plutôt que de répondre tout de suite,
 * pour qu'un e-mail inconnu ne se distingue pas d'un mot de passe erroné par
 * le temps de calcul de scrypt.
 */
let dummyPasswordHash: Promise<string> | null = null;

export function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHash) {
    dummyPasswordHash = hashPassword("hash-factice-egalisation-du-temps-de-reponse");
  }
  return dummyPasswordHash;
}
