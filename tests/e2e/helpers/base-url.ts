/** One origin for the managed server and every independently created browser context. */
export const E2E_PORT = process.env.MONEYFLOW_E2E_PORT ?? "3000";
if (!/^\d+$/.test(E2E_PORT) || Number(E2E_PORT) < 1 || Number(E2E_PORT) > 65535) {
    throw new Error("MONEYFLOW_E2E_PORT must be an integer from 1 to 65535");
}
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
