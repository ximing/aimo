/**
 * Script to generate .icns (macOS) and .ico (Windows) icon files from PNG
 * Run with: node create-icons.js
 *
 * Required dependencies:
 *   npm install --save-dev icns-lib png-to-ico
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate .ico file for Windows
async function generateIco() {
  try {
    const pngToIco = await import('png-to-ico');

    const files = [
      path.join(__dirname, 'icon_16.png'),
      path.join(__dirname, 'icon_32.png'),
      path.join(__dirname, 'icon_48.png'),
      path.join(__dirname, 'icon_256.png'),
    ].filter((f) => fs.existsSync(f));

    const buf = await pngToIco.default(files);
    fs.writeFileSync(path.join(__dirname, 'icon.ico'), buf);
    console.log('✓ Generated icon.ico for Windows');
  } catch (err) {
    console.error('Failed to generate icon.ico:', err.message);
    console.log('  Run: npm install --save-dev png-to-ico');
  }
}

// Generate .icns file for macOS
async function generateIcns() {
  try {
    const { Icns, IcnsImage } = await import('@fiahfy/icns');

    const icns = new Icns();

    const images = [
      { osType: 'icp4', file: 'icon_16.png' },   // 16x16
      { osType: 'icp5', file: 'icon_32.png' },   // 32x32
      { osType: 'icp6', file: 'icon_64.png' },   // 64x64
      { osType: 'ic07', file: 'icon_128.png' },  // 128x128
      { osType: 'ic08', file: 'icon_256.png' },  // 256x256
      { osType: 'ic09', file: 'icon.png' },      // 512x512
    ];

    for (const { osType, file } of images) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        const image = new IcnsImage(osType, data.length, data);
        icns.append(image);
      }
    }

    fs.writeFileSync(path.join(__dirname, 'icon.icns'), icns.data);
    console.log('✓ Generated icon.icns for macOS');
  } catch (err) {
    console.error('Failed to generate icon.icns:', err.message);
    console.log('  Run: pnpm add -D @fiahfy/icns');
  }
}

async function main() {
  console.log('Generating platform-specific icon files...\n');
  await generateIco();
  await generateIcns();
  console.log('\nDone!');
}

main();
