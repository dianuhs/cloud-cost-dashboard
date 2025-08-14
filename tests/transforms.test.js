/**
 * Unit tests for transform functions
 * Tests critical business logic for the FinOps dashboard
 */

import { 
  daily_totals, 
  cost_by_service, 
  project_month_end, 
  top_movers,
  calculateKPIs,
  validateAndParseCSV
} from '../lib/transforms.js'

// Mock data for testing
const mockData = [
  { 
    date: '2024-03-01', 
    service: 'AmazonEC2', 
    cost_usd: 100, 
    account: 'prod', 
    tag_env: 'prod', 
    region: 'us-east-1',
    parsedDate: new Date('2024-03-01')
  },
  { 
    date: '2024-03-01', 
    service: 'AmazonS3', 
    cost_usd: 50, 
    account: 'prod', 
    tag_env: 'prod', 
    region: 'us-east-1',
    parsedDate: new Date('2024-03-01')
  },
  { 
    date: '2024-03-02', 
    service: 'AmazonEC2', 
    cost_usd: 120, 
    account: 'prod', 
    tag_env: 'prod', 
    region: 'us-east-1',
    parsedDate: new Date('2024-03-02')
  },
  { 
    date: '2024-03-02', 
    service: 'AmazonS3', 
    cost_usd: 30, 
    account: 'prod', 
    tag_env: 'prod', 
    region: 'us-east-1',
    parsedDate: new Date('2024-03-02')
  }
]

