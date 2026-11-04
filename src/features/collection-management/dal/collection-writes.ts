import "server-only";

import type {
  CreateOwnCollectionResult,
  DeleteOwnCollectionResult,
  UpdateOwnCollectionInput,
  UpdateOwnCollectionResult,
} from "../model/collection-management.types";

/** `create_my_collection(title, description)` as the signed-in owner; a failure is a value (design D2, D5). */
export async function createOwnCollection(title: string, description: string | null): Promise<CreateOwnCollectionResult> {
  void title;
  void description;
  throw new Error("not implemented");
}

/** `update_my_collection(...)` as the signed-in owner (design D2, D6). */
export async function updateOwnCollection(input: UpdateOwnCollectionInput): Promise<UpdateOwnCollectionResult> {
  void input;
  throw new Error("not implemented");
}

/** `delete_my_collection(collectionId)` as the signed-in owner; answers the stored title (design D2, D7). */
export async function deleteOwnCollection(collectionId: string): Promise<DeleteOwnCollectionResult> {
  void collectionId;
  throw new Error("not implemented");
}
