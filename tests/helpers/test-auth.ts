import { generateKeyPair, exportJWK, type JSONWebKeySet } from "jose";

// Shared test keypair for integration tests using SELF.fetch()
// This is initialized once and reused across all tests
let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>> | null = null;
let testJWKS: JSONWebKeySet | null = null;

export async function getTestKeyPair() {
	if (!testKeyPair) {
		testKeyPair = await generateKeyPair("ES256", { extractable: true });
	}
	return testKeyPair;
}

export async function getTestJWKS(): Promise<JSONWebKeySet> {
	if (!testJWKS) {
		const keyPair = await getTestKeyPair();
		const publicJWK = await exportJWK(keyPair.publicKey);
		testJWKS = {
			keys: [
				{
					...publicJWK,
					kid: "test-key-id",
					use: "sig",
					alg: "ES256",
				},
			],
		};
	}
	return testJWKS;
}
