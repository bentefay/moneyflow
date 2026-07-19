const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function requireSecureSupabaseUrl(rawUrl: string, environment: string | undefined): string {
    const url = new URL(rawUrl);
    const isSecure = url.protocol === "https:";
    const isLocalDevelopment = environment !== "production" && LOOPBACK_HOSTS.has(url.hostname);

    if (!isSecure && !(url.protocol === "http:" && isLocalDevelopment)) {
        throw new Error("Supabase URL must use HTTPS outside loopback development");
    }

    return url.toString().replace(/\/$/, "");
}
