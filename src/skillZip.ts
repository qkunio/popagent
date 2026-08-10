import type { SkillAppFile } from './types'

const encoder = new TextEncoder()

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  parts.forEach(part => { output.set(part, offset); offset += part.length })
  return output
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear())
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

function safePath(path: string) {
  return path.replace(/\\/g, '/').split('/').filter(part => part && part !== '.' && part !== '..').join('/')
}

export function createSkillZip(files: SkillAppFile[], folders: string[]) {
  const folderSet = new Set<string>()
  const registerFolder = (path: string) => {
    const parts = safePath(path).split('/').filter(Boolean)
    for (let index = 1; index <= parts.length; index += 1) folderSet.add(parts.slice(0, index).join('/'))
  }
  folders.forEach(registerFolder)
  files.forEach(file => {
    const parts = safePath(file.path).split('/')
    if (parts.length > 1) registerFolder(parts.slice(0, -1).join('/'))
  })

  const entries = [
    ...[...folderSet].sort().map(path => ({ name: `${path}/`, data: new Uint8Array(), directory: true })),
    ...files.map(file => ({ name: safePath(file.path), data: encoder.encode(file.content), directory: false })),
  ].filter(entry => entry.name)

  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0
  const stamp = dosDateTime()

  entries.forEach(entry => {
    const name = encoder.encode(entry.name)
    const checksum = crc32(entry.data)
    const local = new Uint8Array(30 + name.length + entry.data.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, stamp.time, true)
    localView.setUint16(12, stamp.date, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, entry.data.length, true)
    localView.setUint32(22, entry.data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(entry.data, 30 + name.length)
    localParts.push(local)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, stamp.time, true)
    centralView.setUint16(14, stamp.date, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, entry.data.length, true)
    centralView.setUint32(24, entry.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(38, entry.directory ? 0x10 : 0, true)
    centralView.setUint32(42, localOffset, true)
    central.set(name, 46)
    centralParts.push(central)
    localOffset += local.length
  })

  const central = concat(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, central.length, true)
  endView.setUint32(16, localOffset, true)
  const archive = concat([...localParts, central, end])
  return new Blob([archive.buffer as ArrayBuffer], { type: 'application/zip' })
}

export function downloadSkillZip(name: string, files: SkillAppFile[], folders: string[]) {
  const blob = createSkillZip(files, folders)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'skill'}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
