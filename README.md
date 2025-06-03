# AI Business Analytics Agent

An AI-powered business analytics and reporting agent that understands business problems, conducts data analysis using AWS Athena, and generates comprehensive reports with insights.

## Overview

This system consists of:
- **Main Agent**: Core AI application that orchestrates the analysis workflow
- **6 MCP Servers**: Specialized servers providing tools for different capabilities
  - Database Server: Data storage and caching
  - AWS Athena Server: SQL query execution on AWS Athena
  - Email Server: Email delivery and template management
  - Data Visualization Server: Chart and graph generation
  - PDF Generation Server: Report PDF creation
  - Machine Learning Server: Pattern recognition and forecasting

## Features

- **Natural Language Problem Understanding**: Converts business questions into actionable analysis plans
- **Automated Data Analysis**: Executes complex SQL queries on AWS Athena
- **Intelligent Insights**: Uses ML to identify patterns, anomalies, and trends
- **Professional Reports**: Generates PDF reports with charts, tables, and recommendations
- **Email Delivery**: Automatically sends reports to stakeholders
- **Caching & Performance**: Redis and PostgreSQL for fast data retrieval
- **Extensible Architecture**: Modular MCP server design for easy expansion

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Docker
- AWS Account (for Athena access)

### Installation

1. **Clone and setup the project:**
   ```bash
   cd AI-Business-Analytics-Agent
   ./scripts/setup.sh
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration
   ```

3. **Start the databases:**
   ```bash
   docker-compose up -d
   ```

4. **Build all servers:**
   ```bash
   npm run build
   ```

5. **Start development:**
   ```bash
   npm run dev
   ```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│   Main Agent     │───▶│   MCP Servers   │
│ Business Problem│    │ Problem Analysis │    │ Specialized     │
└─────────────────┘    │ Query Generation │    │ Tools & Data    │
                       │ Report Creation  │    └─────────────────┘
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   PDF Report     │
                       │   Email Delivery │
                       └──────────────────┘
```

## MCP Servers

### 1. Database Server
- **Purpose**: Data storage, caching, and retrieval
- **Tools**: `store_data`, `retrieve_data`, `update_cache`, `delete_data`, `cleanup_expired`, `backup_data`, `get_statistics`
- **Technologies**: PostgreSQL, Redis

### 2. AWS Athena Server
- **Purpose**: SQL query execution on AWS Athena
- **Tools**: `execute_query`, `list_databases`, `list_tables`, `describe_table`, `get_query_status`, `get_query_results`
- **Technologies**: AWS SDK, Athena API

### 3. Email Server
- **Purpose**: Email delivery and template management
- **Tools**: `send_email`, `send_bulk_email`, `create_template`, `track_email`, `validate_email`
- **Technologies**: SendGrid, AWS SES, or Mailgun

### 4. Data Visualization Server
- **Purpose**: Chart and graph generation
- **Tools**: `create_chart`, `create_table`, `create_dashboard`, `export_chart`, `create_heatmap`
- **Technologies**: Chart.js, D3.js, Canvas

### 5. PDF Generation Server
- **Purpose**: PDF report creation and manipulation
- **Tools**: `html_to_pdf`, `merge_pdfs`, `add_watermark`, `compress_pdf`, `extract_text`
- **Technologies**: Puppeteer, PDF-lib

### 6. Machine Learning Server
- **Purpose**: Pattern recognition, anomaly detection, forecasting
- **Tools**: `train_model`, `predict`, `analyze_patterns`, `detect_anomalies`, `forecast_timeseries`
- **Technologies**: TensorFlow.js, Python scikit-learn

## Usage Example

```javascript
// Example API call to analyze business problem
POST /api/analyze
{
  "problem": "Our revenue has declined 15% this quarter. What are the main contributing factors and what should we do about it?",
  "data_sources": ["sales_transactions", "customer_data", "product_catalog"],
  "time_range": "last_6_months"
}

// Response
{
  "job_id": "uuid-here",
  "status": "processing",
  "estimated_completion": "2024-01-15T10:30:00Z"
}
```

## Configuration

### Environment Variables

```bash
# Main Application
NODE_ENV=development
PORT=3000
API_KEY=your-api-key-here

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/analytics_db
REDIS_URL=redis://localhost:6379

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
ATHENA_WORKGROUP=primary
ATHENA_OUTPUT_LOCATION=s3://your-bucket/

# LLM
OPENAI_API_KEY=your-openai-key
LLM_PROVIDER=openai
LLM_MODEL=gpt-4

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=analytics@yourcompany.com
```

## Development

### Project Structure

```
AI-Business-Analytics-Agent/
├── main-agent/                 # Main AI agent application
├── mcp-servers/               # MCP servers
│   ├── database-server/
│   ├── athena-server/
│   ├── email-server/
│   ├── visualization-server/
│   ├── pdf-server/
│   └── ml-server/
├── shared/                    # Shared utilities and types
├── docs/                      # Documentation
├── tests/                     # Tests
└── scripts/                   # Setup and utility scripts
```

### Available Scripts

```bash
npm run dev              # Start development mode
npm run build            # Build all servers
npm run test             # Run tests
npm run setup            # Initial setup
npm run setup:db         # Start databases only
```

### Adding New Analysis Types

1. Create analysis module in `main-agent/src/analysis/`
2. Add corresponding ML models in `ml-server`
3. Update query templates in `athena-server`
4. Add visualization templates in `visualization-server`

## Testing

```bash
# Run all tests
npm test

# Run specific server tests
cd mcp-servers/database-server && npm test

# Run integration tests
npm run test:integration
```

## Deployment

### Production Setup

1. **Configure production environment:**
   ```bash
   NODE_ENV=production
   ```

2. **Use production databases:**
   - AWS RDS for PostgreSQL
   - AWS ElastiCache for Redis

3. **Set up monitoring:**
   - Application logs with Winston
   - Error tracking with Sentry
   - Performance monitoring

### Docker Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions and support:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the implementation plan in `Implementation_Plan_MCP_Servers.md`