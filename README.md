# FinOps Cloud Cost Dashboard

A comprehensive cloud cost analysis dashboard for managing and optimizing your cloud spending. Built specifically for hiring managers to evaluate cloud cost patterns and projections.

## Features

### 📊 **Analytics & KPIs**
- **Total Cost Tracking**: Real-time spend analysis across filtered periods
- **Daily Average Calculations**: Track spending trends over time  
- **Service Analysis**: Identify which services consume the most budget
- **Top Service Insights**: Highlight your highest-cost service at a glance

### 📈 **Advanced Insights**
- **Month-End Projections**: Predict spending based on current trends
- **Budget vs Actual Tracking**: Compare actual spend against monthly budgets
- **Top Movers Analysis**: Identify services with the biggest cost changes (7-day or 30-day windows)
- **Highest Spend Days**: Pinpoint cost spikes and unusual spending patterns

### 🎯 **Interactive Features**
- **Dual Data Sources**: Use bundled sample data or upload your own CSV files
- **Advanced Filtering**: Filter by date range, services, and accounts
- **Real-time Updates**: All analytics update instantly when filters change
- **Budget Management**: Set and track monthly budget goals

### 📊 **Visualizations**
- **Daily Spend Trend**: Line chart showing cost patterns over time
- **Cost by Service**: Bar chart displaying top 12 services by cost
- **PNG Export**: Download any chart as a high-quality PNG image

### 💾 **Export Capabilities**
- **Filtered Data Export**: Download current filtered dataset as CSV
- **Cost by Service Export**: Export service cost breakdown 
- **Daily Totals Export**: Export daily spending summaries
- **Chart Downloads**: Save charts as PNG files for presentations

## Quick Start

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Sample Data
The dashboard includes a comprehensive sample CSV with 90+ days of realistic cloud billing data:
- **Time Range**: March 1st - May 31st, 2024
- **Accounts**: acct-prod, acct-dev  
- **Services**: AmazonEC2, AmazonS3, AWSLambda, AmazonRDS
- **Regions**: us-east-1, us-west-2
- **Features**: Natural spending variation with cost spikes for realistic analysis

## CSV Data Format

Your CSV files must include these required columns:

| Column | Format | Description |
|--------|--------|-------------|
| `date` | YYYY-MM-DD | Billing date |
| `service` | string | AWS service name |
| `cost_usd` | number | Cost in US dollars |
| `account` | string | Account identifier |  
| `tag_env` | string | Environment tag (prod/dev) |
| `region` | string | AWS region |

### Example CSV:
```csv
date,service,cost_usd,account,tag_env,region
2024-03-01,AmazonEC2,145.67,acct-prod,prod,us-east-1
2024-03-01,AmazonS3,23.45,acct-prod,prod,us-east-1
2024-03-01,AWSLambda,8.92,acct-prod,prod,us-east-1
```

## Architecture

### Core Components
- **Transform Functions** (`/lib/transforms.js`): Pure functions for all data calculations
- **Main Dashboard** (`/app/page.js`): Complete React component with Chart.js integration
- **Sample Data** (`/public/sample_billing.csv`): Pre-loaded realistic dataset

### Key Transform Functions
- `daily_totals()`: Group and sum costs by date
- `cost_by_service()`: Aggregate spending by service  
- `project_month_end()`: Calculate projected monthly spending
- `top_movers()`: Identify services with biggest cost changes
- `calculateKPIs()`: Generate key performance indicators

### Technology Stack
- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **UI Components**: shadcn/ui component library
- **CSV Processing**: Papa Parse
- **Date Handling**: date-fns
- **Export**: Canvas-based PNG downloads

## Performance

- **Optimized for 50,000+ rows**: Client-side filtering handles large datasets smoothly
- **Real-time Analytics**: Instant filter updates without API calls
- **Memory Efficient**: Pure functions with minimal state management
- **Fast Rendering**: Virtualized components for large data sets

## Data Validation

The dashboard includes comprehensive validation:
- **Missing Columns**: Detects and reports missing required fields
- **Date Validation**: Ensures proper YYYY-MM-DD format
- **Numeric Validation**: Validates cost_usd as valid numbers
- **Error Reporting**: Clear, actionable error messages
- **Graceful Handling**: Continues processing valid rows when errors exist

## Testing

Unit tests are provided for all core transform functions:

```bash
# Run tests (when Jest is configured)
npm test
```

Tests cover:
- Data aggregation accuracy
- Edge cases (empty data, single records)
- Date calculations and projections
- CSV validation logic
- Top movers calculations

## Browser Support

- Chrome 90+
- Firefox 88+  
- Safari 14+
- Edge 90+

## Contributing

This dashboard was built as an MVP for demonstrating FinOps capabilities. The codebase prioritizes:
- **Correctness**: Accurate financial calculations
- **Clarity**: Readable code and clear UX
- **Simplicity**: Focused feature set without over-engineering

## License

MIT License - Built for hiring manager evaluation purposes.
