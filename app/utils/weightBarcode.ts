export function parseWeightBarcode(
  barcode: string,
): { productCode: string; weightKg: number } | null {
  if (barcode.length !== 13) return null;

  const productCode = barcode.substring(0, 7);
  const weightStr = barcode.substring(7, 12);

  const weightGrams = parseInt(weightStr, 10);
  if (isNaN(weightGrams) || weightGrams <= 0) return null;

  const weightKg = weightGrams / 1000;

  console.log(
    `[WEIGHT-BARCODE] Parsed product barcode: ${productCode}, quantity: ${weightKg}`,
  );

  return { productCode, weightKg };
}

export function tryWeightBarcodeSearch(
  query: string,
): { searchQuery: string; weightKg: number | null } {
  const parsed = parseWeightBarcode(query);
  if (parsed) {
    return { searchQuery: parsed.productCode, weightKg: parsed.weightKg };
  }
  return { searchQuery: query, weightKg: null };
}
