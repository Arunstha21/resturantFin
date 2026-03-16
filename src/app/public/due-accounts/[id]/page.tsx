/**
 * Public Due Account Page - Public view for customer due account statements
 */
"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Calendar, Receipt, RefreshCw, AlertCircle, Printer } from "lucide-react"
import type { DueAccountSummary } from "@/types"
import { Button } from "@/components/ui/button"

// Print styles - Professional Invoice Layout
const printStyles = `
  /* Hide print invoice on screen */
  .print-invoice-portal {
    display: none !important;
  }

  @media print {
    /* Hide all app content */
    body > *:not(.print-invoice-portal) {
      display: none !important;
    }

    /* Show print invoice */
    .print-invoice-portal {
      display: block !important;
    }

    /* Page settings */
    @page {
      margin-top: 8mm;
      margin-bottom: 8mm;
      margin-left: 1.5rem;
      margin-right: 1rem;
      size: A4;
    }

    .orders-table tbody tr {
      page-break-inside: avoid;
    }

    /* Invoice-specific print styles */
    .print-only .invoice-header {
      border-bottom: 3px solid #333;
      padding-bottom: 12px;
      margin-bottom: 15px;
    }
    .print-only .invoice-title {
      font-size: 26px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 5px;
    }
    .print-only .invoice-subtitle {
      font-size: 12px;
      color: #666;
    }
    .print-only .invoice-section {
      margin-bottom: 15px;
    }
    .print-only .section-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    .print-only .info-row {
      display: flex !important;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .print-only .info-label {
      font-weight: bold;
      min-width: 100px;
      color: #555;
    }
    .print-only .info-value {
      color: #333;
    }
    .print-only .amount-display {
      font-size: 20px;
      font-weight: bold;
      color: #dc2626;
      text-align: right;
      padding: 10px 14px;
      background: #fef2f2;
      border: 2px solid #dc2626;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .print-only .orders-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 11px;
      display: table !important;
    }
    .print-only .orders-table thead {
      background: #f5f5f5;
      display: table-header-group !important;
    }
    .print-only .orders-table tbody {
      display: table-row-group !important;
    }
    .print-only .orders-table th {
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #333;
      display: table-cell !important;
    }
    .print-only .orders-table td {
      padding: 4px;
      border-bottom: 1px solid #eee;
      display: table-cell !important;
    }
    .print-only .orders-table tr {
      display: table-row !important;
    }
    .print-only .orders-table tr:hover {
      background: #f9f9f9;
    }
    .print-only .order-amount {
      text-align: right;
      font-weight: bold;
      color: #dc2626;
    }
    .print-only .table-number {
      display: inline-block;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      margin-left: 6px;
    }
    .print-only .items-list {
      margin: 4px 0;
      padding-left: 12px;
      font-size: 10px;
      color: #666;
    }
    .print-only .invoice-footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 2px solid #333;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    .print-only .total-summary {
      margin-top: 15px;
      padding: 10px 14px;
      background: #f9f9f9;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .print-only .summary-row {
      display: flex !important;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .print-only .summary-row.total {
      font-size: 14px;
      font-weight: bold;
      padding-top: 8px;
      border-top: 2px solid #333;
      margin-top: 6px;
    }
  }
`

