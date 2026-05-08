import { fetch } from "bun";
import config from "../../config.json" with { type: "json" };

type SeatData = {
  event: string;
  data: Record<
    string,
    {
      occupied: boolean;
      studentId: string | null;
    }
  >;
};

export async function getAvailableSeats() {
  const apiUrl = config.url.librarySeats;

  let response;

  try {
    response = await fetch(apiUrl);
  } catch (error) {
    console.error("Error fetching library seats data:", error);
    return null;
  }

  const data = (await response.json()) as SeatData;

  const floorMappings: Record<string, string> = {
    G: "Ground Floor",
    "1": "Floor 1",
    "2": "Floor 2",
    "3": "Floor 3",
  };

  const capacity = [];
  let totalAvailableSeats = 0;
  let totalCapacity = 0;

  for (const prefix in floorMappings) {
    let availableSeats = 0;
    let totalSeats = 0;

    for (const seatId in data.data) {
      if (seatId.startsWith(prefix + "-")) {
        totalSeats++;

        if (!data.data[seatId]?.occupied) {
          availableSeats++;
        }
      }
    }

    capacity.push({
      floor: floorMappings[prefix],
      occupiedSeats: totalSeats - availableSeats,
      availableSeats,
      totalSeats,
      availableSeatIds: Object.keys(data.data)
        .filter(
          (seatId) =>
            seatId.startsWith(prefix + "-") && !data.data[seatId]?.occupied,
        )
        .map((seatId) => Number(seatId.replace(new RegExp(`^${prefix}-`), ""))),
    });

    totalAvailableSeats += availableSeats;
    totalCapacity += totalSeats;
  }

  return {
    totalAvailableSeats,
    totalCapacity,
    capacity,
  };
}
