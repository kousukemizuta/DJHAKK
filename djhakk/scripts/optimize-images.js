/**
 * Image Optimization Script
 * Converts images to WebP format and generates responsive sizes
 * 
 * Usage: node scripts/optimize-images.js
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

const INPUT_DIR = './public/images';
const OUTPUT_DIR = './public/images/optimized';

// Responsive breakpoints
const SIZES = [
  { width: 320, suffix: '-sm' },
  { width: 640, suffix: '-md' },
  { width: 1024, suffix: '-lg' },
  { width: 1920, suffix: '-xl' },
];

// Supported input formats
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

async function optimizeImage(inputPath, filename) {
  const ext = extname(filename).toLowerCase();
  const name = basename(filename, ext);
  
  if (!SUPPORTED_FORMATS.includes(ext)) {
    console.log(`⏭️  Skipping ${filename} (unsupported format)`);
    return;
  }
  
  console.log(`🖼️  Processing ${filename}...`);
  
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  
  // Generate WebP versions at different sizes
  for (const size of SIZES) {
    // Skip if original is smaller
    if (metadata.width && metadata.width < size.width) continue;
    
    const outputName = `${name}${size.suffix}.webp`;
    const outputPath = join(OUTPUT_DIR, outputName);
    
    await sharp(inputPath)
      .resize(size.width, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    console.log(`   ✅ ${outputName}`);
  }
  
  // Also create original size WebP
  const outputName = `${name}.webp`;
  const outputPath = join(OUTPUT_DIR, outputName);
  
  await sharp(inputPath)
    .webp({ quality: 85 })
    .toFile(outputPath);
  
  console.log(`   ✅ ${outputName}`);
}

async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      await optimizeImage(fullPath, entry.name);
    }
  }
}

async function main() {
  console.log('🚀 Starting image optimization...\n');
  
  await ensureDir(OUTPUT_DIR);
  
  try {
    await stat(INPUT_DIR);
  } catch (e) {
    console.log(`📁 Creating ${INPUT_DIR}...`);
    await ensureDir(INPUT_DIR);
    console.log('⚠️  No images found. Add images to public/images/ and run again.');
    return;
  }
  
  await processDirectory(INPUT_DIR);
  
  console.log('\n✨ Image optimization complete!');
  console.log(`📁 Optimized images saved to ${OUTPUT_DIR}`);
}

main().catch(console.error);
