"use client"

import { useState, useEffect } from "react"
import { UserForm } from "@/components/users/user-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { deleteUser } from "@/app/actions/users"
import { Edit, Trash2, Plus, Search, Users } from "lucide-react"
import type { User } from "@/types"
import { toast } from "sonner"
import { getSession } from "next-auth/react"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState<{ _id: string; name: string }[]>([])
  const [session, setSession] = useState<any>(null)
  const superAdmin = session?.user?.superAdmin

  useEffect(() => {
    getSession().then(setSession)
  }, [])
  
  useEffect(() => {
    fetchOrganizations()
  }, [superAdmin === true])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/organization")
      const data = await response.json()
      setOrganizations(data.organizations || [])
    } catch (error) {
      console.error("Error fetching organizations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredUsers(filtered)
  }, [users, searchTerm])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      toast.error("Failed to fetch users")
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      await deleteUser(id)
      setUsers(users.filter((user) => user._id !== id))
      toast.success("User deleted successfully")
    } catch (error) {
      toast.error("Failed to delete user")
      console.error("Error deleting user:", error)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingUser(null)
    fetchUsers()
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user)
                                  setShowForm(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(user._id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            {showForm && <UserForm key={editingUser?._id || "new"} superAdmin={superAdmin} organizations={organizations} user={editingUser || undefined} onSuccess={handleFormSuccess} />}
          </div>
        </div>
      </main>
    </div>
  )
}
