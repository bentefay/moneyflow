/**
 * WebAuthn PRF extension types.
 *
 * `@simplewebauthn` v13 inlines a trimmed copy of the DOM WebAuthn types into each package, and
 * that copy predates the PRF extension. Because it is inlined, the ambient `lib.dom.d.ts`
 * definitions do not apply, so the extension has to be declared against each package separately.
 *
 * Shapes follow W3C WebAuthn Level 3 §10.1.4 exactly: `first` required, `second` optional, and a
 * 32-byte result surfaced only to client-side script.
 */

interface WebAuthnPRFValues {
    first: BufferSource;
    second?: BufferSource;
}

interface WebAuthnPRFInputs {
    eval?: WebAuthnPRFValues;
    evalByCredential?: Record<string, WebAuthnPRFValues>;
}

interface WebAuthnPRFOutputs {
    enabled?: boolean;
    results?: { first: ArrayBuffer; second?: ArrayBuffer };
}

declare module "@simplewebauthn/server" {
    interface AuthenticationExtensionsClientInputs {
        prf?: WebAuthnPRFInputs;
    }
    interface AuthenticationExtensionsClientOutputs {
        prf?: WebAuthnPRFOutputs;
        /**
         * Client extension outputs are an open map keyed by extension identifier, so an authenticator
         * may return entries this build has no type for. Declaring that keeps a real ceremony
         * response assignable wherever the extension bag is handled generically.
         */
        [extensionIdentifier: string]: unknown;
    }
}

declare module "@simplewebauthn/browser" {
    interface AuthenticationExtensionsClientInputs {
        prf?: WebAuthnPRFInputs;
    }
    interface AuthenticationExtensionsClientOutputs {
        prf?: WebAuthnPRFOutputs;
        [extensionIdentifier: string]: unknown;
    }
}

export {};
