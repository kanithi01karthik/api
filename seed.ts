import { Database } from "bun:sqlite";
import { db } from "./lib/db";
import * as schema from "./lib/db/schema";

async function main() {
    console.log("Initializing database.sqlite...");
    const sqlite = new Database("database.sqlite");
    
    const ALLOWED_TABLES = ["batch2022", "batch2023", "batch2024", "batch2025", "batch2026"];
    const createTableQuery = (tableName: string) => {
        if (!ALLOWED_TABLES.includes(tableName)) throw new Error(`Invalid table name: ${tableName}`);
        return `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            rollnumber INTEGER PRIMARY KEY,
            name TEXT,
            branchabbr TEXT,
            branch TEXT,
            "group" TEXT,
            subgroup TEXT
        );
    `;
    };
    
    sqlite.run(createTableQuery("batch2022"));
    sqlite.run(createTableQuery("batch2023"));
    sqlite.run(createTableQuery("batch2024"));
    sqlite.run(createTableQuery("batch2025"));
    sqlite.run(createTableQuery("batch2026"));
    sqlite.close();

    console.log("Seeding test data...");

    // Seed dummy students across different years
    await db.insert(schema.batch2025Table).values({
        rollnumber: 25103001,
        name: "First Year CSE Student",
        branchabbr: "CS",
        branch: "Computer Science & Engineering",
        group: "B6",
        subgroup: "a",
    }).onConflictDoNothing();

    await db.insert(schema.batch2024Table).values({
        rollnumber: 24103002,
        name: "Second Year CSE Student",
        branchabbr: "CS",
        branch: "Computer Science & Engineering",
        group: "CSE-A",
        subgroup: "C1",
    }).onConflictDoNothing();

    await db.insert(schema.batch2023Table).values({
        rollnumber: 23104003,
        name: "Third Year ECE Student",
        branchabbr: "EC",
        branch: "Electronics & Communication Engineering",
        group: "ECE-B",
        subgroup: "D2",
    }).onConflictDoNothing();

    console.log("Database seeded successfully!");
}

main().catch(console.error);
