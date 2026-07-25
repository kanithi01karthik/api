import config from "../config.json" assert { type: "json" };
import type {
  semArrDataType,
  semDataType,
  sessionDeptDataType,
} from "../types/xceed";

export const allowedBranches = [
  "CSE",
  "CS",
  "IT",
  "ECE",
  "EC",
  "EE",
  "ME",
  "CE",
  "BT",
  "CH",
  "CHE",
  "ICE",
  "IPE",
  "TT",
  "MNC",
  "MC",
] as const;

export const branchToDeptMap: Record<
  (typeof allowedBranches)[number],
  { deptName: string; semPrefix: string }
> = {
  CSE: {
    deptName: "Computer Science and Engineering",
    semPrefix: "B.Tech-CSE",
  },
  CS: { deptName: "Computer Science and Engineering", semPrefix: "B.Tech-CSE" },
  IT: { deptName: "Information Technology", semPrefix: "B.Tech-IT" },
  ECE: {
    deptName: "Electronics and Communication Engineering",
    semPrefix: "B.Tech-ECE",
  },
  EC: {
    deptName: "Electronics and Communication Engineering",
    semPrefix: "B.Tech-ECE",
  },
  EE: { deptName: "Electrical Engineering", semPrefix: "B.Tech-EE" },
  ME: { deptName: "Mechanical Engineering", semPrefix: "B.Tech-ME" },
  CE: { deptName: "Civil Engineering", semPrefix: "B.Tech-CE" },
  BT: { deptName: "Biotechnology", semPrefix: "B.Tech-BT" },
  CH: { deptName: "Chemical Engineering", semPrefix: "B.Tech-CH" },
  CHE: { deptName: "Chemical Engineering", semPrefix: "B.Tech-CH" },
  ICE: {
    deptName: "Instrumentation and Control Engineering",
    semPrefix: "B.Tech-ICE",
  },
  IPE: {
    deptName: "Industrial and Production Engineering",
    semPrefix: "B.Tech-IPE",
  },
  TT: { deptName: "Textile Technology", semPrefix: "B.Tech-TT" },
  MNC: { deptName: "Mathematics & Computing", semPrefix: "B.Tech-MCE" },
  MC: { deptName: "Mathematics & Computing", semPrefix: "B.Tech-MCE" },
};

export async function getHigherYearGroup(
  year: number,
  branch: string,
  group: string,
  subSection?: string,
): Promise<semDataType | null> {
  const branchUpper = branch.trim().toUpperCase();
  const branchInfo = branchToDeptMap[branchUpper];
  if (!branchInfo) {
    throw new Error(`Invalid branch abbreviation: ${branch}`);
  }

  const sessions = await fetch(config.url.sessionAndDept);
  const sessionDeptData = (await sessions.json()) as sessionDeptDataType;

  const currentSessionObj = sessionDeptData.uniqueSessions.find(
    (sess) => sess.currentSession,
  );
  if (!currentSessionObj || !currentSessionObj.session) {
    throw new Error(
      "Current session not found in sessionDeptData.uniqueSessions",
    );
  }
  const currentSession = currentSessionObj.session;
  const isEven = currentSession.toLowerCase().includes("even");

  // Calculate semester number based on college year and odd/even session
  const semNumber = (year - 1) * 2 + (isEven ? 2 : 1);

  // Get the department code
  const codeFetch = await fetch(
    `${config.url.deptCode}/${encodeURIComponent(`${currentSession}`)}/${encodeURIComponent(`${branchInfo.deptName}`)}`,
  );
  if (!codeFetch.ok) {
    throw new Error("Failed to fetch department code from Xceed");
  }
  const code = JSON.parse(await codeFetch.text());
  if (typeof code !== "string" || code.trim() === "") {
    throw new Error("Unexpected code format from Xceed API");
  }

  // Fetch the semesters list for this department code
  const semFetch = await fetch(`${config.url.sem}${encodeURIComponent(code)}`);
  if (!semFetch.ok) {
    throw new Error("Failed to fetch semester data from Xceed");
  }
  const semData = (await semFetch.json()) as semArrDataType;

  const grpUpper = group.trim().toUpperCase();
  const subUpper = subSection ? subSection.trim().toUpperCase() : "";

  // Attempt pattern match with subsection first: e.g. B.Tech-CSE-4A1 or B.Tech-CSE-4A-1
  const targetPatternWithSub1 = `${branchInfo.semPrefix}-${semNumber}${grpUpper}${subUpper}`;
  const targetPatternWithSub2 = `${branchInfo.semPrefix}-${semNumber}${grpUpper}-${subUpper}`;

  const targetPattern = `${branchInfo.semPrefix}-${semNumber}${grpUpper}`; // e.g. B.Tech-CSE-4A
  const fallbackPattern2 = `${branchInfo.semPrefix}-${semNumber}-${grpUpper}`;
  const fallbackPattern3 = `${branchInfo.semPrefix}-${semNumber}`; // e.g. if single section like B.Tech-CSE-8

  let semEntry: semDataType | undefined;

  if (subUpper) {
    semEntry = semData.find(
      (entry) =>
        entry.code === code &&
        (entry.sem.toUpperCase() === targetPatternWithSub1.toUpperCase() ||
          entry.sem.toUpperCase().includes(targetPatternWithSub1.toUpperCase()) ||
          entry.sem.toUpperCase() === targetPatternWithSub2.toUpperCase() ||
          entry.sem.toUpperCase().includes(targetPatternWithSub2.toUpperCase())),
    );
  }

  if (!semEntry) {
    semEntry = semData.find(
      (entry) =>
        entry.code === code &&
        (entry.sem.toUpperCase() === targetPattern.toUpperCase() ||
          entry.sem.toUpperCase().includes(targetPattern.toUpperCase()) ||
          entry.sem.toUpperCase().includes(fallbackPattern2.toUpperCase())),
    );
  }

  if (!semEntry) {
    semEntry = semData.find(
      (entry) =>
        entry.code === code &&
        entry.sem.toUpperCase() === fallbackPattern3.toUpperCase(),
    );
  }

  if (!semEntry) {
    semEntry = semData.find(
      (entry) =>
        entry.code === code &&
        entry.sem.toUpperCase().includes(branchInfo.semPrefix.toUpperCase()) &&
        entry.sem.includes(`${semNumber}`) &&
        entry.sem.toUpperCase().includes(grpUpper) &&
        (!subUpper || entry.sem.toUpperCase().includes(subUpper)),
    );
  }

  return semEntry || null;
}
