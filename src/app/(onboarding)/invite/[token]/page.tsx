"use client";

/**
 * Invite Redemption Page
 *
 * Flow for accepting a vault invite:
 * 1. Extract invite secret from URL fragment
 * 2. Derive ephemeral keypair from secret
 * 3. Look up invite by pubkey
 * 4. Unwrap vault key using invite secret
 * 5. Re-wrap vault key for user's X25519 key
 * 6. Accept invite via API
 * 7. Redirect to vault
 */

import sodium from "libsodium-wrappers";
import { CheckCircle2, Loader2, Users, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { setActiveVaultStorage } from "@/components/providers/active-vault-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIdentity } from "@/hooks";
import { base64ToPrivateKey, initCrypto } from "@/lib/crypto/keypair";
import { getSessionEncPublicKey, getSessionEncSecretKey } from "@/lib/crypto/session";
import { trpc } from "@/lib/trpc/client";
import {
    deriveInviteKeypairFromFragment,
    redeemRealVaultKey,
    selfWrapVaultKey
} from "@/lib/vault/invite-redemption";
import { markPendingPersonLink } from "@/lib/vault/pending-person-link";

type RedeemState =
    | "checking-auth"
    | "ready"
    | "accepting"
    | "success"
    | "error"
    | "expired"
    | "invalid"
    | "need-auth";

export default function InvitePage() {
    const router = useRouter();
    const params = useParams();
    const inviteId = params.token as string;

    const { status: authStatus } = useIdentity();

    const [state, setState] = useState<RedeemState>("checking-auth");
    const [error, setError] = useState<string | null>(null);
    const [inviteInfo, setInviteInfo] = useState<{
        vaultId: string;
        role: "owner" | "member";
        /** Owner's authenticated `crypto_box` envelope wrapping the real vault key. */
        encryptedVaultKey: string;
        /** Owner's X25519 sender public key needed to unwrap the envelope. */
        senderEncPublicKey: string;
    } | null>(null);

    // tRPC mutation for accepting invite
    const acceptMutation = trpc.invite.accept.useMutation();
    const utils = trpc.useUtils();

    // Check authentication
    useEffect(() => {
        if (authStatus === "loading") {
            return; // Still checking session
        }

        if (authStatus === "locked") {
            // User needs to unlock first - redirect to unlock with return URL
            const returnUrl = encodeURIComponent(`/invite/${inviteId}${window.location.hash}`);
            router.replace(`/unlock?returnTo=${returnUrl}`);
        }
    }, [authStatus, inviteId, router]);

    // Process the invite once authentication is available.
    useEffect(() => {
        if (authStatus !== "unlocked" || state !== "checking-auth") return;

        async function processInvite() {
            try {
                await initCrypto();

                // Get invite secret from URL fragment
                const fragment = window.location.hash.slice(1);
                if (!fragment) {
                    setState("invalid");
                    setError("Invite link is missing the secret. Please request a new invite.");
                    return;
                }

                // Decode the secret (URL-safe base64)
                let inviteSecret: Uint8Array;
                try {
                    inviteSecret = sodium.from_base64(fragment, sodium.base64_variants.URLSAFE);
                } catch {
                    setState("invalid");
                    setError("Invite secret is invalid. Please request a new invite.");
                    return;
                }

                // Derive ephemeral keypair from invite secret
                const inviteKeypair = sodium.crypto_box_seed_keypair(inviteSecret);
                const invitePubkeyBase64 = sodium.to_base64(
                    inviteKeypair.publicKey,
                    sodium.base64_variants.ORIGINAL
                );

                // Look up invite by pubkey - we need to make a direct API call
                // since the useQuery pattern doesn't work well for this flow
                try {
                    const result = await utils.invite.getByPubkey.fetch({
                        invitePubkey: invitePubkeyBase64
                    });

                    // Store invite info for display and redemption. The envelope
                    // and sender key are needed to unwrap the REAL vault key.
                    setInviteInfo({
                        vaultId: result.vaultId,
                        role: result.role,
                        encryptedVaultKey: result.encryptedVaultKey,
                        senderEncPublicKey: result.senderEncPublicKey
                    });

                    setState("ready");
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    if (errorMsg.includes("expired")) {
                        setState("expired");
                        setError("This invite has expired. Please request a new invite.");
                    } else if (errorMsg.includes("not found") || errorMsg.includes("Invalid")) {
                        setState("invalid");
                        setError(
                            "This invite is no longer valid. It may have been used or revoked."
                        );
                    } else {
                        setState("error");
                        setError(errorMsg);
                    }
                }
            } catch (err) {
                setState("error");
                setError(err instanceof Error ? err.message : "Failed to process invite");
            }
        }

        processInvite();
    }, [authStatus, state, utils]);

    // Handle accept invite
    const handleAccept = useCallback(async () => {
        if (!inviteInfo) return;

        setState("accepting");
        setError(null);

        try {
            await initCrypto();

            // Re-derive the ephemeral invite keypair from the URL fragment secret.
            const fragment = window.location.hash.slice(1);
            const invite = await deriveInviteKeypairFromFragment(fragment);

            // Get user's keys
            const userEncPublicKeyBase64 = getSessionEncPublicKey();
            const userEncSecretKeyBase64 = getSessionEncSecretKey();

            if (!userEncPublicKeyBase64 || !userEncSecretKeyBase64) {
                throw new Error("Session keys not available");
            }

            // Unwrap the REAL vault key from the owner's authenticated envelope,
            // then re-wrap it for our own membership row (sender == self), exactly
            // as vault creation does so `VaultProvider` can open the same vault.
            const realVaultKey = await redeemRealVaultKey({
                encryptedVaultKey: inviteInfo.encryptedVaultKey,
                senderEncPublicKey: inviteInfo.senderEncPublicKey,
                inviteSecretKey: invite.inviteSecretKey
            });
            const membershipKey = await selfWrapVaultKey({
                vaultKey: realVaultKey,
                ownEncPublicKey: userEncPublicKeyBase64,
                ownEncSecretKey: base64ToPrivateKey(userEncSecretKeyBase64)
            });

            // Accept the invite
            await acceptMutation.mutateAsync({
                invitePubkey: invite.invitePubkeyBase64,
                encryptedVaultKey: membershipKey,
                encPublicKey: userEncPublicKeyBase64
            });

            // Deliver the member INTO the shared vault: the first open there
            // materializes their linked Person (HS-012). The marker survives the
            // navigation and any refresh, and the open reconciles it idempotently.
            // This page renders outside ActiveVaultProvider, so the selection is
            // persisted through storage; the (app) layout reads it on mount.
            markPendingPersonLink(inviteInfo.vaultId);
            setActiveVaultStorage({ id: inviteInfo.vaultId });

            setState("success");

            router.push("/transactions");
        } catch (err) {
            setState("error");
            setError(err instanceof Error ? err.message : "Failed to accept invite");
        }
    }, [inviteInfo, acceptMutation, router]);

    // Render based on state
    return (
        <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                        <Users className="text-primary h-6 w-6" />
                    </div>
                    <CardTitle>Vault Invitation</CardTitle>
                    <CardDescription>
                        You&apos;ve been invited to join a shared vault.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Checking auth state */}
                    {state === "checking-auth" && authStatus !== "unlocked" && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                        </div>
                    )}

                    {/* Loading invite */}
                    {state === "checking-auth" && authStatus === "unlocked" && (
                        <div className="flex flex-col items-center gap-2 py-8">
                            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                            <p className="text-muted-foreground text-sm">Verifying invite...</p>
                        </div>
                    )}

                    {/* Ready to accept */}
                    {state === "ready" && inviteInfo && (
                        <div className="space-y-4">
                            <div className="bg-muted/50 rounded-lg border p-4">
                                <p className="text-sm">
                                    You&apos;ll be added as a{" "}
                                    <span className="font-semibold">{inviteInfo.role}</span> of this
                                    vault.
                                </p>
                            </div>
                            <Button onClick={handleAccept} className="w-full">
                                Accept Invitation
                            </Button>
                        </div>
                    )}

                    {/* Accepting */}
                    {state === "accepting" && (
                        <div className="flex flex-col items-center gap-2 py-8">
                            <Loader2 className="text-primary h-8 w-8 animate-spin" />
                            <p className="text-muted-foreground text-sm">Joining vault...</p>
                        </div>
                    )}

                    {/* Success */}
                    {state === "success" && (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-600">Success!</AlertTitle>
                            <AlertDescription className="text-green-600">
                                You&apos;ve joined the vault. Redirecting to dashboard...
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Error states */}
                    {(state === "error" || state === "expired" || state === "invalid") && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>
                                {state === "expired"
                                    ? "Invite Expired"
                                    : state === "invalid"
                                      ? "Invalid Invite"
                                      : "Error"}
                            </AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Need auth */}
                    {state === "need-auth" && (
                        <div className="space-y-4">
                            <Alert>
                                <AlertTitle>Authentication Required</AlertTitle>
                                <AlertDescription>
                                    Please unlock your identity to accept this invite.
                                </AlertDescription>
                            </Alert>
                            <Button onClick={() => router.push("/unlock")} className="w-full">
                                Go to Unlock
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
