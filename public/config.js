(function configureScramjetApp(window) {
  const publicWispEndpoints = Object.freeze([
	"wss://wisp-server-python-nh0a.onrender.com/",
]);

	let endpointCursor = -1;

	function selectWispEndpoint() {
		if (publicWispEndpoints.length === 0) {
			throw new Error("No public Wisp endpoints are configured.");
		}

		endpointCursor = (endpointCursor + 1) % publicWispEndpoints.length;
		return publicWispEndpoints[endpointCursor];
	}

	const transport = Object.freeze({
		strategy: "round-robin",
		endpoints: publicWispEndpoints,
		selectEndpoint: selectWispEndpoint,
	});

	window.SCRAMJET_APP_CONFIG = Object.freeze({
		defaultSettings: Object.freeze({
			showBlockedImage: true,
			enableKonamiShortcut: true,
		}),
		quickLinks: Object.freeze([
			{ label: "Geforce Now", url: "https://play.geforcenow.com/" },
			{ label: "TikTok", url: "https://www.tiktok.com/" },
			{ label: "Snapchat", url: "https://web.snapchat.com/" },
			{ label: "YouTube", url: "https://www.youtube.com/" },
			{ label: "Quenq", url: "https://quenq.com/" },
		]),
		// Keep all Wisp/proxy destination choices in this browser-side file.
		wispEndpoints: publicWispEndpoints,
		transport,
		wisp: transport,
	});
})(window);
