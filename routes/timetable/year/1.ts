import { OpenAPIHono, z } from "@hono/zod-openapi";
import config from "../../../config.json" assert { type: "json" };
import { getFirstYearGroups } from "../../../lib/firstYear";
import type { semDataType, timetableDataType } from "../../../types/xceed";

export const year1 = new OpenAPIHono();

const querySchema = z.object({
    group: z.enum(["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6"]),
});

const responseSchema = z.object({
    timetableData: z.record(
        z.string(),
        z.record(
            z.string(),
            z.array(
                z.array(
                    z.object({
                        subject: z.string(),
                        faculty: z.string(),
                        room: z.string(),
                    })
                )
            )
        )
    ),
    notes: z.array(z.string()),
});

const errorSchema = z.object({
    error: z.string(),
});

year1.openapi(
    {
        method: "get",
        path: "/",
        tags: ["Timetable"],
        summary: "Get First Year Timetable",
        description: "Returns the timetable for first year students.",
        request: {
            query: querySchema,
        },
        responses: {
            200: {
                description: "Timetable retrieved successfully",
                content: {
                    "application/json": {
                        schema: responseSchema,
                    },
                },
            },
            400: {
                description: "Invalid group parameter",
                content: {
                    "application/json": {
                        schema: errorSchema,
                    },
                },
            },
            500: {
                description: "Internal server error",
                content: {
                    "application/json": {
                        schema: errorSchema,
                    },
                },
            },
            502: {
                description: "Failed to fetch timetable data",
                content: {
                    "application/json": {
                        schema: errorSchema,
                    },
                },
            },
        },
    },
    async c => {
        const { group } = c.req.valid("query");

        const groups = await getFirstYearGroups();
        const groupData = groups[group] as unknown as semDataType;

        if (!groupData) {
            return c.json({ error: "Invalid group parameter" }, 400);
        }

        try {
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 8000);
            let fetchedData: Response;
            try {
                fetchedData = await fetch(
                    `${config.url.timeTable}/${encodeURIComponent(groupData.code.toString())}/${encodeURIComponent(
                        groupData.sem.toString()
                    )}`,
                    { signal: controller.signal }
                );
            } finally {
                clearTimeout(fetchTimeout);
            }

            if (!fetchedData.ok) {
                return c.json({ error: "Failed to fetch timetable data" }, 502);
            }

            const data = (await fetchedData.json()) as timetableDataType;

            return c.json(data, 200);
        } catch (error: unknown) {
            const message = error instanceof Error && error.name === "AbortError"
                ? "Timetable fetch timed out"
                : "An error occurred while fetching timetable data";
            return c.json({ error: message }, 500);
        }
    }
);
