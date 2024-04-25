document.addEventListener("DOMContentLoaded", function () {
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
});
