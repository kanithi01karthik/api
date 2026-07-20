import { beforeAll, afterAll, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { app } from "./app";
import { db } from "./lib/db";
import * as schema from "./lib/db/schema";

const originalFetch = globalThis.fetch;

beforeAll(async () => {
    // Ensure all tables are created in the SQLite database
    const sqlite = new Database("database.sqlite");
    
    const createTableQuery = (tableName: string) => `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            rollnumber INTEGER PRIMARY KEY,
            name TEXT,
            branchabbr TEXT,
            branch TEXT,
            "group" TEXT,
            subgroup TEXT
        );
    `;
    
    sqlite.run(createTableQuery("batch2022"));
    sqlite.run(createTableQuery("batch2023"));
    sqlite.run(createTableQuery("batch2024"));
    sqlite.run(createTableQuery("batch2025"));
    sqlite.run(createTableQuery("batch2026"));
    sqlite.close();

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

    // Mock global fetch to isolate tests from network dependency
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        
        if (urlStr.includes("allsessanddept")) {
            return new Response(JSON.stringify({
                uniqueSessions: [{ session: "2026-2027 (Odd)", currentSession: true }],
                uniqueDept: [
                    "Basic Sciences",
                    "Computer Science and Engineering", 
                    "Electronics and Communication Engineering"
                ]
            }));
        }
        
        if (urlStr.includes("getcode")) {
            if (urlStr.includes("Basic%20Sciences")) {
                return new Response(JSON.stringify("basic-sciences-code"));
            }
            if (urlStr.includes("Computer%20Science%20and%20Engineering")) {
                return new Response(JSON.stringify("cse-code"));
            }
            if (urlStr.includes("Electronics%20and%20Communication%20Engineering")) {
                return new Response(JSON.stringify("ece-code"));
            }
        }
        
        if (urlStr.includes("addsem")) {
            if (urlStr.includes("code=basic-sciences-code")) {
                return new Response(JSON.stringify([
                    { _id: "1", sem: "B.Tech-CSE-SectionB6", code: "basic-sciences-code" }
                ]));
            }
            if (urlStr.includes("code=cse-code")) {
                return new Response(JSON.stringify([
                    { _id: "2", sem: "B.Tech-CSE-3A", code: "cse-code" }
                ]));
            }
            if (urlStr.includes("code=ece-code")) {
                return new Response(JSON.stringify([
                    { _id: "3", sem: "B.Tech-ECE-5B", code: "ece-code" }
                ]));
            }
        }

        if (urlStr.includes("lockclasstt")) {
            return new Response(JSON.stringify({
                timetableData: {
                    Monday: {
                        period1: [[{ subject: "Mock Subject", faculty: "Mock Faculty", room: "Mock Room" }]]
                    }
                },
                notes: ["Mock notes"]
            }));
        }
	
         throw new Error(`Unexpected network fetch in tests: ${urlStr}`);
    }) as any;
});

afterAll(() => {
    globalThis.fetch = originalFetch;
});

describe("OpensourceNITJ API Integration Tests", () => {
    describe("Health Endpoint", () => {
        it("should return status ok", async () => {
            const res = await app.request("/health");
            expect(res.status).toBe(200);
            const body = (await res.json()) as any;
            expect(body.status).toBe("ok");
            expect(body.uptime).toBeTypeOf("number");
        });
    });

    describe("Student Group Lookup", () => {
        it("should return correct group for 1st Year (Batch 2025)", async () => {
            const res = await app.request("/students/getGroup?rollNumber=25103001");
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual({
                group: "B6",
                subGroup: "a",
            });
        });

        it("should return correct group for 2nd Year (Batch 2024)", async () => {
            const res = await app.request("/students/getGroup?rollNumber=24103002");
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual({
                group: "CSE-A",
                subGroup: "1",
            });
        });

        it("should return correct group for 3rd Year (Batch 2023)", async () => {
            const res = await app.request("/students/getGroup?rollNumber=23104003");
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual({
                group: "ECE-B",
                subGroup: "2",
            });
        });

        it("should return 404 for unknown roll number", async () => {
            const res = await app.request("/students/getGroup?rollNumber=99999999");
            expect(res.status).toBe(404);
        });
    });

    describe("Timetable Endpoints", () => {
        it("should fetch 1st Year Timetable", async () => {
            const res = await app.request("/timetable/year/1?group=B6");
            expect(res.status).toBe(200);
            const body = (await res.json()) as any;
            expect(body).toHaveProperty("timetableData");
            expect(body.timetableData.Monday.period1[0][0].subject).toBe("Mock Subject");
            expect(body).toHaveProperty("notes");
        });

        it("should fetch 2nd Year (CSE) Timetable with structured data and subsection", async () => {
            const res = await app.request("/timetable/year/2?branch=CSE&group=A&subSection=1");
            expect(res.status).toBe(200);
            const body = (await res.json()) as any;
            expect(body).toHaveProperty("timetableData");
            
            const firstSlot = body.timetableData.Monday.period1[0][0];
            expect(firstSlot.subject).toBe("Mock Subject");
            expect(firstSlot).toHaveProperty("subjectCode");
            expect(firstSlot.startTime).toBe("08:30 AM");
            expect(firstSlot.endTime).toBe("09:30 AM");
            expect(firstSlot.duration).toBe("1 hour");
            expect(firstSlot.branch).toBe("CSE");
            expect(firstSlot.year).toBe("2");
            expect(firstSlot.section).toBe("A");
            expect(firstSlot.subSection).toBe("1");
            expect(firstSlot.courseType).toBe("Lecture");
            
            expect(body).toHaveProperty("notes");
        });

        it("should fetch 3rd Year (ECE) Timetable", async () => {
            const res = await app.request("/timetable/year/3?branch=ECE&group=B");
            expect(res.status).toBe(200);
            const body = (await res.json()) as any;
            expect(body).toHaveProperty("timetableData");
            expect(body.timetableData.Monday.period1[0][0].subject).toBe("Mock Subject");
            expect(body).toHaveProperty("notes");
        });

        it("should return 400 or 404 for non-existent branch or section", async () => {
            const res = await app.request("/timetable/year/2?branch=XYZ&group=Z");
            expect([400, 404]).toContain(res.status);
        });
    });
});
