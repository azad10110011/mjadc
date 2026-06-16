'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, Select } from '@/components/ui'
import { Save, Image, Trash2, Link as LinkIcon, Plus, GripVertical, Crop, Edit3, Palette } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'
import Cropper, { type Area } from 'react-easy-crop'

interface HeroImage {
  path: string
  cropX: number
  cropY: number
  title?: string
  subtitle?: string
  buttonText?: string
  buttonLink?: string
}

export default function AdminSettingsPage() {
  const [footerText, setFooterText] = useState('')
  const [footerPhoto, setFooterPhoto] = useState('')
  const [footerPhotoFile, setFooterPhotoFile] = useState<File | null>(null)
  const [pageWidth, setPageWidth] = useState('90')
  const [collegePhoto, setCollegePhoto] = useState('')
  const [collegePhotoFile, setCollegePhotoFile] = useState<File | null>(null)
  const [heroImages, setHeroImages] = useState<HeroImage[]>([])
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [cropModalIdx, setCropModalIdx] = useState<number | null>(null)
  const [slideContentIdx, setSlideContentIdx] = useState<number | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [cropZoom, setCropZoom] = useState(1)
  const croppedAreaPctRef = useRef<Area | null>(null)
  const [heroInterval, setHeroInterval] = useState('2')
  const [heroSliderWidth, setHeroSliderWidth] = useState('100')
  const [heroSliderHeight, setHeroSliderHeight] = useState('55')
  const [cardWidth, setCardWidth] = useState('190')
  const [cardHeight, setCardHeight] = useState('0')
  const [cardGap, setCardGap] = useState('5')
  const [principalSignature, setPrincipalSignature] = useState('')
  const [principalSignatureFile, setPrincipalSignatureFile] = useState<File | null>(null)
  const [collegeLogo, setCollegeLogo] = useState('')
  const [collegeLogoFile, setCollegeLogoFile] = useState<File | null>(null)
  const [homeLinkLabel, setHomeLinkLabel] = useState('')
  const [homeLinkUrl, setHomeLinkUrl] = useState('')
  const [headerBg, setHeaderBg] = useState('#ffffff')
  const [headerTextColor, setHeaderTextColor] = useState('#111827')
  const [collegeNameBn, setCollegeNameBn] = useState('')
  const [collegeNameEn, setCollegeNameEn] = useState('')
  const [collegeInfo, setCollegeInfo] = useState('')
  const [logoWidth, setLogoWidth] = useState('')
  const [logoHeight, setLogoHeight] = useState('')
  const [navFontSize, setNavFontSize] = useState('')
  const [nameBnSize, setNameBnSize] = useState('')
  const [nameEnSize, setNameEnSize] = useState('')
  const [infoSize, setInfoSize] = useState('')
  const [collegePhotoWidth, setCollegePhotoWidth] = useState('')
  const [collegePhotoHeight, setCollegePhotoHeight] = useState('')
  const [noticeFontSize, setNoticeFontSize] = useState('')
  const [navWidth, setNavWidth] = useState('100')
  const [navAlign, setNavAlign] = useState('right')
  const [hamburgerBg, setHamburgerBg] = useState('rgba(255,255,255,0.15)')
  const [hamburgerPos, setHamburgerPos] = useState('right')
  const [menuBg, setMenuBg] = useState('#1e3a5f')
  const [menuTextColor, setMenuTextColor] = useState('#ffffff')
  const [menuHoverColor, setMenuHoverColor] = useState('#2563eb')
  const [menuActiveColor, setMenuActiveColor] = useState('#1d4ed8')
  const [navMenu, setNavMenu] = useState<{ label: string; url?: string; children?: { label: string; url?: string; children?: { label: string; url: string }[] }[] }[]>([])
  const [sliderBg, setSliderBg] = useState('#1e3a5f')
  const [noticeBg, setNoticeBg] = useState('#ffffff')
  const [noticeTextColor, setNoticeTextColor] = useState('#4b5563')
  const [menuSections, setMenuSections] = useState<{ title: string; titleSize: string; titleColor: string; titleStyle: string; titleAlign: string; bgColor: string; links: { label: string; url: string }[] }[]>(
    Array.from({ length: 3 }, () => ({ title: '', titleSize: 'text-lg', titleColor: '#111827', titleStyle: 'font-bold', titleAlign: 'text-left', bgColor: '#ffffff', links: [{ label: '', url: '' }] }))
  )

  useEffect(() => {
    api.get<{ status: number; data: { setting_key: string; setting_value: string }[] }>('/admin/settings')
      .then((res) => {
        const footer = res.data.find((s) => s.setting_key === 'footer_text')
        if (footer) setFooterText(footer.setting_value)
        const fphoto = res.data.find((s) => s.setting_key === 'footer_photo')
        if (fphoto) setFooterPhoto(fphoto.setting_value)
        const width = res.data.find((s) => s.setting_key === 'page_width')
        if (width) setPageWidth(width.setting_value)
        const photo = res.data.find((s) => s.setting_key === 'college_photo')
        if (photo) setCollegePhoto(photo.setting_value)
        const hero = res.data.find((s) => s.setting_key === 'hero_images')
        if (hero) {
          try { const parsed = JSON.parse(hero.setting_value); if (Array.isArray(parsed)) setHeroImages(parsed.map((p: any) => typeof p === 'string' ? { path: p, cropX: 50, cropY: 50 } : p)) }
          catch { setHeroImages([]) }
        }
        const interval = res.data.find((s) => s.setting_key === 'hero_interval')
        if (interval) setHeroInterval(interval.setting_value)
        const hll = res.data.find((s) => s.setting_key === 'homepage_link_label')
        if (hll) setHomeLinkLabel(hll.setting_value)
        const hlu = res.data.find((s) => s.setting_key === 'homepage_link_url')
        if (hlu) setHomeLinkUrl(hlu.setting_value)
        const cw = res.data.find((s) => s.setting_key === 'id_card_width')
        if (cw) setCardWidth(cw.setting_value)
        const ch = res.data.find((s) => s.setting_key === 'id_card_height')
        if (ch) setCardHeight(ch.setting_value)
        const cg = res.data.find((s) => s.setting_key === 'id_card_gap')
        if (cg) setCardGap(cg.setting_value)
        const ps = res.data.find((s) => s.setting_key === 'principal_signature')
        if (ps) setPrincipalSignature(ps.setting_value)
        const cl = res.data.find((s) => s.setting_key === 'college_logo')
        if (cl) setCollegeLogo(cl.setting_value)
        const hsw = res.data.find((s) => s.setting_key === 'hero_slider_width')
        if (hsw) setHeroSliderWidth(hsw.setting_value)
        const hsh = res.data.find((s) => s.setting_key === 'hero_slider_height')
        if (hsh) setHeroSliderHeight(hsh.setting_value)
        const ms = res.data.find((s) => s.setting_key === 'homepage_menu_sections')
        if (ms) {
          try { const parsed = JSON.parse(ms.setting_value); if (Array.isArray(parsed) && parsed.length === 3) setMenuSections(parsed) }
          catch {}
        }
        const hbg = res.data.find((s) => s.setting_key === 'header_bg')
        if (hbg?.setting_value) setHeaderBg(hbg.setting_value)
        const htc = res.data.find((s) => s.setting_key === 'header_text_color')
        if (htc?.setting_value) setHeaderTextColor(htc.setting_value)
        const cbn = res.data.find((s) => s.setting_key === 'college_name_bn')
        if (cbn?.setting_value) setCollegeNameBn(cbn.setting_value)
        const cen = res.data.find((s) => s.setting_key === 'college_name_en')
        if (cen?.setting_value) setCollegeNameEn(cen.setting_value)
        const cinf = res.data.find((s) => s.setting_key === 'college_info')
        if (cinf?.setting_value) setCollegeInfo(cinf.setting_value)
        const lw = res.data.find((s) => s.setting_key === 'logo_width')
        if (lw?.setting_value) setLogoWidth(lw.setting_value)
        const lh = res.data.find((s) => s.setting_key === 'logo_height')
        if (lh?.setting_value) setLogoHeight(lh.setting_value)
        const nfs = res.data.find((s) => s.setting_key === 'nav_font_size')
        if (nfs?.setting_value) setNavFontSize(nfs.setting_value)
        const nbs = res.data.find((s) => s.setting_key === 'name_bn_size')
        if (nbs?.setting_value) setNameBnSize(nbs.setting_value)
        const nes = res.data.find((s) => s.setting_key === 'name_en_size')
        if (nes?.setting_value) setNameEnSize(nes.setting_value)
        const infs = res.data.find((s) => s.setting_key === 'info_size')
        if (infs?.setting_value) setInfoSize(infs.setting_value)
        const cpw = res.data.find((s) => s.setting_key === 'college_photo_width')
        if (cpw?.setting_value) setCollegePhotoWidth(cpw.setting_value)
        const cph = res.data.find((s) => s.setting_key === 'college_photo_height')
        if (cph?.setting_value) setCollegePhotoHeight(cph.setting_value)
        const nfss = res.data.find((s) => s.setting_key === 'notice_font_size')
        if (nfss?.setting_value) setNoticeFontSize(nfss.setting_value)
        const mbg = res.data.find((s) => s.setting_key === 'menu_bg')
        if (mbg?.setting_value) setMenuBg(mbg.setting_value)
        const mtc = res.data.find((s) => s.setting_key === 'menu_text_color')
        if (mtc?.setting_value) setMenuTextColor(mtc.setting_value)
        const mhc = res.data.find((s) => s.setting_key === 'menu_hover_color')
        if (mhc?.setting_value) setMenuHoverColor(mhc.setting_value)
        const mac = res.data.find((s) => s.setting_key === 'menu_active_color')
        if (mac?.setting_value) setMenuActiveColor(mac.setting_value)
        const hmbg = res.data.find((s) => s.setting_key === 'hamburger_bg')
        if (hmbg?.setting_value) setHamburgerBg(hmbg.setting_value)
        const hpos = res.data.find((s) => s.setting_key === 'hamburger_pos')
        if (hpos?.setting_value) setHamburgerPos(hpos.setting_value)
        const nw = res.data.find((s) => s.setting_key === 'nav_width')
        if (nw?.setting_value) setNavWidth(nw.setting_value)
        const nal = res.data.find((s) => s.setting_key === 'nav_align')
        if (nal?.setting_value) setNavAlign(nal.setting_value)
        const nm = res.data.find((s) => s.setting_key === 'nav_menu')
        if (nm?.setting_value) {
          try { const parsed = JSON.parse(nm.setting_value); if (Array.isArray(parsed)) setNavMenu(parsed) }
          catch {}
        }
        const sb = res.data.find((s) => s.setting_key === 'slider_bg')
        if (sb?.setting_value) setSliderBg(sb.setting_value)
        const nb = res.data.find((s) => s.setting_key === 'notice_bg')
        if (nb?.setting_value) setNoticeBg(nb.setting_value)
        const nc = res.data.find((s) => s.setting_key === 'notice_text_color')
        if (nc?.setting_value) setNoticeTextColor(nc.setting_value)
      })
      .catch(() => {})
  }, [])

  const handleSaveFooter = () => {
    api.put('/admin/settings/footer_text', { setting_value: footerText })
      .then(() => alert('Footer text saved'))
      .catch(() => {})
  }

  const handleSaveCardDims = () => {
    Promise.all([
      api.put('/admin/settings/id_card_width', { setting_value: cardWidth }),
      api.put('/admin/settings/id_card_height', { setting_value: cardHeight }),
      api.put('/admin/settings/id_card_gap', { setting_value: cardGap }),
    ])
      .then(() => alert('ID card settings saved'))
      .catch(() => {})
  }

  const handleSaveWidth = () => {
    const val = parseInt(pageWidth, 10)
    if (val < 50 || val > 100) { alert('Page width must be between 50 and 100'); return }
    api.put('/admin/settings/page_width', { setting_value: String(val) })
      .then(() => alert('Page width saved'))
      .catch(() => {})
  }

  return (
    <PanelLayout role="admin" title="Settings">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Global Footer Text</h3>
            <p className="mb-2 text-sm text-gray-500">
              This text appears at the bottom of every public-facing page. Changing it here
              updates all pages immediately.
            </p>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
            <Button className="mt-4" onClick={handleSaveFooter}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Footer Photo</h3>
            <p className="mb-2 text-sm text-gray-500">
              A small logo or image displayed in the footer.
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                {footerPhoto && (
                  <img src={`${UPLOAD_BASE}/${footerPhoto}`} alt="Footer" className="h-16 w-auto rounded border object-contain" />
                )}
                <Input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setFooterPhotoFile(e.target.files?.[0] || null)} />
                <Button onClick={async () => {
                  if (!footerPhotoFile) { alert('Select a file first'); return }
                  const formData = new FormData()
                  formData.append('file', footerPhotoFile)
                  formData.append('directory', 'profiles')
                  const res: any = await api.upload('/admin/media/upload', formData)
                  if (!res.data?.path) { alert('Upload failed'); return }
                  await api.put('/admin/settings/footer_photo', { setting_value: res.data.path })
                  setFooterPhoto(res.data.path)
                  setFooterPhotoFile(null)
                  alert('Footer photo saved')
                }}>
                  <Image className="mr-2 h-4 w-4" /> Upload & Save
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Page Width</h3>
            <p className="mb-2 text-sm text-gray-500">
              Set the width of public-facing pages as a percentage of the screen (50–100).
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={50}
                max={100}
                value={pageWidth}
                onChange={(e) => setPageWidth(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-gray-500">%</span>
              <Button onClick={handleSaveWidth}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">ID Card Dimensions</h3>
            <p className="mb-2 text-sm text-gray-500">
              Set the width and height of ID cards in millimeters. Height 0 = auto-height (content determines size).
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Width (mm):</label>
                <Input type="number" min={50} max={300} value={cardWidth} onChange={(e) => setCardWidth(e.target.value)} className="w-24" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Height (mm):</label>
                <Input type="number" min={0} max={400} value={cardHeight} onChange={(e) => setCardHeight(e.target.value)} className="w-24" />
                <span className="text-xs text-gray-400">(0 = auto)</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Gap (mm):</label>
                <Input type="number" min={0} max={50} value={cardGap} onChange={(e) => setCardGap(e.target.value)} className="w-20" />
              </div>
              <Button onClick={handleSaveCardDims}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Principal Signature (ID Card)</h3>
            <p className="mb-2 text-sm text-gray-500">
              Upload the principal&apos;s signature image to display on ID cards.
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                {principalSignature && (
                  <img src={`${UPLOAD_BASE}/${principalSignature}`} alt="Signature" className="h-12 w-auto rounded border object-contain bg-white" />
                )}
                <Input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setPrincipalSignatureFile(e.target.files?.[0] || null)} />
                <Button onClick={async () => {
                  if (!principalSignatureFile) { alert('Select a file first'); return }
                  const formData = new FormData()
                  formData.append('file', principalSignatureFile)
                  formData.append('directory', 'profiles')
                  const res: any = await api.upload('/admin/media/upload', formData)
                  if (!res.data?.path) { alert('Upload failed'); return }
                  await api.put('/admin/settings/principal_signature', { setting_value: res.data.path })
                  setPrincipalSignature(res.data.path)
                  setPrincipalSignatureFile(null)
                  alert('Signature saved')
                }}>
                  <Image className="mr-2 h-4 w-4" /> Upload & Save
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">College Logo (ID Card)</h3>
            <p className="mb-2 text-sm text-gray-500">
              Upload the college logo to display on the top-left of ID cards.
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                {collegeLogo && (
                  <img src={`${UPLOAD_BASE}/${collegeLogo}`} alt="Logo" className="h-16 w-auto rounded border object-contain bg-white" />
                )}
                <Input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={(e) => setCollegeLogoFile(e.target.files?.[0] || null)} />
                <Button onClick={async () => {
                  if (!collegeLogoFile) { alert('Select a file first'); return }
                  const formData = new FormData()
                  formData.append('file', collegeLogoFile)
                  formData.append('directory', 'profiles')
                  const res: any = await api.upload('/admin/media/upload', formData)
                  if (!res.data?.path) { alert('Upload failed'); return }
                  await api.put('/admin/settings/college_logo', { setting_value: res.data.path })
                  setCollegeLogo(res.data.path)
                  setCollegeLogoFile(null)
                  alert('College logo saved')
                }}>
                  <Image className="mr-2 h-4 w-4" /> Upload & Save
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">College Photo</h3>
            <p className="mb-2 text-sm text-gray-500">
              Upload the photo displayed in the &quot;About the College&quot; section on the home page.
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                {collegePhoto && (
                  <img src={`${UPLOAD_BASE}/${collegePhoto}`} alt="College" className="h-40 w-full max-w-xs rounded-lg border object-cover" />
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Width (%):</label>
                    <input type="number" min={10} max={100} value={collegePhotoWidth} onChange={(e) => setCollegePhotoWidth(e.target.value)}
                      className="h-9 w-20 rounded border border-gray-300 px-2 text-sm text-gray-700" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Height (%):</label>
                    <input type="number" min={10} max={100} value={collegePhotoHeight} onChange={(e) => setCollegePhotoHeight(e.target.value)}
                      className="h-9 w-20 rounded border border-gray-300 px-2 text-sm text-gray-700" />
                  </div>
                </div>
                <Input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setCollegePhotoFile(e.target.files?.[0] || null)} />
                <Button onClick={async () => {
                  if (!collegePhotoFile) { alert('Select a file first'); return }
                  try {
                    const formData = new FormData()
                    formData.append('file', collegePhotoFile)
                    formData.append('directory', 'profiles')
                    const res: any = await api.upload('/admin/media/upload', formData)
                    if (!res.data?.path) { alert('Upload failed'); return }
                    await api.put('/admin/settings/college_photo', { setting_value: res.data.path })
                    await api.put('/admin/settings/college_photo_width', { setting_value: collegePhotoWidth })
                    await api.put('/admin/settings/college_photo_height', { setting_value: collegePhotoHeight })
                    setCollegePhoto(res.data.path)
                    setCollegePhotoFile(null)
                    alert('College photo saved')
                  } catch (err: any) { alert(err.message) }
                }}>
                  <Image className="mr-2 h-4 w-4" /> Upload & Save
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">College Header</h3>
            <p className="mb-2 text-sm text-gray-500">
              Configure the header content and colors displayed at the top of every page. Font sizes and logo are responsive — set your desired size at 1920px screen width and it will scale proportionally on all devices.
            </p>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="College Name (Bangla)" value={collegeNameBn} onChange={(e) => setCollegeNameBn(e.target.value)} placeholder="মিঞা জিন্নাহ আলম ডিগ্রী কলেজ" />
                <Input label="College Name (English)" value={collegeNameEn} onChange={(e) => setCollegeNameEn(e.target.value)} placeholder="Miah Jinnah Alam Degree College" />
              </div>
              <Input label="Additional Info (optional)" value={collegeInfo} onChange={(e) => setCollegeInfo(e.target.value)} placeholder="EIIN: 12345, Established: 1990" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Logo Width (leave empty for auto)" type="number" value={logoWidth} onChange={(e) => setLogoWidth(e.target.value)} placeholder="e.g. 80" />
                <Input label="Logo Height (leave empty for auto)" type="number" value={logoHeight} onChange={(e) => setLogoHeight(e.target.value)} placeholder="e.g. 80" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Name (Bangla) Size" type="number" value={nameBnSize} onChange={(e) => setNameBnSize(e.target.value)} placeholder="e.g. 20" />
                <Input label="Name (English) Size" type="number" value={nameEnSize} onChange={(e) => setNameEnSize(e.target.value)} placeholder="e.g. 16" />
                <Input label="Info / EIIN Size" type="number" value={infoSize} onChange={(e) => setInfoSize(e.target.value)} placeholder="e.g. 14" />
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Header BG:</label>
                  <input type="color" value={headerBg} onChange={(e) => setHeaderBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                  <span className="text-xs text-gray-500">{headerBg}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Header Text:</label>
                  <input type="color" value={headerTextColor} onChange={(e) => setHeaderTextColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                  <span className="text-xs text-gray-500">{headerTextColor}</span>
                </div>
              </div>
              <Button onClick={async () => {
                await Promise.all([
                  api.put('/admin/settings/college_name_bn', { setting_value: collegeNameBn }),
                  api.put('/admin/settings/college_name_en', { setting_value: collegeNameEn }),
                  api.put('/admin/settings/college_info', { setting_value: collegeInfo }),
                  api.put('/admin/settings/header_bg', { setting_value: headerBg }),
                  api.put('/admin/settings/header_text_color', { setting_value: headerTextColor }),
                  api.put('/admin/settings/logo_width', { setting_value: logoWidth }),
                  api.put('/admin/settings/logo_height', { setting_value: logoHeight }),
                  api.put('/admin/settings/name_bn_size', { setting_value: nameBnSize }),
                  api.put('/admin/settings/name_en_size', { setting_value: nameEnSize }),
                  api.put('/admin/settings/info_size', { setting_value: infoSize }),
                ])
                alert('Header settings saved')
              }}>
                <Save className="mr-2 h-4 w-4" /> Save Header
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Hero Slider Images</h3>
            <p className="mb-2 text-sm text-gray-500">
              Images for the top banner slider. They auto-change every 2 seconds on the home page.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              {heroImages.map((img, i) => (
                <div key={i} className="relative h-24 w-40 rounded-lg border overflow-hidden group">
                  <img src={`${UPLOAD_BASE}/${img.path}`} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <button onClick={() => setSlideContentIdx(i)} className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => {
                      setCropModalIdx(i)
                      setCrop({ x: 0, y: 0 })
                      setCropZoom(1)
                    }} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-700 hover:bg-blue-100">
                      <Crop className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={async () => {
                      const updated = heroImages.filter((_, j) => j !== i)
                      await api.put('/admin/settings/hero_images', { setting_value: JSON.stringify(updated) })
                      setHeroImages(updated)
                    }} className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} />
              <Button onClick={async () => {
                if (!heroFile) { alert('Select a file first'); return }
                try {
                  const formData = new FormData()
                  formData.append('file', heroFile)
                  formData.append('directory', 'hero')
                  const res: any = await api.upload('/admin/media/upload', formData)
                  if (!res.data?.path) { alert('Upload failed'); return }
                  const updated = [...heroImages, { path: res.data.path, cropX: 50, cropY: 50 }]
                  await api.put('/admin/settings/hero_images', { setting_value: JSON.stringify(updated) })
                  setHeroImages(updated)
                  setHeroFile(null)
                  alert('Hero image added')
                } catch (err: any) { alert(err.message) }
              }}>
                <Image className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-gray-600">Slide interval (seconds):</label>
              <Input type="number" min={1} max={60} value={heroInterval} onChange={(e) => setHeroInterval(e.target.value)} className="w-20" />
              <Button onClick={async () => {
                const val = parseInt(heroInterval, 10)
                if (val < 1) { alert('Minimum 1 second'); return }
                await api.put('/admin/settings/hero_interval', { setting_value: String(val) })
                alert('Interval saved')
              }}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Display Width (% of screen):</label>
                <Input type="number" min={50} max={100} value={heroSliderWidth} onChange={(e) => setHeroSliderWidth(e.target.value)} className="w-20" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Display Height (% of screen):</label>
                <Input type="number" min={20} max={100} value={heroSliderHeight} onChange={(e) => setHeroSliderHeight(e.target.value)} className="w-20" />
              </div>
              <Button onClick={async () => {
                const w = parseInt(heroSliderWidth, 10)
                const h = parseInt(heroSliderHeight, 10)
                if (w < 50 || w > 100) { alert('Width must be 50-100'); return }
                if (h < 20 || h > 100) { alert('Height must be 20-100'); return }
                await Promise.all([
                  api.put('/admin/settings/hero_slider_width', { setting_value: String(w) }),
                  api.put('/admin/settings/hero_slider_height', { setting_value: String(h) }),
                ])
                alert('Slider dimensions saved')
              }}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Homepage Quick Menu Sections</h3>
            <p className="mb-4 text-sm text-gray-500">
              Manage the 3-column link section on the homepage. Each column has a title, title size, and multiple links.
            </p>
            <div className="space-y-6">
              {menuSections.map((section, si) => (
                <div key={si} className="rounded-lg border border-gray-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">Section {si + 1}</h4>
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <Input label="Section Title" placeholder="e.g. Academics" value={section.title}
                      onChange={(e) => {
                        const copy = [...menuSections]
                        copy[si] = { ...copy[si], title: e.target.value }
                        setMenuSections(copy)
                      }}
                    />
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Size</label>
                      <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={section.titleSize}
                        onChange={(e) => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], titleSize: e.target.value }
                          setMenuSections(copy)
                        }}
                      >
                        <option value="text-sm">Small</option>
                        <option value="text-base">Normal</option>
                        <option value="text-lg">Large</option>
                        <option value="text-xl">Extra Large</option>
                        <option value="text-2xl">2XL</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={section.titleColor}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si] = { ...copy[si], titleColor: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-300"
                        />
                        <span className="text-xs text-gray-500">{section.titleColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Style</label>
                      <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={section.titleStyle}
                        onChange={(e) => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], titleStyle: e.target.value }
                          setMenuSections(copy)
                        }}
                      >
                        <option value="font-normal">Normal</option>
                        <option value="font-bold">Bold</option>
                        <option value="italic">Italic</option>
                        <option value="font-bold italic">Bold Italic</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Title Alignment</label>
                      <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={section.titleAlign}
                        onChange={(e) => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], titleAlign: e.target.value }
                          setMenuSections(copy)
                        }}
                      >
                        <option value="text-left">Left</option>
                        <option value="text-center">Center</option>
                        <option value="text-right">Right</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Section Background</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={section.bgColor}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si] = { ...copy[si], bgColor: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-300"
                        />
                        <span className="text-xs text-gray-500">{section.bgColor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {section.links.map((link, li) => (
                      <div key={li} className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
                        <Input placeholder="Link text" value={link.label}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si].links[li] = { ...copy[si].links[li], label: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="flex-1"
                        />
                        <Input placeholder="URL" value={link.url}
                          onChange={(e) => {
                            const copy = [...menuSections]
                            copy[si].links[li] = { ...copy[si].links[li], url: e.target.value }
                            setMenuSections(copy)
                          }}
                          className="flex-1"
                        />
                        <button onClick={() => {
                          const copy = [...menuSections]
                          copy[si] = { ...copy[si], links: copy[si].links.filter((_, j) => j !== li) }
                          setMenuSections(copy)
                        }} className="rounded-md p-1 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => {
                      const copy = [...menuSections]
                      copy[si] = { ...copy[si], links: [...copy[si].links, { label: '', url: '' }] }
                      setMenuSections(copy)
                    }}>
                      <Plus className="mr-1 h-3 w-3" /> Add Link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={async () => {
              await api.put('/admin/settings/homepage_menu_sections', { setting_value: JSON.stringify(menuSections) })
              alert('Quick menu sections saved')
            }}>
              <Save className="mr-2 h-4 w-4" /> Save All Sections
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Homepage Custom Link</h3>
            <p className="mb-2 text-sm text-gray-500">
              A link shown between Gallery and Quick Links on the homepage. Leave blank to hide.
            </p>
            <div className="flex items-start gap-3">
              <LinkIcon className="mt-2 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1 space-y-3">
                <Input label="Link Text" placeholder="e.g. Admission 2026" value={homeLinkLabel} onChange={(e) => setHomeLinkLabel(e.target.value)} />
                <Input label="Link URL" placeholder="e.g. /admission or https://example.com" value={homeLinkUrl} onChange={(e) => setHomeLinkUrl(e.target.value)} />
              </div>
            </div>
            <Button className="mt-4" onClick={async () => {
              await api.put('/admin/settings/homepage_link_label', { setting_value: homeLinkLabel })
              await api.put('/admin/settings/homepage_link_url', { setting_value: homeLinkUrl })
              alert('Homepage link saved')
            }}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Navigation Menu</h3>
            <p className="mb-2 text-sm text-gray-500">
              Configure the navigation menu items and colors. Add dropdown children to create submenus.
            </p>
            <div className="flex items-center gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Width (%):</label>
                <input type="number" min={20} max={100} value={navWidth} onChange={(e) => setNavWidth(e.target.value)}
                  className="h-9 w-20 rounded border border-gray-300 px-2 text-sm text-gray-700" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Align:</label>
                <select value={navAlign} onChange={(e) => setNavAlign(e.target.value)}
                  className="h-9 rounded border border-gray-300 px-2 text-sm text-gray-700"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Font Size:</label>
                <input type="number" min={10} max={30} value={navFontSize} onChange={(e) => setNavFontSize(e.target.value)}
                  className="h-9 w-20 rounded border border-gray-300 px-2 text-sm text-gray-700" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Menu BG:</label>
                <input type="color" value={menuBg} onChange={(e) => setMenuBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{menuBg}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Menu Text:</label>
                <input type="color" value={menuTextColor} onChange={(e) => setMenuTextColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{menuTextColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Hover:</label>
                <input type="color" value={menuHoverColor} onChange={(e) => setMenuHoverColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{menuHoverColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Active:</label>
                <input type="color" value={menuActiveColor} onChange={(e) => setMenuActiveColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{menuActiveColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Hamburger BG:</label>
                <input type="color" value={hamburgerBg} onChange={(e) => setHamburgerBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{hamburgerBg}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Hamburger Position:</label>
                <select value={hamburgerPos} onChange={(e) => setHamburgerPos(e.target.value)}
                  className="h-9 rounded border border-gray-300 px-2 text-sm text-gray-700"
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {navMenu.map((item, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Menu Label" value={item.label} onChange={(e) => { const c = [...navMenu]; c[i] = { ...c[i], label: e.target.value }; setNavMenu(c) }} className="flex-1" />
                    <Input placeholder="URL (leave empty for dropdown)" value={item.url || ''} onChange={(e) => { const c = [...navMenu]; c[i] = { ...c[i], url: e.target.value }; setNavMenu(c) }} className="flex-1" />
                    <button onClick={() => { const c = [...navMenu]; c[i] = { ...c[i], children: [...(c[i].children || []), { label: '', url: '' }] }; setNavMenu(c) }} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setNavMenu(navMenu.filter((_, j) => j !== i)) }} className="rounded-md p-1.5 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {item.children && item.children.length > 0 && (
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                      {item.children.map((child, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <Input placeholder="Child Label" value={child.label} onChange={(e) => { const c = [...navMenu]; c[i].children![ci] = { ...c[i].children![ci], label: e.target.value }; setNavMenu(c) }} className="flex-1" />
                          <Input placeholder="URL" value={child.url || ''} onChange={(e) => { const c = [...navMenu]; c[i].children![ci] = { ...c[i].children![ci], url: e.target.value }; setNavMenu(c) }} className="flex-1" />
                          <button onClick={() => { const c = [...navMenu]; c[i].children![ci] = { ...c[i].children![ci], children: [...(c[i].children![ci].children || []), { label: '', url: '' }] }; setNavMenu(c) }} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50" title="Add sub-child">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { const c = [...navMenu]; c[i].children = c[i].children!.filter((_, j) => j !== ci); setNavMenu(c) }} className="rounded-md p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {item.children.some((c) => c.children && c.children.length > 0) && (
                        <div className="ml-6 space-y-2">
                          {item.children.map((child, ci) => child.children && child.children.length > 0 && child.children.map((sub, si) => (
                            <div key={`${ci}-${si}`} className="flex items-center gap-2">
                              <Input placeholder="Sub-child Label" value={sub.label} onChange={(e) => { const c = [...navMenu]; c[i].children![ci].children![si] = { ...c[i].children![ci].children![si], label: e.target.value }; setNavMenu(c) }} className="flex-1" />
                              <Input placeholder="URL" value={sub.url} onChange={(e) => { const c = [...navMenu]; c[i].children![ci].children![si] = { ...c[i].children![ci].children![si], url: e.target.value }; setNavMenu(c) }} className="flex-1" />
                              <button onClick={() => { const c = [...navMenu]; c[i].children![ci].children = c[i].children![ci].children!.filter((_, k) => k !== si); setNavMenu(c) }} className="rounded-md p-1.5 text-red-500 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setNavMenu([...navMenu, { label: '', url: '', children: [] }])}>
                <Plus className="mr-1 h-3 w-3" /> Add Menu Item
              </Button>
            </div>
            <Button className="mt-4" onClick={async () => {
              await Promise.all([
                api.put('/admin/settings/nav_width', { setting_value: navWidth }),
                api.put('/admin/settings/nav_align', { setting_value: navAlign }),
                api.put('/admin/settings/nav_font_size', { setting_value: navFontSize }),
                api.put('/admin/settings/nav_menu', { setting_value: JSON.stringify(navMenu) }),
                api.put('/admin/settings/menu_bg', { setting_value: menuBg }),
                api.put('/admin/settings/menu_text_color', { setting_value: menuTextColor }),
                api.put('/admin/settings/menu_hover_color', { setting_value: menuHoverColor }),
                api.put('/admin/settings/menu_active_color', { setting_value: menuActiveColor }),
                api.put('/admin/settings/hamburger_bg', { setting_value: hamburgerBg }),
                api.put('/admin/settings/hamburger_pos', { setting_value: hamburgerPos }),
              ])
              alert('Navigation menu saved')
            }}>
              <Save className="mr-2 h-4 w-4" /> Save Navigation Menu
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Slider & Notice Colors</h3>
            <p className="mb-2 text-sm text-gray-500">
              Configure the background and text colors for the hero slider and scrolling notice bar.
            </p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Slider BG:</label>
                <input type="color" value={sliderBg} onChange={(e) => setSliderBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{sliderBg}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Notice BG:</label>
                <input type="color" value={noticeBg} onChange={(e) => setNoticeBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{noticeBg}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Notice Text:</label>
                <input type="color" value={noticeTextColor} onChange={(e) => setNoticeTextColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-gray-500">{noticeTextColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Notice Font Size:</label>
                <input type="number" min={10} max={30} value={noticeFontSize} onChange={(e) => setNoticeFontSize(e.target.value)}
                  className="h-9 w-20 rounded border border-gray-300 px-2 text-sm text-gray-700" />
              </div>
            </div>
            <Button className="mt-4" onClick={async () => {
              await Promise.all([
                api.put('/admin/settings/slider_bg', { setting_value: sliderBg }),
                api.put('/admin/settings/notice_bg', { setting_value: noticeBg }),
                api.put('/admin/settings/notice_text_color', { setting_value: noticeTextColor }),
                api.put('/admin/settings/notice_font_size', { setting_value: noticeFontSize }),
              ])
              alert('Slider & notice colors saved')
            }}>
              <Save className="mr-2 h-4 w-4" /> Save Colors
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Site Configuration</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <p><strong>Domain:</strong> mjadc.ac.bd</p>
              <p><strong>Hosting:</strong> Namecheap Shared Hosting</p>
              <p><strong>Default Footer:</strong> {footerText}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {slideContentIdx !== null && heroImages[slideContentIdx] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl mx-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Slide Content</h3>
            <p className="mb-4 text-sm text-gray-500">Add optional text and button for this slide.</p>
            <div className="space-y-3">
              <Input label="Title (optional)" value={heroImages[slideContentIdx].title || ''} onChange={(e) => {
                const c = [...heroImages]; c[slideContentIdx] = { ...c[slideContentIdx], title: e.target.value }; setHeroImages(c)
              }} />
              <Input label="Subtitle (optional)" value={heroImages[slideContentIdx].subtitle || ''} onChange={(e) => {
                const c = [...heroImages]; c[slideContentIdx] = { ...c[slideContentIdx], subtitle: e.target.value }; setHeroImages(c)
              }} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Button Text" value={heroImages[slideContentIdx].buttonText || ''} onChange={(e) => {
                  const c = [...heroImages]; c[slideContentIdx] = { ...c[slideContentIdx], buttonText: e.target.value }; setHeroImages(c)
                }} />
                <Input label="Button Link" value={heroImages[slideContentIdx].buttonLink || ''} onChange={(e) => {
                  const c = [...heroImages]; c[slideContentIdx] = { ...c[slideContentIdx], buttonLink: e.target.value }; setHeroImages(c)
                }} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSlideContentIdx(null)}>Cancel</Button>
              <Button onClick={async () => {
                await api.put('/admin/settings/hero_images', { setting_value: JSON.stringify(heroImages) })
                setSlideContentIdx(null)
                alert('Slide content saved')
              }}>
                <Save className="mr-2 h-4 w-4" /> Save Content
              </Button>
            </div>
          </div>
        </div>
      )}

      {cropModalIdx !== null && heroImages[cropModalIdx] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl mx-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Adjust Crop Area</h3>
            <p className="mb-4 text-sm text-gray-500">Drag the image to choose which part is visible in the slider ({heroSliderWidth}% × {heroSliderHeight}% frame).</p>
            <div className="relative h-[60vh] w-full rounded-lg overflow-hidden bg-gray-900">
              <Cropper
                image={`${UPLOAD_BASE}/${heroImages[cropModalIdx].path}`}
                crop={crop}
                zoom={cropZoom}
                aspect={parseInt(heroSliderWidth) / parseInt(heroSliderHeight)}
                onCropChange={setCrop}
                onZoomChange={setCropZoom}
                onCropComplete={(croppedAreaPct: Area, _: Area) => { croppedAreaPctRef.current = croppedAreaPct }}
              />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm text-gray-600">Zoom:</label>
              <input type="range" min={0.5} max={3} step={0.01} value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} className="w-40" />
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => setCropModalIdx(null)}>Cancel</Button>
              <Button onClick={async () => {
                const pct = croppedAreaPctRef.current
                if (!pct) return
                const cropX = Math.round((pct.x + pct.width / 2) * 100) / 100
                const cropY = Math.round((pct.y + pct.height / 2) * 100) / 100
                const updated = heroImages.map((img, j) =>
                  j === cropModalIdx ? { ...img, cropX, cropY } : img
                )
                await api.put('/admin/settings/hero_images', { setting_value: JSON.stringify(updated) })
                setHeroImages(updated)
                setCropModalIdx(null)
                alert('Crop position saved')
              }}>
                <Save className="mr-2 h-4 w-4" /> Save Crop
              </Button>
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  )
}
