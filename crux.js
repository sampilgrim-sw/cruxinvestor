// Function to fetch the ad campaign page and extract slot IDs
async function fetchAndExtractSlotIds(adSlug) {
	const url = `/ad-campaigns/${adSlug}`;
	try {
		const response = await fetch(url);
		const html = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		const slotIds = [...doc.querySelectorAll(".advert-slot-id")].map(
			(el) => el.textContent
		);
		return slotIds;
	} catch (error) {
		console.error("Failed to fetch or parse ad campaign page:", error);
		return [];
	}
}

// Utility function for weighted random selection, excluding priority 0 (always selected)
function weightedRandomSelect(items) {
	const weights = items.map((item) => Math.pow(2, -item.priority));
	const totalWeight = weights.reduce((total, weight) => total + weight, 0);
	let random = Math.random() * totalWeight;

	for (let i = 0; i < items.length; i++) {
		if (random < weights[i]) return items[i];
		random -= weights[i];
	}
	return null; // Fallback if needed
}

async function populateAdverts() {
	const slotsMap = new Map(); // SlotId => [{ advert, priority }]

	// Collect adverts and their target slots with priorities
	const adverts = document.querySelectorAll(".adverts .advert");
	for (const advert of adverts) {
		const adSlug = advert.getAttribute("data-slug");
		const priority = parseInt(advert.getAttribute("data-priority"), 10);
		if (!adSlug) continue;

		const slotIds = await fetchAndExtractSlotIds(adSlug);
		slotIds.forEach((slotId) => {
			if (!slotsMap.has(slotId)) slotsMap.set(slotId, []);
			slotsMap.get(slotId).push({ advert, priority });
		});
	}

	// Process each slot
	slotsMap.forEach((adverts, slotId) => {
		const priorityZeroAdverts = adverts.filter((a) => a.priority === 0);
		const otherAdverts = adverts.filter((a) => a.priority !== 0);

		// Always select priority 0 adverts, randomly select among others based on weight
		const selectedAdverts = [...priorityZeroAdverts];
		if (otherAdverts.length > 0) {
			const selectedAdvert = weightedRandomSelect(otherAdverts);
			if (selectedAdvert) selectedAdverts.push(selectedAdvert);
		}

		// Find all slots with the matching ID and append the selected adverts to each
		const slotElements = document.querySelectorAll(
			`.advert-slot[data-ad-slot="${slotId}"]`
		);
		slotElements.forEach((slotElement) => {
			selectedAdverts.forEach(({ advert }) => {
				const clonedAdvert = advert.cloneNode(true);
				slotElement.appendChild(clonedAdvert);
			});
		});
	});
}

// populateAdverts();
