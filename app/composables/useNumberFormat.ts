export function useNumberFormat() {
  function formatNumber(value: number, decimals = 2): string {
    return (Number(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return { formatNumber };
}
