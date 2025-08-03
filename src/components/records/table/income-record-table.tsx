"use client"

import { useState, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IncomeRecordDialog } from "@/components/records/income-record-dialog"
import { OfflineAPI } from "@/lib/offline/offline-api"
import { Search, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { IncomeRecord } from "@/types"
import { useGroupedIncomeRecords } from "../hooks/use-grouped-income-records"
import { useIncomeColumns } from "../hooks/use-income-columns"
import { TablePagination } from "./table-pagination"

interface IncomeRecordsTableProps {
  records: IncomeRecord[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  onFormSuccess: () => Promise<void>
  isOnline: boolean
}

export function IncomeRecordsTable({
  records,
  isLoading,
  onRefresh,
  onFormSuccess,
  isOnline,
}: IncomeRecordsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroupExpansion = useCallback((dueAccountId: string) => {
    setExpandedGroups((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(dueAccountId)) {
        newExpanded.delete(dueAccountId)
      } else {
        newExpanded.add(dueAccountId)
      }
      return newExpanded
    })
  }, [])

  const handleDeleteIncome = async (id: string) => {
    try {
      // Handle group deletion
      if (id.startsWith("group_")) {
        const dueAccountId = id.replace("group_", "")
        const groupOrders = records.filter((record) => record.isDueAccount && record.dueAccountId === dueAccountId)

        // Delete all orders in the group
        await Promise.all(groupOrders.map((order) => OfflineAPI.deleteIncomeRecord(order._id)))

        const message = isOnline
          ? `${groupOrders.length} orders deleted successfully`
          : `${groupOrders.length} orders deleted offline - will sync when online`
        toast.success(message)
        await onRefresh()
        return
      }

      // Handle individual order deletion
      const actualId = id.startsWith("child_") ? id.replace("child_", "") : id
      await OfflineAPI.deleteIncomeRecord(actualId)

      const message = isOnline ? "Order deleted successfully" : "Order deleted offline - will sync when online"
      toast.success(message)
      await onRefresh()
    } catch (error) {
      toast.error("Failed to delete order")
      console.error("Error deleting order:", error)
    }
  }

  const groupedRecords = useGroupedIncomeRecords(records, expandedGroups)
  const columns = useIncomeColumns({
    expandedGroups,
    toggleGroupExpansion,
    onFormSuccess,
    onDelete: handleDeleteIncome,
  })

  const table = useReactTable({
    data: groupedRecords,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8 w-full sm:w-[300px]"
            />
          </div>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full sm:w-auto bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="w-full sm:w-auto">
          <IncomeRecordDialog onSuccess={onFormSuccess} mode="create" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders & Income Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading records...
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const isChild = row.original._id.startsWith("child_")
                        const isGroup = row.original.isGroup
                        return (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            onClick={isGroup ? () => toggleGroupExpansion(row.original.dueAccountId!) : undefined}
                            className={`${isChild ? "bg-gray-900/50 border-l-2 border-l-gray-300" : ""} ${
                              isGroup ? "bg-gray-800/50 hover:bg-gray-600 border-l-2 border-l-gray-500" : ""
                            }${!isChild && !isGroup ? "hover:bg-gray-800" : ""}`}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination table={table} />
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
