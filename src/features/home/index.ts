// Public API of the home feature. Server-only: the DAL export makes client imports fail the build.
export { getHomeGreeting } from "./dal/home-greeting";
export { HomeGreeting } from "./components/HomeGreeting/HomeGreeting";
export { resolveGreeting } from "./model/resolve-greeting";
