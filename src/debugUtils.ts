// Simple utility to log to a file for debugging
import fs from 'fs';
export function debugLog(message: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('debug.log', `[${timestamp}] ${message}\n`);
}
