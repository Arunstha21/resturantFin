import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
  }).format(amount)
}

export function getDateRange(filter: string) {
  const now = new Date()

  switch (filter) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      }
    case "week":
      return {
        start: startOfWeek(now),
        end: endOfWeek(now),
      }
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      }
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      }
  }
}

export function exportToCSV(data: any[], filename: string) {
  const csvContent = convertToCSV(data)
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ""

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          return typeof value === "string" ? `"${value}"` : value
        })
        .join(","),
    ),
  ]

  return csvRows.join("\n")
}