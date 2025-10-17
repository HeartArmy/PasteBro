# PasteBro

A fast, lightweight clipboard manager for macOS that actually works over fullscreen apps.

Inspired by Maccy and PastePal, but built to be faster, simpler, and actually appear above fullscreen apps without forcing you to exit fullscreen mode.

## Why PasteBro?

- **Actually works in fullscreen** - Appears above fullscreen apps without exiting fullscreen mode
- **Blazing fast** - Instant startup, no lag
- **Simple & clean** - Apple-inspired design, no bloat
- **Smart storage** - Doesn't eat your disk space by default

## Installation (macOS Intel)

1. Download the latest `.dmg` from [Releases](../../releases)
2. Open the `.dmg` file
3. Drag **PasteBro.app** to your **Applications** folder
4. Done!

**To auto-launch at login:** Since this is an unsigned app, you need to add it manually:
- Go to System Preferences → Users & Groups → Login Items
- Click the `+` button and select PasteBro from Applications

## Usage

- Press **Cmd+L** (or your custom hotkey) to open the sidebar
- Click any item to select it
- Double-click or press **Cmd+C** to copy
- **Shift+Click** to select multiple items in order
- **Cmd+Click** to select individual items

## Important: Image Storage Setting ⚠️

**Keep "Save images to disk" UNCHECKED** (default)

Why? Storing images:
- Eats up storage REALLY quickly (20MB+ per screenshot)
- Slows down your Mac
- Still being optimized

For most use cases (text, code, links), you don't need image storage. The app tracks image metadata without saving the actual files, keeping things fast and lean.

If you really need image storage, enable it in Preferences → Storage, but be warned!

## Features

✅ Text & rich text with formatting  
✅ Multi-item selection and paste  
✅ Pin important items  
✅ Search history  
✅ Source app tracking  
✅ Trash & restore  
✅ Import/export history  
✅ Works over fullscreen apps  
✅ Customizable hotkeys  

🚧 Image storage (experimental - keep disabled)

## Development

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build for Intel Mac
npm run build:intel

# Build for Apple Silicon
npm run build:arm

# Build for both
npm run build
```

## Requirements

- macOS 10.15 or later
- Intel or Apple Silicon Mac


## License

MIT

## Credits

Email - arhampersonal [at] icloud [dot] com

Built with Electron, better-sqlite3, and sharp.

---

**Give it a shot!** Fast, simple, and actually works. 🚀
