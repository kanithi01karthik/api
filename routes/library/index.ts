import { OpenAPIHono } from "@hono/zod-openapi";

import { getSeatsRoute } from "./getSeats";
export const libraryRoute = new OpenAPIHono();

libraryRoute.route("/getSeats", getSeatsRoute);
