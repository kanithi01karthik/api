import { OpenAPIHono, z } from "@hono/zod-openapi";
import config from "../../../config.json" assert { type: "json" };
import { getHigherYearGroup } from "../../../lib/higherYears";
import type { timetableDataType } from "../../../types/xceed";

export const higherYears = new OpenAPIHono();

const pathSchema = z.object({
  year: z.enum(["2", "3", "4"]),
});

const querySchema = z.object({
  branch: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Za-z]+$/, "Branch must contain only letters")
    .openapi({ example: "CSE" }),
  group: z
    .string()
    .max(3)
    .regex(/^[A-Za-z0-9]*$/, "Group must be alphanumeric")
    .default("A")
    .openapi({ example: "A" }),
  subSection: z
    .string()
    .max(3)
    .regex(/^[A-Za-z0-9]*$/, "SubSection must be alphanumeric")
    .optional()
    .openapi({ example: "1" }),
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
            subjectCode: z.string().nullable(),
            faculty: z.string(),
            room: z.string(),
            day: z.string(),
            startTime: z.string().nullable(),
            endTime: z.string().nullable(),
            duration: z.string().nullable(),
            branch: z.string(),
            year: z.string(),
            section: z.string(),
            subSection: z.string().nullable(),
            courseType: z.enum(["Lecture", "Tutorial", "Practical", "Unknown"]),
          }),
        ),
      ),
    ),
  ),
  notes: z.array(z.string()),
});

const errorSchema = z.object({
  error: z.string(),
});

higherYears.openapi(
  {
    method: "get",
    path: "/:year",
    tags: ["Timetable"],
    summary: "Get Higher Year Timetable",
    description:
      "Returns the timetable for second, third, and fourth year students.",
    request: {
      params: pathSchema,
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
        description: "Invalid parameters",
        content: {
          "application/json": {
            schema: errorSchema,
          },
        },
      },
      404: {
        description: "Timetable not found for the specified parameters",
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
        description: "Failed to fetch timetable data from Xceed",
        content: {
          "application/json": {
            schema: errorSchema,
          },
        },
      },
    },
  },
  async (c) => {
    const { year } = c.req.valid("param");
    const { branch, group, subSection } = c.req.valid("query");

    try {
      const yearNum = parseInt(year, 10);
      const groupData = await getHigherYearGroup(yearNum, branch, group, subSection);

      if (!groupData) {
        return c.json(
          { error: "Timetable section not found for the specified parameters" },
          404,
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let fetchedData: Response;
      try {
        fetchedData = await fetch(
          `${config.url.timeTable}/${encodeURIComponent(groupData.code.toString())}/${encodeURIComponent(
            groupData.sem.toString(),
          )}`,
          { signal: controller.signal },
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!fetchedData.ok) {
        return c.json(
          { error: "Failed to fetch timetable data from Xceed" },
          502,
        );
      }

      const rawData = (await fetchedData.json()) as timetableDataType;

      // Define approximate NITJ slot times for standard periods
      const timeSlots: Record<string, { start: string; end: string; duration: string }> = {
        period1: { start: "08:30 AM", end: "09:30 AM", duration: "1 hour" },
        period2: { start: "09:30 AM", end: "10:30 AM", duration: "1 hour" },
        period3: { start: "10:30 AM", end: "11:30 AM", duration: "1 hour" },
        period4: { start: "11:30 AM", end: "12:30 PM", duration: "1 hour" },
        period5: { start: "01:30 PM", end: "02:30 PM", duration: "1 hour" },
        period6: { start: "02:30 PM", end: "03:30 PM", duration: "1 hour" },
        period7: { start: "03:30 PM", end: "04:30 PM", duration: "1 hour" },
        period8: { start: "04:30 PM", end: "05:30 PM", duration: "1 hour" },
      };

      const structuredTimetable: Record<string, Record<string, Array<Array<any>>>> = {};

      for (const [day, periods] of Object.entries(rawData.timetableData)) {
        structuredTimetable[day] = {};
        for (const [periodName, slots] of Object.entries(periods)) {
          structuredTimetable[day][periodName] = slots.map((concurrentSlotList) => {
            return concurrentSlotList.map((slot) => {
              const subjectText = slot.subject.trim();
              
              // Attempt to extract subject code if present in subjectText (e.g. "CSX-201 Data Structures" or "CSX 201")
              const codeMatch = subjectText.match(/^([A-Z]{2,4}[- ]?\d{3})/i);
              const subjectCode = codeMatch ? codeMatch[1] : null;

              // Determine Course Type: Lab/Practical, Tutorial, or Lecture
              let courseType: "Lecture" | "Tutorial" | "Practical" | "Unknown" = "Lecture";
              const lowerSubj = subjectText.toLowerCase();
              if (lowerSubj.includes("lab") || lowerSubj.includes("practical") || lowerSubj.includes("project")) {
                courseType = "Practical";
              } else if (lowerSubj.includes("tutorial") || lowerSubj.includes("tut")) {
                courseType = "Tutorial";
              }

              // Retrieve period timings
              const timings = timeSlots[periodName.toLowerCase()] || { start: null, end: null, duration: null };

              return {
                subject: subjectText,
                subjectCode,
                faculty: slot.faculty.trim(),
                room: slot.room.trim(),
                day,
                startTime: timings.start,
                endTime: timings.end,
                duration: timings.duration,
                branch,
                year,
                section: group,
                subSection: subSection || null,
                courseType,
              };
            });
          });
        }
      }

      return c.json({
        timetableData: structuredTimetable,
        notes: rawData.notes,
      }, 200);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.startsWith("Invalid branch abbreviation")
      ) {
        return c.json({ error: "Invalid branch parameter" }, 400);
      }
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Timetable fetch timed out"
          : "An error occurred while fetching timetable data";
      return c.json({ error: message }, 500);
    }
  },
);
