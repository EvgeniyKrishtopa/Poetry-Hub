import type { MyPoemsPageProps } from "../MyPoemsPage/MyPoemsPage.types";

/** What `MyPoemsPage` passes down; rendered on the public-profile branch only (add-poem-collections D3). */
export type MyPoemsContentProps = Pick<MyPoemsPageProps, "actions" | "board">;
