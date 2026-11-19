// Shrink a photo before uploading (Session 122). Phone cameras produce 4–8 MB images; this resizes so the
// longest side is at most `maxSide` px and re-encodes as JPEG, which keeps uploads fast on mobile data.
// Falls back to the original file if the browser can't decode it.

export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const url = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    URL.revokeObjectURL(url)
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    if (scale === 1 && file.size < 1.5 * 1024 * 1024 && file.type === 'image/jpeg') return file
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#fff' // transparent PNGs become white, not black
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
