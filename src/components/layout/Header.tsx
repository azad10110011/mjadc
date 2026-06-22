'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { api, UPLOAD_BASE } from '@/lib/api'

const resp = (val: string, min = 0.6, max = 1.5) => {
  const v = parseFloat(val)
  return v ? `clamp(${Math.round(v * min)}px, ${(v / 19.2).toFixed(2)}vw, ${Math.round(v * max)}px)` : undefined
}

export function Header() {
  const [logoSrc, setLogoSrc] = useState('/college_logo.png')
  const [headerBg, setHeaderBg] = useState('#ffffff')
  const [headerTextColor, setHeaderTextColor] = useState('#111827')
  const [collegeNameBn, setCollegeNameBn] = useState('মিঞা জিন্নাহ আলম ডিগ্রী কলেজ')
  const [collegeNameEn, setCollegeNameEn] = useState('Miah Jinnah Alam Degree College')
  const [collegeInfo, setCollegeInfo] = useState('')
  const [logoWidth, setLogoWidth] = useState('')
  const [logoHeight, setLogoHeight] = useState('')
  const [nameBnSize, setNameBnSize] = useState('')
  const [nameEnSize, setNameEnSize] = useState('')
  const [infoSize, setInfoSize] = useState('')
  const [headerWidth, setHeaderWidth] = useState('100')

  useEffect(() => {
    const keys = ['college_logo', 'header_bg', 'header_text_color', 'college_name_bn', 'college_name_en', 'college_info', 'logo_width', 'logo_height', 'name_bn_size', 'name_en_size', 'info_size', 'header_width']
    Promise.all(keys.map((k) =>
      api.get<{ data: { setting_value: string } }>(`/settings/${k}`).then((r) => ({ key: k, value: r.data?.setting_value })).catch(() => ({ key: k, value: null }))
    )).then((results) => {
      for (const r of results) {
        if (!r.value) continue
        if (r.key === 'college_logo') setLogoSrc(`${UPLOAD_BASE}/${r.value}`)
        if (r.key === 'header_bg') setHeaderBg(r.value)
        if (r.key === 'header_text_color') setHeaderTextColor(r.value)
        if (r.key === 'college_name_bn') setCollegeNameBn(r.value)
        if (r.key === 'college_name_en') setCollegeNameEn(r.value)
        if (r.key === 'college_info') setCollegeInfo(r.value)
        if (r.key === 'logo_width') setLogoWidth(r.value)
        if (r.key === 'logo_height') setLogoHeight(r.value)
        if (r.key === 'name_bn_size') setNameBnSize(r.value)
        if (r.key === 'name_en_size') setNameEnSize(r.value)
        if (r.key === 'info_size') setInfoSize(r.value)
        if (r.key === 'header_width') setHeaderWidth(r.value)
      }
    })
  }, [])

  return (
    <header className="border-b border-gray-200" style={{ backgroundColor: headerBg, color: headerTextColor, width: `${headerWidth}%`, minWidth: `${headerWidth}vw` }}>
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-4 md:py-5">
        <Link href="/" className="flex items-center gap-3 md:gap-4">
          <div className={`flex shrink-0 items-center ${logoWidth && logoHeight ? '' : 'self-stretch'}`}>
            <img src={logoSrc} alt="MJADC Logo" className="rounded-full object-contain"
              style={
                logoWidth && logoHeight
                  ? { width: `${parseFloat(logoWidth)}vw`, height: `${parseFloat(logoHeight)}vw` }
                  : { height: '100%', width: 'auto' }
              }
            />
          </div>
          <div className="text-left">
            <h1 className="font-bold leading-tight" style={{ color: headerTextColor, fontSize: resp(nameBnSize) }}>
              {collegeNameBn}
            </h1>
            <p className="font-semibold leading-tight" style={{ color: headerTextColor, fontSize: resp(nameEnSize) }}>
              {collegeNameEn}
            </p>
            {collegeInfo && (
              <p className="mt-0.5 opacity-80" style={{ color: headerTextColor, fontSize: resp(infoSize) }}>
                {collegeInfo}
              </p>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}
