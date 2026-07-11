import { describe, expect, it } from "vitest";
import { parseDelimited } from "@/lib/spatial/parse-csv";

describe("parseDelimited", () => {
  it("parses CSV with headers and quoted commas", () => {
    const rows = parseDelimited('id,name\n1,"Acme, Inc"\n2,Beta');
    expect(rows).toEqual([
      { id: "1", name: "Acme, Inc" },
      { id: "2", name: "Beta" },
    ]);
  });

  it("parses TSV without a header", () => {
    const rows = parseDelimited("a\tb\nc\td", {
      delimiter: "\t",
      hasHeader: false,
    });
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseDelimited("")).toEqual([]);
  });

  it("unescapes doubled quotes inside quoted fields", () => {
    const rows = parseDelimited('id,name\n1,"Say ""hi"""');
    expect(rows[0]?.name).toBe('Say "hi"');
  });
});
