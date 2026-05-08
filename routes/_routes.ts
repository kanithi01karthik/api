import { healthRoute } from "./health";
import { studentsRoute } from "./students";
import { timeTableRoute } from "./timetable";
import { libraryRoute } from "./library";

export const routes = {
  "/health": healthRoute,
  "/students": studentsRoute,
  "/timetable": timeTableRoute,
  "/library": libraryRoute,
};
