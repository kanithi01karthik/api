<h1 align="center">
  <br>
  <a href="https://opensourcenitj.com/api">
    <img src="./assets/readmeBanner.jpg" alt="os-api">
  </a>
  <br>
  OpensourceNITJ - API
  <br>
</h1>

<h4 align="center">By Developers, For Developers</h4>

<p align="center">
  <a href="https://opensourcenitj.com">
    <img alt="OpenSourceNITJ" src="https://img.shields.io/badge/OpenSourceNITJ-community?color#2596be">
  </a>
  <a href="https://github.com/opensourcenitj/api">
    <img alt="GitHub version" src="https://img.shields.io/github/package-json/v/Opensource-NITJ/api?color=ffffff">
  </a>
  <a href="https://github.com/opensourcenitj/api">
    <img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/Opensource-NITJ/api?color=ffffff">
  </a>
</p>

### Features

- Get student group or section using roll number — supports **all 4 years**
- Get timetables for **1st, 2nd, 3rd, and 4th year** students, fetched live from Xceed
- Get real-time library seat availability

### Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [Hono](https://hono.dev) with `@hono/zod-openapi`
- **Database**: SQLite via [Drizzle ORM](https://orm.drizzle.team)
- **Validation**: [Zod](https://zod.dev)

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Installation

```bash
bun install
```

### Database Setup

Before starting the server, seed the database with student data:

```bash
bun seed.ts
```

> **Note:** `seed.ts` creates all batch tables (`batch2022`–`batch2026`) and inserts sample records. Replace these with your real data before deploying.

### Running the Server

```bash
bun server.ts
```

Server starts on port **6969** by default.

### Running Tests

```bash
bun test test.spec.ts
```

### OpenAPI Docs

The full interactive OpenAPI spec is served at:

```
http://localhost:6969/openapi
```

---

## Routes

### Base URL

```
https://api.opensourcenitj.com
```

---

### Health Check

```http
GET /health
```

Returns the health status of the API server.

#### Response (200)

```json
{
  "status": "ok",
  "uptime": 12345.67,
  "timestamp": "2026-01-16T14:32:10.123Z"
}
```

| Field     | Type   | Description              |
| --------- | ------ | ------------------------ |
| status    | string | Health status of the API |
| uptime    | number | Server uptime in seconds |
| timestamp | string | ISO 8601 timestamp       |

---

### Get Library Seat Availability

```http
GET /library/getSeats
```

Returns real-time library seat availability information across all floors.

#### Response (200)

```json
{
  "totalAvailableSeats": 390,
  "totalCapacity": 390,
  "capacity": [
    {
      "floor": "Floor 1",
      "occupiedSeats": 0,
      "availableSeats": 114,
      "totalSeats": 114,
      "availableSeatIds": [1, 2, 3]
    }
  ]
}
```

| Field               | Type     | Description                           |
| ------------------- | -------- | ------------------------------------- |
| totalAvailableSeats | number   | Total available seats in the library  |
| totalCapacity       | number   | Total seating capacity of the library |
| capacity            | object[] | Floor-wise seating statistics         |

#### `capacity` Object

| Field            | Type     | Description                                  |
| ---------------- | -------- | -------------------------------------------- |
| floor            | string   | Floor name                                   |
| occupiedSeats    | number   | Number of occupied seats on the floor        |
| availableSeats   | number   | Number of available seats on the floor       |
| totalSeats       | number   | Total seats available on the floor           |
| availableSeatIds | number[] | Available seat numbers relative to the floor |

#### Error Response (404)

```json
{ "error": "Library information not found" }
```

---

### Get Student Group

```http
GET /students/getGroup
```

Returns the group/section and subgroup of a student based on their roll number. Supports students from **all years** (batches 2022–2026). The batch is automatically inferred from the first two digits of the roll number.

#### Query Parameters

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| rollNumber | string | ✅       | Roll number of student (8–10 digits) |

#### Response (200)

```json
{
  "group": "B6",
  "subGroup": "a"
}
```

For higher-year students, `group` will reflect their branch section (e.g. `CSE-A`) and `subGroup` their lab batch identifier (e.g. `1`).

| Field    | Type            | Description                                        |
| -------- | --------------- | -------------------------------------------------- |
| group    | string          | Student group or section (e.g. `B6`, `CSE-A`)      |
| subGroup | string \| null  | Student subgroup or lab batch (e.g. `a`, `1`, `2`) |

#### Error Response (404)

```json
{ "message": "Group not found for the provided roll number." }
```

---

### Get First Year Timetable

```http
GET /timetable/year/1
```

Returns the live timetable for first-year students, fetched directly from Xceed.

#### Query Parameters

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| group     | string | ✅       | Common group (`A1`–`B6`)     |

#### Response (200)

```json
{
  "timetableData": {
    "Monday": {
      "period1": [
        [
          {
            "subject": "Maths",
            "faculty": "Dr. Sharma",
            "room": "LT-1"
          }
        ]
      ]
    }
  },
  "notes": ["Practical classes start next week"]
}
```

#### Error Responses

| Status | Description                      |
| ------ | -------------------------------- |
| 400    | Invalid `group` parameter        |
| 502    | Failed to fetch data from Xceed  |
| 500    | Internal server error            |

---

### Get Higher Year Timetable

```http
GET /timetable/year/:year
```

Returns the live timetable for **2nd, 3rd, or 4th year** students for a specific branch and section, fetched directly from Xceed. The correct semester is automatically resolved based on the current academic session (Odd/Even).

#### Path Parameters

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| year      | number | ✅       | Academic year: `2`, `3`, or `4` |

#### Query Parameters

| Parameter | Type   | Required | Description                                             |
| --------- | ------ | -------- | ------------------------------------------------------- |
| branch    | string | ✅       | Department code (see table below). Use the **parent department**, not the specific programme name. |
| group     | string | ❌       | Section letter or identifier (e.g. `A`, `B`). Default: `A` |

#### Department Codes

> **Note:** The `branch` parameter maps to the **department** on Xceed, not your specific programme name.
> Programmes that were introduced under a parent department share its timetable infrastructure:
>
> - **DSE** (Data Science & Engineering, from ~2023) → use `CSE`
> - **AI** (Artificial Intelligence, from 2026) → use `CSE`
> - **VLSI** specialisation → use `ECE`
> - **DS** (Data Science) elective streams → use `IT`
>
> When in doubt, check which department conducts your core theory classes on Xceed.

| Code | Department on Xceed | Programmes covered |
| ---- | ------------------- | ------------------- |
| `CSE` / `CS` | Computer Science and Engineering | B.Tech CSE, DSE (2023+), AI (2026+) |
| `IT`         | Information Technology | B.Tech IT, Data Science streams |
| `ECE` / `EC` | Electronics and Communication Engineering | B.Tech ECE, VLSI specialisation |
| `EE`         | Electrical Engineering | B.Tech EE |
| `ME`         | Mechanical Engineering | B.Tech ME |
| `CE`         | Civil Engineering | B.Tech CE |
| `BT`         | Biotechnology | B.Tech BT |
| `CH` / `CHE` | Chemical Engineering | B.Tech CH |
| `ICE`        | Instrumentation and Control Engineering | B.Tech ICE |
| `IPE`        | Industrial and Production Engineering | B.Tech IPE |
| `TT`         | Textile Technology | B.Tech TT |
| `MNC`        | Mathematics & Computing | B.Tech MNC |

#### Example Request

```http
GET /timetable/year/2?branch=CSE&group=A
```

#### Response (200)

```json
{
  "timetableData": {
    "Monday": {
      "period1": [
        [
          {
            "subject": "DSA",
            "faculty": "Lalatendu Behera",
            "room": "LT-403"
          }
        ]
      ]
    }
  },
  "notes": []
}
```

#### `timetableData` Structure

```ts
Record<
  string,   // Day (e.g. "Monday")
  Record<
    string, // Period (e.g. "period1", "lunch")
    Array<
      Array<{
        subject: string;
        faculty: string;
        room: string;
      }>
    >
  >
>;
```

Each period contains an outer array (one entry per concurrent group/lab batch) and an inner array of classes happening simultaneously.

#### Error Responses

| Status | Description                                               |
| ------ | --------------------------------------------------------- |
| 400    | Invalid `branch` or `group` parameter                     |
| 404    | No timetable section found for the given parameters       |
| 502    | Failed to fetch data from Xceed                           |
| 500    | Internal server error (including upstream timeout)        |

---

## Database Schema

Student data is stored in per-batch SQLite tables (`batch2022` through `batch2026`). Each table has the same schema:

| Column      | Type    | Description                        |
| ----------- | ------- | ---------------------------------- |
| rollnumber  | integer | Primary key — student roll number  |
| name        | text    | Full name                          |
| branchabbr  | text    | Branch abbreviation (e.g. `CSE`)   |
| branch      | text    | Full branch name                   |
| group       | text    | Group or section                   |
| subgroup    | text    | Sub-group or lab batch             |

The correct batch table is automatically selected based on the first two digits of the roll number (e.g. `24xxxxxx` → `batch2024`).

---

## Security

- Input validated via Zod schemas on all endpoints
- Roll numbers validated to be 8–10 numeric digits with a valid year prefix
- Branch abbreviations constrained to a strict allowlist — no raw user input reaches Xceed URLs
- All Xceed fetches have an 8-second timeout
- Secure HTTP headers via `hono/secure-headers`
- CORS restricted to `GET` requests
- Generic error messages in responses — internal details logged server-side only

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/opensourcenitj/api).
