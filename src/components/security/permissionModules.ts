// Shared Module → Feature structure for permissions
export const PERMISSION_MODULES = [
  {
    name: 'attendance',
    label: 'Attendance',
    features: [
      { name: 'attendance_check_in_out', label: 'Check-in / Check-out' },
      { name: 'attendance_face_verification', label: 'Face Verification' },
      { name: 'attendance_leave_applications', label: 'Leave Applications' },
      { name: 'attendance_regularization_requests', label: 'Regularization Requests' },
      { name: 'attendance_holiday_list', label: 'Holiday List' },
      { name: 'attendance_timeline_view', label: 'Timeline View' },
      { name: 'attendance_journey_map', label: 'Journey Map' },
      { name: 'attendance_statistics', label: 'Attendance Statistics' },
      { name: 'attendance_photo_capture', label: 'Photo Capture' },
    ]
  },
  {
    name: 'my_visit',
    label: 'My Visit',
    features: [
      { name: 'visit_list', label: 'Visit List' },
      { name: 'visit_cards', label: 'Visit Cards' },
      { name: 'visit_check_in_verification', label: 'Check-in Verification' },
      { name: 'visit_order_entry', label: 'Order Entry' },
      { name: 'visit_no_order_reasons', label: 'No-Order Reasons' },
      { name: 'visit_points_gamification', label: 'Points / Gamification' },
      { name: 'visit_ai_recommendations', label: 'AI Recommendations' },
      { name: 'visit_create_visit', label: 'Create Visit' },
      { name: 'visit_insights_panel', label: 'Insights Panel' },
      { name: 'visit_van_stock_management', label: 'Van Stock Management' },
      { name: 'visit_export_visits', label: 'Export Visits' },
      { name: 'visit_sync_data', label: 'Sync Data' },
    ]
  },
  {
    name: 'all_retailers',
    label: 'All Retailers',
    features: [
      { name: 'retailer_list', label: 'Retailer List' },
      { name: 'retailer_add', label: 'Add Retailer' },
      { name: 'retailer_detail', label: 'Retailer Detail' },
      { name: 'retailer_category_filter', label: 'Category Filter' },
      { name: 'retailer_beat_assignment', label: 'Beat Assignment' },
      { name: 'retailer_credit_score', label: 'Credit Score' },
      { name: 'retailer_order_history', label: 'Order History' },
      { name: 'retailer_analytics', label: 'Retailer Analytics' },
      { name: 'retailer_bulk_import', label: 'Bulk Import' },
      { name: 'retailer_location_map', label: 'Location Map' },
    ]
  },
  {
    name: 'my_target',
    label: 'My Target',
    features: [
      { name: 'target_overview', label: 'Target Overview' },
      { name: 'target_period_selection', label: 'Period Selection' },
      { name: 'target_achievement_percentage', label: 'Achievement Percentage' },
      { name: 'target_territory_performance', label: 'Territory Performance' },
      { name: 'target_beat_performance', label: 'Beat Performance' },
      { name: 'target_retailer_performance', label: 'Retailer Performance' },
      { name: 'target_ai_recommendations', label: 'AI Recommendations' },
      { name: 'target_shortfall_analysis', label: 'Shortfall Analysis' },
    ]
  },
  {
    name: 'performance',
    label: 'Performance',
    features: [
      { name: 'performance_overall', label: 'Overall Performance' },
      { name: 'performance_territory_breakdown', label: 'Territory Breakdown' },
      { name: 'performance_beat_breakdown', label: 'Beat Breakdown' },
      { name: 'performance_retailer_breakdown', label: 'Retailer Breakdown' },
      { name: 'performance_period_comparison', label: 'Period Comparison' },
      { name: 'performance_trend_analysis', label: 'Trend Analysis' },
      { name: 'performance_leaderboard', label: 'Leaderboard' },
    ]
  },
  {
    name: 'analytics',
    label: 'Analytics',
    features: [
      { name: 'analytics_business_summary', label: 'Business Summary' },
      { name: 'analytics_beat_details', label: 'Beat Details' },
      { name: 'analytics_retailer_details', label: 'Retailer Details' },
      { name: 'analytics_order_details', label: 'Order Details' },
      { name: 'analytics_product_breakdown', label: 'Product Breakdown' },
      { name: 'analytics_pending_payments', label: 'Pending Payments' },
      { name: 'analytics_user_filter', label: 'User Filter' },
      { name: 'analytics_date_range_picker', label: 'Date Range Picker' },
      { name: 'analytics_performance_calendar', label: 'Performance Calendar' },
      { name: 'analytics_leaderboard', label: 'Leaderboard' },
    ]
  },
  {
    name: 'institutional_sales',
    label: 'Institutional Sales',
    features: [
      { name: 'institutional_dashboard', label: 'Dashboard' },
      { name: 'institutional_leads', label: 'Leads' },
      { name: 'institutional_accounts', label: 'Accounts' },
      { name: 'institutional_contacts', label: 'Contacts' },
      { name: 'institutional_opportunities', label: 'Opportunities' },
      { name: 'institutional_quotes', label: 'Quotes' },
      { name: 'institutional_order_commitments', label: 'Order Commitments' },
      { name: 'institutional_invoices', label: 'Invoices' },
      { name: 'institutional_price_books', label: 'Price Books' },
      { name: 'institutional_collections', label: 'Collections' },
      { name: 'institutional_products', label: 'Products' },
    ]
  },
  {
    name: 'distributor_master',
    label: 'Distributor Master',
    features: [
      { name: 'distributor_list', label: 'Distributor List' },
      { name: 'distributor_add', label: 'Add Distributor' },
      { name: 'distributor_detail', label: 'Distributor Detail' },
      { name: 'distributor_edit', label: 'Edit Distributor' },
      { name: 'distributor_partnership_status', label: 'Partnership Status' },
      { name: 'distributor_fleet_size', label: 'Fleet Size' },
      { name: 'distributor_coverage_area', label: 'Coverage Area' },
      { name: 'distributor_retailer_mapping', label: 'Retailer Mapping' },
    ]
  },
  {
    name: 'primary_orders',
    label: 'Primary Orders',
    features: [
      { name: 'primary_order_list', label: 'Order List' },
      { name: 'primary_order_status', label: 'Order Status' },
      { name: 'primary_order_create', label: 'Create Order' },
      { name: 'primary_order_details', label: 'Order Details' },
      { name: 'primary_order_transporter_info', label: 'Transporter Info' },
      { name: 'primary_order_dispatch_date', label: 'Dispatch Date' },
      { name: 'primary_order_inventory_sync', label: 'Inventory Sync' },
    ]
  },
  {
    name: 'territories',
    label: 'Territories',
    features: [
      { name: 'territory_list', label: 'Territory List' },
      { name: 'territory_detail', label: 'Territory Detail' },
      { name: 'territory_assignment', label: 'Territory Assignment' },
      { name: 'territory_region_management', label: 'Region Management' },
      { name: 'territory_coverage_statistics', label: 'Coverage Statistics' },
    ]
  },
  {
    name: 'gps_track',
    label: 'GPS Track',
    features: [
      { name: 'gps_live_tracking', label: 'Live Tracking' },
      { name: 'gps_journey_playback', label: 'Journey Playback' },
      { name: 'gps_visit_statistics', label: 'Visit Statistics' },
      { name: 'gps_distance_traveled', label: 'Distance Traveled' },
      { name: 'gps_time_analytics', label: 'Time Analytics' },
      { name: 'gps_team_status', label: 'Team Status' },
    ]
  },
  {
    name: 'my_beats',
    label: 'My Beats',
    features: [
      { name: 'beat_list', label: 'Beat List' },
      { name: 'beat_create', label: 'Create Beat' },
      { name: 'beat_detail', label: 'Beat Detail' },
      { name: 'beat_schedule', label: 'Beat Schedule' },
      { name: 'beat_analytics', label: 'Beat Analytics' },
      { name: 'beat_retailer_assignment', label: 'Retailer Assignment' },
      { name: 'beat_travel_allowance', label: 'Travel Allowance' },
    ]
  },
  {
    name: 'competition_master',
    label: 'Competition Master',
    features: [
      { name: 'competition_competitor_list', label: 'Competitor List' },
      { name: 'competition_competitor_detail', label: 'Competitor Detail' },
      { name: 'competition_sales_team_size', label: 'Sales Team Size' },
      { name: 'competition_regional_presence', label: 'Regional Presence' },
      { name: 'competition_sku_comparison', label: 'SKU Comparison' },
      { name: 'competition_swot_analysis', label: 'SWOT Analysis' },
      { name: 'competition_news_articles', label: 'News Articles' },
    ]
  },
  {
    name: 'check_schemes',
    label: 'Check Schemes',
    features: [
      { name: 'scheme_active_schemes', label: 'Active Schemes' },
      { name: 'scheme_types', label: 'Scheme Types' },
      { name: 'scheme_validity_tracking', label: 'Validity Tracking' },
      { name: 'scheme_details', label: 'Scheme Details' },
      { name: 'scheme_applicability', label: 'Applicability' },
      { name: 'scheme_tiered_offers', label: 'Tiered Offers' },
    ]
  },
  {
    name: 'my_expenses',
    label: 'My Expenses',
    features: [
      { name: 'expense_beat_allowance', label: 'Beat Allowance' },
      { name: 'expense_claims', label: 'Expense Claims' },
      { name: 'expense_claim_history', label: 'Claim History' },
      { name: 'expense_approval_status', label: 'Approval Status' },
      { name: 'expense_distance_calculation', label: 'Distance-based Calculation' },
    ]
  },
];

export const PERMISSION_FIELDS = [
  { key: 'can_read', label: 'Read' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
  { key: 'can_view_all', label: 'View All' },
  { key: 'can_modify_all', label: 'Modify All' },
] as const;

export type PermissionField = typeof PERMISSION_FIELDS[number]['key'];
