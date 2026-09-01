import { CSSProperties } from 'react'

interface Props { height?: string; className?: string; style?: CSSProperties }

export default function BenjaminAvatar({ height = '200px', className = '', style }: Props) {
  return (
    <img
      src="/Benjamin_Avatar.png"
      alt="Benjamin — Your AI Strategy Guide"
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block', ...style }}
      className={className}
    />
  )
}
