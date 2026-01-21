-- ================================================
-- Reset Pellet Stock to Zero (Keep Consumption History)
-- ================================================
-- This script deletes all stock purchases to reset inventory to 0 bags
-- while preserving all consumption history records.
--
-- WHAT THIS DOES:
-- ✓ Deletes ALL stock purchases from pellet_stock table
-- ✓ KEEPS ALL consumption records in pellet_consumption table
-- ✓ After running, remaining stock will show 0 bags
--
-- RUN THIS WITH CAUTION - All purchase history will be lost!
-- ================================================

BEGIN;

-- Show current stock before deletion
SELECT '=== CURRENT STOCK (Before Reset) ===' as info;
SELECT
    total_purchased_bags,
    total_consumed_bags,
    remaining_bags,
    remaining_kg,
    stock_percentage
FROM v_current_stock;

-- Show consumption records that will be KEPT
SELECT '=== CONSUMPTION RECORDS TO BE KEPT ===' as info;
SELECT COUNT(*) as total_consumption_records FROM pellet_consumption;

-- Show stock purchase records to be DELETED
SELECT '=== STOCK PURCHASES TO BE DELETED ===' as info;
SELECT COUNT(*) as records_to_delete FROM pellet_stock;
SELECT
    id,
    purchase_date,
    num_pallets,
    total_bags,
    total_weight_kg,
    supplier,
    notes
FROM pellet_stock
ORDER BY purchase_date;

-- WARNING: Point of no return after this line
-- Uncomment the next line to actually perform the deletion
-- DELETE FROM pellet_stock;

-- Verify result after deletion
-- SELECT '=== STOCK AFTER RESET ===' as info;
-- SELECT * FROM v_current_stock;

-- SELECT '=== CONSUMPTION HISTORY PRESERVED ===' as info;
-- SELECT COUNT(*) as preserved_records FROM pellet_consumption;

-- Uncomment COMMIT to save changes, or ROLLBACK to cancel
-- COMMIT;
ROLLBACK; -- Safe rollback by default - change to COMMIT when ready

