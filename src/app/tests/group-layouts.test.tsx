import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AuthorizedLayout from "../(authorized)/layout";
import PublicLayout from "../(public)/layout";

// implements FR-8 of add-route-states
describe.each([
  ["(public)", PublicLayout],
  ["(authorized)", AuthorizedLayout],
])("%s layout", (_name, Layout) => {
  it("renders its child with no wrapper element", () => {
    const { container } = render(
      <Layout>
        <p data-testid="marker">child</p>
      </Layout>,
    );

    expect(container.childNodes).toHaveLength(1);
    expect(container.firstElementChild).toHaveAttribute("data-testid", "marker");
  });
});
