import React from 'react'
export const Badge = ({ children, className }: any) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
    {children}
  </span>
)
