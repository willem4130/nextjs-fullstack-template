"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const parameterFormSchema = z.object({
  name: z
    .string()
    .min(1, "Machine name is required")
    .regex(
      /^PARAM_[A-Z0-9_]+$/,
      "Must start with PARAM_ and use UPPERCASE_SNAKE_CASE"
    ),
  displayName: z.string().min(1, "Display name is required").max(100, "Display name too long"),
  value: z.number(),
  unit: z.string().optional(),
  category: z.string().optional(),
  description: z.string().max(500, "Description too long").optional(),
})

export type ParameterFormValues = z.infer<typeof parameterFormSchema>

interface ParameterFormProps {
  defaultValues?: Partial<ParameterFormValues>
  onSubmit: (values: ParameterFormValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  isEditing?: boolean
}

const COMMON_CATEGORIES = [
  "BEDRIJF",
  "VOORRAAD",
  "CAPACITEIT",
  "OPSLAGZONE",
  "NETWERK",
  "LOGISTIEK",
]

export function ParameterForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditing = false,
}: ParameterFormProps) {
  const form = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      displayName: defaultValues?.displayName ?? "",
      value: defaultValues?.value ?? 0,
      unit: defaultValues?.unit ?? "",
      category: defaultValues?.category ?? "",
      description: defaultValues?.description ?? "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., PARAM_VAT_RATE"
                  className="font-mono"
                  {...field}
                  disabled={isEditing}
                />
              </FormControl>
              <FormDescription>
                Must start with PARAM_ and use UPPERCASE_SNAKE_CASE
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., VAT Rate" {...field} />
              </FormControl>
              <FormDescription>
                Human-readable name shown in the UI
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g., 0.21"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                The numeric value of this parameter
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., %, €, days" {...field} />
              </FormControl>
              <FormDescription>
                Optional: Unit of measurement
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COMMON_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Optional: Group related parameters together
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what this parameter represents..."
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional: Add details about this parameter
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Update Parameter" : "Create Parameter"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
