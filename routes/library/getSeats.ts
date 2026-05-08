import { OpenAPIHono, z } from "@hono/zod-openapi";
import { getAvailableSeats } from "../../lib/library/getAvailableSeats";

export const getSeatsRoute = new OpenAPIHono();

const responseSchema = z.object({
  totalAvailableSeats: z.number(),
  totalCapacity: z.number(),
  capacity: z.array(
    z.object({
      floor: z.string(),
      occupiedSeats: z.number(),
      availableSeats: z.number(),
      totalSeats: z.number(),
      availableSeatIds: z.array(z.number()),
    }),
  ),
});

getSeatsRoute.openapi(
  {
    method: "get",
    path: "/",
    tags: ["Library"],
    summary: "Fetch seats availability in the library",
    description:
      "Returns the number of available seats in the library along with the total capacity. This endpoint provides real-time information about the library's occupancy, helping users plan their visits accordingly.",
    responses: {
      200: {
        description: "Library seats availability retrieved successfully",
        content: {
          "application/json": {
            schema: responseSchema,
          },
        },
      },
      404: {
        description: "Library information not found",
      },
    },
  },
  async (c) => {
    const seatsData = await getAvailableSeats();

    if (!seatsData) {
      return c.json({ error: "Library information not found" }, 404);
    }

    return c.json(seatsData);
  },
);
