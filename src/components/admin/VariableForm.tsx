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

const variableFormSchema = z.object({
  name: z
    .string()
    .min(1, "Machine name is required")
    .regex(
      /^(INPUT_|OUTPUT_)[A-Z0-9_]+$/,
      "Must start with INPUT_ or OUTPUT_ and use UPPERCASE_SNAKE_CASE"
    ),
  displayName: z.string().min(1, "Display name is required").max(100, "Display name too long"),
  variableType: z.enum(["INPUT", "OUTPUT"]),
  category: z.string().optional(),
  unit: z.string().optional(),
  formula: z.string().optional(),
  description: z.string().max(500, "Description too long").optional(),
}).refine(
  (data) => {
    // OUTPUT variables must have a formula
    if (data.variableType === "OUTPUT" && !data.formula) {
      return false
    }
    return true
  },
  {
    message: "OUTPUT variables must have a formula",
    path: ["formula"],
  }
)

export type VariableFormValues = z.infer<typeof variableFormSchema>

interface VariableFormProps {
  defaultValues?: Partial<VariableFormValues>
  onSubmit: (values: VariableFormValues) => void | Promise<void>
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

export function VariableForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditing = false,
}: VariableFormProps) {
  const form = useForm<VariableFormValues>({
    resolver: zodResolver(variableFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      displayName: defaultValues?.displayName ?? "",
      variableType: defaultValues?.variableType ?? "INPUT",
      category: defaultValues?.category ?? "",
      unit: defaultValues?.unit ?? "",
      formula: defaultValues?.formula ?? "",
      description: defaultValues?.description ?? "",
    },
  })

  const variableType = form.watch("variableType")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="variableType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variable Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INPUT">INPUT - User-defined value</SelectItem>
                  <SelectItem value="OUTPUT">OUTPUT - Calculated value</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                INPUT variables are set manually, OUTPUT variables are calculated from formulas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., INPUT_WAREHOUSE_CAPACITY"
                  className="font-mono"
                  {...field}
                  disabled={isEditing}
                />
              </FormControl>
              <FormDescription>
                Must start with INPUT_ or OUTPUT_ and use UPPERCASE_SNAKE_CASE
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
                <Input placeholder="e.g., Warehouse Capacity" {...field} />
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
                Optional: Group related variables together
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
                <Input placeholder="e.g., kg, €, m²" {...field} />
              </FormControl>
              <FormDescription>
                Optional: Unit of measurement
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {variableType === "OUTPUT" && (
          <FormField
            control={form.control}
            name="formula"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Formula</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., INPUT_PRICE * INPUT_QUANTITY"
                    className="resize-none font-mono"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Formula to calculate this variable (required for OUTPUT variables)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what this variable represents..."
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional: Add details about this variable
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
            {isSubmitting ? "Saving..." : isEditing ? "Update Variable" : "Create Variable"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
