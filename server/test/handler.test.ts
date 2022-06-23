import { checkTimestamp } from "../handler";

test("return false as the timestamp is over 5 days", () => {
  expect(checkTimestamp(+new Date() - 432000001)).toBe(true);
});
test("return false as the timestamp is under 5 days", () => {
  expect(checkTimestamp(+new Date() - 432000000)).toBe(false);
});
test("return false as the timestamp is under 5 days", () => {
  expect(checkTimestamp(+new Date())).toBe(false);
});
