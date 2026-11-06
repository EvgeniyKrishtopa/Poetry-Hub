import { CollectionListNotice, CreateCollectionLink, OwnCollectionsSection } from "@/features/collection-management";
import { MyPoemsPage } from "@/features/poem-management";

// The two features never import each other: the route composes them through MyPoemsPage's slots.
export default function MyPoemsRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <MyPoemsPage
        notices={<CollectionListNotice />}
        actions={<CreateCollectionLink />}
        beforeList={<OwnCollectionsSection />}
      />
    </main>
  );
}
