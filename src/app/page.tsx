import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, TrendingUp, Boxes, Calculator, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Supply Chain Simulator</h1>
          </div>
          <Link href="/admin/dashboard">
            <Button>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Model Supply Chain Scenarios with Confidence
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Multi-tenant SaaS for what-if scenario modeling with non-linear effect curves, side-by-side comparison, and financial impact analysis
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/admin/scenarios">
              <Button size="lg">
                Create Scenario
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button size="lg" variant="outline">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50">
        <div className="container px-4 py-24">
          <div className="mx-auto max-w-5xl">
            <h3 className="text-center text-3xl font-bold">Core Features</h3>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <CardTitle className="mt-4">What-If Analysis</CardTitle>
                  <CardDescription>
                    Model multiple scenarios side-by-side to compare outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Baseline vs Alternative comparisons
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Delta and percent change tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Scenario cloning for quick iterations
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Calculator className="h-8 w-8 text-purple-600" />
                  <CardTitle className="mt-4">Formula Engine</CardTitle>
                  <CardDescription>
                    Powerful calculation engine with dependency resolution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      9 math functions (IF, MAX, MIN, POW, etc.)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Automatic dependency ordering
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Circular dependency detection
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                  <CardTitle className="mt-4">Non-Linear Curves</CardTitle>
                  <CardDescription>
                    Model complex relationships with effect curves
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      5 curve types (Linear, Logarithmic, Exponential, Step, Custom)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Live preview with Recharts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Custom interpolation support
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Boxes className="h-8 w-8 text-orange-600" />
                  <CardTitle className="mt-4">Multi-Tenant SaaS</CardTitle>
                  <CardDescription>
                    Enterprise-ready with organization-level isolation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Role-based access (Admin, Editor, Viewer)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Complete data isolation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Audit logging for compliance
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t">
        <div className="container px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-3xl font-bold">Ready to get started?</h3>
            <p className="mt-4 text-lg text-muted-foreground">
              Create your first scenario and start modeling supply chain decisions
            </p>
            <div className="mt-8">
              <Link href="/admin/scenarios">
                <Button size="lg">
                  Create First Scenario
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
          <p>Supply Chain Scenario Simulator - Production Ready</p>
          <p>Built with Next.js 16, tRPC 11 & Prisma 6</p>
        </div>
      </footer>
    </main>
  )
}
