/**
 * usePasskey ceremony-failure contract
 *
 * Review-01 B-1 found that a passkey prompt the user never answers leaves the ceremony promise
 * pending forever, so the hook's `finally` never runs and the calling page stays busy with no
 * error. These tests pin the two properties that failure mode violated: every ceremony settles,
 * and the caller learns which credential was created so it can be rolled back.
 *
 * No real key material appears here. The PRF output is synthetic fill bytes and the master secret
 * is a fixed non-secret pattern.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    startRegistration: vi.fn(),
    startAuthentication: vi.fn(),
    cancelCeremony: vi.fn(),
    startRegistrationMutation: vi.fn(),
    finishRegistrationMutation: vi.fn(),
    startAuthenticationMutation: vi.fn(),
    finishAuthenticationMutation: vi.fn()
}));

vi.mock("@simplewebauthn/browser", () => ({
    startRegistration: mocks.startRegistration,
    startAuthentication: mocks.startAuthentication,
    bufferToBase64URLString: () => "Y2hhbGxlbmdl",
    WebAuthnAbortService: { cancelCeremony: mocks.cancelCeremony }
}));

vi.mock("@/lib/trpc", () => ({
    trpc: {
        passkey: {
            startRegistration: {
                useMutation: () => ({ mutateAsync: mocks.startRegistrationMutation })
            },
            finishRegistration: {
                useMutation: () => ({ mutateAsync: mocks.finishRegistrationMutation })
            },
            startAuthentication: {
                useMutation: () => ({ mutateAsync: mocks.startAuthenticationMutation })
            },
            finishAuthentication: {
                useMutation: () => ({ mutateAsync: mocks.finishAuthenticationMutation })
            }
        }
    }
}));

import { usePasskey } from "@/hooks/use-passkey";
import { PRF_OUTPUT_BYTES } from "@/lib/crypto/passkeyWrap";

const MASTER_SECRET_BYTES = 64;

function syntheticMasterSecret(): Uint8Array {
    return new Uint8Array(MASTER_SECRET_BYTES).fill(7);
}

function syntheticPrfOutput(): Uint8Array {
    return new Uint8Array(PRF_OUTPUT_BYTES).fill(9);
}

/** A ceremony response shaped like the browser's, carrying a synthetic PRF output. */
function ceremonyResponse(id: string) {
    return {
        id,
        rawId: id,
        type: "public-key",
        response: {},
        clientExtensionResults: {
            prf: { enabled: true, results: { first: syntheticPrfOutput() } }
        }
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.startRegistrationMutation.mockResolvedValue({
        challengeId: "challenge-id",
        options: {}
    });
    mocks.finishRegistrationMutation.mockResolvedValue({
        registered: true,
        credentialId: "credential-id"
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("usePasskey ceremony deadline", () => {
    it("gives up on a prompt the user never answers instead of staying busy forever", async () => {
        vi.useFakeTimers();

        // The exact failure review-01 reproduced: the browser promise simply never settles.
        mocks.startRegistration.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => usePasskey());

        let settled = false;
        act(() => {
            void result.current
                .registerPasskey(syntheticMasterSecret())
                .catch(() => {})
                .finally(() => {
                    settled = true;
                });
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(120_000);
        });

        expect(settled).toBe(true);
        expect(result.current.isBusy).toBe(false);
        expect(result.current.error).not.toBeNull();
    });

    it("aborts the in-flight ceremony through the library rather than abandoning it", async () => {
        vi.useFakeTimers();
        mocks.startRegistration.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => usePasskey());

        act(() => {
            void result.current.registerPasskey(syntheticMasterSecret()).catch(() => {});
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(120_000);
        });

        // Leaving the ceremony running would let a late answer resolve into a torn-down flow.
        expect(mocks.cancelCeremony).toHaveBeenCalled();
    });

    it("does not cut off a slow but legitimate ceremony", async () => {
        vi.useFakeTimers();

        // 45s: plausible for someone fetching a security key, and inside the authenticator's own
        // 60s advisory deadline.
        mocks.startRegistration.mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve(ceremonyResponse("credential-id")), 45_000);
                })
        );
        mocks.startAuthentication.mockResolvedValue(ceremonyResponse("credential-id"));

        const { result } = renderHook(() => usePasskey());

        let failed = false;
        act(() => {
            void result.current.registerPasskey(syntheticMasterSecret()).catch(() => {
                failed = true;
            });
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(50_000);
        });

        expect(failed).toBe(false);
        expect(mocks.cancelCeremony).not.toHaveBeenCalled();
    });
});

describe("usePasskey registration rollback contract", () => {
    it("reports the credential it created so a failed follow-up step can undo it", async () => {
        mocks.startRegistration.mockResolvedValue(ceremonyResponse("credential-id"));
        mocks.startAuthentication.mockResolvedValue(ceremonyResponse("credential-id"));

        const { result } = renderHook(() => usePasskey());

        let credentialId: string | undefined;
        await act(async () => {
            credentialId = await result.current.registerPasskey(syntheticMasterSecret());
        });

        // Without this the caller cannot clean up a credential bound to an identity whose
        // registration then failed.
        expect(credentialId).toBe("credential-id");
    });

    it("releases the busy state after a rejected ceremony", async () => {
        mocks.startRegistration.mockRejectedValue(
            Object.assign(new Error("dismissed"), { name: "NotAllowedError" })
        );

        const { result } = renderHook(() => usePasskey());

        await act(async () => {
            await result.current.registerPasskey(syntheticMasterSecret()).catch(() => {});
        });

        await waitFor(() => {
            expect(result.current.isBusy).toBe(false);
        });
        expect(result.current.error).not.toBeNull();
    });
});
