"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import type { User } from "@/types"

interface UserAvatarGroupProps {
  users: User[]
  maxDisplay?: number
}

export function UserAvatarGroup({ users, maxDisplay = 3 }: UserAvatarGroupProps) {
  if (!users || users.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Users className="h-4 w-4" />
        <span>No users</span>
      </div>
    )
  }

  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = users.length - maxDisplay

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500"
      case "manager":
        return "bg-blue-500"
      case "staff":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {displayUsers.map((user) => (
                <Avatar
                  key={user._id}
                  className={`h-8 w-8 border-2 border-background ${getRoleColor(user.role)} hover:z-10 transition-transform hover:scale-110`}
                >
                  <AvatarFallback className="text-white text-xs font-medium">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            {remainingCount > 0 && (
              <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                +{remainingCount}
              </div>
            )}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Members ({users.length})
          </DialogTitle>
          <DialogDescription>View all members of this organization</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
          {users.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className={`h-10 w-10 ${getRoleColor(user.role)}`}>
                  <AvatarFallback className="text-white font-medium">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {user.role}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
