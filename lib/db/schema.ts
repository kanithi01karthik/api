import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const batch2022Table = sqliteTable("batch2022", {
    rollnumber: integer("rollnumber").primaryKey(),
    name: text("name"),
    branchabbr: text("branchabbr"),
    branch: text("branch"),
    group: text("group"),
    subgroup: text("subgroup"),
});

export const batch2023Table = sqliteTable("batch2023", {
    rollnumber: integer("rollnumber").primaryKey(),
    name: text("name"),
    branchabbr: text("branchabbr"),
    branch: text("branch"),
    group: text("group"),
    subgroup: text("subgroup"),
});

export const batch2024Table = sqliteTable("batch2024", {
    rollnumber: integer("rollnumber").primaryKey(),
    name: text("name"),
    branchabbr: text("branchabbr"),
    branch: text("branch"),
    group: text("group"),
    subgroup: text("subgroup"),
});

export const batch2025Table = sqliteTable("batch2025", {
    rollnumber: integer("rollnumber").primaryKey(),
    name: text("name"),
    branchabbr: text("branchabbr"),
    branch: text("branch"),
    group: text("group"),
    subgroup: text("subgroup"),
});

export const batch2026Table = sqliteTable("batch2026", {
    rollnumber: integer("rollnumber").primaryKey(),
    name: text("name"),
    branchabbr: text("branchabbr"),
    branch: text("branch"),
    group: text("group"),
    subgroup: text("subgroup"),
});
