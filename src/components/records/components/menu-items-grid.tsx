"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FormLabel } from "@/components/ui/form"
import { formatCurrency } from "@/lib/utils"

interface MenuItem {
  name: string
  price: number
}

interface MenuItemsGridProps {
  menuItems: MenuItem[]
  currentItems: any[]
  onAddItem: (item: MenuItem) => void
}

export const MenuItemsGrid = React.memo<MenuItemsGridProps>(({ menuItems, currentItems, onAddItem }) => {
  return (
    <div className="space-y-2">
      <FormLabel>Quick Add Menu Items</FormLabel>
      <p className="text-sm text-muted-foreground">
        Click to add items. If item already exists, quantity will be increased.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
        {menuItems.map((item) => {
          const existingItem = currentItems?.find(
            (watchedItem) => watchedItem.name.toLowerCase() === item.name.toLowerCase(),
          )
          const currentQuantity = existingItem?.quantity || 0

          return (
            <Button
              key={item.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddItem(item)}
              className="justify-start text-left h-auto p-2 relative"
            >
              <div className="w-full">
                <div className="font-medium text-xs">{item.name}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                {currentQuantity > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {currentQuantity}
                  </Badge>
                )}
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
})

MenuItemsGrid.displayName = "MenuItemsGrid"
