"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { organizationSchema, type OrganizationInput } from "@/lib/validations"
import type { Organization } from "@/types"
import { createOrganization, updateOrganization } from "@/app/actions/organization"

interface OrganizationFormProps {
  organization?: Organization
  onSuccess?: () => void
}

export function OrganizationForm({organization, onSuccess }: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues: organization
      ? {
          name: organization.name,
          shortName: organization.shortName || "",
          address: organization.address || "",
          phone: organization.phone || "",
          email: organization.email || "",
          taxId: organization.taxId || "",
          isActive: organization.isActive ?? true,
        }
      : {
          name: "",
          shortName: "",
          address: "",
          phone: "",
          email: "",
          taxId: "",
          isActive: true,
        },
    mode: "onChange",
  })

  const onSubmit = async (data: OrganizationInput) => {
    setIsLoading(true)

    try {
      if (organization) {
        await updateOrganization(organization._id, data)
        toast.success("Organization updated successfully!")
      } else {
        await createOrganization({ ...data, shortName: data.shortName ?? "" })
        toast.success("Organization created successfully!")
      }

      if (!organization) {
        form.reset()
      }
      onSuccess?.()
    } catch (error) {
      console.error("Error submitting organization form:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{organization ? "Edit Organization" : "Add New Organization"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name</FormLabel>
                  <FormControl>
                    <Input placeholder="ACME" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+977 (98) 12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Kathmandu, Nepal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input placeholder="12-3456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">Enable or disable this organization</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full touch-manipulation active:scale-95 transition-transform"
            >
              {isLoading ? "Saving..." : organization ? "Update Organization" : "Create Organization"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
