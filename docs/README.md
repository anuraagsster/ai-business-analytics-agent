# AI Business Analytics Agent Documentation

Welcome to the comprehensive documentation for the AI Business Analytics Agent. This documentation provides detailed information about the system architecture, MCP servers, setup instructions, and usage guides.

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [MCP Servers](#mcp-servers)
4. [Setup and Installation](#setup-and-installation)
5. [Configuration](#configuration)
6. [Usage Guides](#usage-guides)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)
9. [Contributing](#contributing)

## Introduction

The AI Business Analytics Agent is a comprehensive system for analyzing business data, identifying insights, and generating actionable reports. It leverages multiple specialized MCP servers to provide capabilities such as SQL query execution, data visualization, machine learning analysis, PDF generation, email delivery, and data storage.

### Key Features

- Natural language understanding of business problems
- Automated data analysis using AWS Athena
- Intelligent insights using machine learning algorithms
- Professional PDF report generation
- Email delivery of reports
- Data caching for performance optimization

## Architecture

The AI Business Analytics Agent follows a modular architecture with a central agent coordinating the workflow across multiple specialized MCP servers. Each server provides specific tools and resources that contribute to the overall analytics pipeline.

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

### Workflow

1. User submits a business problem for analysis
2. Main agent interprets the problem and creates an analysis plan
3. Agent executes the plan by orchestrating tools from various MCP servers
4. Data is retrieved from databases via Athena queries
5. Analysis is performed using machine learning tools
6. Visualizations and charts are generated
7. Reports are compiled into PDF format
8. Results are delivered via email to stakeholders

## MCP Servers

The system comprises six specialized MCP servers, each responsible for a specific aspect of the analytics workflow:

- [Database Server](./servers/database-server.md) - Data storage, caching, and retrieval
- [AWS Athena Server](./servers/athena-server.md) - SQL query execution on AWS Athena
- [Email Server](./servers/email-server.md) - Email delivery and template management
- [Data Visualization Server](./servers/visualization-server.md) - Chart and graph generation
- [PDF Generation Server](./servers/pdf-server.md) - PDF report creation and manipulation
- [Machine Learning Server](./servers/ml-server.md) - Pattern recognition, anomaly detection, forecasting

Each server provides specific tools and resources that can be accessed through the MCP protocol.

## Setup and Installation

For detailed setup instructions, please see the [Setup Guide](./guides/setup-guide.md).

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/ai-business-analytics-agent.git
cd ai-business-analytics-agent

# Run the setup script
./scripts/setup.sh

# Configure environment variables
cp .env.example .env
# Edit .env with your actual configuration

# Start the databases
docker-compose up -d

# Build all servers
npm run build

# Start development
npm run dev
```

## Configuration

The system can be configured through environment variables and configuration files. See the [Configuration Guide](./guides/configuration-guide.md) for detailed information.

## Usage Guides

- [Creating Your First Analysis](./guides/first-analysis.md)
- [Custom Query Templates](./guides/custom-queries.md)
- [Chart Customization](./guides/chart-customization.md)
- [Report Templates](./guides/report-templates.md)
- [Email Notifications](./guides/email-notifications.md)

## API Reference

For detailed API documentation, please see the [API Reference](./api/README.md).

## Troubleshooting

Common issues and their solutions are documented in the [Troubleshooting Guide](./guides/troubleshooting.md).

## Contributing

Contributions to the AI Business Analytics Agent are welcome! Please see the [Contributing Guide](./guides/contributing.md) for more information.