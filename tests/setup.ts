import "@testing-library/jest-dom/vitest";
import sodium from "libsodium-wrappers";
import { beforeAll } from "vitest";

// Initialize libsodium before all tests
beforeAll(async () => {
	await sodium.ready;
});
