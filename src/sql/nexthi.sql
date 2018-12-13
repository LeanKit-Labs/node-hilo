
BEGIN TRAN
SELECT [next_hi]
FROM <%= TABLE %> WITH(rowlock,updlock);
UPDATE <%= TABLE %>
SET [next_hi] = [next_hi] + 1
COMMIT TRAN
