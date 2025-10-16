# PasteBro Assets

## Required Icons

### Tray Icon
- **File**: `tray-icon.png`
- **Size**: 16x16 and 32x32 (for Retina)
- **Format**: PNG with transparency
- **Style**: Simple, monochrome icon that works in both light and dark menu bars
- **Template**: Should be a template image (black with alpha channel)

### App Icon
- **File**: `icon.icns`
- **Sizes needed**: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- **Format**: ICNS (macOS icon format)
- **Style**: Colorful, represents clipboard/paste functionality

## Creating Icons

### For Tray Icon:
1. Create a simple 16x16 black icon with transparency
2. Use a clipboard or paste symbol
3. Save as PNG

### For App Icon:
1. Design icon at 1024x1024
2. Use `iconutil` to convert to ICNS:
   ```bash
   iconutil -c icns icon.iconset
   ```

## Placeholder
Currently using placeholder paths. Replace with actual icons before distribution.
