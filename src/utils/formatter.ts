/**
 * Formats a date string or Date object to "Jan 1st, 2025" style.
 * Example: formatDate("2025-01-01") → "Jan 1st, 2025"
 */
export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return ""; // invalid date guard

  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();

  // ordinal suffix
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";

  return `${month} ${day}${suffix}, ${year}`;
}
