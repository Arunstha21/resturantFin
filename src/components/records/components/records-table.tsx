"use client"

import React, { useMemo, useState } from "react"
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
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  Search,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ChevronRightIcon,
  Users,
  Banknote,
  Smartphone,
  WifiOff,
  Trash2,
} from "lucide-react"
import type { IncomeRecord, ExpenseRecord } from "@/types"
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
import { TablePagination } from "./table-pagination"

// Enhanced type for grouped records
interface GroupedIncomeRecord extends IncomeRecord {
  isGroup?: boolean
  groupedOrders?: IncomeRecord[]
  orderCount?: number
}

interface RecordsTableProps {
  type: "income" | "expense"
  data: IncomeRecord[] | ExpenseRecord[]
  isLoading: boolean
  isRefreshing: boolean
  onRefresh: () => void
  onSuccess: () => Promise<void>
  onDelete: (id: string) => Promise<void>
  CreateDialog: React.ComponentType<{ onSuccess: () => Promise<void> }>
  EditDialog: React.ComponentType<{ record: any; onSuccess: () => Promise<void> }>
}

export const RecordsTable = React.memo<RecordsTableProps>(
  ({ type, data, isLoading, isRefreshing, onRefresh, onSuccess, onDelete, CreateDialog, EditDialog }) => {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState("")
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

    const toggleGroupExpansion = React.useCallback((dueAccountId: string) => {
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

    // Group income records by due account
    const groupedIncomeRecords = useMemo(() => {
      if (type !== "income") return []

      const incomeData = data as IncomeRecord[]
      const grouped: GroupedIncomeRecord[] = []
      const dueAccountGroups = new Map<string, IncomeRecord[]>()
      const regularRecords: IncomeRecord[] = []

      // Separate due account orders from regular orders
      incomeData.forEach((record) => {
        if (record.isDueAccount && record.dueAccountId) {
          if (!dueAccountGroups.has(record.dueAccountId)) {
            dueAccountGroups.set(record.dueAccountId, [])
          }
          dueAccountGroups.get(record.dueAccountId)!.push(record)
        } else {
          regularRecords.push(record)
        }
      })

      // Create group records for due accounts
      dueAccountGroups.forEach((orders, dueAccountId) => {
        if (orders.length > 1) {
          // Sort orders within group: pending first, then by date (newest first)
          const sortedOrders = orders.sort((a, b) => {
            if (a.paymentStatus !== b.paymentStatus) {
              return a.paymentStatus === "pending" ? -1 : 1
            }
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          })

          const totalAmount = sortedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
          const pendingOrders = sortedOrders.filter((order) => order.paymentStatus === "pending")

          const groupRecord: GroupedIncomeRecord = {
            ...sortedOrders[0],
            _id: `group_${dueAccountId}`,
            isGroup: true,
            groupedOrders: sortedOrders,
            orderCount: sortedOrders.length,
            totalAmount,
            paymentStatus: pendingOrders.length > 0 ? "pending" : "completed",
            items: [
              {
                name: `${sortedOrders.length} orders`,
                quantity: sortedOrders.reduce((sum, order) => sum + order.items.length, 0),
                price: totalAmount,
              },
            ],
          }

          grouped.push(groupRecord)

          // Add individual orders if group is expanded
          if (expandedGroups.has(dueAccountId)) {
            sortedOrders.forEach((order) => {
              grouped.push({
                ...order,
                _id: `child_${order._id}`,
              })
            })
          }
        } else {
          grouped.push(orders[0])
        }
      })

      // Add regular records
      regularRecords.forEach((record) => {
        grouped.push(record)
      })

      // Sort the final grouped array
      return grouped.sort((a, b) => {
        if (a._id.startsWith("child_") || b._id.startsWith("child_")) {
          return 0
        }
        if (a.paymentStatus !== b.paymentStatus) {
          return a.paymentStatus === "pending" ? -1 : 1
        }
        const dateA =
          a.isGroup && a.groupedOrders
            ? Math.max(...a.groupedOrders.map((o) => new Date(o.date).getTime()))
            : new Date(a.date).getTime()
        const dateB =
          b.isGroup && b.groupedOrders
            ? Math.max(...b.groupedOrders.map((o) => new Date(o.date).getTime()))
            : new Date(b.date).getTime()
        return dateB - dateA
      })
    }, [data, type, expandedGroups])

    // Income table columns
    const incomeColumns = useMemo<ColumnDef<GroupedIncomeRecord>[]>(
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
            const isChild = record._id.startsWith("child_")

            return (
              <div
                className={`flex items-center gap-2 ${isChild ? "pl-8" : ""} ${record.isGroup ? "cursor-pointer" : ""}`}
              >
                {record.isGroup && (
                  <div className="flex items-center">
                    {expandedGroups.has(record.dueAccountId!) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                    <Users className="h-4 w-4 ml-1" />
                  </div>
                )}
                <span className="font-medium">
                  {value}
                  {record.isGroup && ` (${record.orderCount} orders)`}
                </span>
                {record.isDueAccount && !record.isGroup && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    Due Account
                  </Badge>
                )}
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

            if (record.isGroup) {
              const methods = record.groupedOrders?.map((order) => order.paymentMethod) || []
              const uniqueMethods = Array.from(new Set(methods))

              if (uniqueMethods.length === 1) {
                return (
                  <div className="flex items-center gap-1">
                    {uniqueMethods[0] === "cash" ? (
                      <Banknote className="h-3 w-3" />
                    ) : (
                      <Smartphone className="h-3 w-3" />
                    )}
                    <span className="text-xs capitalize">{uniqueMethods[0]}</span>
                  </div>
                )
              } else {
                return (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Mixed</span>
                  </div>
                )
              }
            }

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
          cell: ({ getValue, row }) => {
            const status = getValue() as string
            const record = row.original

            if (record.isGroup) {
              const pendingCount =
                record.groupedOrders?.filter((order) => order.paymentStatus === "pending").length || 0
              const completedCount =
                record.groupedOrders?.filter((order) => order.paymentStatus === "completed").length || 0

              if (pendingCount > 0 && completedCount > 0) {
                return (
                  <div className="flex flex-col gap-1">
                    <Badge variant="destructive" className="text-xs">
                      {pendingCount} Pending
                    </Badge>
                    <Badge variant="default" className="text-xs">
                      {completedCount} Completed
                    </Badge>
                  </div>
                )
              }
            }

            return <Badge variant={status === "completed" ? "default" : "destructive"}>{status}</Badge>
          },
        },
        {
          accessorKey: "items",
          header: "Items",
          cell: ({ getValue, row }) => {
            const items = getValue() as any[]
            const record = row.original

            if (record.isGroup) {
              const totalItems = record.groupedOrders?.reduce((sum, order) => sum + order.items.length, 0) || 0
              return `${totalItems} items (${record.orderCount} orders)`
            }

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
          cell: ({ getValue, row }) => {
            const amount = getValue() as number
            const record = row.original

            return (
              <div className={`font-medium ${record.isGroup ? "text-red-800 font-semibold" : "text-green-600"}`}>
                {formatCurrency(amount)}
              </div>
            )
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
          cell: ({ getValue, row }) => {
            const date = getValue() as string
            const record = row.original

            if (record.isGroup) {
              const dates = record.groupedOrders?.map((order) => new Date(order.date)) || []
              const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
              const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

              if (minDate.toDateString() === maxDate.toDateString()) {
                return minDate.toLocaleDateString()
              } else {
                return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
              }
            }

            return new Date(date).toLocaleDateString()
          },
        },
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const record = row.original
            const isChild = record._id.startsWith("child_")

            return (
              <>
                {!record.isGroup && (
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <EditDialog
                      record={isChild ? { ...record, _id: record._id.replace("child_", "") } : record}
                      onSuccess={onSuccess}
                    />
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
                            {record.isGroup
                              ? `This will delete all ${record.orderCount} orders in this group. This action cannot be undone.`
                              : "This action cannot be undone. Are you sure you want to delete this order?"}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(row.original._id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </>
            )
          },
          enableSorting: false,
        },
      ],
      [expandedGroups, onSuccess, onDelete, EditDialog],
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
              <EditDialog record={row.original} onSuccess={onSuccess} />
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
                      onClick={() => onDelete(row.original._id)}
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
      [onSuccess, onDelete, EditDialog],
    )

    const tableData = type === "income" ? groupedIncomeRecords : (data as ExpenseRecord[])
    const columns = type === "income" ? incomeColumns : expenseColumns

    const table = useReactTable<GroupedIncomeRecord | ExpenseRecord>({
      data: tableData as (GroupedIncomeRecord | ExpenseRecord)[],
      columns: columns as ColumnDef<GroupedIncomeRecord | ExpenseRecord>[],
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${type === "income" ? "orders" : "expenses"}...`}
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(String(event.target.value))}
                className="pl-8 w-[300px]"
              />
            </div>
            <Button variant="outline" onClick={onRefresh} disabled={isLoading || isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <CreateDialog onSuccess={onSuccess} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {type === "income" ? "Orders & Income Records" : "Expense Records"} ({data.length})
            </CardTitle>
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
                          const isChild = row.original._id?.startsWith("child_")
                          const isGroup = (row.original as GroupedIncomeRecord).isGroup

                          return (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              onClick={
                                isGroup
                                  ? () => toggleGroupExpansion((row.original as GroupedIncomeRecord).dueAccountId!)
                                  : undefined
                              }
                              className={`${isChild ? "bg-gray-900/50 border-l-2 border-l-gray-300" : ""} ${
                                isGroup ? "bg-gray-800/50 hover:bg-gray-600 border-l-2 border-l-gray-500" : ""
                              } ${!isChild && !isGroup ? "hover:bg-gray-800" : ""}`}
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
      </div>
    )
  },
)

RecordsTable.displayName = "RecordsTable"
