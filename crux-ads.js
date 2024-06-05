// Function to check if we're on a Post page and whether ads should be shown. We DON'T show ads if there's exactly ONE related company.
function shouldShowAds() {
	// Check if the current page URL matches the form /posts/xxx
	const isPostPage = /\/posts\/[^\/]+/.test(window.location.pathname);
	if (!isPostPage) return true; // Not a post page, show ads by default

	// Find the .post-content_companies-list element
	const companiesList = document.querySelector(".post-content_companies-list");
	if (!companiesList) return true; // Element not found, show ads

	// Count the direct children of the .post-content_companies-list
	const childrenCount = companiesList.children.length;
	return childrenCount !== 1; // Show ads if there are 0 or 2+ children
}

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
	// Proceed with the rest of the script only if ads should be shown
	if (!shouldShowAds()) return;

	const slotElements = document.querySelectorAll(".advert-slot");
	const adverts = document.querySelectorAll(".adverts .advert");

	console.log(slotElements);
	console.log(adverts);

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
		const slotType = slotElement.getAttribute("data-type");
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

		// Select a single advert for the slot

		let selectedAdvert = null;

		// if multiple priority 0 ads
		if (priorityZeroAdverts.length > 0) {
			// Randomly select one from priority 0 adverts
			selectedAdvert =
				priorityZeroAdverts[
					Math.floor(Math.random() * priorityZeroAdverts.length)
				];
		} else if (otherAdverts.length > 0) {
			selectedAdvert = weightedRandomSelect(otherAdverts);
		}

		// Append the selected advert to the slot
		if (selectedAdvert) {
			const clonedAdvert = selectedAdvert.advert.cloneNode(true);
			clonedAdvert.setAttribute("data-type", slotType);
			slotElement.appendChild(clonedAdvert);
		}
	});
}

// populateAdverts();
