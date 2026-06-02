// Temporary fix: declare next/types module
declare module 'next/types.js' {
  export type { ImageProps, ImageLoader, ImageLoaderProps, StaticImageData, StaticRequire } from 'next/image'
  export type { NextFont, NextFontWithVariable } from 'next/font'
}
