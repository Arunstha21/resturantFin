"use client"

import { useOffline } from "../hooks/use-offline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Wifi, WifiOff, RefreshCw, Clock, Database, Trash2, ChevronDown, ChevronUp, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useState, useEffect } from "react"

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingOperations, lastSyncTime, manualSync, clearLocalData, getStorageStats } =
    useOffline()

  const [isExpanded, setIsExpanded] = useState(false)
  const [storageStats, setStorageStats] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    if (isExpanded) {
      loadStorageStats()
    }
  }, [isExpanded])

  const loadStorageStats = async () => {
    try {
      const stats = await getStorageStats()
      setStorageStats(stats)
    } catch (error) {
      console.error("Failed to load storage stats:", error)
    }
  }

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline")
      return
    }

    try {
      await manualSync()
      toast.success("Sync completed successfully")
    } catch (error) {
      toast.error("Sync failed. Please try again.")
    }
  }

  const handleClearData = async () => {
    if (!confirm("Are you sure you want to clear all local data? This cannot be undone.")) {
      return
    }

    try {
      await clearLocalData()
      toast.success("Local data cleared successfully")
      setStorageStats({})
    } catch (error) {
      toast.error("Failed to clear local data")
    }
  }

  // Show different states
  const hasIssues = !isOnline || isSyncing || pendingOperations > 0
  const isAllGood = isOnline && !isSyncing && pendingOperations === 0

  // Don't show anything if everything is perfect and not expanded
  if (isAllGood && !isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="h-8 w-8 p-0 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border border-green-200 dark:border-green-800 rounded-full shadow-sm"
        >
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 w-full sm:w-auto max-w-sm sm:max-w-md mx-auto sm:mx-0">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="bg-background/95 backdrop-blur-sm shadow-lg border">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                {/* Status Section */}
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Connection Status */}
                  {isOnline ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex-shrink-0">
                        <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-green-700 dark:text-green-300 truncate">Online</div>
                        <div className="text-xs text-green-600 dark:text-green-400 truncate">Connected</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex-shrink-0">
                        <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-red-700 dark:text-red-300 truncate">Offline</div>
                        <div className="text-xs text-red-600 dark:text-red-400 truncate">No connection</div>
                      </div>
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                    {isSyncing && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 whitespace-nowrap"
                      >
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        <span className="hidden sm:inline">Syncing</span>
                        <span className="sm:hidden">Sync</span>
                      </Badge>
                    )}
                    {pendingOperations > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 whitespace-nowrap"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">{pendingOperations} pending</span>
                        <span className="sm:hidden">{pendingOperations}</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expand Button */}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 ml-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Offline Warning */}
              {!isOnline && (
                <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-red-800 dark:text-red-200">Working Offline</div>
                      <div className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                        Your changes are saved locally and will sync when you're back online.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              {isSyncing && (
                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 animate-spin flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Syncing Data</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                        Please wait while we sync your changes with the server.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Operations */}
              {pendingOperations > 0 && (
                <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        {pendingOperations} Operation{pendingOperations !== 1 ? "s" : ""} Pending
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300 mt-1 leading-relaxed">
                        These changes will sync automatically when you're online.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Good Status */}
              {isAllGood && (
                <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200">All Synced</div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1 leading-relaxed">
                        Everything is up to date and working perfectly.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Sync */}
              {lastSyncTime && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </div>
              )}

              {/* Storage Stats */}
              {Object.keys(storageStats).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Database className="h-4 w-4" />
                    Local Storage
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(storageStats).map(([store, count]) => (
                      <div key={store} className="flex justify-between items-center bg-muted p-2 rounded text-xs">
                        <span className="text-muted-foreground capitalize truncate">
                          {store
                            .replace(/([A-Z])/g, " $1")
                            .replace("Records", "")
                            .trim()}
                        </span>
                        <span className="font-medium text-foreground ml-2 flex-shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {isOnline && pendingOperations > 0 && !isSyncing && (
                  <Button size="sm" onClick={handleManualSync} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearData}
                  className="flex-1 bg-transparent"
                  disabled={isSyncing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
