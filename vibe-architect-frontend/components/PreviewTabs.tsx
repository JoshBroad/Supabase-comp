import * as React from "react"
import { supabase } from "@/lib/supabaseClient"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Lock, Unlock, Database, BarChart } from "lucide-react"

export function PreviewTabs({ sessionId }: { sessionId: string }) {
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  
  const [data, setData] = React.useState<any[]>([])
  const [dataLoading, setDataLoading] = React.useState(false)
  const [queryError, setQueryError] = React.useState<string | null>(null)

  // Auth handlers
  const handleSignUp = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) alert(error.message)
    else alert("Check your email for confirmation link!")
  }

  const handleSignIn = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) alert(error.message)
    else setUser(data.user)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setData([]) // Clear data on sign out to demonstrate RLS
  }

  // Data handlers
  const fetchData = async () => {
    setDataLoading(true)
    setQueryError(null)
    // Attempt to fetch from a table. Since we don't know the table name, 
    // we'll assume a standard one or fetch list of tables first?
    // For demo, we might try to fetch 'users' or 'items' if they exist, 
    // or just show a message that backend connection is needed.
    // Ideally, the build session would provide the main table name.
    
    // For now, let's try to query 'todos' or 'items' as example
    const { data, error } = await supabase.from('items').select('*')
    
    setDataLoading(false)
    if (error) {
      setQueryError(error.message)
      setData([])
    } else {
      setData(data || [])
    }
  }

  return (
    <Tabs defaultValue="auth" className="w-full max-w-3xl mx-auto">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="auth">Authentication</TabsTrigger>
        <TabsTrigger value="data">Data & RLS</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      
      <TabsContent value="auth">
        <Card>
          <CardHeader>
            <CardTitle>User Authentication</CardTitle>
            <CardDescription>
              Sign up or sign in to test Row Level Security (RLS).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Unlock className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Authenticated as</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant="success" className="mt-2">Role: authenticated</Badge>
                </div>
                <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleSignIn} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleSignUp} disabled={loading}>
                    Sign Up
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="data">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Data Explorer</span>
              {user ? (
                <Badge variant="success" className="gap-1"><Unlock className="h-3 w-3" /> Access Granted</Badge>
              ) : (
                <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> RLS Protected</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Try fetching data. Without authentication, RLS should block access or return empty results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/50 p-4 min-h-[200px] flex items-center justify-center">
              {dataLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : queryError ? (
                <div className="text-center text-destructive space-y-2">
                  <p className="font-medium">Query Failed</p>
                  <p className="text-sm">{queryError}</p>
                </div>
              ) : data.length > 0 ? (
                <div className="w-full space-y-2">
                  {data.map((item, i) => (
                    <div key={i} className="text-xs bg-background p-2 rounded border font-mono">
                      {JSON.stringify(item)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data found or access denied.</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchData} className="w-full">
              Fetch Data
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
            <CardDescription>
              Query your data warehouse (Iceberg/S3) via Supabase Foreign Tables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="rounded-md border bg-slate-950 p-4 font-mono text-xs text-slate-50">
               <span className="text-purple-400">SELECT</span> * <span className="text-purple-400">FROM</span> analytics.events 
               <br />
               <span className="text-purple-400">WHERE</span> session_id = <span className="text-green-400">'{sessionId}'</span>
               <br />
               <span className="text-purple-400">ORDER BY</span> ts <span className="text-purple-400">DESC</span>
               <br />
               <span className="text-purple-400">LIMIT</span> 10;
             </div>
             
             <div className="flex items-center justify-center p-8 border rounded-md border-dashed">
               <div className="text-center space-y-2">
                 <BarChart className="h-8 w-8 mx-auto text-muted-foreground" />
                 <p className="text-sm text-muted-foreground">Run query to see results</p>
               </div>
             </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" className="w-full">Run Iceberg Query</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
