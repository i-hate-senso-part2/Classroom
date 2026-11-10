import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const terminal = createInterface({
	input: process.stdin,
	output: process.stdout,
});

function ask(prompt) {
	return new Promise((resolve) => terminal.question(prompt, resolve));
}

try {
	const password = await ask("Admin password (12+ characters): ");
	if (password.length < 12) {
		throw new Error("Use at least 12 characters.");
	}

	const confirmation = await ask("Confirm password: ");
	if (password !== confirmation) {
		throw new Error("Passwords do not match.");
	}

	const salt = randomBytes(16);
	const digest = scryptSync(password, salt, 64).toString("hex");
	console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${digest}`);
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
} finally {
	terminal.close();
}
