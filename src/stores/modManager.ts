import { defineStore } from "pinia";
import { ref } from "vue";
import { platform, type ManagerMod as BD2Mod } from "../backends";
import { useLogger } from "../composables/useLogger";

export const useModManagerStore = defineStore("modManager", () => {
  const { logMessage } = useLogger()
  let listeners: (() => void)[] = []

  const connected = ref(false)

  const mods = ref<BD2Mod[]>([])
  const pending = ref<string[]>([])
  const errors = ref<Record<string, string>>({})
  
  let connecting = false

  async function connect() {
    if (connected.value || connecting) return;
    connecting = true;
    try {
      await platform.connectToManager();
    } catch {
      connected.value = false;
    } finally {
      connecting = false;
    }
  }

  async function initialize() {
    listeners.push(await platform.onManagerEvent(event => {
      if (event.type === "state") {
        mods.value = event.mods;
        connected.value = true;
      } else {
        connected.value = false;
      }
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
      const result = await platform.setModEnabledOnManager(mod.name, enabled);
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
