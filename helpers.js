/**
 * Convert bytes to human readable format
 * @param {string|number} bytes - The byte value to convert
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string with appropriate unit
 */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0 || bytes === "0") return "0 B";

  // Convert string to number if needed
  const numBytes = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;

  if (isNaN(numBytes)) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(numBytes) / Math.log(k));

  return parseFloat((numBytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Convert memory percentage to human readable format
 * @param {string|number} freeMemory - Free memory in bytes
 * @param {string|number} totalMemory - Total memory in bytes
 * @returns {object} Object containing formatted values and percentage
 */
function formatMemoryUsage(freeMemory, totalMemory) {
  const free =
    typeof freeMemory === "string" ? parseInt(freeMemory, 10) : freeMemory;
  const total =
    typeof totalMemory === "string" ? parseInt(totalMemory, 10) : totalMemory;

  if (!total || total === 0) {
    return {
      free: "0 B",
      total: "0 B",
      used: "0 B",
      usedPercentage: "0%",
      freePercentage: "0%",
    };
  }

  const used = total - free;
  const usedPercentage = ((used / total) * 100).toFixed(1);
  const freePercentage = ((free / total) * 100).toFixed(1);

  return {
    free: formatBytes(free),
    total: formatBytes(total),
    used: formatBytes(used),
    usedPercentage: `${usedPercentage}%`,
    freePercentage: `${freePercentage}%`,
  };
}

/**
 * Convert HDD space to human readable format
 * @param {string|number} freeSpace - Free HDD space in bytes
 * @param {string|number} totalSpace - Total HDD space in bytes
 * @returns {object} Object containing formatted values and percentage
 */
function formatHddUsage(freeSpace, totalSpace) {
  const free =
    typeof freeSpace === "string" ? parseInt(freeSpace, 10) : freeSpace;
  const total =
    typeof totalSpace === "string" ? parseInt(totalSpace, 10) : totalSpace;

  if (!total || total === 0) {
    return {
      free: "0 B",
      total: "0 B",
      used: "0 B",
      usedPercentage: "0%",
      freePercentage: "0%",
    };
  }

  const used = total - free;
  const usedPercentage = ((used / total) * 100).toFixed(1);
  const freePercentage = ((free / total) * 100).toFixed(1);

  return {
    free: formatBytes(free),
    total: formatBytes(total),
    used: formatBytes(used),
    usedPercentage: `${usedPercentage}%`,
    freePercentage: `${freePercentage}%`,
  };
}

/**
 * Convert CPU frequency to human readable format
 * @param {string|number} frequency - CPU frequency in Hz
 * @returns {string} Formatted frequency string
 */
function formatCpuFrequency(frequency) {
  const freq =
    typeof frequency === "string" ? parseInt(frequency, 10) : frequency;

  if (!freq || freq === 0) return "0 Hz";

  const k = 1000;
  const sizes = ["Hz", "KHz", "MHz", "GHz"];
  const i = Math.floor(Math.log(freq) / Math.log(k));

  return parseFloat((freq / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

module.exports = {
  formatBytes,
  formatMemoryUsage,
  formatHddUsage,
  formatCpuFrequency,
};
