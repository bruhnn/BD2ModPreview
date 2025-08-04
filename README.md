# BD2ModPreview

A **minimal Spine animation viewer** used internally by [**BD2ModManager**](https://github.com/bruhnn/BD2ModManager).

---

## Overview

**BD2ModPreview** is a lightweight, standalone `.exe` for previewing Spine mod animations.  
It is designed specifically for use with **BD2ModManager** and is **not** a full-featured Spine viewer.

---

## Usage

While this tool is normally launched by **BD2ModManager**, you can run it manually:

```bash
BD2ModPreview.exe <path-to-mod-folder>
```
The mod folder must include:

- .skel or .json file
- .atlas file
- Corresponding .png texture(s)

## Spine Runtime License

This project uses the official Spine runtimes provided by [Esoteric Software](http://esotericsoftware.com/).  
These runtimes are licensed under their own terms, and **you must have a valid Spine license** to use or distribute projects built with them.

[Spine Runtimes License](http://esotericsoftware.com/spine-runtimes-license)

> **Note:** This previewer is for **educational and debugging purposes only**. It is not affiliated with or endorsed by Esoteric Software.

---

## Related Project

- [**BD2ModManager**](https://github.com/bruhnn/BD2ModManager) – Mod manager with built-in support for mod previews using BD2ModPreview.

---

## License

Licensed under the [MIT License](LICENSE).
