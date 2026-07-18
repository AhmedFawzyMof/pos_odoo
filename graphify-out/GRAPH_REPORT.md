# Graph Report - /home/ahmedmoftah/odoo/pos  (2026-06-12)

## Corpus Check
- 203 files · ~63,293 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 731 nodes · 592 edges · 174 communities (138 shown, 36 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Cart & Checkout Store|Cart & Checkout Store]]
- [[_COMMUNITY_Vendor Bills Management|Vendor Bills Management]]
- [[_COMMUNITY_Company Profile Editing|Company Profile Editing]]
- [[_COMMUNITY_Type Definitions (POSCart)|Type Definitions (POS/Cart)]]
- [[_COMMUNITY_Area 4|Area 4]]
- [[_COMMUNITY_Area 5|Area 5]]
- [[_COMMUNITY_POS Cashier Workspace|POS Cashier Workspace]]
- [[_COMMUNITY_Orders & Payments|Orders & Payments]]
- [[_COMMUNITY_Area 8|Area 8]]
- [[_COMMUNITY_Pages|Pages]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Products Management|Products Management]]
- [[_COMMUNITY_Suppliers Management|Suppliers Management]]
- [[_COMMUNITY_Customers Management|Customers Management]]
- [[_COMMUNITY_Customers (CRUD)|Customers (CRUD)]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Products DeleteArchive|Products Delete/Archive]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Purchase Orders|Purchase Orders]]
- [[_COMMUNITY_Product API Helpers|Product API Helpers]]
- [[_COMMUNITY_Area 20|Area 20]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Warehouse Dashboard|Warehouse Dashboard]]
- [[_COMMUNITY_Warehouse Transfers|Warehouse Transfers]]
- [[_COMMUNITY_Auth & Login|Auth & Login]]
- [[_COMMUNITY_POS Session & Registers|POS Session & Registers]]
- [[_COMMUNITY_Dashboard KPI|Dashboard KPI]]
- [[_COMMUNITY_Area 29|Area 29]]
- [[_COMMUNITY_Suppliers API|Suppliers API]]
- [[_COMMUNITY_Reports|Reports]]
- [[_COMMUNITY_Area 32|Area 32]]
- [[_COMMUNITY_Pages|Pages]]
- [[_COMMUNITY_POS Terminal Components|POS Terminal Components]]
- [[_COMMUNITY_Type Definitions|Type Definitions]]
- [[_COMMUNITY_Area 36|Area 36]]
- [[_COMMUNITY_Area 37|Area 37]]
- [[_COMMUNITY_Area 38|Area 38]]
- [[_COMMUNITY_Area 39|Area 39]]
- [[_COMMUNITY_Area 40|Area 40]]
- [[_COMMUNITY_Type Definitions|Type Definitions]]
- [[_COMMUNITY_Type Definitions|Type Definitions]]
- [[_COMMUNITY_Area 43|Area 43]]
- [[_COMMUNITY_Area 44|Area 44]]
- [[_COMMUNITY_Area 45|Area 45]]
- [[_COMMUNITY_Categories Management|Categories Management]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Area 48|Area 48]]
- [[_COMMUNITY_POS Category Filter|POS Category Filter]]
- [[_COMMUNITY_POS Payment Sheet|POS Payment Sheet]]
- [[_COMMUNITY_POS Cart Panel|POS Cart Panel]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_POS Barcode Scanner|POS Barcode Scanner]]
- [[_COMMUNITY_Area 54|Area 54]]
- [[_COMMUNITY_Area 55|Area 55]]
- [[_COMMUNITY_Area 56|Area 56]]
- [[_COMMUNITY_Area 57|Area 57]]
- [[_COMMUNITY_Area 58|Area 58]]
- [[_COMMUNITY_Reports - SidebarChart|Reports - Sidebar/Chart]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_Area 61|Area 61]]
- [[_COMMUNITY_User Profile|User Profile]]
- [[_COMMUNITY_Purchase Orders API|Purchase Orders API]]
- [[_COMMUNITY_Vendor Bills API|Vendor Bills API]]
- [[_COMMUNITY_Area 65|Area 65]]
- [[_COMMUNITY_Orders API|Orders API]]
- [[_COMMUNITY_POS Master Data API|POS Master Data API]]
- [[_COMMUNITY_Products API|Products API]]
- [[_COMMUNITY_Area 69|Area 69]]
- [[_COMMUNITY_Area 70|Area 70]]
- [[_COMMUNITY_Area 71|Area 71]]
- [[_COMMUNITY_Area 72|Area 72]]
- [[_COMMUNITY_Area 73|Area 73]]
- [[_COMMUNITY_Middleware & Plugins|Middleware & Plugins]]
- [[_COMMUNITY_Auth Store (Pinia)|Auth Store (Pinia)]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Area 85|Area 85]]
- [[_COMMUNITY_Area 88|Area 88]]
- [[_COMMUNITY_Area 90|Area 90]]
- [[_COMMUNITY_Area 92|Area 92]]
- [[_COMMUNITY_Permissions Utility|Permissions Utility]]

