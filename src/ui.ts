import { logMessage } from './logger';
import { setPlayerConfig } from './spine-player';

let folderSelection = document.getElementById('folder-selection')
let viewerSection = document.getElementById('viewer-section')
let logOverlay = document.getElementById('log-overlay')
let controlsWrapper = document.getElementById('controls-wrapper')
let expandBtn = document.getElementById('expand-btn')
let controls = document.getElementById('controls')
let premultipliedAlphaCheckbox = document.getElementById("premultipliedAlpha") as HTMLInputElement
let backgroundColorPicker = document.getElementById("backgroundColor") as HTMLInputElement
let folderSelectionMessage = document.getElementById('folder-selection-message')

export function showViewerSection(showViewer: boolean): void {
    viewerSection?.classList.toggle('hidden', !showViewer);
    viewerSection?.classList.toggle('visible', showViewer);
    folderSelection?.classList.toggle('hidden', showViewer);
    folderSelection?.classList.toggle('visible', !showViewer);
}

export function showViewerError(message: string): void {
    showViewerSection(false);
    if (folderSelectionMessage) {
        folderSelectionMessage.textContent = message;
    }
    logMessage(message, 'error');
}

function showLogs(show: boolean): void {
    logOverlay?.classList.toggle('hidden', !show);
}

export function initializeUI(): void {
    logMessage("Initializing UI components and event listeners.");

    expandBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        controlsWrapper?.classList.add('active');
    });

    document.addEventListener('click', () => {
        controlsWrapper?.classList.remove('active');
    });

    controls?.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById("open-logs-btn")?.addEventListener("click", () => showLogs(true));
    document.getElementById("folder-selection-logs-button")?.addEventListener("click", () => showLogs(true));
    document.getElementById('close-log-btn')?.addEventListener('click', () => showLogs(false));

    premultipliedAlphaCheckbox?.addEventListener("change", (event) => {
        const isChecked = (event.target as HTMLInputElement).checked;
        logMessage(`Premultiplied Alpha changed to: ${isChecked}`);
        setPlayerConfig({ premultipliedAlpha: isChecked });
    });

    backgroundColorPicker?.addEventListener("change", (event) => {
        const color = (event.target as HTMLInputElement).value;
        logMessage(`Background color changed to: ${color}`);
        setPlayerConfig({backgroundColor: color})
    });

    logMessage("UI Initialized.");
}
