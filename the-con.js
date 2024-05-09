function theCon() {
	/* key MS / Vimeo stuff */
	const progressMilestones = {}; // Object to store progress milestones for each course and episode

	// Start by fetching and updating the UI, then display chapter progress
	fetchAndUpdateMemberUI()
		.then(() => {
			displayChapterProgress(); // Ensure this runs after Memberstack data is fully loaded and processed
			updateLatestButton(); // point Latest Button to correct episode
		})
		.catch((error) => {
			console.error("Error in fetching/updating Memberstack data:", error);
		});
	setupVideoElements();

	/* non MS stuff */
	setupSplide();
	calculatePostReadTime();
	setupLoopElements();

	/*** KEY FUNCTIONS ***/

	function setupVideoElements() {
		const videoElements = document.querySelectorAll(".video");
		videoElements.forEach((video) => {
			video.addEventListener("click", () => {
				const vimeoContainer = video.querySelector(".vimeo");
				const vimeoId = video.getAttribute("data-crux-vimeo-id");
				const player = initVimeo(vimeoContainer, vimeoId);
				trackVimeo(player, video);
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

	function initVimeo(vimeoContainer, vimeoId) {
		const options = {
			id: vimeoId,
			byline: false,
			title: false,
			vimeo_logo: false,
			autoplay: true /* play Vimeo once custom play button clicked */,
			speed: false /* disable speed controls to avoid API issues */,
		};

		const player = new Vimeo.Player(vimeoContainer, options);

		player.loadVideo(vimeoId).then(function (id) {
			console.log(`video ${id} has loaded 🥳`);
		});

		player.on("play", (event) => {
			console.log("video is playing ❤️");
		});

		return player;
	}

	function trackVimeo(player, videoElement) {
		const course = videoElement.getAttribute("data-course-name");
		const episode = videoElement.getAttribute("data-post-id");

		player.on("timeupdate", function (data) {
			const progress = data.seconds / data.duration;
			// Update progress only at 20% increments
			saveProgress(course, episode, progress, 20); // Added a new parameter for increment
		});
	}

	/**
	 * Saves the viewing progress of a video episode for a course in Memberstack's member JSON
	 * only when each 10% interval is reached, rounding the progress to the nearest 10%.
	 * @param {string} course - The course identifier
	 * @param {string} episode - The episode identifier
	 * @param {number} progress - The progress percentage of the video
	 */

	async function saveProgress(course, episode, progress, increment = 10) {
		const memberstack = window.$memberstackDom;

		try {
			const member = await memberstack.getCurrentMember();
			if (member) {
				const memberId = member.id;
				let memberData = await memberstack.getMemberJSON(memberId);

				// Calculate the percentage watched, rounded to the nearest 10
				const percentageWatched = Math.round(progress * 100);
				const milestone = Math.round(percentageWatched / increment) * increment;

				// Construct a unique key for the current course and episode
				const progressKey = `${course}-${episode}`;

				// Only save progress if we hit a new milestone and it's different from the last saved one
				if (progressMilestones[progressKey] !== milestone) {
					// Update last saved milestone
					progressMilestones[progressKey] = milestone;

					// Ensure the base structure is correct and initialized
					if (
						!memberData ||
						typeof memberData !== "object" ||
						!memberData.data
					) {
						memberData = { data: {} };
					}

					// Initialize courses structure
					memberData.data.courses = memberData.data.courses || {};
					memberData.data.courses[course] =
						memberData.data.courses[course] || {};
					memberData.data.courses[course][episode] =
						memberData.data.courses[course][episode] || {};

					// Set the rounded progress and timestamp
					memberData.data.courses[course][episode].progress = milestone / 100;
					memberData.data.courses[course][episode].last_watched =
						new Date().toISOString(); // ISO 8601 format

					// Update member's JSON
					await memberstack.updateMemberJSON({
						memberId: memberId,
						json: memberData.data,
					});

					// Optionally log the updated JSON data to verify
					// const updatedJson = await memberstack.getMemberJSON(memberId);
					console.log(
						`Saved progress at ${milestone}% for episode ${episode} on ${memberData.data.courses[course][episode].last_watched}`
					);
				}
			} else {
				console.log("No member logged in");
			}
		} catch (error) {
			console.error("Error saving progress:", error);
		}
	}

	/**
	 * Fetches member data including video progress and modifies the page content based on various member data fields.
	 */
	// Make fetchAndUpdateMemberUI async to handle the completion properly
	async function fetchAndUpdateMemberUI() {
		try {
			const member = await window.$memberstackDom.getCurrentMember();
			if (member.data) {
				console.log("Logged in member data:", member.data);

				handleSignUpAndReleaseDates(member.data);

				const memberJson = await window.$memberstackDom.getMemberJSON(
					member.id
				);
				if (memberJson && memberJson.data && memberJson.data.courses) {
					const courses = memberJson.data.courses;
					for (const [courseId, episodes] of Object.entries(courses)) {
						for (const [episode, episodeData] of Object.entries(episodes)) {
							updateEpisodeContent(courseId, episode, episodeData);
						}
					}
				}
			} else {
				console.log("No member logged in");
				handleLoggedOutState();
			}
		} catch (error) {
			console.error("Error fetching member data:", error);
			throw error; // Rethrow to handle it in the calling .then/.catch
		}
	}

	/**
	 * Handles the display of sign-up dates and modifies UI based on the membership duration and release dates.
	 * @param {object} memberData - Data about the member.
	 */
	function handleSignUpAndReleaseDates(memberData) {
		let signUpDate;
		const signUpDateString = memberData.customFields["sign-up-date"];

		if (signUpDateString) {
			signUpDate = new Date(signUpDateString);
			if (isNaN(signUpDate.getTime())) {
				signUpDate = new Date(memberData.createdAt); // Fallback to creation date
				console.log(
					"Sign-up date is missing or undefined in custom fields, using creation date."
				);
			}
		} else {
			console.log(
				"Sign-up date is missing or undefined in custom fields, using creation date."
			);
			signUpDate = new Date(memberData.createdAt);
		}

		// Make sure to reset to start of the day for comparison
		signUpDate.setHours(0, 0, 0, 0);

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0); // Set current date to start of the day for fair comparison

		// Calculate membership duration in weeks, considering the start of the 8th day
		const timeDiff = currentDate - signUpDate;
		const daysSinceSignUp = Math.floor(timeDiff / (1000 * 3600 * 24));
		const membershipDurationWeeks = Math.floor(daysSinceSignUp / 7) + 1;

		document.querySelectorAll(".postcard").forEach((post) => {
			updatePostCard(post, signUpDate, currentDate, membershipDurationWeeks);
		});
	}

	function updatePostCard(
		post,
		signUpDate,
		currentDate,
		membershipDurationWeeks
	) {
		const postReleaseWeeks = parseInt(
			post.getAttribute("data-post-release"),
			10
		);
		const releaseDate = new Date(signUpDate);
		releaseDate.setDate(releaseDate.getDate() + (postReleaseWeeks - 1) * 7); // Calculate expected release date
		releaseDate.setHours(0, 0, 0, 0); // Set release date to start of the day

		post.setAttribute("data-release-date", releaseDate.toISOString());

		const releaseTag = post.querySelector(".release-tag_wrapper");
		const releaseTagText = post.querySelector(".release-tag_text");
		const postStatus = post.getAttribute("data-post-status");
		const newTag = post.querySelector(".postcard_new");

		if (postStatus !== "available") {
			releaseTag.removeAttribute("hidden");
			releaseTagText.textContent = "Coming soon";
		} else if (membershipDurationWeeks >= postReleaseWeeks) {
			post.setAttribute("data-post-unlocked", "true");
			releaseTag.setAttribute("hidden", ""); // Hide tag using hidden attribute
			// Check if the video's release date is within the last 7 days
			if ((currentDate - releaseDate) / (1000 * 3600 * 24) <= 7) {
				newTag.removeAttribute("hidden"); // Show the 'new' tag
			} else {
				newTag.setAttribute("hidden", ""); // Hide the 'new' tag
			}
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
	}

	/**
	 * Updates HTML content based on the progress of a video episode.
	 * @param {string} courseId - The course identifier
	 * @param {string} episodeId - The episode identifier
	 * @param {object} episodeData - Data containing progress and other metadata
	 */
	function updateEpisodeContent(courseId, episode, episodeData) {
		// Find all matching episode elements
		const episodeElements = document.querySelectorAll(
			`.postcard[data-post-id='${episode}'][data-course-name='${courseId}']`
		);

		if (episodeElements.length === 0) {
			console.log(
				`No HTML elements found for course ${courseId} episode ${episode}`
			);
		} else {
			episodeElements.forEach((episodeElement) => {
				const progressPercentage = Math.round(episodeData.progress * 100);

				// Determine the watched status based on progress percentage
				if (progressPercentage === 0) {
					episodeElement.setAttribute("data-post-watched", "unwatched");
					episodeElement.setAttribute("data-post-progress", 0);
					console.log(
						`Episode ${episode} of course ${courseId} is set to unwatched.`
					);
				} else if (progressPercentage >= 80) {
					episodeElement.setAttribute("data-post-watched", "watched");
					episodeElement.setAttribute("data-post-progress", 100);
					console.log(
						`Episode ${episode} of course ${courseId} is set to watched.`
					);
				} else {
					episodeElement.setAttribute("data-post-watched", "in progress");
					episodeElement.setAttribute("data-post-progress", progressPercentage);
					console.log(
						`Episode ${episode} of course ${courseId} is in progress at ${progressPercentage}% watched.`
					);
				}
			});
		}
	}

	/* update dashboard progress component */
	function displayChapterProgress() {
		// Check if the dashboard progress component exists
		const dashboardProgress = document.querySelector(".dashboard-progress");
		if (!dashboardProgress) {
			console.log("Dashboard progress component not found.");
			return; // Exit if there's no dashboard progress component
		}

		// Object to store aggregated progress data by chapter
		const chapters = {};

		// Aggregate progress data from each postcard on the page
		document.querySelectorAll(".postcard").forEach((postcard) => {
			const chapter = postcard.getAttribute("data-post-chapter");
			const progress = parseFloat(postcard.getAttribute("data-post-progress"));
			if (!chapters[chapter]) {
				chapters[chapter] = {
					totalProgress: 0,
					count: 0,
				};
			}

			chapters[chapter].totalProgress += progress;
			chapters[chapter].count++;
		});

		// Calculate and update progress for each chapter
		Object.keys(chapters).forEach((chapter) => {
			const avgProgress =
				chapters[chapter].count > 0
					? chapters[chapter].totalProgress / chapters[chapter].count
					: 0;
			const chapterElements = document.querySelectorAll(
				`.chapter[data-chapter="${chapter}"]`
			);

			chapterElements.forEach((chapterElement) => {
				const progressBar = chapterElement.querySelector(
					".chapter_progress-bar"
				);
				const progressNum = chapterElement.querySelector(
					".chapter_progress-num"
				);

				if (progressBar) {
					// Update the width of the :after pseudo-element via inline style
					progressBar.style.setProperty("--progress", avgProgress / 100);
				}

				if (progressNum) {
					progressNum.textContent = `${avgProgress.toFixed(0)}%`;
				}

				// Update the data-progress attribute for the chapter element
				chapterElement.setAttribute("data-progress", avgProgress.toFixed(0));
			});
		});
	}
	function updateLatestButton() {
		// Check if the btn exists
		const btn = document.getElementById("btn-latest");
		if (!btn) {
			console.log("Latest btn not found.");
			return; // Exit if there's no dashboard progress component
		}

		let latestSlug = "";
		const postcards = document.querySelectorAll(".postcard");
		for (const postcard of postcards) {
			const progress = parseFloat(postcard.getAttribute("data-post-progress"));
			if (progress < 80) {
				latestSlug = postcard.getAttribute("data-post-slug");
				break;
			}
		}

		btn.querySelector("#btn-latest-icon").removeAttribute("hidden");
		btn.querySelector("#btn-latest-text").innerText = "Watch latest episode";
		btn.setAttribute("href", `/posts/${latestSlug}`);
	}

	/**
	 * Handles UI changes when no member is logged in.
	 */
	function handleLoggedOutState() {
		document.querySelectorAll(".post").forEach((post) => {
			const releaseTag = post.querySelector(".release-tag");
			const releaseTagText = post.querySelector(".release-tag_text");
			const newTag = post.querySelector(".postcard_new");
			releaseTag.removeAttribute("hidden");
			releaseTagText.textContent = "Coming soon";
			newTag.setAttribute("hidden", "");
		});
	}

	/*** OTHER FUNCTIONS ***/

	function setupLoopElements() {
		var loops = document.querySelectorAll(".loop");

		loops.forEach(function (loop) {
			var videoID = loop.getAttribute("data-crux-vimeo-id"); // Assuming data-videoid attribute contains the Vimeo video ID
			var startSeconds = parseFloat(loop.dataset.startTime); // Assuming data-start attribute
			var endSeconds = parseFloat(loop.dataset.endTime); // Assuming data-end attribute

			var videoContainer = loop.querySelector(".loop_square.is-video");
			var imgContainer = loop.querySelector(".loop_square.is-img");

			// Create the iframe dynamically
			var iframe = document.createElement("iframe");
			iframe.setAttribute(
				"src",
				`https://player.vimeo.com/video/${videoID}?autoplay=1&loop=1&autopause=0&muted=1&background=1`
			);
			iframe.setAttribute("frameborder", "0");
			iframe.setAttribute("allow", "autoplay; fullscreen");
			iframe.style.width = "100%";
			iframe.style.height = "100%";

			// Append iframe to the video container
			videoContainer.appendChild(iframe);

			var player = new Vimeo.Player(iframe);

			// Handling the time update for looping
			player.on("timeupdate", function (data) {
				if (data.seconds >= endSeconds) {
					player.setCurrentTime(startSeconds);
				}
			});

			// Ensure we start at the loop beginning every time the video plays
			player.on("play", function () {
				player.setCurrentTime(startSeconds);
			});

			// Handling video ready event to switch opacity
			player.on("loaded", function () {
				videoContainer.style.opacity = 1;
				imgContainer.style.opacity = 0;
			});
		});
	}
	function calculatePostReadTime() {
		// Attempt to get the article text element
		const articleElement = document.getElementById("transcript");
		const readTimeElement = document.getElementById("read-time");

		// Check if the elements exist
		if (!articleElement) {
			return; // Exit the function if no article element
		}
		if (!readTimeElement) {
			return; // Exit the function if no read time element
		}

		// Get the text content from the article element
		const articleText = articleElement.innerText;

		// Split the text into an array of words
		const wordsArray = articleText.split(" ");

		// Count the number of words in the array
		const wordCount = wordsArray.length;

		// Calculate the estimated reading time
		const wordsPerMinute = 200;
		const readingTime = Math.ceil(wordCount / wordsPerMinute);

		// Display the reading time in the read time element
		readTimeElement.innerText = `${readingTime}m read time`;
	}
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

		function mount_splide_home(myClass) {
			let splides = document.querySelectorAll(myClass);
			for (let i = 0; i < splides.length; i++) {
				let splideOptions = {
					perPage: 3,
					gap: "1rem",
					autoplay: false,
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
		mount_splide_home(".splide.home-playlist");

		function mount_splide_about(myClass) {
			let splides = document.querySelectorAll(myClass);
			for (let i = 0; i < splides.length; i++) {
				let splideOptions = {
					perPage: 3,
					gap: "1rem",
					autoplay: "pause",
					autoScroll: {
						speed: 2,
						pauseOnHover: true,
					},
					arrows: false,
					breakpoints: {
						767: {
							perPage: 1,
						},
					},
				};

				let splide = new Splide(splides[i], splideOptions); // create splide instance with these options
				splide.mount(window.splide.Extensions);
			}
		}
		mount_splide_about(".splide.about-playlist");
	}
}
