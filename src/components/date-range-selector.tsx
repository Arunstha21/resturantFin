/**
 * DateRangeSelector - Reusable date range selection component
 * Provides consistent date filtering across all dashboard pages
 */

"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar } from "lucide-react"

export type DateRangeFilter =
  | "today"
  | "yesterday"
  | "week"
  | "lastWeek"
  | "month"
  | "lastMonth"
  | "year"
  | "lastYear"
  | "all"
  | "custom"

export interface DateRangeSelectorProps {
  value: DateRangeFilter
  onChange: (value: DateRangeFilter) => void
  startDate?: string
  endDate?: string
  onStartDateChange?: (date: string) => void
  onEndDateChange?: (date: string) => void
  showCustomInputs?: boolean
  label?: string
  includeAllTimeOption?: boolean
}

export function DateRangeSelector({
  value,
  onChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  showCustomInputs = true,
  label = "Date Range",
  includeAllTimeOption = false,
}: DateRangeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="lastWeek">Last Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="lastYear">Last Year</SelectItem>
          {includeAllTimeOption && <SelectItem value="all">All Time</SelectItem>}
          {showCustomInputs && <SelectItem value="custom">Custom Range</SelectItem>}
        </SelectContent>
      </Select>

      {showCustomInputs && value === "custom" && onStartDateChange && onEndDateChange && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get date range label for display
 * This is a regular utility function, not a hook
 */
export function getDateRangeLabel(filter: DateRangeFilter, startDate?: string, endDate?: string): string {
  switch (filter) {
    case "today":
      return "Today"
    case "yesterday":
      return "Yesterday"
    case "week":
      return "This Week"
    case "lastWeek":
      return "Last Week"
    case "month":
      return "This Month"
    case "lastMonth":
      return "Last Month"
    case "year":
      return "This Year"
    case "lastYear":
      return "Last Year"
    case "all":
      return "All Time"
    case "custom":
      if (startDate && endDate) {
        return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      }
      return "Custom Range"
    default:
      return "This Month"
  }
}
