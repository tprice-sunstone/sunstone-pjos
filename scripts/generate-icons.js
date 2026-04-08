/**
 * generate-icons.js
 * Generates all Android + iOS app icons and splash screen assets
 * for Sunstone Studio using the sharp image library.
 *
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS_ASSETS = path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets');

// Brand colors
const DEEP_WINE = '#852454';
const WHITE = '#FFFFFF';

// ============================================================
// SVG Generators
// ============================================================

/** Full icon: wine background + white serif "S" */
function fullIconSvg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${DEEP_WINE}"/>
  <text x="50" y="69" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="60" fill="${WHITE}">S</text>
</svg>`);
}

/** Round-clipped icon: same design in a circle */
function roundIconSvg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="100" height="100" fill="${DEEP_WINE}"/>
    <text x="50" y="69" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="60" fill="${WHITE}">S</text>
  </g>
</svg>`);
}

/** Adaptive foreground: white "S" on transparent, in 66% safe zone */
function adaptiveForegroundSvg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">
  <text x="54" y="71" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="50" fill="${WHITE}">S</text>
</svg>`);
}

/** Splash screen: white background, centered wine "S" */
function splashSvg(width, height) {
  const fontSize = Math.min(width, height) * 0.12;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${WHITE}"/>
  <text x="${width / 2}" y="${height / 2 + fontSize * 0.35}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${fontSize}" fill="${DEEP_WINE}">S</text>
</svg>`);
}

/** iOS splash icon: white background, wine "S", 200pt base */
function splashIconSvg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${WHITE}"/>
  <text x="100" y="140" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="130" fill="${DEEP_WINE}">S</text>
