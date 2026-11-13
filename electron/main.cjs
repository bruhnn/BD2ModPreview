const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
} = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const DEV_URL = process.env.ELECTRON_DEV_URL;
const DIST = path.join(__dirname, "..", "dist");

// com.bruhnn.BD2ModPreview
app.setName("BD2ModPreview");
app.setPath(
  "userData",
  path.join(app.getPath("appData"), "com.bruhnn.BD2ModPreview"),
);
const cacheDir = path.join(app.getPath("cache"), "com.bruhnn.BD2ModPreview");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

let win = null;

// errors.rs
const error = (type, message) =>
  message === undefined ? { type } : { type, message };

function handle(command, fn) {
  ipcMain.handle(command, async (_event, args = {}) => {
    try {
      return { ok: true, value: await fn(args) };
    } catch (reason) {
      return {
        ok: false,
        error: reason instanceof Error ? reason.message : reason,
      };
    }
  });
}

// [paths] [--theme ] [--language ]
function launchArgs() {
  const args = process.argv.slice(app.isPackaged ? 1 : 2);
  const result = { paths: [], theme: null, language: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const [flag, inline] = arg.split("=", 2);
    if (flag === "--theme" || flag === "--language") {
      result[flag.slice(2)] = inline ?? args[++i] ?? null;
    } else if (!arg.startsWith("-")) {
      result.paths.push(path.resolve(arg));
    }
  }

  return result;
}

const statePath = path.join(
  app.getPath("userData"),
  "electron-window-state.json",
);

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

function saveWindowState() {
  if (!win) return;
  const state = { ...win.getNormalBounds(), maximized: win.isMaximized() };
  try {
    fs.writeFileSync(statePath, JSON.stringify(state));
  } catch {}
}

const MIME = {
  json: "application/json",
  atlas: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

async function fileToDataUri(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  let data;
  try {
    data = await fsp.readFile(filePath);
  } catch (e) {
    throw error("IOError", `Failed to read file '${fileName}': ${e.message}`);
  }
  return [
    fileName,
    `data:${MIME[ext] ?? "application/octet-stream"};base64,${data.toString("base64")}`,
  ];
}

const MOD_PATTERNS = [
  ["idle", "char"],
  ["cutscene", "cutscene_char"],
  ["illustdating", "illust_dating"],
  ["illustspecial", "illust_special"],
  ["specialillust", "specialillust"],
  ["illusttalk", "illust_talk"],
  ["npc", "npc"],
];

function detectFolderType(entries) {
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name.toLowerCase();
    if (!name.endsWith(".modfile")) continue;
    for (const [type, prefix] of MOD_PATTERNS) {
      if (name.startsWith(prefix))
        return [
          type,
          name.slice(prefix.length, -".modfile".length).split("_")[0],
        ];
    }
  }
  return ["unknown", null];
}

handle("get_spine_assets", async ({ folderPath }) => {
  if (!fs.existsSync(folderPath)) throw error("DirectoryNotFound", folderPath);

  let entries;
  try {
    entries = await fsp.readdir(folderPath, { withFileTypes: true });
  } catch (e) {
    throw error("DirectoryInvalidError", [folderPath, e.message]);
  }

  const rawData = {};
  let skeleton = null;
  let atlas = null;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).slice(1);
    if (!["json", "skel", "atlas", "png"].includes(ext)) continue;

    const [name, uri] = await fileToDataUri(path.join(folderPath, entry.name));
    rawData[name] = uri;
    if (ext === "json" || ext === "skel") skeleton = name;
    if (ext === "atlas") atlas = name;
  }

  if (!skeleton) throw error("MissingSkeletonOrJson");
  if (!atlas) throw error("MissingAtlas");

  const [modType, modId] = detectFolderType(entries);
  return {
    modType,
    modId,
    skeletonFilename: skeleton,
    atlasFilename: atlas,
    rawData,
  };
});

handle("get_mod_backgrounds", async () => {
  throw error(
    "IOError",
    "Mod backgrounds are not implemented in the Electron build yet",
  );
});

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

async function fetchBytes(url, limit) {
  const response = await net.fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (limit && data.length > limit) throw new Error("File is too large");
  return data;
}

