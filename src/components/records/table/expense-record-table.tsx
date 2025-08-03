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
import { Badge } from "@/components/ui/badge"
import { ExpenseRecordDialog } from "@/components/records/expense-record-dialog"
import { OfflineAPI } from "@/lib/offline/offline-api"
import { Search, RefreshCw, WifiOff, Trash2, Edit, Tag } from "lucide-react"
import { toast } from "sonner"
import type { ExpenseRecord } from "@/types"
import { useExpenseColumns } from "../hooks/use-expense-columns"
import { TablePagination } from "./table-pagination"
import { formatCurrency } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

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

  const renderMobileCard = (record: ExpenseRecord) => {
    return (
      <Card key={record._id} className="mb-2">
        <CardContent>
          {/* Main Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <h3 className="font-medium text-sm truncate">{record.description || "Expense"}</h3>
                </div>

                <div className="flex items-center gap-1">
                  {record.category && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      <Tag className="h-2 w-2 mr-1" />
                      {record.category}
                    </Badge>
                  )}

                  {record._offline && <WifiOff className="h-3 w-3 text-orange-500" />}
                </div>
              </div>
            </div>

            {/* Amount and Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="font-bold text-sm text-red-600">-{formatCurrency(record.amount)}</div>

              <div className="flex gap-1">
                <ExpenseRecordDialog
                  record={record}
                  onSuccess={onFormSuccess}
                  mode="edit"
                  trigger={
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                  }
                />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteExpense(record._id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-2 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
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
          <ExpenseRecordDialog onSuccess={onFormSuccess} mode="create" />
        </div>
      </div>

      {/* Mobile View (hidden on md and up) */}
      <div className="block md:hidden">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Expenses ({table.getFilteredRowModel().rows.length})</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => renderMobileCard(row.original))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 text-sm">No results found.</p>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="mt-3">
              <TablePagination table={table} />
            </div>
          </>
        )}
      </div>

      {/* Desktop View (hidden on mobile) */}
      <div className="hidden md:block">
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
      </div>
    </>
  )
}
