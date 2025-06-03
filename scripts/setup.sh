#!/bin/bash

echo "Setting up AI Business Analytics Agent development environment..."

# Check prerequisites
echo "Checking prerequisites..."
node --version || { echo "Node.js not found. Please install Node.js 18+"; exit 1; }
python3 --version || { echo "Python not found. Please install Python 3.8+"; exit 1; }
docker --version || { echo "Docker not found. Please install Docker"; exit 1; }

# Copy environment file
echo "Setting up environment configuration..."
cp .env.example .env
echo "Please edit .env file with your actual configuration values"

# Install dependencies
echo "Installing dependencies..."
npm install

# Setup databases
echo "Starting databases..."
docker-compose up -d postgres redis

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
sleep 10

# Install all server dependencies
echo "Installing MCP server dependencies..."
cd main-agent && npm install && cd ..
cd mcp-servers/database-server && npm install && cd ../..
cd mcp-servers/athena-server && npm install && cd ../..
cd mcp-servers/email-server && npm install && cd ../..
cd mcp-servers/visualization-server && npm install && cd ../..
cd mcp-servers/pdf-server && npm install && cd ../..
cd mcp-servers/ml-server && npm install && cd ../..

echo "Setup complete! Please:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'npm run build' to build all servers"
echo "3. Run 'npm run dev' to start development"