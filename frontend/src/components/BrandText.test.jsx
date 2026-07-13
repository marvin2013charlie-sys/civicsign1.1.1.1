/* eslint-env jest */
import React from "react";
import { renderToString } from "react-dom/server";
import { RichTextWithContactEmail } from "./BrandText";

describe("RichTextWithContactEmail", () => {
  it("renders plain strings", () => {
    const html = renderToString(<RichTextWithContactEmail text="Hello world" />);
    expect(html).toContain("Hello world");
  });

  it("passes through React nodes without calling string methods", () => {
    const html = renderToString(
      <RichTextWithContactEmail
        text={
          <>
            See our <strong>Refund Policy</strong> for details.
          </>
        }
      />,
    );
    expect(html).toContain("Refund Policy");
    expect(html).toContain("for details.");
  });
});