async function writeAtomic(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.download`;
  await fsp.writeFile(temporary, data);
  await fsp.rename(temporary, filePath);
}

const AUDIO_SOURCES = [
  [
    "jsDelivr",
    "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/audio/dating/",
  ],
  [
    "GitHub",
    "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/master/audio/dating/",
  ],
];

handle("get_dating_audio", async ({ hash }) => {
  if (!/^[0-9a-f]{64}$/.test(hash)) throw "Invalid audio hash";
  const filePath = path.join(cacheDir, "dating-audio", `${hash}.ogg`);

  try {
    const cached = await fsp.readFile(filePath);
    if (sha256(cached) === hash)
      return { data: cached.toString("base64"), failures: [] };
    await fsp.rm(filePath, { force: true });
  } catch {}

  const failures = [];
  for (const [source, base] of AUDIO_SOURCES) {
    try {
      const data = await fetchBytes(`${base}${hash}.ogg`, 20 * 1024 * 1024);
      if (data.subarray(0, 4).toString() !== "OggS" || sha256(data) !== hash)
        throw new Error("Dating audio verification failed");
      await writeAtomic(filePath, data);
      return { data: data.toString("base64"), failures };
    } catch (e) {
      failures.push(`${source}: ${e.message}`);
    }
  }
  throw failures.join("; ");
});

const BACKGROUND_SOURCES = [
  "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/backgrounds/cutscene/",
  "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/master/backgrounds/cutscene/",
];
const backgroundsDir = path.join(cacheDir, "game-backgrounds");

handle("get_game_background", async ({ hash }) => {
  if (!/^[0-9a-f]{64}$/.test(hash)) throw "Invalid background hash";
  const filePath = path.join(backgroundsDir, `${hash}.webp`);
  let data = await fsp.readFile(filePath).catch(() => null);

  if (!data) {
    const errors = [];
    for (const base of BACKGROUND_SOURCES) {
      try {
        const downloaded = await fetchBytes(`${base}${hash}.webp`);
        if (sha256(downloaded) !== hash) throw new Error("checksum mismatch");
        data = downloaded;
        break;
      } catch (e) {
        errors.push(`${base}: ${e.message}`);
      }
    }
    if (!data) throw errors.join("; ");
    await writeAtomic(filePath, data);
  }

  return `data:image/webp;base64,${data.toString("base64")}`;
});

handle("has_game_backgrounds", async ({ hashes }) =>
  hashes.every((hash) =>
    fs.existsSync(path.join(backgroundsDir, `${hash}.webp`)),
  ),
);

handle("get_game_background_cache_size", async () => {
  const entries = await fsp.readdir(backgroundsDir).catch(() => []);
  const sizes = await Promise.all(
    entries.map((name) =>
      fsp.stat(path.join(backgroundsDir, name)).then(
        (s) => s.size,
        () => 0,
      ),
    ),
  );
  return sizes.reduce((sum, size) => sum + size, 0);
});

handle("clear_game_background_cache", async () => {
  await fsp.rm(backgroundsDir, { recursive: true, force: true });
});

handle("get_version", async () => app.getVersion());
handle("get_user_locale", async () => app.getSystemLocale() || "en-US");
handle("get_launch_args", async () => launchArgs());
handle("open_url", async ({ url }) => {
  if (!/^https?:\/\//.test(url)) throw "Only http(s) links can be opened";
  await shell.openExternal(url);
});

handle("get_machine_id", async () => {
  const id = ["/etc/machine-id", "/var/lib/dbus/machine-id"]
    .map((file) => {
      try {
        return fs.readFileSync(file, "utf8").trim();
      } catch {
        return "";
      }
    })
    .find(Boolean);
  if (!id) throw error("MachineIdNotFound");
  return sha256(
    Buffer.concat([
      Buffer.from("BD2ModPreview"),
      Buffer.from(id.toLowerCase()),
    ]),
  );
});

handle("show_window", async () => win?.show());
handle("is_always_on_top", async () => win?.isAlwaysOnTop() ?? false);
handle("set_always_on_top", async ({ value }) => win?.setAlwaysOnTop(value));

handle("pick_folder", async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

handle("save_file", async ({ defaultName, filters, bytes }) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters,
  });
  if (result.canceled || !result.filePath) return null;
  await fsp.writeFile(result.filePath, Buffer.from(bytes));
  return result.filePath;
});


function appDataPath(relative) {
  const root = app.getPath("userData");
  const full = path.resolve(root, relative);
  if (!full.startsWith(root + path.sep))
    throw "Path is outside the app data folder";
  return full;
}

handle("read_app_data_text", async ({ path: relative }) => {
  try {
    return await fsp.readFile(appDataPath(relative), "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
});

handle("write_app_data_text", async ({ path: relative, text }) => {
  await writeAtomic(appDataPath(relative), text);
});

function createWindow() {
  const state = loadWindowState();

  win = new BrowserWindow({
    title: "BD2ModManager - Mod Preview",
    width: state.width ?? 800,
    height: state.height ?? 600,
    x: state.x,
    y: state.y,
    minWidth: 360,
    minHeight: 360,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (state.maximized) win.maximize();
  win.removeMenu();

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (details) => {
    if (!details.url.startsWith(DEV_URL ?? "app://")) details.preventDefault();
  });

  win.on("close", saveWindowState);
  win.on("closed", () => (win = null));

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadURL("app://bundle/index.html");
}

app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
    if (!file.startsWith(DIST))
      return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  createWindow();
});

app.on("window-all-closed", () => app.quit());
