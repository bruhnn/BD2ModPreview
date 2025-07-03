import { getMatches } from '@tauri-apps/plugin-cli';
import { logMessage } from './logger';
import { loadSpine } from './spine-player';
import { initializeUI, showViewerError } from './ui';
import { listen } from '@tauri-apps/api/event';

interface DragDropPayload {
  paths: string[];
}

// interface CliPayload {
//   path: string
// }

function initializeDragAndDrop(): void {
  listen<DragDropPayload>('tauri://drag-drop', (event) => {
    const filePath = event.payload.paths[0];
    if (filePath) {
      logMessage(`File dropped: ${filePath}`);
      loadSpine(filePath);
    }
  });
  logMessage("Drag and drop listener initialized.");
}

// function initializeCli() {
//   listen<CliPayload>('load-from-cli', (event) => {
//     const filePath = event.payload.path
//     if (filePath) {
//       logMessage(`File received from CLI: ${filePath}`)
//       loadSpine(filePath)
//     }
//   })
// }

async function loadFromCli(): Promise<void> {
  try {
    const matches = await getMatches();
    const pathArg = matches.args.path?.value;

    if (typeof pathArg === 'string' && pathArg) {
      logMessage(`Found 'path' argument from CLI: ${pathArg}`);
      await loadSpine(pathArg);
    } else {
      logMessage("No CLI 'path' argument provided. Waiting for user interaction.");
    }
  } catch (e) {
    showViewerError(`Error processing CLI arguments: ${e}`);
  }
}

function main() {
  document.addEventListener('DOMContentLoaded', () => {
    logMessage("Application starting...");
    initializeUI();
    // initializeCli();
    initializeDragAndDrop();
    loadFromCli()
  });
}

main();
