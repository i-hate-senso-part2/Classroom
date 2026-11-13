"use strict";
/**
 *
 * @param {string} input
 * @param {string} template Template for a search query.
 * @returns {string} Fully qualified URL
 */
function search(input, template) {
	try {
		// input is a valid URL:
		// eg: https://example.com, https://example.com/test?q=param
		const url = new URL(input);
		if (url.protocol === "http:" || url.protocol === "https:") {
			return url.toString();
		}
	} catch {
		// Input may be a hostname without a scheme.
	}

	try {
		// input is a valid URL when http:// is added to the start:
		// eg: example.com, https://example.com/test?q=param
		const url = new URL(`http://${input}`);
		// only if the hostname has a TLD/subdomain
		if (url.hostname.includes(".") && !url.username && !url.password) {
			return url.toString();
		}
	} catch {
		// Input is not a valid URL.
	}

	return template.replace("%s", encodeURIComponent(input));
}
