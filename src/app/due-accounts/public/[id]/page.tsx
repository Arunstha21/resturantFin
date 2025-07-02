"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Calendar, Receipt, RefreshCw, AlertCircle } from "lucide-react"
import type { DueAccountSummary } from "@/types"
import { Button } from "@/components/ui/button"

interface PublicDueAccountPageProps {
  params: Promise<{
    id: string
  }>
}

export default function PublicDueAccountPage({ params }: PublicDueAccountPageProps) {
  const [account, setAccount] = useState<DueAccountSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string>("")

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setAccountId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails()
    }
  }, [accountId])

  const fetchAccountDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/due-accounts/public/${accountId}`)
      console.log(response);
      
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch account details")
      }

      setAccount(data.account)
    } catch (error) {
      console.error("Error fetching account details:", error)
      setError(error instanceof Error ? error.message : "Failed to load account details")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading account details...</p>
        </div>
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account Not Found</h3>
            <p className="text-muted-foreground mb-4">
              {error || "The requested account could not be found or is no longer active."}
            </p>
            <Button onClick={fetchAccountDetails} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Due Account Statement</h1>
          <p className="text-muted-foreground">Customer: {account.customerName}</p>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleString()}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Due Amount</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(account.totalDueAmount)}</div>
              <p className="text-xs text-muted-foreground">Outstanding balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{account.pendingOrdersCount}</div>
              <p className="text-xs text-muted-foreground">Unpaid orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Order</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{new Date(account.lastOrderDate).toLocaleDateString()}</div>
              <p className="text-xs text-muted-foreground">Most recent order</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {account.orders.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Orders</h3>
                <p className="text-muted-foreground">All orders have been paid. Thank you!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {account.orders.map((order) => (
                  <div key={order._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{new Date(order.date).toLocaleDateString()}</span>
                        {order.tableNumber && (
                          <Badge variant="secondary" className="text-xs">
                            Table {order.tableNumber}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">{formatCurrency(order.totalAmount)}</div>
                        <Badge variant="destructive" className="text-xs">
                          Pending
                        </Badge>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Items:</h4>
                      <div className="grid gap-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span>{formatCurrency(item.quantity * item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          <strong>Notes:</strong> {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>This is an automated statement. Please contact the restaurant for any queries.</p>
        </div>
      </div>
    </div>
  )
}