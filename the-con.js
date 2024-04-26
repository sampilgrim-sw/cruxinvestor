document.addEventListener("DOMContentLoaded", () => {
	setupSplide();
	getMemberData();
	setupVideoElements();
});

function setupSplide() {
	/* splide defaults */
	Splide.defaults = {
		perMove: 1,
		gap: "0rem",
		arrows: false,
		pagination: false,
		focus: 0,
		speed: 600,
		dragAngleThreshold: 60,
		autoWidth: false,
		rewind: false,
		rewindSpeed: 400,
		waitForTransition: false,
		updateOnMove: true,
		trimSpace: "move",
		type: "loop",
		drag: true,
		snap: true,
		autoWidth: false,
		autoplay: true,
	};

	/* generic splider implementation */
	function mount_splide(myClass) {
		let splides = document.querySelectorAll(myClass);
		for (let i = 0; i < splides.length; i++) {
			let splideOptions = {
				perPage: 3,
				gap: "1rem",
				pauseOnHover: false,
				arrows: true,
				breakpoints: {
					767: {
						perPage: 1,
					},
				},
			};

			let splide = new Splide(splides[i], splideOptions); // create splide instance with these options
			splide.mount();
		}
	}
	mount_splide(".splide.home-playlist");
}

function setupVideoElements() {
	const videoElements = document.querySelectorAll(".video");
	videoElements.forEach((video) => {
		video.addEventListener("click", () => {
			const vimeoContainer = video.querySelector(".vimeo");
			const player = initVimeo(vimeoContainer);
			trackVimeo(player);
			toggleVideoElements(video);
		});
	});
}

function toggleVideoElements(videoElement) {
	const thumbnail = videoElement.querySelector(".video-thumbnail");
	const note = videoElement.querySelector(".video-note");
	const playWrapper = videoElement.querySelector(".video-play_wrapper");
	const vimeoElement = videoElement.querySelector(".vimeo");

	// Hide elements if they exist
	if (thumbnail) {
		thumbnail.style.display = "none";
	}
	if (note) {
		note.style.display = "none";
	}
	if (playWrapper) {
		playWrapper.style.display = "none";
	}

	// Show Vimeo player if it exists
	if (vimeoElement) {
		vimeoElement.style.display = "block";
	} else {
		console.error("Vimeo player element not found.");
	}
}

function initVimeo(vimeoContainer) {
	const vimeoId = vimeoContainer.getAttribute("data-vimeo-id");
	const options = { id: vimeoId };
	const player = new Vimeo.Player(vimeoContainer, options);

	player.loadVideo(vimeoId).then(function (id) {
		console.log(`video ${id} has loaded 🥳`);
	});

	player.on("play", (event) => {
		console.log("video is playing ❤️");
	});

	return player;
}

function trackVimeo(player) {
	player.on("timeupdate", function (data) {
		const percentageWatched = Math.floor((data.percent * 100) / 10) * 10;
		console.log(
			`Member watched ${percentageWatched}% of video ${player.element.id}`
		);
	});
}

