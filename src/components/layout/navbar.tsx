"use client"

import { Session } from "next-auth"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  Menu,
  X,
  BarChart3,
  FileText,
  DollarSign,
  LogOut,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const baseNavigation = [
  { name: "Dashboard", shortName: "Dash", href: "/dashboard", icon: BarChart3 },
  { name: "Records", shortName: "Rec", href: "/dashboard/records", icon: DollarSign },
  { name: "Reports", shortName: "Rpt", href: "/dashboard/reports", icon: FileText },
  { name: "Menu", shortName: "Menu", href: "/dashboard/menu-management", icon: FileText },
  { name: "Due Accounts", shortName: "Due", href: "/dashboard/due-accounts", icon: DollarSign },
]

const adminExtra = [
  { name: "Users", shortName: "Users", href: "/dashboard/users", icon: Users },
  { name: "Sales Analytics", shortName: "Sales", href: "/dashboard/sales-analytics", icon: BarChart3 },
]

const getNavigation = (role: string | undefined) => {
  return role === "admin"
    ? [...baseNavigation, ...adminExtra]
    : role === "manager"
    ? baseNavigation.filter((item) => item.name !== "Menu")
    : baseNavigation
}

export function Navbar({ serverSession }: { serverSession: Session | null }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const session = serverSession
  const userRole = session?.user?.role
  const navigation = getNavigation(userRole)

  return (
    <nav className="bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <BarChart3 className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold">RestaurantFin</span>
            </Link>
            <div className="hidden sm:flex sm:space-x-4 md:ml-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-2 py-1 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-primary"
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-1" />
                  <span className="hidden md:inline lg:hidden">{item.shortName}</span>
                  <span className="hidden lg:inline">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ModeToggle />
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{session.user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">{userRole}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/signin">
                <Button>Sign In</Button>
              </Link>
            )}
            <div className="sm:hidden">
              <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="sm:hidden border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
