"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Bug, EyeOff } from "lucide-react"

interface DebugPanelProps {
  incomeCount: number
  expenseCount: number
  isLoading: boolean
  isRefreshing: boolean
  onForceRefresh: () => Promise<void>
}

export function DebugPanel({ incomeCount, expenseCount, isLoading, isRefreshing, onForceRefresh }: DebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false)

  if (!isVisible) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsVisible(true)} className="fixed bottom-4 right-4 z-50">
        <Bug className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Debug Panel</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Income Records:</span>
          <Badge variant="secondary">{incomeCount}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Expense Records:</span>
          <Badge variant="secondary">{expenseCount}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Loading:</span>
          <Badge variant={isLoading ? "destructive" : "default"}>{isLoading ? "Yes" : "No"}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Refreshing:</span>
          <Badge variant={isRefreshing ? "destructive" : "default"}>{isRefreshing ? "Yes" : "No"}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onForceRefresh}
          disabled={isRefreshing}
          className="w-full bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Force Refresh
        </Button>
      </CardContent>
    </Card>
  )
}
