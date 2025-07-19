"use server"

import dbConnect from "@/lib/db"
import IncomeRecord from "@/models/IncomeRecord"

export async function getSalesAnalytics(dateFilter = "month") {
  try {
    await dbConnect()

    console.log(`Starting sales analytics for filter: ${dateFilter}`)

    // Step 1: Get ALL income records from database at once
    const allIncomeRecords = await IncomeRecord.find({}).lean()
    // console.log(`Retrieved ${allIncomeRecords.length} total income records from database`)

    if (allIncomeRecords.length === 0) {
      return {
        success: true,
        data: {
          bestSellingItems: [],
          categorySales: [],
          dailySales: [],
          overallStats: {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            totalItemsSold: 0,
            uniqueItemTypes: 0,
          },
          dateRange: { startDate: new Date(), endDate: new Date(), filter: dateFilter },
          debug: { totalRecordsInDB: 0, filteredRecords: 0, processedOrders: 0, filteringDetails: {} },
        },
      }
    }

    // Step 2: Calculate date range for filtering
    const now = new Date()
    let startDate: Date

    switch (dateFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case "all":
        // Special case: include all records regardless of date
        startDate = new Date("2020-01-01") // Very old date to include everything
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    console.log(`Filtering records from ${startDate.toISOString()} to ${now.toISOString()}`)

    // Step 3: Analyze all records first to understand the data
    const analysisResults: {
      totalRecords: number
      recordsInDateRange: number
      recordsWithValidPayment: number
      recordsWithItems: number
      recordsWithItemsAndNames: number
      paymentStatusBreakdown: Map<string, number>
      dateRangeInDB: { oldest: Date | null; newest: Date | null }
      recordsPassingAllFilters: number
    } = {
      totalRecords: allIncomeRecords.length,
      recordsInDateRange: 0,
      recordsWithValidPayment: 0,
      recordsWithItems: 0,
      recordsWithItemsAndNames: 0,
      paymentStatusBreakdown: new Map(),
      dateRangeInDB: { oldest: null, newest: null },
      recordsPassingAllFilters: 0,
    }

    // First pass: analyze all records
    allIncomeRecords.forEach((record) => {
      // Track payment status
      const status = record.paymentStatus || "null"
      analysisResults.paymentStatusBreakdown.set(status, (analysisResults.paymentStatusBreakdown.get(status) || 0) + 1)

      // Track date range in database
      const recordDate = new Date(record.date)
      if (!analysisResults.dateRangeInDB.oldest || recordDate < analysisResults.dateRangeInDB.oldest) {
        analysisResults.dateRangeInDB.oldest = recordDate
      }
      if (!analysisResults.dateRangeInDB.newest || recordDate > analysisResults.dateRangeInDB.newest) {
        analysisResults.dateRangeInDB.newest = recordDate
      }

      // Check individual filter criteria
      const isInDateRange = dateFilter === "all" || (recordDate >= startDate && recordDate <= now)
      const hasValidPayment = ["completed", "pending"].includes(record.paymentStatus)
      const hasItems = record.items && Array.isArray(record.items) && record.items.length > 0
      const hasItemsWithNames = hasItems && record.items.some((item: any) => item.name && String(item.name).trim() !== "")

      if (isInDateRange) analysisResults.recordsInDateRange++
      if (hasValidPayment) analysisResults.recordsWithValidPayment++
      if (hasItems) analysisResults.recordsWithItems++
      if (hasItemsWithNames) analysisResults.recordsWithItemsAndNames++
      if (isInDateRange && hasValidPayment && hasItemsWithNames) analysisResults.recordsPassingAllFilters++
    })

    console.log("Analysis Results:", {
      totalRecords: analysisResults.totalRecords,
      recordsInDateRange: analysisResults.recordsInDateRange,
      recordsWithValidPayment: analysisResults.recordsWithValidPayment,
      recordsWithItems: analysisResults.recordsWithItems,
      recordsWithItemsAndNames: analysisResults.recordsWithItemsAndNames,
      recordsPassingAllFilters: analysisResults.recordsPassingAllFilters,
      paymentStatusBreakdown: Object.fromEntries(analysisResults.paymentStatusBreakdown),
      dateRangeInDB: {
        oldest: analysisResults.dateRangeInDB.oldest?.toISOString(),
        newest: analysisResults.dateRangeInDB.newest?.toISOString(),
      },
    })

    // Step 4: Filter records with more flexible criteria
    const filteredRecords = allIncomeRecords.filter((record) => {
      // Check date (skip if "all" filter)
      const recordDate = new Date(record.date)
      const isInDateRange = dateFilter === "all" || (recordDate >= startDate && recordDate <= now)

      // Check payment status (be more flexible)
      const validPaymentStatus = ["paid", "pending", "completed"].includes(record.paymentStatus)

      // Check if record has items with names (more flexible)
      const hasValidItems =
        record.items &&
        Array.isArray(record.items) &&
        record.items.length > 0 &&
        record.items.some((item) => item.name && String(item.name).trim() !== "")

      return isInDateRange && validPaymentStatus && hasValidItems
    })

    console.log(`Filtered to ${filteredRecords.length} records matching criteria`)

    // If we still have very few records, let's be even more flexible
    if (filteredRecords.length < 10 && dateFilter !== "all") {
      console.log("Very few records found, trying more flexible filtering...")

      const moreFlexibleRecords = allIncomeRecords.filter((record) => {
        const recordDate = new Date(record.date)
        const isInDateRange = dateFilter === "all" || (recordDate >= startDate && recordDate <= now)

        // Accept any payment status except explicitly rejected ones
        const validPaymentStatus = !["cancelled", "refunded", "failed"].includes(record.paymentStatus)

        // Accept records with any items, even without names
        const hasItems = record.items && Array.isArray(record.items) && record.items.length > 0

        return isInDateRange && validPaymentStatus && hasItems
      })

      if (moreFlexibleRecords.length > filteredRecords.length) {
        console.log(`Using more flexible filtering: ${moreFlexibleRecords.length} records`)
        filteredRecords.splice(0, filteredRecords.length, ...moreFlexibleRecords)
      }
    }

    // Rest of the processing remains the same...
    const itemSalesMap = new Map()
    const categorySalesMap = new Map()
    const dailySalesMap = new Map()

    let totalOrders = 0
    let totalRevenue = 0
    let totalItemsSold = 0
    const uniqueItemNames = new Set()

    // Process each filtered record
    filteredRecords.forEach((record, recordIndex) => {
      try {
        totalOrders++
        const orderAmount = Number(record.totalAmount) || 0
        totalRevenue += orderAmount

        // Process items in this order
        if (record.items && Array.isArray(record.items)) {
          record.items.forEach((item, itemIndex) => {
            try {
              // Extract item data with defaults - be more flexible with names
              const itemName = String(item.name || item.itemName || item.title || `Item ${itemIndex + 1}`)
              const itemCategory = String(item.category || item.type || "Food")
              const itemQuantity = Number(item.quantity || item.qty || 1)
              const itemPrice = Number(item.price || item.unitPrice || item.cost || 0)
              const itemTotal = itemQuantity * itemPrice

              totalItemsSold += itemQuantity
              uniqueItemNames.add(itemName)

              // Track individual item sales
              if (!itemSalesMap.has(itemName)) {
                itemSalesMap.set(itemName, {
                  _id: itemName,
                  itemName: itemName,
                  category: itemCategory,
                  totalQuantitySold: 0,
                  totalRevenue: 0,
                  orderCount: 0,
                  lastSold: record.date,
                  firstSold: record.date,
                  allPrices: new Set(),
                })
              }

              const itemData = itemSalesMap.get(itemName)
              itemData.totalQuantitySold += itemQuantity
              itemData.totalRevenue += itemTotal
              itemData.orderCount++
              itemData.allPrices.add(itemPrice)

              // Update dates
              const recordDate = new Date(record.date)
              if (recordDate > new Date(itemData.lastSold)) {
                itemData.lastSold = record.date
              }
              if (recordDate < new Date(itemData.firstSold)) {
                itemData.firstSold = record.date
              }

              // Track category sales
              if (!categorySalesMap.has(itemCategory)) {
                categorySalesMap.set(itemCategory, {
                  category: itemCategory,
                  totalQuantity: 0,
                  totalRevenue: 0,
                  uniqueItems: new Set(),
                })
              }

              const categoryData = categorySalesMap.get(itemCategory)
              categoryData.totalQuantity += itemQuantity
              categoryData.totalRevenue += itemTotal
              categoryData.uniqueItems.add(itemName)
            } catch (itemError) {
              console.error(`Error processing item ${itemIndex} in record ${recordIndex}:`, itemError)
            }
          })
        }

        // Track daily sales
        const dateKey = new Date(record.date).toDateString()
        if (!dailySalesMap.has(dateKey)) {
          dailySalesMap.set(dateKey, {
            date: record.date,
            totalOrders: 0,
            totalRevenue: 0,
            totalItems: 0,
            uniqueItemTypes: new Set(),
          })
        }

        const dayData = dailySalesMap.get(dateKey)
        dayData.totalOrders++
        dayData.totalRevenue += orderAmount

        if (record.items && Array.isArray(record.items)) {
          record.items.forEach((item) => {
            const itemQuantity = Number(item.quantity || item.qty || 1)
            const itemName = String(item.name || item.itemName || item.title || "Unknown Item")
            dayData.totalItems += itemQuantity
            dayData.uniqueItemTypes.add(itemName)
          })
        }
      } catch (recordError) {
        console.error(`Error processing record ${recordIndex}:`, recordError)
      }
    })

    // Step 5: Convert Maps to Arrays and calculate final values
    const bestSellingItems = Array.from(itemSalesMap.values())
      .map((item) => ({
        ...item,
        allPrices: Array.from(item.allPrices),
        averagePrice: item.totalRevenue > 0 ? item.totalRevenue / item.totalQuantitySold : 0,
      }))
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)

    const categorySales = Array.from(categorySalesMap.values())
      .map((category) => ({
        ...category,
        uniqueItems: category.uniqueItems.size,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    const dailySales = Array.from(dailySalesMap.values())
      .map((day) => ({
        ...day,
        uniqueItemTypes: day.uniqueItemTypes.size,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const overallStats = {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalItemsSold,
      uniqueItemTypes: uniqueItemNames.size,
    }

    console.log(`Processing complete:`)
    console.log(`- Processed ${totalOrders} orders`)
    console.log(`- Total revenue: $${totalRevenue}`)
    console.log(`- Total items sold: ${totalItemsSold}`)
    console.log(`- Unique items: ${uniqueItemNames.size}`)
    console.log(`- Best selling items: ${bestSellingItems.length}`)
    console.log(`- Categories: ${categorySales.length}`)
    console.log(`- Daily records: ${dailySales.length}`)

    return {
      success: true,
      data: {
        bestSellingItems,
        categorySales,
        dailySales,
        overallStats,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          filter: dateFilter,
        },
        debug: {
          totalRecordsInDB: allIncomeRecords.length,
          filteredRecords: filteredRecords.length,
          processedOrders: totalOrders,
          filteringDetails: {
            recordsInDateRange: analysisResults.recordsInDateRange,
            recordsWithValidPayment: analysisResults.recordsWithValidPayment,
            recordsWithItems: analysisResults.recordsWithItems,
            recordsWithItemsAndNames: analysisResults.recordsWithItemsAndNames,
            recordsPassingAllFilters: analysisResults.recordsPassingAllFilters,
            paymentStatusBreakdown: Object.fromEntries(analysisResults.paymentStatusBreakdown),
            dateRangeInDB: {
              oldest: analysisResults.dateRangeInDB.oldest?.toISOString() || null,
              newest: analysisResults.dateRangeInDB.newest?.toISOString() || null,
            },
          },
        },
      },
    }
  } catch (error) {
    console.error("Failed to get sales analytics:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      debug: {
        errorDetails: error instanceof Error ? error.stack : "Unknown error stack",
      },
    }
  }
}

export async function getItemSalesHistory(itemName: string, limit = 1000) {
  try {
    await dbConnect()

    console.log(`Fetching sales history for item: ${itemName}`)

    // Get ALL income records at once
    const allRecords = await IncomeRecord.find({})
    // console.log(`Retrieved ${allRecords.length} total records for item history analysis`)

    const salesHistory: any[] = []

    // Process records in JavaScript
    allRecords.forEach((record) => {
      // Only include completed/pending orders
      if (!["completed", "pending"].includes(record.paymentStatus)) {
        return
      }

      if (record.items && Array.isArray(record.items)) {
        record.items.forEach((item: any) => {
          const currentItemName = String(item.name || "")
          if (currentItemName === itemName) {
            salesHistory.push({
              orderId: record._id.toString(),
              date: record.date,
              customerName: record.customerName || "Walk-in Customer",
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0,
              total: (Number(item.quantity) || 1) * (Number(item.price) || 0),
              paymentStatus: record.paymentStatus,
              itemName: currentItemName,
              category: String(item.category || "Food"),
              orderTotal: Number(record.totalAmount) || 0,
            })
          }
        })
      }
    })

    // Sort by date (newest first) and limit
    salesHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const limitedHistory = salesHistory.slice(0, limit)

    console.log(`Found ${salesHistory.length} sales for item "${itemName}", returning ${limitedHistory.length}`)

    return {
      success: true,
      data: limitedHistory,
    }
  } catch (error) {
    console.error("Failed to get item sales history:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function getItemPriceHistory(itemName: string) {
  try {
    await dbConnect()

    console.log(`Fetching price history for item: ${itemName}`)

    // Get ALL income records at once
    const allRecords = await IncomeRecord.find({}).lean()

    const priceHistoryMap = new Map()

    // Process records in JavaScript
    allRecords.forEach((record) => {
      // Only include completed/pending orders
      if (!["completed", "pending"].includes(record.paymentStatus)) {
        return
      }

      if (record.items && Array.isArray(record.items)) {
        record.items.forEach((item) => {
          const currentItemName = String(item.name || "")
          if (currentItemName === itemName) {
            const price = Number(item.price) || 0
            const quantity = Number(item.quantity) || 1
            const dateKey = new Date(record.date).toDateString()
            const mapKey = `${dateKey}-${price}`

            if (!priceHistoryMap.has(mapKey)) {
              priceHistoryMap.set(mapKey, {
                price: price,
                count: 0,
                totalQuantity: 0,
                firstSeen: record.date,
                lastSeen: record.date,
                date: record.date,
              })
            }

            const priceData = priceHistoryMap.get(mapKey)
            priceData.count++
            priceData.totalQuantity += quantity

            const recordDate = new Date(record.date)
            if (recordDate > new Date(priceData.lastSeen)) {
              priceData.lastSeen = record.date
            }
            if (recordDate < new Date(priceData.firstSeen)) {
              priceData.firstSeen = record.date
            }
          }
        })
      }
    })

    const priceHistory = Array.from(priceHistoryMap.values()).sort(
      (a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime(),
    )

    console.log(`Found ${priceHistory.length} price points for item: ${itemName}`)

    return {
      success: true,
      data: priceHistory,
    }
  } catch (error) {
    console.error("Failed to get item price history:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Simple function to get all income records (for testing)
export async function getAllIncomeRecords() {
  try {
    await dbConnect()

    const allRecords = await IncomeRecord.find({}).lean()

    return {
      success: true,
      data: allRecords,
      count: allRecords.length,
    }
  } catch (error) {
    console.error("Failed to get all income records:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