</svg>`);
}

// ============================================================
// Size definitions
// ============================================================

const ADAPTIVE_SIZES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const LEGACY_SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

const SPLASH_STANDARD = {
  'drawable-mdpi': [320, 480],
  'drawable-hdpi': [480, 720],
  'drawable-xhdpi': [640, 960],
  'drawable-xxhdpi': [960, 1440],
  'drawable-xxxhdpi': [1280, 1920],
};

const SPLASH_PORT = {
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 720],
  'drawable-port-xhdpi': [640, 960],
  'drawable-port-xxhdpi': [960, 1440],
  'drawable-port-xxxhdpi': [1280, 1920],
};

const SPLASH_LAND = {
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [720, 480],
  'drawable-land-xhdpi': [960, 640],
  'drawable-land-xxhdpi': [1440, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
};

// ============================================================
// Main
// ============================================================

async function main() {
  const generated = [];

  // ----------------------------------------------------------
  // Android Adaptive Icons (foreground + background PNGs)
  // ----------------------------------------------------------
  console.log('Generating Android adaptive icons...');
  for (const [density, size] of Object.entries(ADAPTIVE_SIZES)) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });

    // Foreground: white "S" on transparent
    const fgPath = path.join(dir, 'ic_launcher_foreground.png');
    await sharp(adaptiveForegroundSvg(size)).png().toFile(fgPath);
    generated.push(fgPath);

    // Background: solid Deep Wine
    const bgPath = path.join(dir, 'ic_launcher_background.png');
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 133, g: 36, b: 84, alpha: 1 },
      },
    }).png().toFile(bgPath);
    generated.push(bgPath);
  }

  // ----------------------------------------------------------
  // Android Legacy Icons (square + round)
  // ----------------------------------------------------------
  console.log('Generating Android legacy icons...');
  for (const [density, size] of Object.entries(LEGACY_SIZES)) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`);

    const sqPath = path.join(dir, 'ic_launcher.png');
    await sharp(fullIconSvg(size)).png().toFile(sqPath);
    generated.push(sqPath);

    const rdPath = path.join(dir, 'ic_launcher_round.png');
    await sharp(roundIconSvg(size)).png().toFile(rdPath);
    generated.push(rdPath);
  }

  // ----------------------------------------------------------
  // Android Splash Screens
  // ----------------------------------------------------------
  console.log('Generating Android splash screens...');

  // Standard density directories (as specified)
  for (const [folder, [w, h]] of Object.entries(SPLASH_STANDARD)) {
    const dir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(dir, { recursive: true });
    const sp = path.join(dir, 'splash.png');
    await sharp(splashSvg(w, h)).png().toFile(sp);
    generated.push(sp);
  }

  // Base drawable/splash.png
  const baseSplash = path.join(ANDROID_RES, 'drawable', 'splash.png');
  await sharp(splashSvg(480, 800)).png().toFile(baseSplash);
  generated.push(baseSplash);

  // Update existing Capacitor portrait + landscape splash screens
  console.log('Updating Capacitor splash screens (portrait + landscape)...');
  for (const [folder, [w, h]] of Object.entries({ ...SPLASH_PORT, ...SPLASH_LAND })) {
    const dir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(dir, { recursive: true });
    const sp = path.join(dir, 'splash.png');
    await sharp(splashSvg(w, h)).png().toFile(sp);
    generated.push(sp);
  }

  // ----------------------------------------------------------
  // iOS App Icon (1024x1024)
  // ----------------------------------------------------------
  console.log('Generating iOS app icon...');
  const iosIconDir = path.join(IOS_ASSETS, 'AppIcon.appiconset');
  fs.mkdirSync(iosIconDir, { recursive: true });

  const iosIconPath = path.join(iosIconDir, 'AppIcon-1024.png');
  await sharp(fullIconSvg(1024)).png().toFile(iosIconPath);
  generated.push(iosIconPath);

  // Remove old icon file
  const oldIosIcon = path.join(iosIconDir, 'AppIcon-512@2x.png');
  if (fs.existsSync(oldIosIcon)) {
    fs.unlinkSync(oldIosIcon);
    console.log('  Removed old AppIcon-512@2x.png');
  }

  // Write Contents.json
  fs.writeFileSync(
    path.join(iosIconDir, 'Contents.json'),
    JSON.stringify(
      {
        images: [
          {
            filename: 'AppIcon-1024.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
        ],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2
    )
  );

  // ----------------------------------------------------------
  // iOS SplashIcon (1x / 2x / 3x)
  // ----------------------------------------------------------
  console.log('Generating iOS splash icon...');
  const iosSplashIconDir = path.join(IOS_ASSETS, 'SplashIcon.imageset');
  fs.mkdirSync(iosSplashIconDir, { recursive: true });

  const splashScales = [
    { scale: '1x', size: 200, filename: 'splash-icon.png' },
    { scale: '2x', size: 400, filename: 'splash-icon@2x.png' },
    { scale: '3x', size: 600, filename: 'splash-icon@3x.png' },
  ];

  for (const { size, filename } of splashScales) {
    const p = path.join(iosSplashIconDir, filename);
    await sharp(splashIconSvg(size)).png().toFile(p);
    generated.push(p);
  }

  fs.writeFileSync(
    path.join(iosSplashIconDir, 'Contents.json'),
    JSON.stringify(
      {
        images: splashScales.map((s) => ({
          idiom: 'universal',
          scale: s.scale,
          filename: s.filename,
        })),
        info: { author: 'xcode', version: 1 },
      },
      null,
      2
    )
  );

  // ----------------------------------------------------------
  // iOS existing Splash.imageset (update with branded images)
  // ----------------------------------------------------------
  console.log('Updating iOS splash images...');
  const iosExistingSplashDir = path.join(IOS_ASSETS, 'Splash.imageset');
  if (fs.existsSync(iosExistingSplashDir)) {
    const splashFiles = [
      'splash-2732x2732.png',
      'splash-2732x2732-1.png',
      'splash-2732x2732-2.png',
    ];
    for (const filename of splashFiles) {
      const p = path.join(iosExistingSplashDir, filename);
      if (fs.existsSync(p)) {
        await sharp(splashSvg(2732, 2732)).png().toFile(p);
        generated.push(p);
      }
    }
  }

  // ----------------------------------------------------------
  // Report
  // ----------------------------------------------------------
  console.log(`\nGenerated ${generated.length} files:\n`);
  for (const f of generated) {
    const stat = fs.statSync(f);
    const meta = await sharp(f).metadata();
    const rel = path.relative(ROOT, f);
    console.log(
      `  ${rel.replace(/\\/g, '/')} - ${meta.width}x${meta.height} (${(stat.size / 1024).toFixed(1)} KB)`
    );
  }
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
