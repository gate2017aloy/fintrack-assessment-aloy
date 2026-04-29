import React from 'react'

export const Badge = ({ children, className }: any) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
    {children}
  </span>
)

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

export const Table = ({ children }: any) => (
  <table className="w-full text-left">{children}</table>
)

export const TableHeader = ({ children }: any) => (
  <thead className="bg-gray-50">{children}</thead>
)

export const TableBody = ({ children }: any) => (
  <tbody className="divide-y">{children}</tbody>
)

export const TableRow = ({ children }: any) => (
  <tr>{children}</tr>
)

export const TableHead = ({ children }: any) => (
  <th className="p-3 text-sm font-semibold text-gray-600">{children}</th>
)

export const TableCell = ({ children }: any) => (
  <td className="p-3 text-sm">{children}</td>
)
