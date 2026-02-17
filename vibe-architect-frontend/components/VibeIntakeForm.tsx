import * as React from "react"
import { useRouter } from "next/navigation"
import { api, VibeIntakeData } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { TemplatePicker } from "./TemplatePicker"
import { Loader2 } from "lucide-react"

export function VibeIntakeForm() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const [vibeText, setVibeText] = React.useState("")
  const [template, setTemplate] = React.useState("")
  const [enableAnalytics, setEnableAnalytics] = React.useState(true)
  const [enableDriftSentinel, setEnableDriftSentinel] = React.useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!vibeText.trim()) {
        throw new Error("Please describe your app vibe.")
      }
      if (!template) {
        throw new Error("Please select a template.")
      }

      const data: VibeIntakeData = {
        vibeText,
        template,
        options: {
          enableAnalytics,
          enableDriftSentinel,
        },
      }

      const { sessionId } = await api.createSession(data)
      router.push(`/build/${sessionId}`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to start build session.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Start New Build</CardTitle>
        <CardDescription>
          Describe your app idea and let the Vibe Architect build it for you.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="vibe">Vibe Specification</Label>
            <Textarea
              id="vibe"
              placeholder="I want a CRM for dog walkers with scheduling and payments..."
              className="min-h-[150px]"
              value={vibeText}
              onChange={(e) => setVibeText(e.target.value)}
              disabled={loading}
            />
          </div>

          <TemplatePicker 
            value={template} 
            onChange={setTemplate}
          />

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="analytics" className="flex flex-col space-y-1">
              <span>Enable Analytics</span>
              <span className="font-normal text-xs text-muted-foreground">
                Track usage with Iceberg/S3 integration
              </span>
            </Label>
            <Switch
              id="analytics"
              checked={enableAnalytics}
              onCheckedChange={setEnableAnalytics}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="drift" className="flex flex-col space-y-1">
              <span>Drift Sentinel</span>
              <span className="font-normal text-xs text-muted-foreground">
                Monitor schema drift and suggest fixes
              </span>
            </Label>
            <Switch
              id="drift"
              checked={enableDriftSentinel}
              onCheckedChange={setEnableDriftSentinel}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing Session...
              </>
            ) : (
              "Start Build"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
