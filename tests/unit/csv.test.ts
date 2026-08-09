import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("builds a header row from column labels", () => {
    const csv = toCsv([{ name: "Widget" }], [{ key: "name", label: "Name" }]);
    expect(csv.split("\n")[0]).toBe("Name");
  });

  it("quotes values containing commas", () => {
    const csv = toCsv([{ name: "Widget, Blue" }], [{ key: "name", label: "Name" }]);
    expect(csv.split("\n")[1]).toBe('"Widget, Blue"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const csv = toCsv([{ note: 'Said "hello"' }], [{ key: "note", label: "Note" }]);
    expect(csv.split("\n")[1]).toBe('"Said ""hello"""');
  });

  it("quotes values containing newlines", () => {
    const csv = toCsv([{ note: "line1\nline2" }], [{ key: "note", label: "Note" }]);
    expect(csv.split("\n").slice(1).join("\n")).toBe('"line1\nline2"');
  });

  it("renders null and undefined as empty strings", () => {
    const csv = toCsv([{ a: null, b: undefined }], [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ]);
    expect(csv.split("\n")[1]).toBe(",");
  });

  it("renders one row per data item in column order", () => {
    const csv = toCsv(
      [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
      [
        { key: "b", label: "B" },
        { key: "a", label: "A" },
      ]
    );
    const lines = csv.split("\n");
    expect(lines).toEqual(["B,A", "2,1", "4,3"]);
  });
});
