# Electron Window Over Fullscreen Apps (macOS Sonoma)

This guide shows how to make an Electron window appear **above fullscreen apps** on macOS without exiting fullscreen mode.

## The Problem

By default, when you show an Electron window while a macOS app is in fullscreen mode, it forces the fullscreen app to exit fullscreen. This breaks the user experience for menu bar apps and utilities.

## The Solution

Use these specific settings to enable `NSWindowCollectionBehaviorFullScreenAuxiliary` behavior:

### 1. Hide Dock Icon (Menu Bar App)

```javascript
// In your app initialization, after app.whenReady()
if (process.platform === 'darwin') {
  app.dock.hide();
}
```

### 2. Configure BrowserWindow

```javascript
const mainWindow = new BrowserWindow({
  width: 400,
  height: 800,
  show: false,
  frame: false,
  transparent: true,
  resizable: false,
  skipTaskbar: true,
  alwaysOnTop: true,
  type: 'panel', // ⭐ Critical for fullscreen support
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  }
});
```

### 3. Set Window Behavior

```javascript
// Make window appear above fullscreen apps
mainWindow.setAlwaysOnTop(true, 'floating');
mainWindow.setVisibleOnAllWorkspaces(true);
mainWindow.setFullScreenable(false); // ⭐ Sets NSWindowCollectionBehaviorFullScreenAuxiliary

// Optional: Prevent minimizing
mainWindow.setMinimizable(false);
```

## Complete Example

```javascript
const { app, BrowserWindow } = require('electron');

class MyApp {
  async initialize() {
    await app.whenReady();
    
    // Hide dock icon for menu bar app
    if (process.platform === 'darwin') {
      app.dock.hide();
    }
    
    this.createMainWindow();
  }
  
  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 800,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      type: 'panel', // Critical for fullscreen
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Configure fullscreen behavior
    this.mainWindow.setAlwaysOnTop(true, 'floating');
    this.mainWindow.setVisibleOnAllWorkspaces(true);
    this.mainWindow.setFullScreenable(false);
    this.mainWindow.setMinimizable(false);

    this.mainWindow.loadFile('index.html');
  }
}

const myApp = new MyApp();
myApp.initialize();
```

## Key Points

### Why This Works

1. **`type: 'panel'`** - Creates a panel-style window that macOS treats differently
2. **`setFullScreenable(false)`** - Tells macOS to use `NSWindowCollectionBehaviorFullScreenAuxiliary`, which allows the window to appear over fullscreen apps
3. **`setAlwaysOnTop(true, 'floating')`** - Sets the window level to float above other windows
4. **`setVisibleOnAllWorkspaces(true)`** - Makes window appear across all Mission Control spaces
5. **`app.dock.hide()`** - Removes dock icon, making it a pure menu bar app

### Tested On

- ✅ macOS Sonoma (14.x)
- ✅ macOS Ventura (13.x)
- ✅ Electron 33.x

### What This Enables

- Window appears over fullscreen Safari
- Window appears over fullscreen video players
- Window appears over fullscreen games
- Works across Mission Control spaces
- Doesn't force fullscreen apps to exit fullscreen

## Alternative Window Levels

If `'floating'` doesn't work for your use case, try these levels:

```javascript
// From lowest to highest priority
mainWindow.setAlwaysOnTop(true, 'normal');        // 0 - Regular windows
mainWindow.setAlwaysOnTop(true, 'floating');      // 3 - Floating windows (recommended)
mainWindow.setAlwaysOnTop(true, 'torn-off-menu'); // 3 - Same as floating
mainWindow.setAlwaysOnTop(true, 'modal-panel');   // 8 - Modal dialogs
mainWindow.setAlwaysOnTop(true, 'main-menu');     // 24 - Menu bar level
mainWindow.setAlwaysOnTop(true, 'status');        // 25 - Above menu bar
mainWindow.setAlwaysOnTop(true, 'pop-up-menu');   // 101 - Popup menus
mainWindow.setAlwaysOnTop(true, 'screen-saver');  // 1000 - Screen saver level
```

For most menu bar apps, **`'floating'`** is the sweet spot.

## Common Issues

### Window Still Exits Fullscreen

Make sure you have **all three** critical settings:
- `type: 'panel'` in BrowserWindow options
- `setFullScreenable(false)` called on the window
- `app.dock.hide()` called (for menu bar apps)

### Window Not Visible

Check that:
- `setAlwaysOnTop(true, 'floating')` is called
- `setVisibleOnAllWorkspaces(true)` is called
- Window is actually shown with `window.show()`

### Works on Some Apps But Not Others

Some apps use custom fullscreen implementations. The solution works for:
- ✅ Safari fullscreen
- ✅ Chrome fullscreen
- ✅ Video players (VLC, QuickTime)
- ✅ Most native macOS apps
- ⚠️ May not work with games using exclusive fullscreen

## Credits

Solution compiled from:
- [Electron Issue #10078](https://github.com/electron/electron/issues/10078)
- [Electron Issue #23551](https://github.com/electron/electron/issues/23551)
- Community contributions on GitHub

## License

This guide is public domain. Use it however you want!