describe('Transform Functions', () => {
  
  describe('daily_totals', () => {
    test('should group costs by date correctly', () => {
      const result = daily_totals(mockData)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        date: '2024-03-01',
        cost: 150
      })
      expect(result[1]).toEqual({
        date: '2024-03-02',
        cost: 150
      })
    })

    test('should handle empty data', () => {
      const result = daily_totals([])
      expect(result).toEqual([])
    })

    test('should sort dates chronologically', () => {
      const unsortedData = [mockData[2], mockData[0], mockData[1], mockData[3]]
      const result = daily_totals(unsortedData)
      
      expect(result[0].date).toBe('2024-03-01')
      expect(result[1].date).toBe('2024-03-02')
    })
  })

  describe('cost_by_service', () => {
    test('should group costs by service correctly', () => {
      const result = cost_by_service(mockData)
      
      expect(result).toHaveLength(2)
      
      // Should be sorted by cost descending
      expect(result[0]).toEqual({
        service: 'AmazonEC2',
        cost: 220
      })
      expect(result[1]).toEqual({
        service: 'AmazonS3',
        cost: 80
      })
    })

    test('should handle empty data', () => {
      const result = cost_by_service([])
      expect(result).toEqual([])
    })

    test('should sort by cost descending', () => {
      const result = cost_by_service(mockData)
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i-1].cost).toBeGreaterThanOrEqual(result[i].cost)
      }
    })
  })

  describe('calculateKPIs', () => {
    test('should calculate KPIs correctly', () => {
      const result = calculateKPIs(mockData)
      
      expect(result.total_cost).toBe(300)
      expect(result.avg_daily).toBe(150) // 300 total / 2 days
      expect(result.n_services).toBe(2)
      expect(result.top_service_name).toBe('AmazonEC2')
      expect(result.top_service_cost).toBe(220)
    })

    test('should handle empty data', () => {
      const result = calculateKPIs([])
      
      expect(result.total_cost).toBe(0)
      expect(result.avg_daily).toBe(0)
      expect(result.n_services).toBe(0)
      expect(result.top_service_name).toBe(null)
      expect(result.top_service_cost).toBe(0)
    })
  })

  describe('project_month_end', () => {
    test('should project month-end spending', () => {
      // Mock data for March with 2 days of data
      const marchData = [
        { 
          parsedDate: new Date('2024-03-01'), 
          cost_usd: 100 
        },
        { 
          parsedDate: new Date('2024-03-02'), 
          cost_usd: 100 
        }
      ]
      
      const result = project_month_end(marchData)
      
      // March has 31 days, we have 2 days of data at $100/day
      // Projection: (200 / 2) * 31 = 3100
      expect(result).toBe(3100)
    })

    test('should handle empty data', () => {
      const result = project_month_end([])
      expect(result).toBe(0)
    })

    test('should handle single day', () => {
      const singleDayData = [
        { 
          parsedDate: new Date('2024-03-01'), 
          cost_usd: 150 
        }
      ]
      
      const result = project_month_end(singleDayData)
      
      // March has 31 days, projection: 150 * 31 = 4650
      expect(result).toBe(4650)
    })
  })

  describe('top_movers', () => {
    test('should identify top movers correctly', () => {
      // Create data with two 7-day windows
      const movingData = [
        // Prior window (days 1-7)
        { parsedDate: new Date('2024-03-01'), service: 'AmazonEC2', cost_usd: 100 },
        { parsedDate: new Date('2024-03-02'), service: 'AmazonEC2', cost_usd: 100 },
        { parsedDate: new Date('2024-03-03'), service: 'AmazonEC2', cost_usd: 100 },
        { parsedDate: new Date('2024-03-04'), service: 'AmazonEC2', cost_usd: 100 },
        { parsedDate: new Date('2024-03-05'), service: 'AmazonEC2', cost_usd: 100 },
        { parsedDate: new Date('2024-03-06'), service: 'AmazonEC2', cost_usd: 100 },
        { parsedDate: new Date('2024-03-07'), service: 'AmazonEC2', cost_usd: 100 },
        // Recent window (days 8-14)
        { parsedDate: new Date('2024-03-08'), service: 'AmazonEC2', cost_usd: 200 },
        { parsedDate: new Date('2024-03-09'), service: 'AmazonEC2', cost_usd: 200 },
        { parsedDate: new Date('2024-03-10'), service: 'AmazonEC2', cost_usd: 200 },
        { parsedDate: new Date('2024-03-11'), service: 'AmazonEC2', cost_usd: 200 },
        { parsedDate: new Date('2024-03-12'), service: 'AmazonEC2', cost_usd: 200 },
        { parsedDate: new Date('2024-03-13'), service: 'AmazonEC2', cost_usd: 200 },
        { parsedDate: new Date('2024-03-14'), service: 'AmazonEC2', cost_usd: 200 }
      ]

      const result = top_movers(movingData, 7, 5)
      
      expect(result.hasEnoughData).toBe(true)
      expect(result.movers).toHaveLength(1)
      expect(result.movers[0].service).toBe('AmazonEC2')
      expect(result.movers[0].recent_cost).toBe(1400) // 7 days * 200
      expect(result.movers[0].prior_cost).toBe(700)   // 7 days * 100
      expect(result.movers[0].change).toBe(700)       // 1400 - 700
      expect(result.movers[0].pct_change).toBe(100)   // (700/700) * 100
    })

    test('should handle insufficient data', () => {
      const insufficientData = [
        { parsedDate: new Date('2024-03-01'), service: 'AmazonEC2', cost_usd: 100 }
      ]

      const result = top_movers(insufficientData, 7, 5)
      
      expect(result.hasEnoughData).toBe(false)
      expect(result.movers).toEqual([])
    })

    test('should handle empty data', () => {
      const result = top_movers([], 7, 5)
      
      expect(result.hasEnoughData).toBe(false)
      expect(result.movers).toEqual([])
    })
  })

  describe('validateAndParseCSV', () => {
    test('should validate correct CSV data', () => {
      const csvData = [
        {
          date: '2024-03-01',
          service: 'AmazonEC2',
          cost_usd: '100.50',
          account: 'prod',
          tag_env: 'production',
          region: 'us-east-1'
        }
      ]

      const result = validateAndParseCSV(csvData)
      
      expect(result.errors).toHaveLength(0)
      expect(result.validRows).toHaveLength(1)
      expect(result.validRows[0].cost_usd).toBe(100.50)
      expect(result.validRows[0].parsedDate).toBeInstanceOf(Date)
    })

    test('should detect missing columns', () => {
      const csvData = [
        {
          date: '2024-03-01',
          service: 'AmazonEC2'
          // Missing required columns
        }
      ]

      const result = validateAndParseCSV(csvData)
      
      expect(result.errors).toContain('Missing required columns: cost_usd, account, tag_env, region')
      expect(result.validRows).toHaveLength(0)
    })

    test('should detect invalid dates', () => {
      const csvData = [
        {
          date: 'invalid-date',
          service: 'AmazonEC2',
          cost_usd: '100.50',
          account: 'prod',
          tag_env: 'production',
          region: 'us-east-1'
        }
      ]

      const result = validateAndParseCSV(csvData)
      
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('invalid date format')
      expect(result.validRows).toHaveLength(0)
    })

    test('should detect invalid cost values', () => {
      const csvData = [
        {
          date: '2024-03-01',
          service: 'AmazonEC2',
          cost_usd: 'not-a-number',
          account: 'prod',
          tag_env: 'production',
          region: 'us-east-1'
        }
      ]

      const result = validateAndParseCSV(csvData)
      
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('cost_usd must be a valid number')
      expect(result.validRows).toHaveLength(0)
    })

    test('should handle empty data', () => {
      const result = validateAndParseCSV([])
      
      expect(result.errors).toContain('CSV file is empty')
      expect(result.validRows).toHaveLength(0)
    })
  })
})