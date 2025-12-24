/**
 * Crypto Module
 *
 * Client-side cryptography for MoneyFlow:
 * - BIP39 seed phrase generation
 * - Ed25519/X25519 keypair derivation
 * - XChaCha20-Poly1305 encryption
 * - X25519 key wrapping
 * - Ed25519 request signing
 */

// Seed phrase utilities
export {
  generateSeedPhrase,
  validateSeedPhrase,
  mnemonicToMasterSeed,
  normalizeMnemonic,
  splitMnemonic,
  joinMnemonic,
} from "./seed";

// Keypair derivation
export {
  initCrypto,
  deriveKeysFromSeed,
  publicKeyToBase64,
  base64ToPublicKey,
  privateKeyToBase64,
  base64ToPrivateKey,
  DOMAIN_ED25519_SIGNING,
  DOMAIN_X25519_ENCRYPTION,
  type SigningKeypair,
  type EncryptionKeypair,
  type DerivedKeys,
} from "./keypair";

// Identity management
export {
  createIdentity,
  unlockWithSeed,
  computePubkeyHash,
  type NewIdentity,
  type UnlockedIdentity,
} from "./identity";

// Session storage
export {
  storeSession,
  getSession,
  hasSession,
  clearSession,
  getSessionPubkeyHash,
  getSessionPublicKey,
  getSessionSecretKey,
  getSessionEncPublicKey,
  getSessionEncSecretKey,
  type SessionData,
} from "./session";

// Symmetric encryption
export {
  generateVaultKey,
  encrypt,
  decrypt,
  encryptForStorage,
  decryptFromStorage,
  encryptString,
  decryptString,
  encryptJSON,
  decryptJSON,
  NONCE_BYTES,
  KEY_BYTES,
} from "./encryption";

// Asymmetric key wrapping
export {
  wrapKey,
  unwrapKey,
  wrapKeyToBase64,
  unwrapKeyFromBase64,
  sealKey,
  unsealKey,
  sealKeyToBase64,
  unsealKeyFromBase64,
} from "./keywrap";

// Request signing
export {
  signRequest,
  verifyRequest,
  signData,
  verifySignature,
  signString,
  verifyStringSignature,
  type SignedRequestHeaders,
} from "./signing";
