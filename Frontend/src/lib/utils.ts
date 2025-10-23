import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

export const ACCEPTED_FILE_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAcceptedUpload(file: File) {
  if (ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}