function getMemberData() {
	window.$memberstackDom
		.getCurrentMember()
		.then((member) => {
			if (member.data) {
				console.log("Logged in member data:", member.data);

				const signUpDateString = member.data.customFields["sign-up-date"];
				if (!signUpDateString) {
					console.error(
						"Sign-up date is missing or undefined in custom fields."
					);
					return;
				}

				const signUpDate = new Date(signUpDateString);
				if (isNaN(signUpDate.getTime())) {
					console.error("Failed to parse sign-up date:", signUpDateString);
					return;
				}

				const currentDate = new Date();
				const membershipDurationWeeks =
					Math.floor((currentDate - signUpDate) / (7 * 24 * 60 * 60 * 1000)) +
					1; // Adjust to start from week 1

				document.querySelectorAll(".postcard").forEach((post) => {
					const postReleaseWeeks =
						parseInt(post.getAttribute("data-post-release"), 10) - 1; // Adjust for zero-based indexing
					const releaseDate = new Date(signUpDate.getTime());
					releaseDate.setDate(releaseDate.getDate() + postReleaseWeeks * 7);

					const releaseTag = post.querySelector(".release-tag_wrapper");
					const releaseTagText = post.querySelector(".release-tag_text");
					const postStatus = post.getAttribute("data-post-status");
					console.log(postStatus);

					if (postStatus !== "available") {
						releaseTag.removeAttribute("hidden");
						releaseTagText.textContent = "Coming soon";
					} else if (membershipDurationWeeks >= postReleaseWeeks) {
						post.setAttribute("data-post-unlocked", "true");
						releaseTag.setAttribute("hidden", ""); // Hide tag using hidden attribute
					} else {
						post.setAttribute("data-post-locked", "true");
						releaseTag.removeAttribute("hidden"); // Show tag by removing hidden attribute

						const daysUntilAvailable =
							(releaseDate - currentDate) / (1000 * 3600 * 24);
						if (daysUntilAvailable > 7) {
							const weeksUntilAvailable = Math.ceil(daysUntilAvailable / 7);
							releaseTagText.textContent = `Available in ${weeksUntilAvailable} weeks`;
						} else {
							releaseTagText.textContent = `Available in ${Math.ceil(
								daysUntilAvailable
							)} days`;
						}
					}
				});
			} else {
				console.log("No member logged in");
				document.querySelectorAll(".post").forEach((post) => {
					const releaseTag = post.querySelector(".release-tag");
					const releaseTagText = post.querySelector(".release-tag_text");
					releaseTag.removeAttribute("hidden");
					releaseTagText.textContent = "Coming soon";
				});
			}
		})
		.catch((error) => {
			console.error("Error fetching member data:", error);
		});
}

// function initVimeo() {
// 	const vimeo = document.getElementsByClassName("vimeo")[0];
// 	const thumbnail = document.getElementsByClassName("thumbnail")[0];
// 	// get vimeo id
// 	const vimeoId = (() => {
// 		return vimeo.getAttribute("data-vimeo-id");
// 	})();

// 	// options
// 	const options = {
// 		id: vimeoId,
// 	};

// 	// player constructor initialisation
// 	const player = new Vimeo.Player(vimeo, options);

// 	player.loadVideo(vimeoId).then(function (id) {
// 		console.log(`video ${id} has loaded 🥳`);
// 		vimeo.style.display = "block";
// 		thumbnail.style.display = "none";
// 	});

// 	player.on("play", (event) => {
// 		console.log("video is playing ❤️");
// 	});
// 	return player;
// }

// function trackVimeo(player) {
// 	// video tracking

// 	// // Find all Vimeo video embeds on the page
// 	// var iframes = document.querySelectorAll('iframe[src*="vimeo.com"]');
// 	// var players = [];

// 	// // Initialize a Vimeo Player for each iframe
// 	// iframes.forEach(function (iframe) {
// 	// var player = new Vimeo.Player(iframe);

// 	// Store the player in the array to manage multiple videos
// 	// players.push(player);

// 	// Event listener for time updates
// 	player.on("timeupdate", function (data) {
// 		// For example, we track every 10% of the video watched
// 		var percentageWatched = Math.floor((data.percent * 100) / 10) * 10;

// 		// Log this to the console or use for debugging
// 		console.log(
// 			`Member watched ${percentageWatched}% of video ${player.element.id}`
// 		);

// 		// Send data to Memberstack or your server for persistent storage
// 		// Adjust the API endpoint/method according to your Memberstack setup
// 		// MemberStack.onReady.then(function(member) {
// 		// 	member.updateMetaData({
// 		// 		videoProgress: {
// 		// 			[player.element.id]: percentageWatched
// 		// 		}
// 		// 	}).then(function(updatedMember) {
// 		// 		console.log('Progress saved:', updatedMember.meta_data.videoProgress);
// 		// 	});
// 		// });
// 	});
// }
