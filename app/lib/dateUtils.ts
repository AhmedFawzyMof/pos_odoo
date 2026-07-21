const EGYPT_TZ = "Africa/Cairo";

export function formatDate(d: string | Date): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ar-EG", {
    timeZone: EGYPT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTime(d: string | Date): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("ar-EG", {
    timeZone: EGYPT_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(d: string | Date): string {
  if (!d) return "";
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatDateLong(d: string | Date): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ar-EG", {
    timeZone: EGYPT_TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateWithTime(d: string | Date): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ar-EG", {
    timeZone: EGYPT_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
