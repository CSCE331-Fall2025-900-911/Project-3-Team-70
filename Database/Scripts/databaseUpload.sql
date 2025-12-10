------------------------------------------------------------
-- MENU
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu (
    menuID INT PRIMARY KEY,
    menuName VARCHAR,
    category VARCHAR,
    price NUMERIC,
    menuImage INT,
    menuDescription VARCHAR,
    seasonalStart TIMESTAMP,
    seasonalEnd TIMESTAMP,
    isActive BOOLEAN NOT NULL DEFAULT true
);

DROP TABLE IF EXISTS staging_menu;

CREATE TEMP TABLE staging_menu (
    menuID INT,
    menuName VARCHAR,
    category VARCHAR,
    price DECIMAL,
    menuImage INT,
    menuDescription VARCHAR,
    seasonalStart TIMESTAMP,
    seasonalEnd TIMESTAMP
);

\copy staging_menu FROM 'Database/DatabaseSeed/menu.csv' CSV HEADER;

INSERT INTO menu (menuID, menuName, category, price, menuImage, menuDescription, seasonalStart, seasonalEnd, isActive)
SELECT menuID, menuName, category, price, menuImage, menuDescription, seasonalStart, seasonalEnd,
       COALESCE(isActive, true)
FROM staging_menu
ON CONFLICT (menuID) DO UPDATE
SET menuName = EXCLUDED.menuName,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    menuImage = EXCLUDED.menuImage,
    menuDescription = EXCLUDED.menuDescription,
    seasonalStart = EXCLUDED.seasonalStart,
    seasonalEnd = EXCLUDED.seasonalEnd,
    isActive = EXCLUDED.isActive;


------------------------------------------------------------
-- EMPLOYEE
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee (
    employeeID INT PRIMARY KEY,
    employeeName VARCHAR,
    employeePosition VARCHAR,
    employeePasscode VARCHAR
);

DROP TABLE IF EXISTS staging_employee;

CREATE TEMP TABLE staging_employee (
    employeeID INT,
    employeeName VARCHAR,
    employeePosition VARCHAR,
    employeePasscode VARCHAR
);

\copy staging_employee FROM 'Database/DatabaseSeed/employee.csv' CSV HEADER;

INSERT INTO employee (employeeID, employeeName, employeePosition, employeePasscode)
SELECT employeeID, employeeName, employeePosition, employeePasscode
FROM staging_employee
ON CONFLICT (employeeID) DO UPDATE
SET employeeName = EXCLUDED.employeeName,
    employeePosition = EXCLUDED.employeePosition,
    employeePasscode = EXCLUDED.employeePasscode;


------------------------------------------------------------
-- ORDERTEST
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orderTest (
    orderID INT PRIMARY KEY,
    employeeID INT REFERENCES employee(employeeID),
    orderLocation VARCHAR,
    orderDate TIMESTAMP,
    orderTotal NUMERIC,
    orderComplete BOOLEAN DEFAULT false,
    customerEmail VARCHAR,
    orderSource VARCHAR DEFAULT 'kiosk'
);

DROP TABLE IF EXISTS staging_order;

CREATE TEMP TABLE staging_order (
    orderID INT,
    employeeID INT,
    orderLocation VARCHAR,
    orderDate TIMESTAMP,
    orderTotal NUMERIC,
    orderComplete BOOLEAN,
    customerEmail VARCHAR,
    orderSource VARCHAR
);

\copy staging_order FROM 'Database/DatabaseSeed/order.csv' CSV HEADER;

INSERT INTO orderTest (orderID, employeeID, orderLocation, orderDate, orderTotal, orderComplete, customerEmail, orderSource)
SELECT orderID, employeeID, orderLocation, orderDate, orderTotal, orderComplete, customerEmail, orderSource
FROM staging_order
ON CONFLICT (orderID) DO UPDATE
SET employeeID = EXCLUDED.employeeID,
    orderLocation = EXCLUDED.orderLocation,
    orderDate = EXCLUDED.orderDate,
    orderTotal = EXCLUDED.orderTotal,
    orderComplete = EXCLUDED.orderComplete,
    customerEmail = EXCLUDED.customerEmail,
    orderSource = EXCLUDED.orderSource;


------------------------------------------------------------
-- ORDER ITEM
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orderItem (
    orderItemID INT PRIMARY KEY,
    menuID INT REFERENCES menu(menuID),
    priceAtPurchase NUMERIC,
    quantityPurchased NUMERIC,
    orderID INT REFERENCES orderTest(orderID),
    orderSize INT
);

DROP TABLE IF EXISTS staging_item;

CREATE TEMP TABLE staging_item (
    orderItemID INT,
    menuID INT,
    priceAtPurchase NUMERIC,
    quantityPurchased NUMERIC,
    orderID INT,
    orderSize INT
);

\copy staging_item FROM 'Database/DatabaseSeed/orderItem.csv' CSV HEADER;

INSERT INTO orderItem (orderItemID, menuID, priceAtPurchase, quantityPurchased, orderID, orderSize)
SELECT orderItemID, menuID, priceAtPurchase, quantityPurchased, orderID, orderSize
FROM staging_item
ON CONFLICT (orderItemID) DO UPDATE
SET menuID = EXCLUDED.menuID,
    priceAtPurchase = EXCLUDED.priceAtPurchase,
    quantityPurchased = EXCLUDED.quantityPurchased,
    orderID = EXCLUDED.orderID,
    orderSize = EXCLUDED.orderSize;


