/**
 * Resize new local images and upload them to Supabase Storage.
 *
 * Walks the folder tree under `photos/` or `photo/` and uses the directory
 * structure directly as the storage path. New files keep their original base
 * name and generated variants are saved as `cover-<name>.webp` and
 * `thumb-<name>.webp`. After a successful
 * upload, local `cover` and `thumb` files are kept on disk while the original
 * input file is deleted so the script stays incremental.
 *
 * Usage:
 *   node scripts/upload-images.mjs                          # all folders
 *   node scripts/upload-images.mjs kolonie/sportowe/rolki   # specific subfolder only
 *
 * Install deps first:
 *   npm install sharp dotenv
 */

import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

for (const envName of ['.env.local', '.env']) {
  const envPath = path.join(PROJECT_ROOT, envName)
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false })
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in environment')
if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const BUCKET = 'event-library'
const PHOTO_DIR_CANDIDATES = [
  path.resolve(PROJECT_ROOT, '..', 'photos'),
  path.resolve(PROJECT_ROOT, '..', 'photo'),
]
const PHOTO_DIR = PHOTO_DIR_CANDIDATES.find((candidate) => existsSync(candidate)) || PHOTO_DIR_CANDIDATES[0]

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.avif'])

const PRESETS = [
  { suffix: 'cover', width: 1400, quality: 78 },
  { suffix: 'thumb', width: 480, quality: 70 },
]

function normalizeSubFolder(inputPath) {
  if (!inputPath) {
    return ''
  }

  const normalized = inputPath.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '')
  return normalized.replace(/^(photos|photo)\//i, '')
}

function isGeneratedVariant(filename) {
  return /^(cover|thumb)-.+\.webp$/i.test(filename) || /^\d{3,}-(cover|thumb)\.webp$/i.test(filename)
}

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET)
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Failed to create bucket "${BUCKET}": ${error.message}`)
    console.log(`Created bucket: ${BUCKET}`)
  }
}

async function uploadBuffer(storagePath, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed for ${storagePath}: ${error.message}`)
  }
}

async function processImage(localFilePath, storageDirPath) {
  const inputBuffer = await fs.readFile(localFilePath)
  const localDirPath = path.dirname(localFilePath)
  const baseName = path.parse(localFilePath).name

  for (const preset of PRESETS) {
    const outBuffer = await sharp(inputBuffer)
      .resize({ width: preset.width, withoutEnlargement: true })
      .webp({ quality: preset.quality })
      .toBuffer()

    const outputFileName = `${preset.suffix}-${baseName}.webp`
    const localOutputPath = path.join(localDirPath, outputFileName)
    const storagePath = `${storageDirPath}/${outputFileName}`

    await fs.writeFile(localOutputPath, outBuffer)
    console.log(`  Saved locally: ${path.basename(localOutputPath)}`)

    await uploadBuffer(storagePath, outBuffer)
    console.log(`  Uploaded: ${storagePath}`)
  }

  await fs.unlink(localFilePath)
  console.log(`  Deleted local original: ${path.basename(localFilePath)}`)
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const images = entries
    .filter((entry) => (
      entry.isFile()
      && IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())
      && !isGeneratedVariant(entry.name)
    ))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))

  if (images.length > 0) {
    const storageDirPath = path.relative(PHOTO_DIR, dir).split(path.sep).join('/')

    console.log(`\n${storageDirPath} (${images.length} new images)`)

    for (const image of images) {
      console.log(` Processing ${image.name}`)
      await processImage(path.join(dir, image.name), storageDirPath)
    }

    return images.length
  }

  let total = 0
  for (const entry of entries) {
    if (entry.isDirectory()) {
      total += await walk(path.join(dir, entry.name))
    }
  }
  return total
}

async function main() {
  const subFolder = normalizeSubFolder(process.argv[2])
  const scanDir = subFolder ? path.join(PHOTO_DIR, subFolder) : PHOTO_DIR

  try {
    await fs.access(scanDir)
  } catch {
    console.error(`Directory not found: ${scanDir}`)
    process.exit(1)
  }

  await ensureBucket()
  console.log(`Scanning: ${scanDir}`)
  const total = await walk(scanDir)
  console.log(`\nDone. Processed ${total} images.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
