-- Migration to remove unused UserSession table
-- This table was not being populated and has no data

DROP TABLE IF EXISTS "UserSession";
