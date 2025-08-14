/**
 * Core data transformation functions for FinOps Dashboard
 * All functions are pure and designed for testing
 */

import { format, parseISO, isValid, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'

/**
 * Parse and validate CSV data
 */
export function validateAndParseCSV(data) {
  const requiredColumns = ['date', 'service', 'cost_usd', 'account', 'tag_env', 'region']
  const errors = []
  const validRows = []

  // Check if data has required columns
  if (!data || data.length === 0) {
    return { validRows: [], errors: ['CSV file is empty'] }
  }

  const headers = Object.keys(data[0])
  const missingColumns = requiredColumns.filter(col => !headers.includes(col))
  
  if (missingColumns.length > 0) {
    return { 
      validRows: [], 
      errors: [`Missing required columns: ${missingColumns.join(', ')}`] 
    }
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowErrors = []
    
    // Validate date
    const dateStr = row.date
    if (!dateStr) {
      rowErrors.push(`Row ${index + 1}: date is required`)
    } else {
      const parsedDate = parseISO(dateStr)
      if (!isValid(parsedDate)) {
        rowErrors.push(`Row ${index + 1}: invalid date format "${dateStr}". Expected YYYY-MM-DD`)
      } else {
        row.parsedDate = parsedDate
      }
    }

    // Validate cost_usd
    const cost = parseFloat(row.cost_usd)
    if (isNaN(cost)) {
      rowErrors.push(`Row ${index + 1}: cost_usd must be a valid number`)
    } else {
      row.cost_usd = cost
    }

    // Validate required string fields
    if (!row.service?.trim()) rowErrors.push(`Row ${index + 1}: service is required`)
    if (!row.account?.trim()) rowErrors.push(`Row ${index + 1}: account is required`)
    if (!row.tag_env?.trim()) rowErrors.push(`Row ${index + 1}: tag_env is required`)
    if (!row.region?.trim()) rowErrors.push(`Row ${index + 1}: region is required`)

    if (rowErrors.length === 0) {
      validRows.push(row)
    } else {
      errors.push(...rowErrors)
    }
  })

  return { validRows, errors }
}

/**
 * Group by date and sum costs
 */
export function daily_totals(df) {
  if (!df || df.length === 0) return []
  
  const grouped = {}
  
  df.forEach(row => {
    const dateKey = format(row.parsedDate, 'yyyy-MM-dd')
    if (!grouped[dateKey]) {
      grouped[dateKey] = { date: dateKey, cost: 0 }
    }
    grouped[dateKey].cost += row.cost_usd
  })

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Group by service and sum costs
 */
export function cost_by_service(df) {
  if (!df || df.length === 0) return []
  
  const grouped = {}
  
  df.forEach(row => {
    if (!grouped[row.service]) {
      grouped[row.service] = { service: row.service, cost: 0 }
    }
    grouped[row.service].cost += row.cost_usd
  })

  return Object.values(grouped).sort((a, b) => b.cost - a.cost)
}

/**
 * Calculate KPIs from filtered data
 */
export function calculateKPIs(df) {
  if (!df || df.length === 0) {
    return {
      total_cost: 0,
      avg_daily: 0,
      n_services: 0,
      top_service_name: null,
      top_service_cost: 0
    }
  }

  const total_cost = df.reduce((sum, row) => sum + row.cost_usd, 0)
  
  // Count unique dates
  const uniqueDates = new Set(df.map(row => format(row.parsedDate, 'yyyy-MM-dd')))
  const n_days = uniqueDates.size
  const avg_daily = n_days > 0 ? total_cost / n_days : 0

  // Count unique services
  const uniqueServices = new Set(df.map(row => row.service))
  const n_services = uniqueServices.size

  // Find top service
  const servicesCost = cost_by_service(df)
  const topService = servicesCost[0]
  
  return {
    total_cost,
    avg_daily,
    n_services,
    top_service_name: topService?.service || null,
    top_service_cost: topService?.cost || 0
  }
}

/**
 * Project month-end spend based on current data
 */
export function project_month_end(df) {
  if (!df || df.length === 0) return 0

  // Get the latest date in the dataset
  const dates = df.map(row => row.parsedDate).sort((a, b) => b - a)
  const latestDate = dates[0]
  
  if (!latestDate) return 0

  // Filter to current month data
  const currentMonthStart = startOfMonth(latestDate)
  const currentMonthEnd = endOfMonth(latestDate)
  
  const thisMonthData = df.filter(row => {
    const rowDate = row.parsedDate
    return rowDate >= currentMonthStart && rowDate <= currentMonthEnd
  })

  if (thisMonthData.length === 0) return 0

  // Calculate totals and unique days in current month
  const total_so_far = thisMonthData.reduce((sum, row) => sum + row.cost_usd, 0)
  const uniqueDatesThisMonth = new Set(
    thisMonthData.map(row => format(row.parsedDate, 'yyyy-MM-dd'))
  )
  const days_so_far = uniqueDatesThisMonth.size

  if (days_so_far === 0) return 0

  // Project based on daily average
  const days_in_month = getDaysInMonth(latestDate)
  const projection = (total_so_far / days_so_far) * days_in_month

  return projection
}

/**
 * Get top services by cost
 */
export function top_services(df, n = 3) {
  const services = cost_by_service(df)
  return services.slice(0, n)
}

/**
 * Find the day with highest spend
 */
export function highest_spend_day(df) {
  if (!df || df.length === 0) return null

  const dailyTotals = daily_totals(df)
  if (dailyTotals.length === 0) return null

  const highestDay = dailyTotals.reduce((max, day) => 
    day.cost > max.cost ? day : max
  )

  return {
    date: highestDay.date,
    cost: highestDay.cost
  }
}

/**
 * Calculate top movers between two time windows
 */
export function top_movers(df, window_days, n = 10) {
  if (!df || df.length === 0) return { movers: [], hasEnoughData: false }

  // Get unique dates and sort
  const uniqueDates = [...new Set(df.map(row => format(row.parsedDate, 'yyyy-MM-dd')))]
    .sort()

  // Check if we have enough data
  if (uniqueDates.length < window_days * 2) {
    return { movers: [], hasEnoughData: false }
  }

  const latestDate = uniqueDates[uniqueDates.length - 1]
  const latestDateObj = parseISO(latestDate)

  // Define recent and prior windows
  const recentEndDate = latestDateObj
  const recentStartDate = new Date(recentEndDate)
  recentStartDate.setDate(recentStartDate.getDate() - (window_days - 1))

  const priorEndDate = new Date(recentStartDate)
  priorEndDate.setDate(priorEndDate.getDate() - 1)
  const priorStartDate = new Date(priorEndDate)
  priorStartDate.setDate(priorStartDate.getDate() - (window_days - 1))

  // Filter data for each window
  const recentData = df.filter(row => 
    row.parsedDate >= recentStartDate && row.parsedDate <= recentEndDate
  )
  
  const priorData = df.filter(row => 
    row.parsedDate >= priorStartDate && row.parsedDate <= priorEndDate
  )

  // Calculate costs by service for each window
  const recentCosts = cost_by_service(recentData).reduce((acc, item) => {
    acc[item.service] = item.cost
    return acc
  }, {})

  const priorCosts = cost_by_service(priorData).reduce((acc, item) => {
    acc[item.service] = item.cost
    return acc
  }, {})

  // Get all services from both windows
  const allServices = new Set([...Object.keys(recentCosts), ...Object.keys(priorCosts)])

  // Calculate changes
  const movers = Array.from(allServices).map(service => {
    const recent_cost = recentCosts[service] || 0
    const prior_cost = priorCosts[service] || 0
    const change = recent_cost - prior_cost
    const pct_change = prior_cost > 0 ? (change / prior_cost) * 100 : null

    return {
      service,
      recent_cost,
      prior_cost,
      change,
      pct_change
    }
  })

  // Sort by absolute change and take top n
  const sortedMovers = movers
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, n)

  return { movers: sortedMovers, hasEnoughData: true }
}

