-- Migration: Add column_mapping to imports
-- Description: Stores CSV column name -> target property key mapping for flexible import (no fixed CSV structure).

ALTER TABLE imports ADD COLUMN column_mapping TEXT;
