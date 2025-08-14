'use client'

import React, { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { format } from 'date-fns'

// Import UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@" /components/ui/tabs'

// Import transform functions
import {
  validateAndParseCSV,
  daily_totals,
  cost_by_service,
  calculateKPIs,
  project_month_end,
  top_services,
  highest_spend_day,
  top_movers,
  applyFilters,
  getDateRange,
  getUniqueValues,
  formatCurrency,
  formatPercentage,
  getCurrentMonthData
} from '@/lib/transforms'

import { 
  Download, 
  Upload, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

export default function FinOpsDashboard() {
  // State management
  const [dataSource, setDataSource] = useState('sample')
  const [rawData, setRawData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [monthlyBudget, setMonthlyBudget] = useState(1200.00)
  const [topMoversWindow, setTopMoversWindow] = useState(7)
  
  // Filter states
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    services: [],
    accounts: []
  })
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    services: [],
    accounts: [],
    dateRange: { min: '', max: '' }
  })

  // Chart refs for PNG export
  const dailyChartRef = useRef(null)
  const serviceChartRef = useRef(null)

  // Load sample data on mount
  useEffect(() => {
    if (dataSource === 'sample') {
      loadSampleData()
    }
  }, [dataSource])

  // Apply filters when data or filters change
  useEffect(() => {
    if (rawData.length > 0) {
      const filtered = applyFilters(rawData, filters)
      setFilteredData(filtered)
    }
  }, [rawData, filters])

  // Load sample CSV data
  const loadSampleData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/sample_billing.csv')
      const csvText = await response.text()
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processCSVData(results.data)
        },
        error: (error) => {
          setValidationErrors([`Error loading sample data: ${error.message}`])
          setIsLoading(false)
        }
      })
    } catch (error) {
      setValidationErrors([`Failed to load sample data: ${error.message}`])
      setIsLoading(false)
    }
  }

  // Process CSV data (validation + setup)
  const processCSVData = (data) => {
    const { validRows, errors } = validateAndParseCSV(data)
    
    setValidationErrors(errors)
    
    if (validRows.length > 0) {
      setRawData(validRows)
      
      // Setup filter options
      const dateRange = getDateRange(validRows)
      const services = getUniqueValues(validRows, 'service')
      const accounts = getUniqueValues(validRows, 'account')
      
      setFilterOptions({
        services,
        accounts,
        dateRange
      })
      
      // Set default filters
      setFilters({
        dateRange: { start: dateRange.min, end: dateRange.max },
        services: [],
        accounts: []
      })
    }
    
    setIsLoading(false)
  }

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processCSVData(results.data)
      },
      error: (error) => {
        setValidationErrors([`Error parsing CSV: ${error.message}`])
        setIsLoading(false)
      }
    })
  }

  // Calculate analytics
  const kpis = calculateKPIs(filteredData)
  const dailyTotals = daily_totals(filteredData)
  const serviceCosts = cost_by_service(filteredData)
  const topServicesList = top_services(filteredData, 3)
  const highestDay = highest_spend_day(filteredData)
  const projectedMonthEnd = project_month_end(filteredData)
  const { movers, hasEnoughData } = top_movers(filteredData, topMoversWindow, 10)
  const { mtdActual } = getCurrentMonthData(filteredData)

  // Chart configurations
  const dailyChartData = {
    labels: dailyTotals.map(d => d.date),
    datasets: [{
      label: 'Daily Spend',
      data: dailyTotals.map(d => d.cost),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.1
    }]
  }

  const serviceChartData = {
    labels: serviceCosts.slice(0, 12).map(s => s.service),
    datasets: [{
      label: 'Cost by Service',
      data: serviceCosts.slice(0, 12).map(s => s.cost),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(14, 165, 233, 0.8)',
        'rgba(132, 204, 22, 0.8)',
        'rgba(244, 63, 94, 0.8)'
      ]
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString()
          }
        }
      }
    }
  }

  // Export functions
  const downloadChartAsPNG = (chartRef, filename) => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = filename
      link.href = url
      link.click()
    }
  }

  const downloadCSV = (data, filename) => {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const budgetDelta = projectedMonthEnd - monthlyBudget
  const budgetDeltaPercent = monthlyBudget > 0 ? (budgetDelta / monthlyBudget) * 100 : 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">FinOps Cloud Cost Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Analyze and optimize your cloud spending with detailed insights and projections
          </p>
        </div>

        {/* Error Display */}
        {validationErrors.length > 0 && (
          <Alert className="mb-6 border-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Data Validation Errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.slice(0, 10).map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
                {validationErrors.length > 10 && (
                  <li className="text-sm font-medium">
                    ...and {validationErrors.length - 10} more errors
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Source & Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Data Source Selection */}
                <div>
                  <Label className="text-base font-medium">CSV Source</Label>
                  <RadioGroup 
                    value={dataSource} 
                    onValueChange={setDataSource}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sample" id="sample" />
                      <Label htmlFor="sample">Use sample data</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upload" id="upload" />
                      <Label htmlFor="upload">Upload CSV</Label>
                    </div>
                  </RadioGroup>
                  
                  {dataSource === 'upload' && (
                    <div className="mt-3">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Date Range Filter */}
                <div>
                  <Label className="text-base font-medium">Date Range</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                    />
                    <Input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* Service Filter */}
                <div>
                  <Label className="text-base font-medium">Services</Label>
                  <Select
                    value={filters.services.length > 0 ? filters.services.join(',') : 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters(prev => ({ ...prev, services: [] }))
                      } else {
                        setFilters(prev => ({ ...prev, services: value.split(',') }))
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue>
                        {filters.services.length === 0 
                          ? 'All services' 
                          : `${filters.services.length} selected`
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All services</SelectItem>
                      {filterOptions.services.map(service => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Filter */}
                <div>
                  <Label className="text-base font-medium">Accounts</Label>
                  <Select
                    value={filters.accounts.length > 0 ? filters.accounts.join(',') : 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters(prev => ({ ...prev, accounts: [] }))
                      } else {
                        setFilters(prev => ({ ...prev, accounts: value.split(',') }))
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue>
                        {filters.accounts.length === 0 
                          ? 'All accounts' 
                          : `${filters.accounts.length} selected`
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      {filterOptions.accounts.map(account => (
                        <SelectItem key={account} value={account}>
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Budget Setting */}
                <div>
                  <Label htmlFor="budget" className="text-base font-medium">
                    Monthly Budget (USD)
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(parseFloat(e.target.value) || 0)}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {filteredData.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No data available</h3>
                  <p className="text-muted-foreground">
                    {rawData.length === 0 
                      ? 'Please upload a CSV file or use sample data.'
                      : 'No data matches the selected filters. Try adjusting your filter criteria.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(kpis.total_cost)}</div>
                      <p className="text-xs text-muted-foreground">
                        Filtered period total
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Daily Spend</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(kpis.avg_daily)}</div>
                      <p className="text-xs text-muted-foreground">
                        Daily average
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Services</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{kpis.n_services}</div>
                      <p className="text-xs text-muted-foreground">
                        Distinct services
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top Service</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold truncate" title={kpis.top_service_name}>
                        {kpis.top_service_name || 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(kpis.top_service_cost)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Daily Spend Trend</CardTitle>
                        <CardDescription>
                          Cost trends over time
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadChartAsPNG(dailyChartRef, 'daily-spend-trend.png')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PNG
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <Line 
                          ref={dailyChartRef}
                          data={dailyChartData} 
                          options={{
                            ...chartOptions,
                            maintainAspectRatio: false,
                            scales: {
                              ...chartOptions.scales,
                              x: {
                                type: 'time',
                                time: {
                                  unit: 'day'
                                }
                              }
                            }
                          }} 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Cost by Service</CardTitle>
                        <CardDescription>
                          Top 12 services by cost
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadChartAsPNG(serviceChartRef, 'cost-by-service.png')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PNG
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <Bar 
                          ref={serviceChartRef}
                          data={serviceChartData} 
                          options={{
                            ...chartOptions,
                            maintainAspectRatio: false
                          }} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analysis Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Findings Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Findings</CardTitle>
                      <CardDescription>Insights from current filters</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {highestDay && (
                        <div>
                          <Label className="text-sm font-medium">Highest Single Day</Label>
                          <p className="text-lg font-bold">{format(new Date(highestDay.date), 'MMM dd, yyyy')}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(highestDay.cost)}</p>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm font-medium">Projected Month-End</Label>
                        <p className="text-lg font-bold">{formatCurrency(projectedMonthEnd)}</p>
                        <p className="text-sm text-muted-foreground">Based on current trend</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Top Services</Label>
                        <div className="space-y-1">
                          {topServicesList.map((service, index) => (
                            <div key={service.service} className="flex justify-between text-sm">
                              <span>{service.service}</span>
                              <span className="font-medium">{formatCurrency(service.cost)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Budget vs Actual */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget vs Actual</CardTitle>
                      <CardDescription>Current month tracking</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">MTD Actual</Label>
                        <p className="text-2xl font-bold">{formatCurrency(mtdActual)}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Monthly Budget</Label>
                        <p className="text-lg">{formatCurrency(monthlyBudget)}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm font-medium">Projected Month-End</Label>
                        <p className="text-xl font-bold">{formatCurrency(projectedMonthEnd)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {budgetDelta >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          )}
                          <span className={`text-sm font-medium ${budgetDelta >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {budgetDelta >= 0 ? '+' : ''}{formatCurrency(budgetDelta)} vs budget
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(budgetDeltaPercent)} vs budget
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Movers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Top Movers
                        <Select 
                          value={topMoversWindow.toString()} 
                          onValueChange={(value) => setTopMoversWindow(parseInt(value))}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7d</SelectItem>
                            <SelectItem value="30">30d</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardTitle>
                      <CardDescription>
                        Biggest cost changes ({topMoversWindow}-day windows)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!hasEnoughData ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Not enough data for {topMoversWindow}-day comparison.
                          Need at least {topMoversWindow * 2} days of data.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {movers.slice(0, 5).map((mover, index) => (
                            <div key={mover.service} className="flex items-center justify-between text-sm">
                              <span className="truncate flex-1 mr-2">{mover.service}</span>
                              <div className="flex items-center gap-2">
                                {mover.change >= 0 ? (
                                  <TrendingUp className="h-3 w-3 text-red-500" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-green-500" />
                                )}
                                <span className={`font-medium ${mover.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                  {mover.change >= 0 ? '+' : ''}{formatCurrency(mover.change)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Export Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                    <CardDescription>Download filtered data and analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => downloadCSV(filteredData, 'filtered-data.csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Filtered Data
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => downloadCSV(serviceCosts, 'cost-by-service.csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Cost by Service
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => downloadCSV(dailyTotals, 'daily-totals.csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Daily Totals
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}