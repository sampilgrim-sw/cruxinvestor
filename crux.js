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
	const slotElements = document.querySelectorAll(".advert-slot");
	const adverts = document.querySelectorAll(".adverts .advert");

	// Prepare advert info
	const advertInfos = await Promise.all(
		[...adverts].map(async (advert) => {
			const adSlug = advert.getAttribute("data-slug");
			const priority = parseInt(advert.getAttribute("data-priority"), 10);
			const slotIds = await fetchAndExtractSlotIds(adSlug);
			return { advert, priority, slotIds };
		})
	);

	// Process each slot independently
	slotElements.forEach((slotElement) => {
		const slotId = slotElement.getAttribute("data-ad-slot");
		const eligibleAdverts = advertInfos.filter(({ slotIds }) =>
			slotIds.includes(slotId)
		);

		// Separate priority 0 adverts
		const priorityZeroAdverts = eligibleAdverts.filter(
			({ priority }) => priority === 0
		);
		const otherAdverts = eligibleAdverts.filter(
			({ priority }) => priority !== 0
		);

		// Select advert(s) for the slot
		const selectedAdverts = [...priorityZeroAdverts];
		if (otherAdverts.length > 0) {
			const selectedAdvert = weightedRandomSelect(otherAdverts);
			if (selectedAdvert) selectedAdverts.push(selectedAdvert);
		}

		// Append selected adverts to the slot
		selectedAdverts.forEach(({ advert }) => {
			const clonedAdvert = advert.cloneNode(true);
			slotElement.appendChild(clonedAdvert);
		});
	});
}

// populateAdverts();
