"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Plus, Search, Building2 } from "lucide-react"
import { toast } from "sonner"
import { deleteOrganization } from "@/app/actions/organization"
import { OrganizationWithUsers } from "@/types"
import { UserAvatarGroup } from "@/components/organization/user-avatar-group"
import { OrganizationForm } from "@/components/organization/organization-form"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithUsers[]>([])
  const [filteredOrganizations, setFilteredOrganizations] = useState<OrganizationWithUsers[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingOrganization, setEditingOrganization] = useState<OrganizationWithUsers | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    const filtered = organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.email && org.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (org.shortName && org.shortName.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    setFilteredOrganizations(filtered)
  }, [organizations, searchTerm])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/organization")
      const data = await response.json()
      setOrganizations(data.organizations || [])
    } catch (error) {
      toast.error("Failed to fetch organizations")
      console.error("Error fetching organizations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return

    try {
      await deleteOrganization(id)
      setOrganizations(organizations.filter((org) => org._id !== id))
      toast.success("Organization deleted successfully")
    } catch (error) {
      toast.error("Failed to delete organization")
      console.error("Error deleting organization:", error)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingOrganization(null)
    fetchOrganizations()
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Organization Management</h1>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredOrganizations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? "No organizations found matching your search."
                      : "No organizations yet. Create one to get started!"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrganizations.map((org) => (
                        <TableRow key={org._id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{org.name}</div>
                              {org.shortName && <div className="text-sm text-muted-foreground">{org.shortName}</div>}
                            </div>
                          </TableCell>
                          <TableCell>{org.email || "-"}</TableCell>
                          <TableCell>{org.phone || "-"}</TableCell>
                          <TableCell>
                            <UserAvatarGroup users={org.users} maxDisplay={3} />
                          </TableCell>
                          <TableCell>
                            <Badge variant={org.isActive ? "default" : "secondary"}>
                              {org.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingOrganization(org)
                                  setShowForm(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(org._id)}>
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
            {showForm && (
              <OrganizationForm
                key={editingOrganization?._id || "new"}
                organization={
                  editingOrganization
                    ? {
                        ...editingOrganization,
                        users: editingOrganization.users.map((user) =>
                          typeof user === "string" ? user : user._id
                        ),
                      }
                    : undefined
                }
                onSuccess={handleFormSuccess}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
