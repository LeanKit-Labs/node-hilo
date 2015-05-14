
SELECT [next_hi]
FROM [hibernate_unique_key] WITH(rowlock,updlock);
UPDATE [hibernate_unique_key]
SET [next_hi] = [next_hi] + 1
