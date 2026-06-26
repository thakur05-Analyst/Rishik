-- ===================================================================================
-- Project: Supply Chain & Logistics Analytics Database Model
-- Component: Star Schema Database Schema Setup (DDL)
-- Description: Establishes a structured star schema for high-performance Power BI
--              visual reporting. It features dimensions for Calendar, Geography, 
--              Customers, Carriers, and a central Shipments Fact Table.
-- Database Dialect: SQL Server T-SQL / Generic SQL
-- ===================================================================================

-- -----------------------------------------------------------------------------------
-- 1. DIMENSION TABLES
-- -----------------------------------------------------------------------------------

-- Dimension: Calendar (Dates)
CREATE TABLE DimCalendar (
    DateKey INT PRIMARY KEY,                       -- Format: YYYYMMDD
    FullDate DATE NOT NULL,
    Year INT NOT NULL,
    Quarter CHAR(2) NOT NULL,                      -- e.g. Q1, Q2
    MonthNumber INT NOT NULL,                      -- 1-12
    MonthName VARCHAR(15) NOT NULL,                -- e.g. January, February
    WeekNumber INT NOT NULL,                       -- 1-53
    DayOfWeek INT NOT NULL,                        -- 1-7
    DayName VARCHAR(15) NOT NULL,                  -- e.g. Monday, Tuesday
    IsWeekend BIT NOT NULL                         -- 0 = Weekday, 1 = Weekend
);

-- Dimension: Locations (Geography)
CREATE TABLE DimLocations (
    LocationKey INT IDENTITY(1,1) PRIMARY KEY,
    WarehouseCode VARCHAR(10) NOT NULL,            -- Origin Hub
    City VARCHAR(50) NOT NULL,
    StateProvince VARCHAR(50) NOT NULL,
    Country VARCHAR(50) NOT NULL,
    GlobalRegion VARCHAR(20) NOT NULL             -- e.g. AMER, EMEA, APAC
);

-- Dimension: Customers (Consignees)
CREATE TABLE DimCustomers (
    CustomerKey INT IDENTITY(1,1) PRIMARY KEY,
    CustomerID VARCHAR(15) NOT NULL UNIQUE,
    CustomerName VARCHAR(100) NOT NULL,
    IndustrySegment VARCHAR(50) NOT NULL,          -- e.g. Retail, Tech, Medical
    CreditTier INT NOT NULL,                       -- Rating 1 to 5
    AccountManager VARCHAR(50) NOT NULL
);

-- Dimension: Carriers (Logistics Vendors)
CREATE TABLE DimCarriers (
    CarrierKey INT IDENTITY(1,1) PRIMARY KEY,
    CarrierCode VARCHAR(10) NOT NULL UNIQUE,       -- Vendor code e.g. DHL, FEDEX
    CarrierName VARCHAR(50) NOT NULL,
    TransportationMode VARCHAR(20) NOT NULL,       -- Air, Ocean, Ground, Rail
    ServiceLevel VARCHAR(20) NOT NULL,             -- Express, Standard, Saver
    PerformanceRating DECIMAL(3,2) NULL            -- Historical KPI score
);


-- -----------------------------------------------------------------------------------
-- 2. FACT TABLE
-- -----------------------------------------------------------------------------------

-- Fact Table: Shipments
CREATE TABLE FactShipments (
    ShipmentKey BIGINT IDENTITY(1,1) PRIMARY KEY,
    ShipmentNumber VARCHAR(20) NOT NULL,           -- Operational Tracking Number
    
    -- Dimension Foreign Keys (Relationships)
    OrderDateKey INT NOT NULL,
    ShipDateKey INT NOT NULL,
    ScheduledDeliveryDateKey INT NOT NULL,
    ActualDeliveryDateKey INT NULL,
    OriginLocationKey INT NOT NULL,
    DestinationLocationKey INT NOT NULL,
    CustomerKey INT NOT NULL,
    CarrierKey INT NOT NULL,
    
    -- Numerical Performance Metrics (Facts)
    FreightCostUSD DECIMAL(10,2) NOT NULL,
    ShipmentWeightKG DECIMAL(10,2) NOT NULL,
    VolumeCBM DECIMAL(6,2) NOT NULL,
    UnitsShipped INT NOT NULL,
    
    -- Transit Timestamp Details (For high-resolution calculation)
    ActualTransitTimeHours INT NULL,
    ScheduledTransitTimeHours INT NOT NULL,
    
    -- Binary Delivery Flag Indicators
    IsDelayed BIT NOT NULL DEFAULT 0,
    IsDamaged BIT NOT NULL DEFAULT 0,
    IsShortShipped BIT NOT NULL DEFAULT 0,         -- Units missing at delivery
    
    -- Star Schema Constraint Keys
    CONSTRAINT FK_FactShipments_OrderDate FOREIGN KEY (OrderDateKey) REFERENCES DimCalendar(DateKey),
    CONSTRAINT FK_FactShipments_ShipDate FOREIGN KEY (ShipDateKey) REFERENCES DimCalendar(DateKey),
    CONSTRAINT FK_FactShipments_SchedDelivery FOREIGN KEY (ScheduledDeliveryDateKey) REFERENCES DimCalendar(DateKey),
    CONSTRAINT FK_FactShipments_ActualDelivery FOREIGN KEY (ActualDeliveryDateKey) REFERENCES DimCalendar(DateKey),
    CONSTRAINT FK_FactShipments_Origin FOREIGN KEY (OriginLocationKey) REFERENCES DimLocations(LocationKey),
    CONSTRAINT FK_FactShipments_Destination FOREIGN KEY (DestinationLocationKey) REFERENCES DimLocations(LocationKey),
    CONSTRAINT FK_FactShipments_Customer FOREIGN KEY (CustomerKey) REFERENCES DimCustomers(CustomerKey),
    CONSTRAINT FK_FactShipments_Carrier FOREIGN KEY (CarrierKey) REFERENCES DimCarriers(CarrierKey)
);

-- CREATE INDEXES FOR HIGH-PERFORMANCE ANALYTICAL JOINS
CREATE INDEX IX_FactShipments_Customer ON FactShipments(CustomerKey);
CREATE INDEX IX_FactShipments_Carrier ON FactShipments(CarrierKey);
CREATE INDEX IX_FactShipments_OrderDate ON FactShipments(OrderDateKey);
CREATE INDEX IX_FactShipments_ActualDeliveryDate ON FactShipments(ActualDeliveryDateKey);
CREATE INDEX IX_FactShipments_Origin ON FactShipments(OriginLocationKey);
CREATE INDEX IX_FactShipments_Destination ON FactShipments(DestinationLocationKey);
