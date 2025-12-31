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
	NONCE_BYTES,
} from "./encryption";
// Identity management
export {
	computePubkeyHash,
	createIdentity,
	type NewIdentity,
	storeIdentitySession,
	type UnlockedIdentity,
	unlockWithSeed,
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
	type SigningKeypair,
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
	wrapKeyToBase64,
} from "./keywrap";
// Vault re-keying
export {
	performCompleteRekey,
	type RekeyResult,
	type RemainingMember,
	reencryptSnapshot,
	rekeyVault,
} from "./rekey";
// Seed phrase utilities
export {
	generateSeedPhrase,
	joinMnemonic,
	mnemonicToMasterSeed,
	normalizeMnemonic,
	splitMnemonic,
	validateSeedPhrase,
} from "./seed";
// Session storage
export {
	clearSession,
	getSession,
	getSessionEncPublicKey,
	getSessionEncSecretKey,
	getSessionPubkeyHash,
	getSessionPublicKey,
	getSessionSecretKey,
	hasSession,
	type SessionData,
	storeSession,
} from "./session";
// Request signing
export {
	type SignedRequestHeaders,
	signData,
	signRequest,
	signString,
	verifyRequest,
	verifySignature,
	verifyStringSignature,
} from "./signing";
