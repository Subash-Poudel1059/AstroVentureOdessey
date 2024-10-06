function toggleDetails(index) {
    const detail = document.getElementById(`detail-${index}`);
    if (detail.style.display === "none" || detail.style.display === "") {
        detail.style.display = "block"; // Show the detail
    } else {
        detail.style.display = "none"; // Hide the detail
    }
}
