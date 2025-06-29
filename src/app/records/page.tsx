"use client"

import { useState, useEffect, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Table as TanStackTable,
} from "@tanstack/react-table"
import { Navbar } from "@/components/layout/navbar"
import { IncomeRecordDialog } from "@/components/records/income-record-dialog"
import { ExpenseRecordDialog } from "@/components/records/expense-record-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import {
  Trash2,
  Search,
  Receipt,
  CreditCard,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Banknote,
  Smartphone,
  WifiOff,
  RefreshCw,
} from "lucide-react"
import type { IncomeRecord, ExpenseRecord } from "@/types"
import { toast } from "sonner"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOffline } from "@/components/hooks/use-offline"
import { OfflineAPI } from "@/lib/offline/offline-api"

export default function RecordsPage() {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("income")

  // Table state
  const [incomeSorting, setIncomeSorting] = useState<SortingState>([])
  const [incomeColumnFilters, setIncomeColumnFilters] = useState<ColumnFiltersState>([])
  const [incomeGlobalFilter, setIncomeGlobalFilter] = useState("")
  const [expenseSorting, setExpenseSorting] = useState<SortingState>([])
  const [expenseColumnFilters, setExpenseColumnFilters] = useState<ColumnFiltersState>([])
  const [expenseGlobalFilter, setExpenseGlobalFilter] = useState("")

  const { isOnline, isSyncing, pendingOperations } = useOffline()

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      console.log("Fetching records...")
      const [incomeData, expenseData] = await Promise.all([
        OfflineAPI.getRecords("income"),
        OfflineAPI.getRecords("expense"),
      ])

      console.log("Income records:", incomeData.length)
      console.log("Expense records:", expenseData.length)

      setIncomeRecords(incomeData || [])
      setExpenseRecords(expenseData || [])
    } catch (error) {
      toast.error("Failed to fetch records")
      console.error("Error fetching records:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteIncome = async (id: string) => {
    try {
      await OfflineAPI.deleteIncomeRecord(id)
      setIncomeRecords(incomeRecords.filter((record) => record._id !== id))

      const message = isOnline ? "Order deleted successfully" : "Order deleted offline - will sync when online"
      toast.success(message)
    } catch (error) {
      toast.error("Failed to delete order")
      console.error("Error deleting order:", error)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await OfflineAPI.deleteExpenseRecord(id)
      setExpenseRecords(expenseRecords.filter((record) => record._id !== id))

      const message = isOnline ? "Expense deleted successfully" : "Expense deleted offline - will sync when online"
      toast.success(message)
    } catch (error) {
      toast.error("Failed to delete expense")
      console.error("Error deleting expense:", error)
    }
  }

  const handleFormSuccess = () => {
    fetchRecords()
  }

  // Income table columns
  const incomeColumns = useMemo<ColumnDef<IncomeRecord>[]>(
    () => [
      {
        id: "customer",
        accessorFn: (row) => row.customerName || `Table ${row.tableNumber}` || "Walk-in",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Customer/Table
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue, row }) => {
          const value = getValue() as string
          const record = row.original
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{value}</span>
              {record._offline && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment Method",
        cell: ({ getValue, row }) => {
          const method = getValue() as string
          const record = row.original

          if (method === "split") {
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Banknote className="h-3 w-3" />
                  <span className="text-xs">Cash: {formatCurrency(record.cashAmount || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  <span className="text-xs">Digital: {formatCurrency(record.digitalAmount || 0)}</span>
                </div>
              </div>
            )
          }

          return (
            <div className="flex items-center gap-1">
              {method === "cash" ? <Banknote className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
              <span className="text-xs capitalize">{method}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "paymentStatus",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Payment
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const status = getValue() as string
          return <Badge variant={status === "completed" ? "default" : "destructive"}>{status}</Badge>
        },
      },
      {
        accessorKey: "items",
        header: "Items",
        cell: ({ getValue }) => {
          const items = getValue() as any[]
          return `${items.length} items`
        },
        enableSorting: false,
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const amount = getValue() as number
          return <div className="text-green-600 font-medium">{formatCurrency(amount)}</div>
        },
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const date = getValue() as string
          return new Date(date).toLocaleDateString()
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <IncomeRecordDialog record={row.original} onSuccess={handleFormSuccess} mode="edit" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Are you sure you want to delete this order?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteIncome(row.original._id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [incomeRecords, isOnline],
  )

  // Expense table columns
  const expenseColumns = useMemo<ColumnDef<ExpenseRecord>[]>(
    () => [
      {
        accessorKey: "description",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Description
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue, row }) => {
          const value = getValue() as string
          const record = row.original
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{value}</span>
              {record._offline && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Category
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge>,
      },
      {
        accessorKey: "vendor",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Vendor
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => (getValue() as string) || "-",
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const amount = getValue() as number
          return <div className="text-red-600 font-medium">{formatCurrency(amount)}</div>
        },
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const date = getValue() as string
          return new Date(date).toLocaleDateString()
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <ExpenseRecordDialog record={row.original} onSuccess={handleFormSuccess} mode="edit" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Are you sure you want to delete this expense?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteExpense(row.original._id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [expenseRecords, isOnline],
  )

  // Income table instance
  const incomeTable = useReactTable({
    data: incomeRecords,
    columns: incomeColumns,
    state: {
      sorting: incomeSorting,
      columnFilters: incomeColumnFilters,
      globalFilter: incomeGlobalFilter,
    },
    onSortingChange: setIncomeSorting,
    onColumnFiltersChange: setIncomeColumnFilters,
    onGlobalFilterChange: setIncomeGlobalFilter,
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

  // Expense table instance
  const expenseTable = useReactTable({
    data: expenseRecords,
    columns: expenseColumns,
    state: {
      sorting: expenseSorting,
      columnFilters: expenseColumnFilters,
      globalFilter: expenseGlobalFilter,
    },
    onSortingChange: setExpenseSorting,
    onColumnFiltersChange: setExpenseColumnFilters,
    onGlobalFilterChange: setExpenseGlobalFilter,
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

  const TablePagination = ({ table }: { table: TanStackTable<any> }) => (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">Rows per page</p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-transparent"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-transparent"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-transparent"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-transparent"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Financial Records</h1>
            {/* Status indicators */}
            <div className="flex items-center gap-2 mt-2">
              {!isOnline && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline Mode
                </Badge>
              )}
              {isSyncing && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Syncing
                </Badge>
              )}
              {pendingOperations > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  {pendingOperations} Pending Sync
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Orders & Income
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={incomeGlobalFilter ?? ""}
                    onChange={(event) => setIncomeGlobalFilter(String(event.target.value))}
                    className="pl-8 w-[300px]"
                  />
                </div>
                <Button variant="outline" onClick={fetchRecords} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              <IncomeRecordDialog onSuccess={handleFormSuccess} mode="create" />
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
                          {incomeTable.getHeaderGroups().map((headerGroup) => (
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
                          {incomeTable.getRowModel().rows?.length ? (
                            incomeTable.getRowModel().rows.map((row) => (
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
                              <TableCell colSpan={incomeColumns.length} className="h-24 text-center">
                                No results.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <TablePagination table={incomeTable} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    value={expenseGlobalFilter ?? ""}
                    onChange={(event) => setExpenseGlobalFilter(String(event.target.value))}
                    className="pl-8 w-[300px]"
                  />
                </div>
                <Button variant="outline" onClick={fetchRecords} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              <ExpenseRecordDialog onSuccess={handleFormSuccess} mode="create" />
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
                          {expenseTable.getHeaderGroups().map((headerGroup) => (
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
                          {expenseTable.getRowModel().rows?.length ? (
                            expenseTable.getRowModel().rows.map((row) => (
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
                              <TableCell colSpan={expenseColumns.length} className="h-24 text-center">
                                No results.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <TablePagination table={expenseTable} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
