// Public API of the breadcrumbs feature, imported only by the `@breadcrumbs` slot's route files. It reaches
// the authors DAL, so a client import fails the build.
export { Breadcrumbs } from "./components/Breadcrumbs/Breadcrumbs";
