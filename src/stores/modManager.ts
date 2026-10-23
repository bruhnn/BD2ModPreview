import { defineStore } from "pinia";
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useLogger } from "../composables/useLogger";

interface BD2Mod {
  name: string;
  path: string;
  enabled: boolean;
  errors: string[];
}

export const useModManagerStore = defineStore("modManager", () => {
  const { logMessage } = useLogger()
  let listeners: UnlistenFn[] = []

  const connected = ref(false)

  const mods = ref<BD2Mod[]>([])
  const pending = ref<string[]>([])
  const errors = ref<Record<string, string>>({})
  
  let connecting = false

  async function connect() {
    if (connected.value || connecting) return;
    connecting = true;
    try {
      await invoke("connect_to_bd2mm");
    } catch {
      connected.value = false;
    } finally {
      connecting = false;
    }
  }

  async function initialize() {
    listeners.push(await listen<{ mods: BD2Mod[] }>("bd2mm::state", ({ payload }) => {
      mods.value = payload.mods;
      connected.value = true;
    }));
    listeners.push(await listen("bd2mm::disconnected", () => {
      connected.value = false;
    }));
    window.addEventListener("focus", connect);
    await connect();
  }

  function dispose() {
    listeners.forEach(unlisten => unlisten());
    listeners = [];
    window.removeEventListener("focus", connect);
  }

  async function setEnabled(mod: BD2Mod, enabled: boolean) {
    if (!connected.value || pending.value.includes(mod.name)) return;
    pending.value.push(mod.name);
    delete errors.value[mod.name];
    try {
      const result = await invoke<{ mods: BD2Mod[] }>("enable_mod_on_bd2mm", { modName: mod.name, enabled });
      mods.value = result.mods;
    } catch (reason) {
      errors.value[mod.name] = String(reason);
      logMessage(errors.value[mod.name], "error");
    } finally {
      pending.value = pending.value.filter(name => name !== mod.name);
    }
  }

  return { connected, mods, pending, errors, initialize, dispose, setEnabled };
});
