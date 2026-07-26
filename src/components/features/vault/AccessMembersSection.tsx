"use client";

/**
 * AccessMembersSection Component
 *
 * Authoritative membership surface for a vault (per D-013: Vault Settings owns
 * Members and Invites; the People page holds only encrypted financial state).
 *
 * Owners can:
 * - Generate invite links (real vault-key wrapping via {@link InviteLinkGenerator}).
 * - See and revoke pending invites.
 * - See and remove members (except themselves).
 *
 * Non-owners see the member roster read-only.
 */

import { Loader2, Users, X } from "lucide-react";
import { useCallback } from "react";
import { Temporal } from "temporal-polyfill";

import { InviteLinkGenerator } from "@/components/features/people";
import { Button } from "@/components/ui/button";
import { useVaultAccess } from "@/hooks/use-vault-access";
import { getSessionPubkeyHash } from "@/lib/crypto/session";
import { trpc } from "@/lib/trpc/client";

/** Shorten a 64-char hex pubkey hash for display. */
function shortenPubkeyHash(pubkeyHash: string): string {
    return `${pubkeyHash.slice(0, 8)}…${pubkeyHash.slice(-4)}`;
}

/** Format an ISO instant as a human-friendly local date-time. */
function formatInstant(iso: string): string {
    return Temporal.Instant.from(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

export interface AccessMembersSectionProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Members and invites management section for the Vault Settings page.
 */
export function AccessMembersSection({ className }: AccessMembersSectionProps) {
    const { vaultId, isOwner, vaultKey, encSecretKey, isLoading } = useVaultAccess();
    const currentUserPubkeyHash = getSessionPubkeyHash();

    const utils = trpc.useUtils();

    const membersQuery = trpc.membership.list.useQuery(
        { vaultId: vaultId ?? "" },
        { enabled: vaultId != null }
    );
    const invitesQuery = trpc.invite.list.useQuery(
        { vaultId: vaultId ?? "" },
        { enabled: vaultId != null && isOwner }
    );

    const removeMutation = trpc.membership.remove.useMutation({
        onSuccess: () => {
            if (vaultId != null) void utils.membership.list.invalidate({ vaultId });
        }
    });
    const revokeMutation = trpc.invite.revoke.useMutation({
        onSuccess: () => {
            if (vaultId != null) void utils.invite.list.invalidate({ vaultId });
        }
    });

    const refreshInvites = useCallback(() => {
        if (vaultId != null) void utils.invite.list.invalidate({ vaultId });
    }, [utils, vaultId]);

    if (vaultId == null) {
        return null;
    }

    return (
        <section className={className}>
            <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h2 className="text-lg font-medium">Access &amp; Members</h2>
            </div>

            {/* Invite generation (owners only). InviteLinkGenerator self-guards on isOwner. */}
            {isOwner && vaultKey && encSecretKey && (
                <div className="mb-6 max-w-md">
                    <InviteLinkGenerator
                        vaultId={vaultId}
                        vaultKey={vaultKey}
                        encSecretKey={encSecretKey}
                        isOwner={isOwner}
                        onInviteCreated={refreshInvites}
                    />
                </div>
            )}

            {/* Member roster */}
            <div className="mb-6 max-w-md">
                <h3 className="mb-2 text-sm font-medium">Members</h3>
                {isOwner && (
                    <p className="text-muted-foreground mb-2 text-xs">
                        Removing a member revokes their access to future changes immediately. The
                        vault key is not rotated, so anything they already downloaded stays readable
                        to them.
                    </p>
                )}
                {isLoading || membersQuery.isLoading ? (
                    <div className="flex items-center gap-2 py-4">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-sm">Loading members…</span>
                    </div>
                ) : membersQuery.isError ? (
                    <p className="text-destructive text-sm">Unable to load members.</p>
                ) : (
                    <ul className="space-y-2">
                        {(membersQuery.data?.members ?? []).map((member) => {
                            const isSelf = member.pubkeyHash === currentUserPubkeyHash;
                            return (
                                <li
                                    key={member.pubkeyHash}
                                    className="bg-card flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-mono text-sm">
                                            {shortenPubkeyHash(member.pubkeyHash)}
                                            {isSelf && (
                                                <span className="text-muted-foreground ml-2">
                                                    (you)
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-muted-foreground text-xs capitalize">
                                            {member.role}
                                        </span>
                                    </div>
                                    {isOwner && !isSelf && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={removeMutation.isPending}
                                            onClick={() =>
                                                removeMutation.mutate({
                                                    vaultId,
                                                    pubkeyHash: member.pubkeyHash
                                                })
                                            }
                                            aria-label={`Remove member ${shortenPubkeyHash(member.pubkeyHash)}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Pending invites (owners only) */}
            {isOwner && (
                <div className="max-w-md">
                    <h3 className="mb-2 text-sm font-medium">Pending Invites</h3>
                    {invitesQuery.isLoading ? (
                        <div className="flex items-center gap-2 py-4">
                            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground text-sm">Loading invites…</span>
                        </div>
                    ) : invitesQuery.isError ? (
                        <p className="text-destructive text-sm">Unable to load invites.</p>
                    ) : (invitesQuery.data ?? []).length === 0 ? (
                        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                            No pending invites.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {(invitesQuery.data ?? []).map((invite) => (
                                <li
                                    key={invite.id}
                                    className="bg-card flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm capitalize">{invite.role}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {invite.isExpired
                                                ? "Expired"
                                                : `Expires ${formatInstant(invite.expiresAt)}`}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={revokeMutation.isPending}
                                        onClick={() =>
                                            revokeMutation.mutate({ inviteId: invite.id })
                                        }
                                        aria-label="Revoke invite"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}
