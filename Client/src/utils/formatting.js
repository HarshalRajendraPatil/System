/**
 * Formats a number into a human-readable format
 * Examples: 1234 -> "1.2k", 1234567 -> "1.2M", 1234567890 -> "1.2B"
 *
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} - Formatted number string
 */
export const formatNumber = (num, decimals = 1) => {
  if (!Number.isFinite(num)) {
    return '0';
  }

  const absNum = Math.abs(num);
  const toCompact = (value, suffix) => {
    const fixed = Number(value).toFixed(decimals);
    const normalized = fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
    return `${normalized}${suffix}`;
  };

  if (absNum >= 1_000_000_000) {
    return toCompact(num / 1_000_000_000, 'B');
  }

  if (absNum >= 1_000_000) {
    return toCompact(num / 1_000_000, 'M');
  }

  if (absNum >= 1_000) {
    return toCompact(num / 1_000, 'K');
  }

  return num.toString();
};

/**
 * Formats a number for display with thousand separators
 * Examples: 1234 -> "1,234", 1234567 -> "1,234,567"
 *
 * @param {number} num - The number to format
 * @returns {string} - Formatted number string
 */
export const formatNumberWithCommas = (num) => {
  if (!Number.isFinite(num)) {
    return '0';
  }

  return num.toLocaleString('en-US');
};

/**
 * Format percentages for display
 * Examples: 45.678 -> "45.7%", 99 -> "99%"
 *
 * @param {number} value - The decimal value (0-100)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  return value.toFixed(decimals) + '%';
};
