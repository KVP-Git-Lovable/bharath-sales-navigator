

## Change PWA Logo to Uploaded Image

### Overview
Replace all PWA icon references with the new uploaded logo image.

### Steps

1. **Copy the uploaded image to the public directory** as the base icon file (`public/icons/app-icon.png`)

2. **Update `vite.config.ts`** manifest icons section to reference the new icon file for all sizes (192x192 and 512x512 at minimum)

3. **Update `manifest.json`** to reference the new icon

4. **Update `index.html`** if there are any apple-touch-icon or favicon references pointing to old icons

### Notes
- The single uploaded image will be used for all icon sizes (browsers handle resizing)
- Existing icon files in `/icons/` folder can remain but won't be referenced

