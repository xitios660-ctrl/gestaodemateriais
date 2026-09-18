/*
  Gestão de Materiais - SQL Server 2012+ Database Mail (MODELO)

  Este arquivo NÃO contém credenciais reais e NÃO é executado automaticamente.
  Não salve a senha SMTP real neste arquivo/repositório.
*/
USE [master];
GO
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'Database Mail XPs', 1;
RECONFIGURE;
GO

USE [msdb];
GO

EXEC dbo.sysmail_add_account_sp
    @account_name    = N'GestaoMateriaisAccount',
    @description     = N'Conta de envio do Portal Gestão de Materiais',
    @email_address   = N'SEU_REMETENTE@suaempresa.com',
    @display_name    = N'Gestão de Materiais',
    @mailserver_name = N'SEU_SMTP.suaempresa.com',
    @port            = 587,
    @enable_ssl      = 1,
    @username        = N'SEU_USUARIO_SMTP',
    @password        = N'SUA_SENHA_SMTP';
GO

EXEC dbo.sysmail_add_profile_sp
    @profile_name = N'GestaoMateriais',
    @description  = N'Perfil de envio do Portal Gestão de Materiais';
GO

EXEC dbo.sysmail_add_profileaccount_sp
    @profile_name    = N'GestaoMateriais',
    @account_name    = N'GestaoMateriaisAccount',
    @sequence_number = 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'SEU_LOGIN_APP')
    CREATE USER [SEU_LOGIN_APP] FOR LOGIN [SEU_LOGIN_APP];
GO

EXEC sp_addrolemember N'DatabaseMailUserRole', N'SEU_LOGIN_APP';
GO

EXEC dbo.sysmail_add_principalprofile_sp
    @profile_name   = N'GestaoMateriais',
    @principal_name = N'SEU_LOGIN_APP',
    @is_default     = 0;
GO

EXEC msdb.dbo.sp_send_dbmail
    @profile_name = N'GestaoMateriais',
    @recipients   = N'teste@suaempresa.com',
    @subject      = N'Teste - Gestão de Materiais',
    @body         = N'<h2>Teste de Database Mail</h2><p>HTML funcionando.</p>',
    @body_format  = 'HTML';
GO

-- Diagnóstico:
-- SELECT TOP (50) * FROM msdb.dbo.sysmail_allitems ORDER BY send_request_date DESC;
-- SELECT TOP (50) * FROM msdb.dbo.sysmail_event_log ORDER BY log_date DESC;
