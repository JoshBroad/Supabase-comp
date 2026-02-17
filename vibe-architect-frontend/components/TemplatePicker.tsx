import * as React from "react"
import { Label } from "@/components/ui/label"

const templates = [
  { id: "saas-starter", name: "SaaS Starter", description: "Auth, Stripe, Dashboard" },
  { id: "marketplace", name: "Marketplace", description: "Listings, Search, Payments" },
  { id: "crm", name: "CRM", description: "Contacts, Deals, Pipelines" },
  { id: "blog", name: "CMS / Blog", description: "Posts, Authors, Categories" },
  { id: "empty", name: "Empty Project", description: "Start from scratch" },
]

interface TemplatePickerProps {
  value: string
  onChange: (value: string) => void
}

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  // Since we haven't implemented Select UI component yet, we use native select for now
  // or I can implement Select component.
  // Wait, I didn't implement Select component yet. I'll use native select.
  
  return (
    <div className="grid gap-2">
      <Label htmlFor="template">Template</Label>
      <select
        id="template"
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>Select a template</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name} - {template.description}
          </option>
        ))}
      </select>
    </div>
  )
}
