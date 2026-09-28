// Public API of the home feature. Server-only: the DAL export makes client imports fail the build.
export { getHomeGreeting } from "./api/home-greeting.dal";
export { HomeGreeting } from "./components/HomeGreeting/HomeGreeting";
export type { Greeting } from "./model/greeting.schema";
export { resolveGreeting } from "./model/resolve-greeting";
