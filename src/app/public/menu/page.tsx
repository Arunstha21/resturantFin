"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Clock, Wifi, Coffee } from "lucide-react"

interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  category: string
  isAvailable: boolean
  image?: string
}

export default function ChiyaStoryMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (itemId: string) => {
    setImageErrors((prev) => new Set(prev).add(itemId))
  }

  const getPlaceholderConfig = (category: string) => {
    const categoryLower = category.toLowerCase()
    if (categoryLower.includes("chiya") || categoryLower.includes("tea")) {
      return {
        emoji: "🍵",
        bgColor: "bg-gradient-to-br from-green-100 to-emerald-100",
        textColor: "text-green-700",
        borderColor: "border-green-200",
      }
    } else if (categoryLower.includes("coffee")) {
      return {
        emoji: "☕",
        bgColor: "bg-gradient-to-br from-amber-100 to-orange-100",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
      }
    } else if (categoryLower.includes("snack") || categoryLower.includes("food")) {
      return {
        emoji: "🥪",
        bgColor: "bg-gradient-to-br from-yellow-100 to-amber-100",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
      }
    } else if (categoryLower.includes("dessert") || categoryLower.includes("sweet")) {
      return {
        emoji: "🧁",
        bgColor: "bg-gradient-to-br from-pink-100 to-rose-100",
        textColor: "text-pink-700",
        borderColor: "border-pink-200",
      }
    } else {
      return {
        emoji: "🍽️",
        bgColor: "bg-gradient-to-br from-gray-100 to-slate-100",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
      }
    }
  }

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu-items?available=true")
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch menu items")
      }
      const categories = Array.from(new Set(data.menuItems.map((item: MenuItem) => item.category))).sort() as string[]
      setCategories(categories)
      setMenuItems(data.menuItems || [])
    } catch (error) {
      console.error("Error fetching menu items:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMenuItems()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Coffee className="h-12 w-12 mx-auto mb-4 text-amber-600 animate-pulse" />
            <Loader2 className="h-6 w-6 animate-spin absolute -top-1 -right-1 text-amber-800" />
          </div>
          <p className="text-amber-700 font-medium">Brewing your stories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 to-orange-900/20"></div>
        <div className="relative text-center py-8 sm:py-12 md:py-16 lg:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light text-amber-900 mb-2 sm:mb-3 md-mb-6 tracking-wide">
              Chiya Story
            </h1>
            <p className="text-sm sm:text-lg md:text-2xl text-amber-700 font-light italic mb-4 sm:mb-6 md:mb-8">
              Every cup tells a story
            </p>
            <div className="w-16 sm:w-24 md:w-32 h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-8xl mx-auto px-4 py-10">
        {categories.map((category, categoryIndex) => (
          <div key={category} className="mb-5 sm:mb-8 md:mb-12">
            <div className="text-center mb-6 sm:mb-8 md:mb-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-light text-amber-900 mb-2 sm:mb-3 md:mb-4">
                {category}
              </h2>
              <div className="w-12 sm:w-14 md:w-16 h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 md:grid-cols-5 lg:grid-cols-6">
              {menuItems
                .filter((item) => item.category === category)
                .map((item) => {
                  const shouldShowPlaceholder = imageErrors.has(item._id) || !item.image
                  const placeholderConfig = getPlaceholderConfig(item.category)

                  return (
                    <Card
                      key={item._id}
                      className="group border-amber-200 bg-white/90 backdrop-blur-sm hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
                    >
                      <CardContent className="p-0">
                        <div className="relative flex-shrink-0">
                          {shouldShowPlaceholder ? (
                            <div
                              className={`flex items-center justify-center h-48 sm:h-56 md:h-64 lg:h-72 ${placeholderConfig.bgColor} border ${placeholderConfig.borderColor} rounded-t-lg`}
                            >
                              <span className={`text-4xl sm:text-5xl md:text-6xl ${placeholderConfig.textColor}`}>
                                {placeholderConfig.emoji}
                              </span>
                            </div>
                          ) : (
                            <Image
                              src={item.image ? item.image : "/images/placeholder.png"}
                              alt={item.name}
                              className="w-full h-48 sm:h-56 md:h-64 lg:h-72 object-cover"
                              onError={() => handleImageError(item._id)}
                            />
                          )}
                          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 md:top-4 md:right-4">
                            <Badge className="bg-amber-600 text-white text-xs sm:text-sm">
                              ₹{item.price.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-2 sm:p-3 md:p-4 lg:p-6">
                          <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-amber-900 mb-1 sm:mb-2 md:mb-3 group-hover:text-amber-700 transition-colors line-clamp-2">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-amber-700 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3 md:mb-4 line-clamp-2 sm:line-clamp-3 hidden sm:block">
                              {item.description}
                            </p>
                          )}
                          <div className="text-center">
                            <span className="text-lg sm:text-xl md:text-2xl font-bold text-amber-800">
                              ₹{item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>

            {categoryIndex < categories.length - 1 && (
              <Separator className="mt-16 bg-gradient-to-r from-transparent via-amber-300 to-transparent h-px" />
            )}
          </div>
        ))}
      </div>

      {/* Location & Features */}
      <div className="bg-white/80 backdrop-blur-sm border-y border-amber-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <MapPin className="h-5 w-5 text-red-500" />
                <span className="text-amber-900 font-medium">Find Us</span>
              </div>
              <p className="text-amber-700 mb-4">Nestled in the heart of the city, where tradition meets modernity</p>
              <Button
                onClick={() => window.open("https://maps.app.goo.gl/2DSdHmGTze2b42Ty5", "_blank")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4">
                <Clock className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <p className="text-sm text-amber-700">Open Daily</p>
                <p className="text-xs text-amber-600">7AM - 10PM</p>
              </div>
              <div className="p-4">
                <Wifi className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <p className="text-sm text-amber-700">Free WiFi</p>
                <p className="text-xs text-amber-600">High Speed</p>
              </div>
              <div className="p-4">
                <Coffee className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <p className="text-sm text-amber-700">Fresh Daily</p>
                <p className="text-xs text-amber-600">Made to Order</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-amber-900 to-orange-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-light mb-4">Visit Us Today</h3>
          <p className="text-amber-100 mb-6">
            Experience the warmth of Nepali hospitality and the finest teas from the Himalayas
          </p>
          <Button
            onClick={() => window.open("https://maps.app.goo.gl/2DSdHmGTze2b42Ty5", "_blank")}
            variant="outline"
            className="border-white hover:bg-amber-500 hover:text-white"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Find Us on Map
          </Button>
          <div className="mt-8 pt-8 border-t border-amber-700">
            <p className="text-amber-200 text-sm">Namaste! Thank you for being part of our story.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
