"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, BarChart3, FileText, DollarSign, LogOut, Users } from "lucide-react"
import { usePathname } from "next/navigation"

export function Navbar() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const path = usePathname()

  // Memoize navigation items to prevent unnecessary re-renders
  const navigation = useMemo(
    () => [
      { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
      { name: "Records", href: "/dashboard/records", icon: DollarSign },
      { name: "Reports", href: "/dashboard/reports", icon: FileText },
      { name: "Menu", href: "/dashboard/menu-management", icon: FileText },
      { name: "Due Accounts", href: "/dashboard/due-accounts", icon: DollarSign },
      ...(session?.user?.role === "admin" ? [{ name: "Users", href: "/dashboard/users", icon: Users }, { name: "Sales Analytics", href: "/dashboard/sales-analytics", icon: BarChart3 }] : []),
    ],
    [session?.user?.role],
  )

  // Optimized mobile menu close handler
  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  // Memoize user initials
  const userInitials = useMemo(() => {
    return session?.user?.name?.charAt(0).toUpperCase() || "U"
  }, [session?.user?.name])

  return (
    <nav className="bg-background border-b sticky top-0 z-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <BarChart3 className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold">RestaurantFin</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium hover:text-foreground transition-colors touch-manipulation ${
                    path === item.href
                      ? "text-foreground border-b-2 border-primary"
                      : "hover:border-b-2 hover:border-primary text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ModeToggle />

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full touch-manipulation">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">{session.user?.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="touch-manipulation">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/signin">
                <Button className="touch-manipulation">Sign In</Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="touch-manipulation">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <nav className="flex flex-col gap-4">
                    <div className="px-2 py-4">
                      <h2 className="text-lg font-semibold">Navigation</h2>
                    </div>
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors touch-manipulation ${
                          path === item.href
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        onClick={handleMobileMenuClose}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