------------------------------------------------------------
-- INVENTORY (includes new isTopping boolean)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    inventoryID INT PRIMARY KEY,
    inventoryName VARCHAR,
    quantityAvailable NUMERIC,
    restockPrice NUMERIC,
    addOnPrice NUMERIC,
    restockOrdered INT,
    unit VARCHAR,
    allergy VARCHAR,
    restockMin INT,
    isTopping BOOLEAN DEFAULT false
);

DROP TABLE IF EXISTS staging_inventory;

CREATE TEMP TABLE staging_inventory (
    inventoryID INT,
    inventoryName VARCHAR,
    quantityAvailable NUMERIC,
    restockPrice NUMERIC,
    addOnPrice NUMERIC,
    restockOrdered INT,
    unit VARCHAR,
    allergy VARCHAR,
    restockMin INT,
    isTopping BOOLEAN
);

\copy staging_inventory FROM 'Database/DatabaseSeed/inventory.csv' CSV HEADER;

INSERT INTO inventory (inventoryID, inventoryName, quantityAvailable, restockPrice, addOnPrice, restockOrdered, unit, allergy, restockMin, isTopping)
SELECT inventoryID, inventoryName, quantityAvailable, restockPrice, addOnPrice, restockOrdered, unit, allergy, restockMin,
       COALESCE(isTopping, false)
FROM staging_inventory
ON CONFLICT (inventoryID) DO UPDATE
SET inventoryName = EXCLUDED.inventoryName,
    quantityAvailable = EXCLUDED.quantityAvailable,
    restockPrice = EXCLUDED.restockPrice,
    addOnPrice = EXCLUDED.addOnPrice,
    restockOrdered = EXCLUDED.restockOrdered,
    unit = EXCLUDED.unit,
    allergy = EXCLUDED.allergy,
    restockMin = EXCLUDED.restockMin,
    isTopping = EXCLUDED.isTopping;


------------------------------------------------------------
-- LOCATION TABLE
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locationTable (
    locationID INT PRIMARY KEY,
    locationName VARCHAR,
    locationAddress VARCHAR,
    locationPhoneNum VARCHAR
);

DROP TABLE IF EXISTS staging_location;

CREATE TEMP TABLE staging_location (
    locationID INT,
    locationName VARCHAR,
    locationAddress VARCHAR,
    locationPhoneNum VARCHAR
);

\copy staging_location FROM 'Database/DatabaseSeed/location.csv' CSV HEADER;

INSERT INTO locationTable (locationID, locationName, locationAddress, locationPhoneNum)
SELECT locationID, locationName, locationAddress, locationPhoneNum
FROM staging_location
ON CONFLICT (locationID) DO UPDATE
SET locationName = EXCLUDED.locationName,
    locationAddress = EXCLUDED.locationAddress,
    locationPhoneNum = EXCLUDED.locationPhoneNum;


------------------------------------------------------------
-- MODIFICATION
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modification (
    modificationID INT PRIMARY KEY,
    inventoryID INT REFERENCES inventory(inventoryID),
    orderItemID INT REFERENCES orderItem(orderItemID),
    modificationQuantity NUMERIC,
    cost NUMERIC
);

DROP TABLE IF EXISTS staging_modification;

CREATE TEMP TABLE staging_modification (
    modificationID INT,
    inventoryID INT,
    orderItemID INT,
    modificationQuantity NUMERIC,
    cost NUMERIC
);

\copy staging_modification FROM 'Database/DatabaseSeed/modifications.csv' CSV HEADER;

INSERT INTO modification (modificationID, inventoryID, orderItemID, modificationQuantity, cost)
SELECT modificationID, inventoryID, orderItemID, modificationQuantity, cost
FROM staging_modification
ON CONFLICT (modificationID) DO UPDATE
SET inventoryID = EXCLUDED.inventoryID,
    orderItemID = EXCLUDED.orderItemID,
    modificationQuantity = EXCLUDED.modificationQuantity,
    cost = EXCLUDED.cost;


------------------------------------------------------------
-- MENU INFO
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menuInfo (
    menuInfoID INT PRIMARY KEY,
    inventoryID INT REFERENCES inventory(inventoryID),
    menuID INT REFERENCES menu(menuID),
    menuInfoQuantity NUMERIC
);

DROP TABLE IF EXISTS staging_menuInfo;

CREATE TEMP TABLE staging_menuInfo (
    menuInfoID INT,
    inventoryID INT,
    menuID INT,
    menuInfoQuantity NUMERIC
);

\copy staging_menuInfo FROM 'Database/DatabaseSeed/menuInfo.csv' CSV HEADER;

INSERT INTO menuInfo (menuInfoID, inventoryID, menuID, menuInfoQuantity)
SELECT menuInfoID, inventoryID, menuID, menuInfoQuantity
FROM staging_menuInfo
ON CONFLICT (menuInfoID) DO UPDATE
SET inventoryID = EXCLUDED.inventoryID,
    menuID = EXCLUDED.menuID,
    menuInfoQuantity = EXCLUDED.menuInfoQuantity;


------------------------------------------------------------
-- TEMP TABLE CLEANUP
------------------------------------------------------------
DROP TABLE IF EXISTS staging_menu;
DROP TABLE IF EXISTS staging_menuInfo;
DROP TABLE IF EXISTS staging_order;
DROP TABLE IF EXISTS staging_item;
DROP TABLE IF EXISTS staging_inventory;
DROP TABLE IF EXISTS staging_location;
DROP TABLE IF EXISTS staging_modification;
DROP TABLE IF EXISTS staging_employee;

------------------------------------------------------------
-- APP USERS (optional seed section, uncomment if needed)
------------------------------------------------------------
-- INSERT INTO app_users (userEmail, userName, userRole)
-- VALUES ('test@example.com','Test User','customer')
-- ON CONFLICT (userEmail) DO NOTHING;
