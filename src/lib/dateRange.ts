function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function isValidDateRange(startDate: string, endDate: string) {
  if ((startDate && !parseLocalDate(startDate)) || (endDate && !parseLocalDate(endDate))) return false;
  return !startDate || !endDate || startDate <= endDate;
}

export function isWithinLocalDateRange(value: string, startDate: string, endDate: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;

  if (startDate) {
    const start = parseLocalDate(startDate);
    if (!start || timestamp < start.getTime()) return false;
  }

  if (endDate) {
    const end = parseLocalDate(endDate);
    if (!end) return false;
    end.setDate(end.getDate() + 1);
    if (timestamp >= end.getTime()) return false;
  }

  return true;
}
