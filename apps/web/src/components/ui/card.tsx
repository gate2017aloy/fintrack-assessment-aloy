import React from 'react'
export const Card = ({ children, className }: any) => (
  <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
)
export const CardHeader = ({ children }: any) => (
  <div className="p-4 border-b">{children}</div>
)
export const CardTitle = ({ children }: any) => (
  <h3 className="text-lg font-semibold">{children}</h3>
)
export const CardContent = ({ children }: any) => (
  <div className="p-4">{children}</div>
)
