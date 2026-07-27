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

// Symmetric encryption
export {
    decrypt,
    decryptFromStorage,
    decryptJSON,
    decryptString,
    encrypt,
    encryptForStorage,
    encryptJSON,
    encryptString,
    generateVaultKey,
    KEY_BYTES,
    NONCE_BYTES
} from "./encryption";
// Identity management
export {
    computePubkeyHash,
    createIdentity,
    type NewIdentity,
    storeIdentitySession,
    type UnlockedIdentity,
    unlockWithSeed
} from "./identity";
// Keypair derivation
export {
    base64ToPrivateKey,
    base64ToPublicKey,
    type DerivedKeys,
    DOMAIN_ED25519_SIGNING,
    DOMAIN_X25519_ENCRYPTION,
    deriveKeysFromSeed,
    type EncryptionKeypair,
    initCrypto,
    privateKeyToBase64,
    publicKeyToBase64,
    type SigningKeypair
} from "./keypair";
// Asymmetric key wrapping
export {
    sealKey,
    sealKeyToBase64,
    unsealKey,
    unsealKeyFromBase64,
    unwrapKey,
    unwrapKeyFromBase64,
    wrapKey,
    wrapKeyToBase64
} from "./keywrap";
// Passkey ceremony helpers
export {
    browserSupportsPasskeys,
    type CeremonyResponse,
    extractPrfOutput,
    isPasskeySupportedResult,
    stripPrfResults
} from "./passkeyCeremony";
// Passkey PRF identity wrapping
export {
    deriveKeyEncryptionKey,
    PASSKEY_PRF_SALT,
    PASSKEY_WRAP_VERSION,
    PRF_OUTPUT_BYTES,
    unwrapMasterSecret,
    wrapMasterSecret,
    zeroize
} from "./passkeyWrap";
// Vault re-keying
export {
    performCompleteRekey,
    type RekeyResult,
    type RemainingMember,
    reencryptSnapshot,
    rekeyVault
} from "./rekey";
// Seed phrase utilities
export {
    generateSeedPhrase,
    joinMnemonic,
    mnemonicToMasterSeed,
    normalizeMnemonic,
    splitMnemonic,
    validateSeedPhrase
} from "./seed";
// Session storage
export {
    clearSession,
    getSession,
    getSessionEncPublicKey,
    getSessionEncSecretKey,
    getSessionPubkeyHash,
    getSessionSecretKey,
    hasSession,
    type SessionData,
    storeSession
} from "./session";
// Request signing
export {
    type SignedRequestHeaders,
    signData,
    signRequest,
    verifyRequest,
    verifySignature,
    verifyStringSignature
} from "./signing";
