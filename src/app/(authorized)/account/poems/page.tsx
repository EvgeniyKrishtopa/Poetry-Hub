import { CollectionListNotice, CreateCollectionLink } from "@/features/collection-management";
import { MyPoemsPage } from "@/features/poem-management";
import { WorkBoard } from "@/features/work-ordering";

// The three features never import each other: the route composes them through MyPoemsPage's slots (drag-and-drop-ordering D3).
export default function MyPoemsRoutePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <MyPoemsPage notices={<CollectionListNotice />} actions={<CreateCollectionLink />} board={<WorkBoard />} />
    </main>
  );
}
