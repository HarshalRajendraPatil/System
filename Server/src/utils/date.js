const ISO_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  if (!ISO_DATE_KEY_REGEX.test(dateKey)) {
    throw new Error('Date key must be in YYYY-MM-DD format');
  }

  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date key');
  }

  return parsed;
};

const shiftDateKey = (dateKey, daysOffset) => {
  const baseDate = parseDateKey(dateKey);
  baseDate.setUTCDate(baseDate.getUTCDate() + daysOffset);
  return toDateKey(baseDate);
};

const getDayDifference = (earlierDateKey, laterDateKey) => {
  const earlier = parseDateKey(earlierDateKey);
  const later = parseDateKey(laterDateKey);

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((later.getTime() - earlier.getTime()) / millisecondsPerDay);
};

module.exports = {
  getDayDifference,
  parseDateKey,
  shiftDateKey,
  toDateKey,
};