/**
 * Apply filters to the dataset
 */
export function applyFilters(data, filters) {
  if (!data || data.length === 0) return []

  return data.filter(row => {
    // Date range filter
    if (filters.dateRange?.start && row.parsedDate < parseISO(filters.dateRange.start)) {
      return false
    }
    if (filters.dateRange?.end && row.parsedDate > parseISO(filters.dateRange.end)) {
      return false
    }

    // Service filter
    if (filters.services?.length > 0 && !filters.services.includes(row.service)) {
      return false
    }

    // Account filter
    if (filters.accounts?.length > 0 && !filters.accounts.includes(row.account)) {
      return false
    }

    return true
  })
}

/**
 * Get date range from dataset
 */
export function getDateRange(data) {
  if (!data || data.length === 0) return { min: null, max: null }

  const dates = data
    .map(row => row.parsedDate)
    .filter(date => date && isValid(date))
    .sort((a, b) => a - b)

  return {
    min: dates[0] ? format(dates[0], 'yyyy-MM-dd') : null,
    max: dates[dates.length - 1] ? format(dates[dates.length - 1], 'yyyy-MM-dd') : null
  }
}

/**
 * Get unique values for filter options
 */
export function getUniqueValues(data, field) {
  if (!data || data.length === 0) return []
  
  const values = [...new Set(data.map(row => row[field]).filter(Boolean))]
  return values.sort()
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value) {
  if (value === null || value === undefined) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

/**
 * Get current month data for budget tracking
 */
export function getCurrentMonthData(df) {
  if (!df || df.length === 0) return { mtdActual: 0, data: [] }

  // Get current date (or latest date in dataset for demo)
  const dates = df.map(row => row.parsedDate).sort((a, b) => b - a)
  const latestDate = dates[0]
  
  if (!latestDate) return { mtdActual: 0, data: [] }

  const currentMonthStart = startOfMonth(latestDate)
  const currentMonthEnd = endOfMonth(latestDate)

  const currentMonthData = df.filter(row => {
    const rowDate = row.parsedDate
    return rowDate >= currentMonthStart && rowDate <= currentMonthEnd
  })

  const mtdActual = currentMonthData.reduce((sum, row) => sum + row.cost_usd, 0)

  return { mtdActual, data: currentMonthData }
}