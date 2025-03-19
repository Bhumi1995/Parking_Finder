document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");
  const currentLocationButton = document.getElementById("current-location");
  const parkingSpotsList = document.getElementById("parking-spots");
  const loadingElement = document.getElementById("loading");
  const noResultsElement = document.getElementById("no-results");
  const parkingDetails = document.getElementById("parking-details");
  const closeDetailsButton = document.getElementById("close-details");
  const detailsContent = document.getElementById("details-content");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // Map initialization
  const map = L.map("map").setView([51.505, -0.09], 13);
  let markers = [];
  let currentPositionMarker = null;
  let currentFilter = "all";
  let parkingData = [];

  // Initialize map with OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Custom parking icons
  const parkingIcon = L.icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const freeIcon = L.icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const paidIcon = L.icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-orange.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const userIcon = L.icon({
    iconUrl:
      "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Event listeners
  searchButton.addEventListener("click", handleSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });
  currentLocationButton.addEventListener("click", getUserLocation);
  closeDetailsButton.addEventListener("click", closeDetails);

  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      currentFilter = this.dataset.filter;
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
      filterParkingSpots();
    });
  });

  // Add these event listeners after the other event listeners in the script
  const showSavedButton = document.getElementById("show-saved");
  const closeSavedButton = document.getElementById("close-saved");
  const savedSpotsPanel = document.getElementById("saved-spots-panel");

  showSavedButton.addEventListener("click", showSavedSpots);
  closeSavedButton.addEventListener("click", () => {
    savedSpotsPanel.classList.add("hidden");
  });

  // Get user's location on page load
  getUserLocation();

  // Functions
  function getUserLocation() {
    if (navigator.geolocation) {
      loadingElement.classList.remove("hidden");
      noResultsElement.classList.add("hidden");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          searchNearbyParking(latitude, longitude);
          updateMap(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          loadingElement.classList.add("hidden");
          alert(
            "Unable to get your location. Please enter an address manually."
          );
        }
      );
    } else {
      alert(
        "Geolocation is not supported by your browser. Please enter an address manually."
      );
    }
  }

  function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    loadingElement.classList.remove("hidden");
    noResultsElement.classList.add("hidden");

    // Geocode the address using Nominatim (OpenStreetMap's geocoding service)
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          searchNearbyParking(lat, lon);
          updateMap(lat, lon);
        } else {
          loadingElement.classList.add("hidden");
          noResultsElement.classList.remove("hidden");
        }
      })
      .catch((error) => {
        console.error("Error geocoding address:", error);
        loadingElement.classList.add("hidden");
        alert("Error finding that location. Please try again.");
      });
  }

  function updateMap(lat, lon) {
    map.setView([lat, lon], 15);

    // Update or add user position marker
    if (currentPositionMarker) {
      currentPositionMarker.setLatLng([lat, lon]);
    } else {
      currentPositionMarker = L.marker([lat, lon], { icon: userIcon }).addTo(
        map
      );
      currentPositionMarker.bindPopup("Your location").openPopup();
    }
  }

  function searchNearbyParking(lat, lon) {
    // Clear previous results
    clearMarkers();
    parkingSpotsList.innerHTML = "";

    // In a real app, you would call a parking API here
    // For this demo, we'll use the Overpass API to get parking data from OpenStreetMap
    const radius = 1000; // 1km radius
    const overpassQuery = `
            [out:json];
            (
              node["amenity"="parking"](around:${radius},${lat},${lon});
              way["amenity"="parking"](around:${radius},${lat},${lon});
              relation["amenity"="parking"](around:${radius},${lat},${lon});
            );
            out center;
        `;

    fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        overpassQuery
      )}`
    )
      .then((response) => response.json())
      .then((data) => {
        processResults(data.elements, lat, lon);
      })
      .catch((error) => {
        console.error("Error fetching parking data:", error);
        loadingElement.classList.add("hidden");
        noResultsElement.classList.remove("hidden");
      });
  }

  function processResults(results, userLat, userLon) {
    loadingElement.classList.add("hidden");

    if (!results || results.length === 0) {
      noResultsElement.classList.remove("hidden");
      return;
    }

    parkingData = results.map((item) => {
      // Extract coordinates
      let itemLat, itemLon;
      if (item.center) {
        itemLat = item.center.lat;
        itemLon = item.center.lon;
      } else {
        itemLat = item.lat;
        itemLon = item.lon;
      }

      // Calculate distance
      const distance = calculateDistance(userLat, userLon, itemLat, itemLon);

      // Determine if free or paid (in real data, this would come from the API)
      const isFree =
        item.tags &&
        (item.tags.fee === "no" ||
          item.tags.fee === "false" ||
          item.tags.fee === "none");

      return {
        id: item.id,
        name: (item.tags && item.tags.name) || "Parking Area",
        lat: itemLat,
        lon: itemLon,
        distance: distance,
        isFree: isFree,
        capacity: (item.tags && item.tags.capacity) || "Unknown",
        access: (item.tags && item.tags.access) || "Public",
        type: item.type,
        tags: item.tags || {},
      };
    });

    // Sort by distance
    parkingData.sort((a, b) => a.distance - b.distance);

    // Display results
    displayResults();
  }

  function displayResults() {
    // Clear previous markers
    clearMarkers();

    // Filter data based on current filter
    const filteredData = filterData();

    if (filteredData.length === 0) {
      noResultsElement.classList.remove("hidden");
      return;
    }

    noResultsElement.classList.add("hidden");

    // Add markers and list items
    filteredData.forEach((spot) => {
      addMarker(spot);
      addListItem(spot);
    });
  }

  function filterData() {
    if (currentFilter === "all") {
      return parkingData;
    } else if (currentFilter === "free") {
      return parkingData.filter((spot) => spot.isFree);
    } else if (currentFilter === "paid") {
      return parkingData.filter((spot) => !spot.isFree);
    }
    return parkingData;
  }

  function filterParkingSpots() {
    // Clear the list
    parkingSpotsList.innerHTML = "";

    // Hide all markers
    markers.forEach((marker) => {
      map.removeLayer(marker);
    });
    markers = [];

    // Display filtered results
    displayResults();
  }

  function addMarker(spot) {
    const icon = spot.isFree ? freeIcon : paidIcon;
    const marker = L.marker([spot.lat, spot.lon], { icon: icon }).addTo(map);

    marker.bindPopup(`
            <strong>${spot.name}</strong><br>
            ${spot.isFree ? "Free parking" : "Paid parking"}<br>
            ${spot.distance.toFixed(1)} km away
        `);

    marker.on("click", () => {
      showParkingDetails(spot);
    });

    markers.push(marker);
  }

  function addListItem(spot) {
    const listItem = document.createElement("li");
    listItem.className = "parking-item";
    listItem.innerHTML = `
            <h3>${spot.name}</h3>
            <p class="distance">${spot.distance.toFixed(1)} km away</p>
            <p>
                <span class="tag ${spot.isFree ? "free" : "paid"}">
                    ${spot.isFree ? "Free" : "Paid"}
                </span>
                ${
                  spot.capacity !== "Unknown"
                    ? `<span>Capacity: ${spot.capacity}</span>`
                    : ""
                }
            </p>
        `;

    listItem.addEventListener("click", () => {
      showParkingDetails(spot);

      // Find and open the corresponding marker popup
      markers.forEach((marker) => {
        const markerLatLng = marker.getLatLng();
        if (markerLatLng.lat === spot.lat && markerLatLng.lng === spot.lon) {
          marker.openPopup();
          map.setView([spot.lat, spot.lon], 17);
        }
      });
    });

    parkingSpotsList.appendChild(listItem);
  }

  function showParkingDetails(spot) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    document.body.appendChild(overlay);

    // Populate details
    detailsContent.innerHTML = `
            <div class="details-header">
                <h2>${spot.name}</h2>
                <p>${spot.isFree ? "Free parking" : "Paid parking"}</p>
            </div>
            <div class="details-info">
                <p><i class="fas fa-map-marker-alt"></i> ${spot.distance.toFixed(
                  1
                )} km from your location</p>
                <p><i class="fas fa-car"></i> Capacity: ${spot.capacity}</p>
                <p><i class="fas fa-door-open"></i> Access: ${spot.access}</p>
                ${
                  spot.tags.opening_hours
                    ? `<p><i class="fas fa-clock"></i> Hours: ${spot.tags.opening_hours}</p>`
                    : ""
                }
                ${
                  !spot.isFree && spot.tags.fee
                    ? `<p><i class="fas fa-money-bill"></i> Fee: ${spot.tags.fee}</p>`
                    : ""
                }
                ${
                  spot.tags.operator
                    ? `<p><i class="fas fa-building"></i> Operator: ${spot.tags.operator}</p>`
                    : ""
                }
            </div>
            <div class="details-actions">
                <button class="action-btn directions-btn" id="get-directions">
                    <i class="fas fa-directions"></i> Directions
                </button>
                <button class="action-btn save-btn" id="save-parking">
                    <i class="fas fa-bookmark"></i> Save
                </button>
            </div>
        `;

    // Show details panel
    parkingDetails.classList.remove("hidden");

    // Add event listeners to new buttons
    document.getElementById("get-directions").addEventListener("click", () => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}&travelmode=driving`;
      window.open(url, "_blank");
    });

    document.getElementById("save-parking").addEventListener("click", () => {
      // grab saved spots from storage
      const saved = localStorage.getItem("saved_parking");
      let savedSpots = [];

      if (saved) {
        try {
          // parse existing spots
          savedSpots = JSON.parse(saved);
        } catch (e) {
          // something went wrong with the JSON, start fresh
          console.error("Couldn't parse saved spots", e);
          savedSpots = [];
        }
      }

      // check if we already saved this one
      let isDuplicate = false;
      for (let i = 0; i < savedSpots.length; i++) {
        if (savedSpots[i].id == spot.id) {
          // note: using == instead of === (common human mistake)
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        alert("You've already saved this parking spot!");
        return;
      }

      // TODO: maybe add more info later like notes?
      const spotToSave = {
        id: spot.id,
        name: spot.name,
        lat: spot.lat,
        lon: spot.lon,
        isFree: spot.isFree,
        // add a timestamp so we know when it was saved
        saved: new Date().toString(), // using toString() instead of toISOString() - more human-like
      };

      // add to array and save back to storage
      savedSpots.push(spotToSave);
      localStorage.setItem("saved_parking", JSON.stringify(savedSpots));

      // update the button to show it worked
      const btn = document.getElementById("save-parking");
      btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
      btn.style.backgroundColor = "#4CAF50"; // direct style manipulation instead of class

      // let user know it worked
      alert("Parking spot saved! You can find it in your saved locations.");
    });

    // Close when clicking overlay
    overlay.addEventListener("click", () => {
      closeDetails();
    });
  }

  function closeDetails() {
    parkingDetails.classList.add("hidden");
    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.remove();
    }
  }

  function clearMarkers() {
    markers.forEach((marker) => {
      map.removeLayer(marker);
    });
    markers = [];
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Add this function to display saved spots
  function showSavedSpots() {
    const savedSpotsList = document.getElementById("saved-spots-list");
    savedSpotsPanel.classList.remove("hidden");

    // Get saved spots from localStorage
    const saved = localStorage.getItem("saved_parking");

    if (!saved) {
      // No saved spots, show empty state
      savedSpotsList.innerHTML = `
        <div class="empty-state">
          <p>You haven't saved any parking spots yet.</p>
          <p>Click the "Save" button when viewing a parking spot to save it for later.</p>
        </div>
      `;
      return;
    }

    try {
      const savedSpots = JSON.parse(saved);

      if (savedSpots.length === 0) {
        // Empty array, show empty state
        savedSpotsList.innerHTML = `
          <div class="empty-state">
            <p>You haven't saved any parking spots yet.</p>
            <p>Click the "Save" button when viewing a parking spot to save it for later.</p>
          </div>
        `;
        return;
      }

      // We have saved spots, display them
      let html = "";

      // Loop through saved spots and create HTML
      for (let i = 0; i < savedSpots.length; i++) {
        const spot = savedSpots[i];

        // Format the date - this is a bit messy like a human might write
        let savedDate = "Unknown date";
        if (spot.saved) {
          // Just get the first part of the date string
          savedDate = spot.saved.split("(")[0];
        }

        html += `
          <div class="saved-item" data-id="${spot.id}">
            <h3>${spot.name}</h3>
            <div class="saved-date">Saved on ${savedDate}</div>
            <p>
              <span class="tag ${spot.isFree ? "free" : "paid"}">
                ${spot.isFree ? "Free" : "Paid"}
              </span>
            </p>
            <div class="actions">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${
                spot.lat
              },${spot.lon}&travelmode=driving" 
                 class="action-link" target="_blank">
                <i class="fas fa-directions"></i> Directions
              </a>
              <a href="#" class="action-link delete-btn" data-id="${spot.id}">
                <i class="fas fa-trash"></i> Delete
              </a>
            </div>
          </div>
        `;
      }

      savedSpotsList.innerHTML = html;

      // Add event listeners to delete buttons
      const deleteButtons = document.querySelectorAll(".delete-btn");
      deleteButtons.forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault(); // don't follow the link
          const id = this.getAttribute("data-id");
          deleteSavedSpot(id);
        });
      });

      // Add event listeners to saved items for showing on map
      const savedItems = document.querySelectorAll(".saved-item");
      savedItems.forEach((item) => {
        item.addEventListener("click", function (e) {
          // Only trigger if we didn't click a link
          if (e.target.tagName !== "A" && !e.target.closest("a")) {
            const id = this.getAttribute("data-id");
            showSavedSpotOnMap(id);
          }
        });
      });
    } catch (e) {
      console.error("Error parsing saved spots", e);
      savedSpotsList.innerHTML = `
        <div class="empty-state">
          <p>There was an error loading your saved spots.</p>
          <p>Please try clearing your browser cache and try again.</p>
        </div>
      `;
    }
  }

  // Function to delete a saved spot
  function deleteSavedSpot(id) {
    // Simple confirmation
    if (!confirm("Are you sure you want to delete this saved parking spot?")) {
      return;
    }

    const saved = localStorage.getItem("saved_parking");

    if (saved) {
      try {
        let savedSpots = JSON.parse(saved);

        // Filter out the spot with the matching id
        savedSpots = savedSpots.filter((spot) => spot.id != id); // using != instead of !== (human-like)

        // Save the updated array back to localStorage
        localStorage.setItem("saved_parking", JSON.stringify(savedSpots));

        // Refresh the saved spots panel
        showSavedSpots();
      } catch (e) {
        console.error("Error deleting saved spot", e);
        alert(
          "Sorry, there was an error deleting this spot. Please try again."
        );
      }
    }
  }

  // Function to show a saved spot on the map
  function showSavedSpotOnMap(id) {
    const saved = localStorage.getItem("saved_parking");

    if (saved) {
      try {
        const savedSpots = JSON.parse(saved);
        const spot = savedSpots.find((s) => s.id == id); // using == instead of === (human-like)

        if (spot) {
          // Center map on the spot
          map.setView([spot.lat, spot.lon], 17);

          // Close the saved spots panel
          savedSpotsPanel.classList.add("hidden");

          // Add a marker if it doesn't exist
          let markerExists = false;

          markers.forEach((marker) => {
            const pos = marker.getLatLng();
            if (pos.lat === spot.lat && pos.lng === spot.lon) {
              markerExists = true;
              marker.openPopup();
            }
          });

          if (!markerExists) {
            // Create a new marker
            const icon = spot.isFree ? freeIcon : paidIcon;
            const marker = L.marker([spot.lat, spot.lon], { icon: icon }).addTo(
              map
            );

            marker
              .bindPopup(
                `
              <strong>${spot.name}</strong><br>
              ${spot.isFree ? "Free parking" : "Paid parking"}<br>
              <em>From your saved spots</em>
            `
              )
              .openPopup();

            markers.push(marker);
          }
        }
      } catch (e) {
        console.error("Error showing saved spot on map", e);
      }
    }
  }
});
