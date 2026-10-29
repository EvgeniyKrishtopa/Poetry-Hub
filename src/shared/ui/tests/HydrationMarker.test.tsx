import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HydrationMarker } from "../HydrationMarker/HydrationMarker";

describe("HydrationMarker", () => {
  afterEach(() => {
    delete document.body.dataset.hydrated;
  });

  it("marks the body as hydrated after mount and renders nothing", () => {
    expect(document.body.dataset.hydrated).toBeUndefined();

    const { container } = render(<HydrationMarker />);

    expect(document.body.dataset.hydrated).toBe("true");
    expect(container).toBeEmptyDOMElement();
  });
});
