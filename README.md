 🛠️ **If you want to update the mod preview used inside BD2ModManager,**  
> replace the `modpreview.exe` file located at:  
> `%localappdata%/bruhnn/BD2ModManager/tools`  
>  

# BD2ModPreview

A minimal Spine animation viewer used internally by **BD2ModManager**.

---

## 📦 What is this?

**BD2ModPreview** is a lightweight, standalone `.exe` used by BD2ModManager to preview Spine-based mod animations.

It is **not** intended to be a fully-featured Spine viewer.

---

## 💡 How to Use

This tool is typically launched by **BD2ModManager**, but you can run it manually for testing by providing the path to your mod folder:

`BD2ModPreview.exe <path-to-mod-folder>`

Your assets folder must include:

- A `.skel` or `.json` file (Spine data)  
- A `.atlas` file  
- The corresponding `.png` texture(s)

---

## 🔒 Spine Runtime Licensing

This project uses the official Spine runtimes provided by [Esoteric Software](http://esotericsoftware.com/), which are licensed under their own terms.

You **must** have a valid Spine license from Esoteric Software to use or distribute projects built with these runtimes.  
See: [Spine Runtimes License](http://esotericsoftware.com/spine-runtimes-license)

> **Note**: This previewer is distributed for educational and debugging purposes only and is not affiliated with or endorsed by Esoteric Software.

---

## 🔗 Related Project

- [**BD2ModManager**](https://github.com/bruhnn/BD2ModManager): A full-featured mod manager with built-in support for previewing mods using this tool.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
