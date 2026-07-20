import { eq } from "drizzle-orm";
import config from "../config.json" assert { type: "json" };
import type { studentInfo } from "../types/db";
import type { semArrDataType, sessionDeptDataType } from "../types/xceed.js";
import { db } from "./db";
import * as dbSchema from "./db/schema";

export async function getFirstYearGroups(): Promise<{ [key: string]: semArrDataType }> {
    const sessions = await fetch(config.url.sessionAndDept);
    const sessionDeptData = (await sessions.json()) as sessionDeptDataType;

    const currentSessionObj = sessionDeptData.uniqueSessions.find(sess => sess.currentSession);
    if (!currentSessionObj || !currentSessionObj.session) {
        throw new Error("Current session not found in sessionDeptData.uniqueSessions");
    }
    const currentSession = currentSessionObj.session;

    const dept = sessionDeptData.uniqueDept.find(d => d === "Basic Sciences");
    if (!dept) {
        throw new Error("Basic Sciences department not found in Xceed session data");
    }

    const codeFetch = await fetch(
        `${config.url.deptCode}/${encodeURIComponent(`${currentSession}`)}/${encodeURIComponent(`${dept}`)}`
    );
    if (!codeFetch.ok) {
        throw new Error("Failed to fetch department code from Xceed");
    }
    const code = JSON.parse(await codeFetch.text());
    if (typeof code !== "string" || code.trim() === "") {
        throw new Error("Unexpected code format from Xceed API");
    }

    const semFetch = await fetch(`${config.url.sem}${encodeURIComponent(code)}`);
    if (!semFetch.ok) {
        throw new Error("Failed to fetch semester data from Xceed");
    }
    const semData = (await semFetch.json()) as semArrDataType;

    const usableData = semData.filter(semEntry => semEntry.code === code);
    const groups = ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6"];
    const mappedData: { [key: string]: any } = {};
    groups.forEach(group => {
        const semEntry = usableData.find(entry => entry.sem.toUpperCase().includes(group));
        if (semEntry) {
            mappedData[group] = semEntry;
        }
    });

    return mappedData;
}

export async function getStudentDetails(rollNumber: string, batch: string): Promise<studentInfo | null> {
    let table;
    switch (batch) {
        case "2022":
            table = dbSchema.batch2022Table;
            break;
        case "2023":
            table = dbSchema.batch2023Table;
            break;
        case "2024":
            table = dbSchema.batch2024Table;
            break;
        case "2025":
            table = dbSchema.batch2025Table;
            break;
        case "2026":
            table = dbSchema.batch2026Table;
            break;
        default:
            return null;
    }

    if (!/^\d+$/.test(rollNumber)) {
        return null;
    }
    const rollInt = parseInt(rollNumber, 10);
    if (isNaN(rollInt)) {
        return null;
    }
    const data = await db
        .select()
        .from(table)
        .where(eq(table.rollnumber, rollInt));

    if (data.length === 0) {
        return null;
    }

    const record = data[0];

    const student: studentInfo = {
        rollnumber: record?.rollnumber.toString() || "",
        name: record?.name || "",
        branchabbr: record?.branchabbr || "",
        branch: record?.branch || "",
        group: record?.group || "",
        subgroup: record?.subgroup || "",
    };
    return student;
}

export async function getGroup(rollNumber: string): Promise<{ group: string; subGroup: string | null } | null> {
    const rollStr = rollNumber.trim();
    // Validate: must be numeric digits only
    if (!/^\d{8,10}$/.test(rollStr)) return null;
    const yearDigits = rollStr.substring(0, 2);
    // Validate: year prefix must be a valid recent batch (e.g. 20–30)
    const yearNum = parseInt(yearDigits, 10);
    if (isNaN(yearNum) || yearNum < 20 || yearNum > 35) return null;
    const batch = "20" + yearDigits;

    const studentDetails = await getStudentDetails(rollStr, batch);
    if (studentDetails) {
        const studentGroup = studentDetails.group ? studentDetails.group.toUpperCase() : "";
        const subgroupStr = studentDetails.subgroup ? studentDetails.subgroup.trim() : "";
        const subGroup = subgroupStr ? subgroupStr.toLowerCase().slice(-1) : null;
        return { group: studentGroup, subGroup: subGroup };
    }

    return null;
}