## God Nodes (most connected - your core abstractions)
1. `tailwind` - 6 edges
2. `aliases` - 6 edges
3. `scripts` - 6 edges
4. `safeSearchRead()` - 5 edges
5. `loadMasterData()` - 5 edges
6. `toTuple()` - 4 edges
7. `toFloat()` - 4 edges
8. `fetchDetail()` - 4 edges
9. `showToast()` - 4 edges
10. `updateOdooStock()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `usePosHotkeys()` --calls--> `usePosCartStore`  [INFERRED]
  app/composables/usePosHotkeys.ts → stores/pos-cart.ts
- `useAuth()` --calls--> `useAuthStore`  [EXTRACTED]
  app/composables/useAuth.ts → stores/auth.ts
- `getOdooClient()` --calls--> `connectToOdoo()`  [EXTRACTED]
  server/utils/odooClient.ts → server/utils/client.ts

## Communities (174 total, 36 thin omitted)

### Community 0 - "Cart & Checkout Store"
Cohesion: 0.04
Nodes (27): allocatedTotal, any, cart, customerDrawerError, customerDrawerSaving, customerSearchQuery, discountValue, errorMessage (+19 more)

### Community 1 - "Vendor Bills Management"
Cohesion: 0.09
Nodes (15): cancelBill, loadingAll, overdueCount, payAmount, payDate, postBill, showPaymentModal, showToast (+7 more)

### Community 2 - "Company Profile Editing"
Cohesion: 0.10
Nodes (20): actionError, actionSuccess, countries, editCity, editCompanyRegistry, editEmail, editLogo, editName (+12 more)

### Community 3 - "Type Definitions (POS/Cart)"
Cohesion: 0.10
Nodes (20): Cart, CartItem, CashMovement, CashMovementResponse, OrderDetailResponse, OrderLine, OrderListResponse, OrderPayload (+12 more)

### Community 4 - "Area 4"
Cohesion: 0.10
Nodes (20): aliases, components, composables, lib, ui, utils, font, iconLibrary (+12 more)

### Community 5 - "Area 5"
Cohesion: 0.10
Nodes (21): dependencies, axios, chart.js, class-variance-authority, clsx, dotenv, html5-qrcode, @lucide/vue (+13 more)

### Community 6 - "POS Cashier Workspace"
Cohesion: 0.13
Nodes (13): error, handleAddToCart(), handleAddToCartFromDetail(), handleCategorySelect(), handleLoadMore(), handleLocationChange(), handleScan(), hasMore (+5 more)

### Community 7 - "Orders & Payments"
Cohesion: 0.14
Nodes (15): addPaymentError, changeStatus(), error, fetchDetail(), loading, newPaymentAmount, newPaymentName, removeLine() (+7 more)

### Community 8 - "Area 8"
Cohesion: 0.11
Nodes (17): devDependencies, @nuxtjs/tailwindcss, tailwindcss, tw-animate-css, @types/node, typescript, name, overrides (+9 more)

### Community 9 - "Pages"
Cohesion: 0.13
Nodes (10): any, completedCount, endItem, showToastMessage(), startItem, string, totalItems, totalPages (+2 more)

### Community 10 - "UI Components"
Cohesion: 0.15
Nodes (9): chartId, uniqueId, ChartConfig, ChartContextProps, THEMES, [useChart, provideChartContext], cache, componentToString() (+1 more)

### Community 11 - "Products Management"
Cohesion: 0.13
Nodes (9): actionError, drawerOpen, filteredProducts, ids, isSaving, liveStockLoading, searchQuery, totalItems (+1 more)

### Community 12 - "Suppliers Management"
Cohesion: 0.13
Nodes (9): actionError, drawerOpen, isSaving, outstanding, overdue, saveSupplier, totalItems, totalPages (+1 more)

### Community 13 - "Customers Management"
Cohesion: 0.14
Nodes (12): accountTypes, editBirthDate, editCompanyName, editEmail, editName, editPhone, editTaxId, editTier (+4 more)

### Community 14 - "Customers (CRUD)"
Cohesion: 0.14
Nodes (8): actionError, drawerOpen, filteredCustomers, isSaving, meta, saveCustomer, totalItems, totalPages

### Community 15 - "UI Components"
Cohesion: 0.15
Nodes (5): fileInput, parsed, selectedCategoryNames, selectedLocationNames, trimmed

### Community 16 - "Products Delete/Archive"
Cohesion: 0.18
Nodes (7): drawerOpen, handleDelete(), handleDeleteFromDrawer(), isSaving, totalItems, totalPages, totalProducts

### Community 17 - "UI Components"
Cohesion: 0.18
Nodes (7): isTaxable, lineTotal, min, step, taxAmount, taxes, taxLabel

### Community 18 - "Purchase Orders"
Cohesion: 0.18
Nodes (5): confirmPO, createBill, receivePO, totalItems, totalPages

### Community 19 - "Product API Helpers"
Cohesion: 0.27
Nodes (10): getOrCreateAttribute(), getOrCreateAttributeValue(), getVariantIdFromTemplate(), match, matchedVariantForm, odooWrite(), productValues, safeSearchRead() (+2 more)

### Community 20 - "Area 20"
Cohesion: 0.20
Nodes (9): categoryMap, completeProducts, locationMap, page, productFields, productIds, productStockLocations, query (+1 more)

### Community 21 - "UI Components"
Cohesion: 0.22
Nodes (4): clean, isLoadingLines, isSearching, showDropdown

### Community 24 - "Warehouse Dashboard"
Cohesion: 0.25
Nodes (5): groupedNav, NavEntry, NavGroup, NavItem, navLinks

### Community 25 - "Warehouse Transfers"
Cohesion: 0.46
Nodes (7): normalizeLine(), normalizeOrder(), normalizePayment(), orderId, query, toFloat(), toTuple()

### Community 26 - "Auth & Login"
Cohesion: 0.25
Nodes (7): categoryCountMap, completeCategories, domain, fields, query, searchQuery, totalProducts

### Community 27 - "POS Session & Registers"
Cohesion: 0.29
Nodes (6): AddressDetails, Customer, CustomerApiResponse, CustomerDetailResponse, CustomerMeta, CustomerOrder

### Community 28 - "Dashboard KPI"
Cohesion: 0.29
Nodes (6): categoryCountMap, limit, locationMap, page, query, taxMap

### Community 29 - "Area 29"
Cohesion: 0.29
Nodes (6): data, domain, productIds, quantitiesByProduct, query, searchQuery

### Community 30 - "Suppliers API"
Cohesion: 0.29
Nodes (6): Picking, PickingMoveLine, POLine, PurchaseOrder, PurchaseOrderApiResponse, PurchaseOrderDetail

### Community 32 - "Area 32"
Cohesion: 0.33
Nodes (4): currentTheme, ThemeName, ThemeOption, themeOptions

### Community 33 - "Pages"
Cohesion: 0.33
Nodes (5): locations, movements, openCreateLoctaion, openTransfer, stockLevels

### Community 34 - "POS Terminal Components"
Cohesion: 0.33
Nodes (5): { inventory_value, out_of_stock, total_quantity, incoming_shipments }, kpis, locations, movement, query

### Community 35 - "Type Definitions"
Cohesion: 0.33
Nodes (5): VendorBill, VendorBillApiResponse, VendorBillDetail, VendorBillLine, VendorBillPayment

### Community 36 - "Area 36"
Cohesion: 0.53
Nodes (3): connectToOdoo(), getOdooClient(), tryCatch()

### Community 37 - "Area 37"
Cohesion: 0.60
Nodes (3): useAuth(), useAuthStore, UserSession

### Community 38 - "Area 38"
Cohesion: 0.40
Nodes (4): { date_from, date_to }, kpis, now, { total_revenue, total_expenses, low_stock_count, total_customers }

### Community 39 - "Area 39"
Cohesion: 0.40
Nodes (4): locationMap, qtyMap, stockLocationsMap, stockMap

### Community 40 - "Area 40"
Cohesion: 0.40
Nodes (3): usePosHotkeys(), UsePosHotkeysOptions, usePosCartStore

### Community 41 - "Type Definitions"
Cohesion: 0.40
Nodes (4): InternalCategory, POSCategory, Product, Tax

### Community 42 - "Type Definitions"
Cohesion: 0.40
Nodes (4): POLineInput, ProductResult, Supplier, VendorBillResult

### Community 44 - "Area 44"
Cohesion: 0.50
Nodes (3): countries, partner, states

### Community 45 - "Area 45"
Cohesion: 0.50
Nodes (3): limit, page, query

### Community 46 - "Categories Management"
Cohesion: 0.50
Nodes (3): allowedCompanies, client, userPermissions

### Community 48 - "Area 48"
Cohesion: 0.50
Nodes (3): moveLines, pickingTypes, productData

## Knowledge Gaps
- **386 isolated node(s):** `$schema`, `style`, `font`, `typescript`, `config` (+381 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Area 5` to `Area 8`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `font` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cart & Checkout Store` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `Vendor Bills Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Company Profile Editing` be split into smaller, more focused modules?**
  _Cohesion score 0.09956709956709957 - nodes in this community are weakly interconnected._
- **Should `Type Definitions (POS/Cart)` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Area 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._