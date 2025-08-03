"use client"

import { useState } from "react"
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
import { ExpenseRecordDialog } from "@/components/records/expense-record-dialog"
import { OfflineAPI } from "@/lib/offline/offline-api"
import { Search, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { ExpenseRecord } from "@/types"
import { useExpenseColumns } from "../hooks/use-expense-columns"
import { TablePagination } from "./table-pagination"

interface ExpenseRecordsTableProps {
  records: ExpenseRecord[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  onFormSuccess: () => Promise<void>
  isOnline: boolean
}

export function ExpenseRecordsTable({
  records,
  isLoading,
  onRefresh,
  onFormSuccess,
  isOnline,
}: ExpenseRecordsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const handleDeleteExpense = async (id: string) => {
    try {
      await OfflineAPI.deleteExpenseRecord(id)
      const message = isOnline ? "Expense deleted successfully" : "Expense deleted offline - will sync when online"
      toast.success(message)
      await onRefresh()
    } catch (error) {
      toast.error("Failed to delete expense")
      console.error("Error deleting expense:", error)
    }
  }

  const columns = useExpenseColumns({
    onFormSuccess,
    onDelete: handleDeleteExpense,
  })

  const table = useReactTable({
    data: records,
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
              placeholder="Search expenses..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8 w-[300px]"
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
          <ExpenseRecordDialog onSuccess={onFormSuccess} mode="create" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
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
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
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
