import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "../(public)/page";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

vi.mock("@/features/home", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/home")>()),
  getHomeGreeting: vi.fn(async () => ({
    ok: true,
    greeting: { key: "home", title: "Welcome to Poetry Hub", message: "Hello, reader." },
  })),
}));

describe("home page", () => {
  // implements FR-9 of add-author-poems
  it("holds only the greeting banner: no search box, no clear button, no list", async () => {
    render(await HomePage());

    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { level: 1, name: "Welcome to Poetry Hub" })).toBeInTheDocument();
    expect(within(main).queryByRole("searchbox")).toBeNull();
    expect(within(main).queryByRole("button", { name: "Очистить" })).toBeNull();
    expect(within(main).queryByRole("list")).toBeNull();
  });
});
