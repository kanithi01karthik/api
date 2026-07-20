import { OpenAPIHono } from "@hono/zod-openapi";
import { year1 } from "./year/1";
import { higherYears } from "./year/higherYears";

export const timeTableRoute = new OpenAPIHono();

timeTableRoute.route("/year/1", year1);
timeTableRoute.route("/year", higherYears);
