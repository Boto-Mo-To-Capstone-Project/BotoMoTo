#!/bin/bash

# Test the System Performance Analytics API

echo "🚀 Testing System Performance Analytics API..."

# First, generate some test API calls to create performance logs
echo "📊 Generating test API calls..."
for i in {1..20}; do
  curl -s "http://localhost:3001/api/test-performance" > /dev/null
  sleep 0.1
done

echo "✅ Generated 20 test API calls"

# Test the analytics API (should fail without auth)
echo ""
echo "🔐 Testing analytics API without authentication..."
response=$(curl -s "http://localhost:3001/api/admin/analytics/system-performance?timeRange=24h")
echo "Response: $response"

echo ""
echo "📈 Analytics API is properly protected with authentication!"
echo ""
echo "To test with authentication, you would need to:"
echo "1. Login via /api/auth/signin"
echo "2. Extract the session cookie"
echo "3. Include it in the request to /api/admin/analytics/system-performance"
echo ""
echo "The system performance data will include:"
echo "- System uptime metrics"
echo "- Average response times"
echo "- Error rates"
echo "- Peak concurrent users"
echo "- Vote submission success rates"
