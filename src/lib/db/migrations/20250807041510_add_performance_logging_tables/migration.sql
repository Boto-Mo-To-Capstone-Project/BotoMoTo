-- CreateTable
CREATE TABLE "api_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricType" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "metadata" JSONB,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "api_logs_createdAt_idx" ON "api_logs"("createdAt");

-- CreateIndex
CREATE INDEX "api_logs_endpoint_createdAt_idx" ON "api_logs"("endpoint", "createdAt");

-- CreateIndex
CREATE INDEX "api_logs_statusCode_createdAt_idx" ON "api_logs"("statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_startedAt_endedAt_idx" ON "user_sessions"("startedAt", "endedAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_startedAt_idx" ON "user_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "system_metrics_metricType_recordedAt_idx" ON "system_metrics"("metricType", "recordedAt");
