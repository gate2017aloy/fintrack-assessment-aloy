import React from 'react'
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
