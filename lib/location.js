export const updateUserLocation = async ({ userId }) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser");
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });

  const { latitude, longitude } = position.coords;

  console.log("Browser latitude:", latitude);
  console.log("Browser longitude:", longitude);

  // Don't save an invalid location
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    (latitude === 0 && longitude === 0)
  ) {
    throw new Error("Invalid browser location received");
  }

  const response = await fetch("/api/profile_controller/location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      latitude,
      longitude,
      userId,
    }),
  });

  const data = await response.json();

  console.log("Location API response:", data);

  if (!response.ok) {
    throw new Error(
      data?.message || "Failed to update user location"
    );
  }

  return data;
};