import { readonly, ref } from "vue";

type LogLevel = "info" | "success" | "error" | "warning";

interface LogEntry {
    timestamp: string,
    level: LogLevel,
    message: string
}

const logs = ref<LogEntry[]>([])

export function useLogger() {

    function logMessage(message: string, level: LogLevel = "info"): void {
      let timestamp = new Date().toLocaleTimeString();
      let logEntry: LogEntry = {timestamp, level, message}
      logs.value.push(logEntry)
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }

    function clearLogs() {
        logs.value = [];
    }

    return {
        logs: readonly(logs),
        logMessage,
        clearLogs
    }
}