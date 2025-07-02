const logContent = document.getElementById('log-content');

export type LogLevel = "info" | "success" | "error" | "warn";

export function logMessage(message: string, level: LogLevel = "info"): void {
  if (!logContent) {
    console.error("Log container element not found in the DOM.");
    return;
  }

  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${level.toLowerCase()}`;

  const timestamp = new Date().toLocaleTimeString();

  logEntry.innerHTML = `
    <span class="timestamp">${timestamp}</span>
    <span class="level">${level.toUpperCase()}</span>
    <span class="message">${message}</span>
  `;

  logContent.appendChild(logEntry);

  logContent.scrollTop = logContent.scrollHeight;

  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}
