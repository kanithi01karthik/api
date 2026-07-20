import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import { routes } from "./routes/_routes";

export const app = new OpenAPIHono();

// Security middleware
app.use(secureHeaders());
app.use(cors({
    origin: "*",
    allowMethods: ["GET"],
    allowHeaders: ["Content-Type"],
}));
app.use(prettyJSON({ force: true }));

// Global error handler — prevents raw stack traces leaking to clients
app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
});

// Global 404 handler
app.notFound((c) => c.json({ error: "Route not found" }, 404));

for (const [path, route] of Object.entries(routes)) {
    app.route(path, route as Hono);
}

app.doc("/openapi", {
    openapi: "3.1.0",
    info: {
        title: "OpenSourceNITJ API",
        version: "1.0.0",
        description: "By developers, for developers.",
    },
    servers: [
        {
            url: "https://api.opensourcenitj.com/",
            description: "Production server",
        },
    ],
});
