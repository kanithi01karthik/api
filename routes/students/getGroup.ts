import { OpenAPIHono, z } from "@hono/zod-openapi";
import { getGroup } from "../../lib/firstYear";

export const getGroupRoute = new OpenAPIHono();

const querySchema = z.object({
    rollNumber: z.string(),
});

const responseSchema = z.object({
    group: z.string().openapi({ example: "B6" }),
    subGroup: z.string().nullable().openapi({ example: "a" }),
});

getGroupRoute.openapi(
    {
        method: "get",
        path: "/",
        tags: ["Students"],
        summary: "Get Student Group",
        description: "Returns the group (e.g., B6) or section of a student based on their roll number.",
        request: {
            query: querySchema,
        },
        responses: {
            200: {
                description: "Student group retrieved successfully",
                content: {
                    "application/json": {
                        schema: responseSchema,
                    },
                },
            },
            404: {
                description: "Group not found for the provided roll number.",
            },
        },
    },
    async c => {
        const { rollNumber } = c.req.valid("query");
        const studentGroup = await getGroup(rollNumber);
        if (studentGroup) {
            return c.json({
                group: studentGroup.group,
                subGroup: studentGroup.subGroup,
            });
        }
        return c.json({ message: "Group not found for the provided roll number." }, 404);
    }
);
