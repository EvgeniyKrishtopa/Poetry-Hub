import {
  CollectionListNotice,
  CreateCollectionLink,
  listCollectedPoems,
  OwnCollectionsSection,
} from "@/features/collection-management";
import { MyPoemsPage } from "@/features/poem-management";

// The two features never import each other: the route composes them through MyPoemsPage's slots and hands the
// poem list the membership read, so it shows free poems only (show-only-free-poems D1).
export default function MyPoemsRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <MyPoemsPage
        notices={<CollectionListNotice />}
        actions={<CreateCollectionLink />}
        beforeList={<OwnCollectionsSection />}
        readCollectedPoems={listCollectedPoems}
      />
    </main>
  );
}
