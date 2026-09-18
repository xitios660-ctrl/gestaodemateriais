/*
  Gestão de Materiais - SQL Server 2012+

  Execute este script DENTRO do banco destinado à aplicação.
  Ele não altera configurações da instância e não cria/atualiza o SQL Server.

  Compatibilidade:
    - SQL Server 2012 (major 11) ou superior
    - Sem ISJSON/JSON_VALUE, inexistentes no SQL Server 2012
    - NVARCHAR(MAX) preserva o documento da aplicação
    - DATETIME2 e SYSUTCDATETIME compatíveis com SQL Server 2012

  Padrões:
    SQLSERVER_SCHEMA=dbo
    SQLSERVER_TABLE_PREFIX=gm_
*/
SET NOCOUNT ON;
GO

DECLARE @product_version NVARCHAR(128) = CONVERT(NVARCHAR(128), SERVERPROPERTY('ProductVersion'));
DECLARE @dot INT = CHARINDEX('.', @product_version + '.');
DECLARE @major INT = CONVERT(INT, LEFT(@product_version, @dot - 1));

IF @major < 11
BEGIN
    RAISERROR('Gestao de Materiais requer SQL Server 2012 (major 11) ou superior.', 16, 1);
    RETURN;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'dbo')
    EXEC(N'CREATE SCHEMA [dbo] AUTHORIZATION [dbo]');
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
                [id] NVARCHAR(64) NOT NULL,
                [doc] NVARCHAR(MAX) NOT NULL,
                [unique_key] NVARCHAR(450) NULL,
                [updated_at] DATETIME2(3) NOT NULL
                    CONSTRAINT [DF_' + @name + N'_updated_at] DEFAULT SYSUTCDATETIME(),
                CONSTRAINT [PK_' + @name + N'] PRIMARY KEY CLUSTERED ([id] ASC)
            );';
        EXEC sp_executesql @sql;
    END;

    FETCH NEXT FROM table_cursor INTO @name;
END;

CLOSE table_cursor;
DEALLOCATE table_cursor;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_gm_users_unique_key' AND object_id = OBJECT_ID(N'[dbo].[gm_users]'))
CREATE UNIQUE NONCLUSTERED INDEX [UX_gm_users_unique_key] ON [dbo].[gm_users] ([unique_key]) WHERE [unique_key] IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_gm_tickets_unique_key' AND object_id = OBJECT_ID(N'[dbo].[gm_tickets]'))
CREATE UNIQUE NONCLUSTERED INDEX [UX_gm_tickets_unique_key] ON [dbo].[gm_tickets] ([unique_key]) WHERE [unique_key] IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_gm_password_reset_tokens_unique_key' AND object_id = OBJECT_ID(N'[dbo].[gm_password_reset_tokens]'))
CREATE UNIQUE NONCLUSTERED INDEX [UX_gm_password_reset_tokens_unique_key] ON [dbo].[gm_password_reset_tokens] ([unique_key]) WHERE [unique_key] IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_gm_tickets_updated_at' AND object_id = OBJECT_ID(N'[dbo].[gm_tickets]'))
CREATE NONCLUSTERED INDEX [IX_gm_tickets_updated_at] ON [dbo].[gm_tickets] ([updated_at] DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_gm_audit_logs_updated_at' AND object_id = OBJECT_ID(N'[dbo].[gm_audit_logs]'))
CREATE NONCLUSTERED INDEX [IX_gm_audit_logs_updated_at] ON [dbo].[gm_audit_logs] ([updated_at] DESC);
GO
