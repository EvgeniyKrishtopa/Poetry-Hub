import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorPhoto } from "../../components/AuthorPhoto/AuthorPhoto";
import { PHOTO_SIZES } from "../../model/author.constants";

const REMOTE_URL = "https://abc.supabase.co/storage/v1/object/public/author-photos/a/b.jpg";
const LOCAL_URL = "http://127.0.0.1:54321/storage/v1/object/public/author-photos/a/b.jpg";

describe("AuthorPhoto", () => {
  // implements FR-14, NFR-5 of add-author-profiles
  it("renders the photo with the alt text «Фото: <full name>»", () => {
    render(<AuthorPhoto photoUrl={REMOTE_URL} fullName="Анна Ахматова" />);

    expect(screen.getByRole("img", { name: "Фото: Анна Ахматова" })).toBeInTheDocument();
  });

  // implements FR-16 of add-author-profiles
  it("gives next/image the sizes hint and keeps optimization for a remote host", () => {
    render(<AuthorPhoto photoUrl={REMOTE_URL} fullName="Анна Ахматова" />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("sizes", PHOTO_SIZES);
    expect(image.getAttribute("src")).toContain("/_next/image");
  });

  // implements FR-16 of add-author-profiles
  it("serves a local-stack photo unoptimized", () => {
    render(<AuthorPhoto photoUrl={LOCAL_URL} fullName="Анна Ахматова" />);

    expect(screen.getByRole("img")).toHaveAttribute("src", LOCAL_URL);
  });

  // implements FR-14, NFR-5 of add-author-profiles
  it("renders a placeholder hidden from assistive technology, with no img, when there is no photo", () => {
    const { container } = render(<AuthorPhoto photoUrl={null} fullName="Анна Ахматова" />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-photo-placeholder]")).toHaveAttribute("aria-hidden", "true");
  });
});
