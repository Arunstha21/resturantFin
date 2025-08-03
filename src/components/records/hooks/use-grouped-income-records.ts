"use client"

import { useMemo } from "react"
import type { IncomeRecord } from "@/types"

// Enhanced type for grouped records
export interface GroupedIncomeRecord extends IncomeRecord {
  isGroup?: boolean
  groupedOrders?: IncomeRecord[]
  orderCount?: number
}

export function useGroupedIncomeRecords(
  incomeRecords: IncomeRecord[],
  expandedGroups: Set<string>,
): GroupedIncomeRecord[] {
  return useMemo(() => {
    const grouped: GroupedIncomeRecord[] = []
    const dueAccountGroups = new Map<string, IncomeRecord[]>()
    const regularRecords: IncomeRecord[] = []

    // Separate due account orders from regular orders
    incomeRecords.forEach((record) => {
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
          // First sort by payment status (pending first)
          if (a.paymentStatus !== b.paymentStatus) {
            return a.paymentStatus === "pending" ? -1 : 1
          }
          // Then by date (newest first)
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        })

        const totalAmount = sortedOrders.reduce((sum, order) => {
          if (order.paymentStatus === "pending") {
            if (order.paymentMethod === "split") {
              const paidAmount = (order.cashAmount || 0) + (order.digitalAmount || 0)
              const remainingAmount = order.totalAmount - paidAmount
              return sum + remainingAmount
            }
            return sum + order.totalAmount
          }
          return sum
        }, 0)

        const pendingOrders = sortedOrders.filter((order) => order.paymentStatus === "pending")
        const groupRecord: GroupedIncomeRecord = {
          ...sortedOrders[0], // Use first order as base
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
        // Single order - add directly
        grouped.push(orders[0])
      }
    })

    // Add regular records
    regularRecords.forEach((record) => {
      grouped.push(record)
    })

    // Sort the final grouped array: pending groups first, then by date
    return grouped.sort((a, b) => {
      // Skip child records in main sorting
      if (a._id.startsWith("child_") || b._id.startsWith("child_")) {
        return 0
      }

      // First sort by payment status (pending first)
      if (a.paymentStatus !== b.paymentStatus) {
        return a.paymentStatus === "pending" ? -1 : 1
      }

      // Then by date (newest first)
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
  }, [incomeRecords, expandedGroups])
}
