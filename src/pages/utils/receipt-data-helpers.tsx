// This file contains the data mapping helper functions to ensure correct display of receipt values

/**
 * Safely parses a value to a floating point number
 * Handles various input formats including strings, numbers, and null/undefined
 *
 * @param {any} value - The value to parse
 * @param {number} defaultValue - Default value if parsing fails (default: 0)
 * @returns {number} - The parsed floating point number
 */
export const parseNumericValue = (value, defaultValue = 0) => {
  // Return default if value is null, undefined or empty string
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  // If value is already a number, return it directly
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }

  // Try to parse string to number
  try {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (error) {
    console.warn(`Failed to parse value: ${value}`, error);
    return defaultValue;
  }
};

/**
 * Formats a numeric value to a string with fixed decimal places
 *
 * @param {any} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {number} defaultValue - Default value if parsing fails (default: 0)
 * @returns {string} - Formatted string with fixed decimal places
 */
export const formatNumericValue = (value, decimals = 2, defaultValue = 0) => {
  const parsedValue = parseNumericValue(value, defaultValue);
  return parsedValue.toFixed(decimals);
};

/**
 * Helper function to extract and parse receipt item values
 *
 * @param {Object} item - Receipt item object
 * @returns {Object} - Object with parsed values
 */
export const parseReceiptItem = (item = {}) => {
  return {
    itemName: item.itemName || "",
    grossWeight: parseNumericValue(item.grossWeight),
    stoneWeight: parseNumericValue(item.stoneWeight),
    netWeight: parseNumericValue(item.netWeight),
    finalWeight: parseNumericValue(item.finalWeight),
    stoneAmount: parseNumericValue(item.stoneAmount),
  };
};

/**
 * Helper function to extract and parse receipt totals
 *
 * @param {Object} totals - Receipt totals object
 * @returns {Object} - Object with parsed values
 */
export const parseReceiptTotals = (totals = {}) => {
  return {
    grossWt: parseNumericValue(totals.grossWt),
    stoneWt: parseNumericValue(totals.stoneWt),
    netWt: parseNumericValue(totals.netWt),
    finalWt: parseNumericValue(totals.finalWt),
    stoneAmt: parseNumericValue(totals.stoneAmt),
  };
};
