/*
  SQL Server 2019+ schema for the alternate database backend.

  The application preserves the current MongoDB document structure inside
  NVARCHAR(MAX) JSON columns so the same FastAPI code can run against either
  engine without changing ticket/category behavior.

  Defaults match:
    SQLSERVER_SCHEMA=dbo
    SQLSERVER_TABLE_PREFIX=gm_
*/
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'dbo')
    EXEC(N'CREATE SCHEMA [dbo]');
GO

DECLARE @tables TABLE ([name] SYSNAME);
INSERT INTO @tables ([name]) VALUES
(N'gm_users'),
(N'gm_categories'),
(N'gm_tickets'),
(N'gm_login_attempts'),
(N'gm_rate_limits'),
(N'gm_password_reset_tokens'),
(N'gm_password_reset_requests'),
(N'gm_audit_logs'),
(N'gm_email_events'),
(N'gm_counters'),
(N'gm_system_settings'),
(N'gm_material_catalogs');

DECLARE @name SYSNAME;
DECLARE table_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT [name] FROM @tables;
OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @name;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF OBJECT_ID(N'[dbo].[' + @name + N']', N'U') IS NULL
    BEGIN
        DECLARE @sql NVARCHAR(MAX) =
            N'CREATE TABLE [dbo].[' + @name + N'] (
                [id] NVARCHAR(64) NOT NULL PRIMARY KEY,
                [doc] NVARCHAR(MAX) NOT NULL,
                [unique_key] NVARCHAR(450) NULL,
                [updated_at] DATETIME2(3) NOT NULL
                    CONSTRAINT [DF_' + @name + N'_updated_at] DEFAULT SYSUTCDATETIME(),
                CONSTRAINT [CK_' + @name + N'_json] CHECK (ISJSON([doc]) = 1)
            );';
        EXEC sp_executesql @sql;
    END;

    FETCH NEXT FROM table_cursor INTO @name;
END;

CLOSE table_cursor;
DEALLOCATE table_cursor;
GO

/* Unique keys used by the application. They are also created automatically on startup. */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_gm_users_unique_key'
      AND object_id = OBJECT_ID(N'[dbo].[gm_users]')
)
CREATE UNIQUE INDEX [UX_gm_users_unique_key]
ON [dbo].[gm_users] ([unique_key])
WHERE [unique_key] IS NOT NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_gm_tickets_unique_key'
      AND object_id = OBJECT_ID(N'[dbo].[gm_tickets]')
)
CREATE UNIQUE INDEX [UX_gm_tickets_unique_key]
ON [dbo].[gm_tickets] ([unique_key])
WHERE [unique_key] IS NOT NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_gm_password_reset_tokens_unique_key'
      AND object_id = OBJECT_ID(N'[dbo].[gm_password_reset_tokens]')
)
CREATE UNIQUE INDEX [UX_gm_password_reset_tokens_unique_key]
ON [dbo].[gm_password_reset_tokens] ([unique_key])
WHERE [unique_key] IS NOT NULL;
GO