// Print Invoice Component - Renders via Portal to document.body
function PrintInvoice({ account }: { account: DueAccountSummary }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="print-invoice-portal">
      <style>{`
        .print-invoice-portal {
          font-family: 'Arial', 'Helvetica', sans-serif;
          color: #000;
          background: #fff;
          padding: 15px;
          padding-left: 5rem;
          padding-right: 5rem;
        }
        .invoice-header {
          border-bottom: 3px solid #333;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .invoice-title {
          font-size: 26px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 5px;
        }
        .invoice-subtitle {
          font-size: 12px;
          color: #666;
        }
        .invoice-section {
          margin-bottom: 15px;
        }
        .section-title {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #ddd;
        }
        .info-row {
          display: flex;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .info-label {
          font-weight: bold;
          min-width: 100px;
          color: #555;
        }
        .info-value {
          color: #333;
        }
        .amount-display {
          font-size: 20px;
          font-weight: bold;
          color: #dc2626;
          text-align: right;
          padding: 10px 14px;
          background: #fef2f2;
          border: 2px solid #dc2626;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .orders-table {
          width: 80%;
          border-collapse: collapse;
          margin-left: auto;
          margin-right: auto;
          margin-top: 10px;
          font-size: 11px;
        }
        .orders-table thead {
          background: #f5f5f5;
        }
        .orders-table th {
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #333;
        }
        .orders-table td {
          padding: 4px;
          border-bottom: 1px solid #eee;
        }
        .orders-table tbody tr {
          page-break-inside: avoid;
        }
        .order-amount {
          text-align: right;
          font-weight: bold;
          color: #dc2626;
        }
        .table-number {
          display: inline-block;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          margin-left: 6px;
        }
        .items-list {
          margin: 4px 0;
          padding-left: 12px;
          font-size: 10px;
          color: #666;
        }
        .invoice-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 2px solid #333;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
        .total-summary {
          margin-top: 15px;
          padding: 10px 14px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #ddd;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 11px;
        }
        .summary-row.total {
          font-size: 14px;
          font-weight: bold;
          padding-top: 8px;
          border-top: 2px solid #333;
          margin-top: 6px;
        }
      `}</style>

      {/* Invoice Header */}
      <div className="invoice-header">
        <div className="invoice-title">{account.organization}</div>
        <div className="invoice-subtitle">DUE ACCOUNT STATEMENT</div>
      </div>

      {/* Customer Details */}
      <div className="invoice-section">
        <div className="section-title">Bill To</div>
        <div className="info-row">
          <span className="info-label">Customer:</span>
          <span className="info-value">{account.customerName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Statement Date:</span>
          <span className="info-value">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Total Amount Display */}
      <div className="amount-display">
        {formatCurrency(account.totalDueAmount)}
        <div style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '5px' }}>
          Total Due Amount
        </div>
      </div>

      {/* Orders Table */}
      {account.orders.length > 0 && (
        <div className="invoice-section">
          <div className="section-title">Pending Orders ({account.orders.length})</div>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {account.orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    {new Date(order.date).toLocaleDateString()}
                    {order.tableNumber && (
                      <span className="table-number">Table {order.tableNumber}</span>
                    )}
                  </td>
                  <td>
                    <div className="items-list">
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="order-amount">{formatCurrency(order.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total Summary */}
      <div className="total-summary">
        <div className="summary-row">
          <span>Pending Orders:</span>
          <span>{account.pendingOrdersCount}</span>
        </div>
        <div className="summary-row total">
          <span>Total Due:</span>
          <span style={{ color: '#dc2626' }}>{formatCurrency(account.totalDueAmount)}</span>
        </div>
      </div>

      {/* Invoice Footer */}
      <div className="invoice-footer">
        <p style={{ marginBottom: '10px' }}>
          This is an automated statement. Generated on {new Date().toLocaleString()}
        </p>
        <p>
          For any queries regarding this statement, please contact {account.organization}.
        </p>
        <p style={{ marginTop: '15px', fontWeight: 'bold' }}>
          Thank you for your business!
        </p>
      </div>
    </div>,
    document.body
  )
}

interface PublicDueAccountPageProps {
  params: Promise<{
    id: string
  }>
}

export default function PublicDueAccountPage({ params }: PublicDueAccountPageProps) {
  const { data: session } = useSession()
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

  // Inject print styles
  useEffect(() => {
    const styleElement = document.createElement("style")
    styleElement.innerHTML = printStyles
    document.head.appendChild(styleElement)
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  const fetchAccountDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/due-accounts/public/${accountId}`)
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

  const handlePrint = () => {
    window.print()
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
        {/* Print Button - Only for logged in users */}
        {session && (
          <div className="flex justify-end mb-4 no-print">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print Statement
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{account.organization}</h1>
          <h2 className="text-2xl font-bold mb-2">Due Account Statement</h2>
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
                          <div key={index} className="text-sm">
                            {item.quantity}x {item.name}
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

      {/* Print Invoice - Only rendered for logged in users via Portal to document.body */}
      {session && account && <PrintInvoice account={account} />}
    </div>
  )
}
