-- =====================================================================
-- CarWeb schema for Microsoft SQL Server (run once on a new server)
-- Run with SSMS, Azure Data Studio, or:
--   sqlcmd -S localhost -U sa -P "<password>" -i sql/schema.sql
-- =====================================================================

IF DB_ID(N'CarWeb') IS NULL
    CREATE DATABASE [CarWeb];
GO

USE [CarWeb];
GO

IF OBJECT_ID(N'dbo.Cars', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Cars (
        Id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Cars PRIMARY KEY,
        Make       NVARCHAR(50)      NOT NULL,
        Model      NVARCHAR(50)      NOT NULL,
        [Year]     SMALLINT          NOT NULL CONSTRAINT CK_Cars_Year CHECK ([Year] BETWEEN 1886 AND 2100),
        Price      DECIMAL(12,2)     NULL     CONSTRAINT CK_Cars_Price CHECK (Price >= 0),
        Mileage    INT               NULL     CONSTRAINT CK_Cars_Mileage CHECK (Mileage >= 0),
        Color      NVARCHAR(30)      NULL,
        Vin        CHAR(17)          NULL     CONSTRAINT UQ_Cars_Vin UNIQUE,
        CreatedAt  DATETIME2(0)      NOT NULL CONSTRAINT DF_Cars_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
END
GO

-- Optional least-privilege login for the web app (change the password!)
-- IF SUSER_ID(N'carweb_app') IS NULL CREATE LOGIN carweb_app WITH PASSWORD = N'ChangeMe!Strong#Pass1', CHECK_POLICY = ON;
-- CREATE USER carweb_app FOR LOGIN carweb_app;
-- ALTER ROLE db_datareader ADD MEMBER carweb_app;
-- ALTER ROLE db_datawriter ADD MEMBER carweb_app;
GO

-- Sample data (only inserted when the table is empty)
IF NOT EXISTS (SELECT 1 FROM dbo.Cars)
BEGIN
    INSERT INTO dbo.Cars (Make, Model, [Year], Price, Mileage, Color, Vin) VALUES
        (N'Toyota', N'Corolla', 2020, 18500.00, 42000, N'White', N'1NXBR32E84Z123456'),
        (N'Honda',  N'Civic',   2019, 16900.50, 58000, N'Blue',  N'2HGFC2F59KH501234'),
        (N'Ford',   N'Mustang', 2022, 38750.00, 12000, N'Red',   N'1FA6P8TH5N5100987');
END
GO
