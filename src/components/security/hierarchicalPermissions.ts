export interface PermissionItem {
  name: string;
  label: string;
}

export interface HierarchicalModule {
  name: string;
  label: string;
  fields: PermissionItem[];
  actions: PermissionItem[];
  widgets: PermissionItem[];
}

export const HIERARCHICAL_MODULES: HierarchicalModule[] = [
  {
    name: 'attendance',
    label: 'Attendance',
    fields: [
      { name: 'field_attendance_pct_this_month', label: 'Attendance % (This Month)' },
      { name: 'field_attendance_present_days', label: 'Present Days' },
      { name: 'field_attendance_absent_days', label: 'Absent Days' },
      { name: 'field_attendance_working_hours', label: 'Working Hours' },
      { name: 'field_attendance_market_hours', label: 'Market Hours' },
      { name: 'field_attendance_first_checkin', label: 'First Check-in' },
      { name: 'field_attendance_last_checkout', label: 'Last Check-out' },
      { name: 'field_attendance_location', label: 'Location' },
    ],
    actions: [
      { name: 'action_attendance_check_in', label: 'Check In' },
      { name: 'action_attendance_check_out', label: 'Check Out' },
      { name: 'action_attendance_apply_leave', label: 'Apply Leave' },
      { name: 'action_attendance_regularize', label: 'Regularize' },
      { name: 'action_attendance_start_market_hours', label: 'Start Market Hours' },
      { name: 'action_attendance_stop_market_hours', label: 'Stop Market Hours' },
      { name: 'action_attendance_face_verification', label: 'Face Verification' },
      { name: 'action_attendance_photo_capture', label: 'Photo Capture' },
    ],
    widgets: [
      { name: 'widget_attendance_my_attendance_tab', label: 'My Attendance Tab' },
      { name: 'widget_attendance_my_team_tab', label: 'My Team Tab' },
      { name: 'widget_attendance_records_table', label: 'Attendance Records Table' },
      { name: 'widget_attendance_leave_tab', label: 'Leave Tab' },
      { name: 'widget_attendance_holiday_tab', label: 'Holiday Tab' },
      { name: 'widget_attendance_journey_map', label: 'Journey Map' },
      { name: 'widget_attendance_timeline_view', label: 'Timeline View' },
      { name: 'widget_attendance_monthly_summary', label: 'Monthly Summary Cards' },
    ],
  },
  {
    name: 'my_visit',
    label: 'My Visit',
    fields: [
      { name: 'field_visit_date', label: 'Visit Date' },
      { name: 'field_visit_retailer_name', label: 'Retailer Name' },
      { name: 'field_visit_beat_name', label: 'Beat Name' },
      { name: 'field_visit_checkin_time', label: 'Check-in Time' },
      { name: 'field_visit_duration', label: 'Visit Duration' },
      { name: 'field_visit_order_value', label: 'Order Value' },
      { name: 'field_visit_status', label: 'Status' },
      { name: 'field_visit_distributor', label: 'Distributor' },
    ],
    actions: [
      { name: 'action_visit_auto_plan', label: 'Auto Plan' },
      { name: 'action_visit_all_beat', label: 'All Beat' },
      { name: 'action_visit_retailers', label: 'Retailers' },
      { name: 'action_visit_summary', label: 'Summary' },
      { name: 'action_visit_timeline', label: 'Timeline' },
      { name: 'action_visit_gps_track', label: 'GPS Track' },
      { name: 'action_visit_van_stock', label: 'Van Stock' },
      { name: 'action_visit_activity', label: 'Activity' },
    ],
    widgets: [
      { name: 'widget_visit_todays_progress', label: "Today's Progress" },
      { name: 'widget_visit_points_earned', label: 'Points Earned' },
      { name: 'widget_visit_week_calendar', label: 'Week Calendar' },
      { name: 'widget_visit_retailer_card_list', label: 'Retailer Card List' },
      { name: 'widget_visit_orders_dialog', label: 'Orders Dialog' },
      { name: 'widget_visit_filters', label: 'Visit Filters' },
      { name: 'widget_visit_ai_recommendations', label: 'AI Recommendations / Insights' },
      { name: 'widget_visit_sync_data_modal', label: 'Sync Data Modal' },
    ],
  },
  {
    name: 'all_retailers',
    label: 'All Retailers',
    fields: [
      { name: 'field_retailer_name', label: 'Retailer Name' },
      { name: 'field_retailer_address', label: 'Address' },
      { name: 'field_retailer_phone', label: 'Phone' },
      { name: 'field_retailer_category', label: 'Category' },
      { name: 'field_retailer_priority', label: 'Priority' },
      { name: 'field_retailer_beat_name', label: 'Beat Name' },
      { name: 'field_retailer_last_visit_date', label: 'Last Visit Date' },
      { name: 'field_retailer_credit_score', label: 'Credit Score' },
      { name: 'field_retailer_pending_amount', label: 'Pending Amount' },
      { name: 'field_retailer_gst_number', label: 'GST Number' },
      { name: 'field_retailer_location_tag', label: 'Location Tag' },
      { name: 'field_retailer_retail_type', label: 'Retail Type' },
      { name: 'field_retailer_potential', label: 'Potential' },
    ],
    actions: [
      { name: 'action_retailer_add', label: 'Add Retailer' },
      { name: 'action_retailer_edit', label: 'Edit Retailer' },
      { name: 'action_retailer_delete', label: 'Delete Retailer' },
      { name: 'action_retailer_bulk_import', label: 'Bulk Import' },
      { name: 'action_retailer_mass_edit_beats', label: 'Mass Edit Beats' },
      { name: 'action_retailer_add_to_visit', label: 'Add to Visit' },
      { name: 'action_retailer_view_analytics', label: 'View Analytics' },
      { name: 'action_retailer_export', label: 'Export' },
    ],
    widgets: [
      { name: 'widget_retailer_list_table', label: 'Retailer List / Table' },
      { name: 'widget_retailer_detail_modal', label: 'Retailer Detail Modal' },
      { name: 'widget_retailer_analytics_panel', label: 'Analytics Panel' },
      { name: 'widget_retailer_credit_score_display', label: 'Credit Score Display' },
      { name: 'widget_retailer_pagination', label: 'Pagination Controls' },
      { name: 'widget_retailer_search_filter', label: 'Search / Filter Bar' },
    ],
  },
  {
    name: 'my_beats',
    label: 'My Beats',
    fields: [
      { name: 'field_beat_name', label: 'Beat Name' },
      { name: 'field_beat_schedule', label: 'Schedule' },
      { name: 'field_beat_retailer_count', label: 'Retailer Count' },
      { name: 'field_beat_territory', label: 'Territory' },
      { name: 'field_beat_travel_allowance', label: 'Travel Allowance' },
    ],
    actions: [
      { name: 'action_beat_create', label: 'Create Beat' },
      { name: 'action_beat_edit', label: 'Edit Beat' },
      { name: 'action_beat_delete', label: 'Delete Beat' },
      { name: 'action_beat_assign_retailers', label: 'Assign Retailers' },
    ],
    widgets: [
      { name: 'widget_beat_list', label: 'Beat List' },
      { name: 'widget_beat_detail', label: 'Beat Detail' },
      { name: 'widget_beat_analytics', label: 'Beat Analytics' },
      { name: 'widget_beat_calendar', label: 'Beat Calendar' },
    ],
  },
  {
    name: 'my_target',
    label: 'My Target',
    fields: [
      { name: 'field_target_value', label: 'Target Value' },
      { name: 'field_target_achievement_pct', label: 'Achievement %' },
      { name: 'field_target_period', label: 'Period' },
      { name: 'field_target_shortfall', label: 'Shortfall' },
    ],
    actions: [
      { name: 'action_target_view_details', label: 'View Details' },
      { name: 'action_target_export', label: 'Export' },
      { name: 'action_target_compare_periods', label: 'Compare Periods' },
    ],
    widgets: [
      { name: 'widget_target_overview', label: 'Target Overview' },
      { name: 'widget_target_territory_performance', label: 'Territory Performance' },
      { name: 'widget_target_beat_performance', label: 'Beat Performance' },
      { name: 'widget_target_retailer_performance', label: 'Retailer Performance' },
      { name: 'widget_target_ai_recommendations', label: 'AI Recommendations' },
      { name: 'widget_target_shortfall_analysis', label: 'Shortfall Analysis' },
    ],
  },
  {
    name: 'analytics',
    label: 'Analytics',
    fields: [
      { name: 'field_analytics_revenue', label: 'Revenue' },
      { name: 'field_analytics_orders_count', label: 'Orders Count' },
      { name: 'field_analytics_coverage_pct', label: 'Coverage %' },
      { name: 'field_analytics_pending_payments', label: 'Pending Payments' },
    ],
    actions: [
      { name: 'action_analytics_export', label: 'Export' },
      { name: 'action_analytics_filter', label: 'Filter' },
      { name: 'action_analytics_date_range', label: 'Date Range Selection' },
      { name: 'action_analytics_user_filter', label: 'User Filter' },
    ],
    widgets: [
      { name: 'widget_analytics_business_summary', label: 'Business Summary' },
      { name: 'widget_analytics_beat_details', label: 'Beat Details' },
      { name: 'widget_analytics_retailer_details', label: 'Retailer Details' },
      { name: 'widget_analytics_order_details', label: 'Order Details' },
      { name: 'widget_analytics_product_breakdown', label: 'Product Breakdown' },
      { name: 'widget_analytics_pending_payments', label: 'Pending Payments' },
      { name: 'widget_analytics_performance_calendar', label: 'Performance Calendar' },
      { name: 'widget_analytics_leaderboard', label: 'Leaderboard' },
    ],
  },
  {
    name: 'gps_track',
    label: 'GPS Track',
    fields: [
      { name: 'field_gps_location', label: 'Location' },
      { name: 'field_gps_distance_traveled', label: 'Distance Traveled' },
      { name: 'field_gps_duration', label: 'Duration' },
      { name: 'field_gps_visit_count', label: 'Visit Count' },
    ],
    actions: [
      { name: 'action_gps_start_tracking', label: 'Start Tracking' },
      { name: 'action_gps_journey_playback', label: 'Journey Playback' },
      { name: 'action_gps_export', label: 'Export' },
    ],
    widgets: [
      { name: 'widget_gps_live_map', label: 'Live Map' },
      { name: 'widget_gps_timeline', label: 'Timeline' },
      { name: 'widget_gps_visit_statistics', label: 'Visit Statistics' },
      { name: 'widget_gps_time_analytics', label: 'Time Analytics' },
      { name: 'widget_gps_team_status', label: 'Team Status' },
    ],
  },
  {
    name: 'performance',
    label: 'Performance',
    fields: [
      { name: 'field_performance_overall_score', label: 'Overall Score' },
      { name: 'field_performance_rank', label: 'Rank' },
      { name: 'field_performance_trend', label: 'Trend' },
    ],
    actions: [
      { name: 'action_performance_export', label: 'Export' },
      { name: 'action_performance_compare_periods', label: 'Compare Periods' },
    ],
    widgets: [
      { name: 'widget_performance_overall', label: 'Overall Performance' },
      { name: 'widget_performance_territory_breakdown', label: 'Territory Breakdown' },
      { name: 'widget_performance_beat_breakdown', label: 'Beat Breakdown' },
      { name: 'widget_performance_retailer_breakdown', label: 'Retailer Breakdown' },
      { name: 'widget_performance_period_comparison', label: 'Period Comparison' },
      { name: 'widget_performance_trend_analysis', label: 'Trend Analysis' },
      { name: 'widget_performance_leaderboard', label: 'Leaderboard' },
    ],
  },
  {
    name: 'primary_orders',
    label: 'Primary Orders',
    fields: [
      { name: 'field_order_number', label: 'Order Number' },
      { name: 'field_order_amount', label: 'Amount' },
      { name: 'field_order_status', label: 'Status' },
      { name: 'field_order_date', label: 'Date' },
      { name: 'field_order_transporter_info', label: 'Transporter Info' },
      { name: 'field_order_dispatch_date', label: 'Dispatch Date' },
    ],
    actions: [
      { name: 'action_order_create', label: 'Create Order' },
      { name: 'action_order_view_details', label: 'View Details' },
      { name: 'action_order_inventory_sync', label: 'Inventory Sync' },
    ],
    widgets: [
      { name: 'widget_order_list', label: 'Order List' },
      { name: 'widget_order_status_board', label: 'Order Status Board' },
      { name: 'widget_order_details', label: 'Order Details' },
    ],
  },
  {
    name: 'my_expenses',
    label: 'My Expenses',
    fields: [
      { name: 'field_expense_amount', label: 'Amount' },
      { name: 'field_expense_category', label: 'Category' },
      { name: 'field_expense_date', label: 'Date' },
      { name: 'field_expense_status', label: 'Status' },
      { name: 'field_expense_distance', label: 'Distance' },
    ],
    actions: [
      { name: 'action_expense_submit_claim', label: 'Submit Claim' },
      { name: 'action_expense_edit_claim', label: 'Edit Claim' },
      { name: 'action_expense_export', label: 'Export' },
    ],
    widgets: [
      { name: 'widget_expense_beat_allowance', label: 'Beat Allowance' },
      { name: 'widget_expense_claims', label: 'Expense Claims' },
      { name: 'widget_expense_claim_history', label: 'Claim History' },
      { name: 'widget_expense_approval_status', label: 'Approval Status' },
    ],
  },
  {
    name: 'gamification',
    label: 'Gamification / Leaderboard',
    fields: [
      { name: 'field_gamification_points', label: 'Points' },
      { name: 'field_gamification_rank', label: 'Rank' },
      { name: 'field_gamification_badges', label: 'Badges' },
    ],
    actions: [
      { name: 'action_gamification_redeem', label: 'Redeem' },
      { name: 'action_gamification_view_details', label: 'View Details' },
    ],
    widgets: [
      { name: 'widget_gamification_leaderboard', label: 'Leaderboard' },
      { name: 'widget_gamification_badges', label: 'Badges' },
      { name: 'widget_gamification_rewards', label: 'Rewards' },
      { name: 'widget_gamification_redemption', label: 'Redemption' },
    ],
  },
  {
    name: 'institutional_sales',
    label: 'Institutional Sales',
    fields: [
      { name: 'field_inst_order_number', label: 'Order Number' },
      { name: 'field_inst_institution_name', label: 'Institution Name' },
      { name: 'field_inst_amount', label: 'Amount' },
      { name: 'field_inst_status', label: 'Status' },
      { name: 'field_inst_date', label: 'Date' },
    ],
    actions: [
      { name: 'action_inst_create_order', label: 'Create Order' },
      { name: 'action_inst_edit_order', label: 'Edit Order' },
      { name: 'action_inst_export', label: 'Export' },
    ],
    widgets: [
      { name: 'widget_inst_order_list', label: 'Order List' },
      { name: 'widget_inst_order_details', label: 'Order Details' },
      { name: 'widget_inst_summary', label: 'Summary' },
    ],
  },
  {
    name: 'distributor_master',
    label: 'Distributor Master',
    fields: [
      { name: 'field_dist_name', label: 'Distributor Name' },
      { name: 'field_dist_territory', label: 'Territory' },
      { name: 'field_dist_contact', label: 'Contact' },
      { name: 'field_dist_credit_limit', label: 'Credit Limit' },
      { name: 'field_dist_outstanding', label: 'Outstanding Amount' },
    ],
    actions: [
      { name: 'action_dist_add', label: 'Add Distributor' },
      { name: 'action_dist_edit', label: 'Edit Distributor' },
      { name: 'action_dist_view_ledger', label: 'View Ledger' },
    ],
    widgets: [
      { name: 'widget_dist_list', label: 'Distributor List' },
      { name: 'widget_dist_detail', label: 'Distributor Detail' },
      { name: 'widget_dist_ledger', label: 'Ledger' },
    ],
  },
  {
    name: 'territories',
    label: 'Territories',
    fields: [
      { name: 'field_territory_name', label: 'Territory Name' },
      { name: 'field_territory_region', label: 'Region' },
      { name: 'field_territory_assigned_user', label: 'Assigned User' },
      { name: 'field_territory_pincode_ranges', label: 'Pincode Ranges' },
    ],
    actions: [
      { name: 'action_territory_create', label: 'Create Territory' },
      { name: 'action_territory_edit', label: 'Edit Territory' },
      { name: 'action_territory_assign', label: 'Assign User' },
    ],
    widgets: [
      { name: 'widget_territory_list', label: 'Territory List' },
      { name: 'widget_territory_map', label: 'Territory Map' },
      { name: 'widget_territory_performance', label: 'Performance Summary' },
    ],
  },
  {
    name: 'competition_master',
    label: 'Competition Master',
    fields: [
      { name: 'field_comp_competitor_name', label: 'Competitor Name' },
      { name: 'field_comp_product', label: 'Product' },
      { name: 'field_comp_price', label: 'Price' },
      { name: 'field_comp_market_share', label: 'Market Share' },
    ],
    actions: [
      { name: 'action_comp_add_insight', label: 'Add Insight' },
      { name: 'action_comp_edit_insight', label: 'Edit Insight' },
      { name: 'action_comp_export', label: 'Export' },
    ],
    widgets: [
      { name: 'widget_comp_insights_list', label: 'Insights List' },
      { name: 'widget_comp_comparison_chart', label: 'Comparison Chart' },
    ],
  },
  {
    name: 'check_schemes',
    label: 'Check Schemes',
    fields: [
      { name: 'field_scheme_name', label: 'Scheme Name' },
      { name: 'field_scheme_type', label: 'Scheme Type' },
      { name: 'field_scheme_validity', label: 'Validity' },
      { name: 'field_scheme_discount', label: 'Discount / Benefit' },
    ],
    actions: [
      { name: 'action_scheme_view_details', label: 'View Details' },
      { name: 'action_scheme_apply', label: 'Apply Scheme' },
    ],
    widgets: [
      { name: 'widget_scheme_list', label: 'Scheme List' },
      { name: 'widget_scheme_detail', label: 'Scheme Detail' },
      { name: 'widget_scheme_eligibility', label: 'Eligibility Check' },
    ],
  },
  {
    name: 'packing_list',
    label: 'Packing List',
    fields: [
      { name: 'field_packing_list_number', label: 'Packing List Number' },
      { name: 'field_packing_delivery_date', label: 'Delivery Date' },
      { name: 'field_packing_items', label: 'Items' },
      { name: 'field_packing_status', label: 'Status' },
    ],
    actions: [
      { name: 'action_packing_create', label: 'Create Packing List' },
      { name: 'action_packing_edit', label: 'Edit Packing List' },
      { name: 'action_packing_mark_delivered', label: 'Mark as Delivered' },
    ],
    widgets: [
      { name: 'widget_packing_list', label: 'Packing List' },
      { name: 'widget_packing_detail', label: 'Packing Detail' },
    ],
  },
  {
    name: 'my_deliveries',
    label: 'My Deliveries',
    fields: [
      { name: 'field_delivery_order_number', label: 'Order Number' },
      { name: 'field_delivery_retailer', label: 'Retailer' },
      { name: 'field_delivery_date', label: 'Delivery Date' },
      { name: 'field_delivery_status', label: 'Status' },
      { name: 'field_delivery_amount', label: 'Amount' },
    ],
    actions: [
      { name: 'action_delivery_mark_delivered', label: 'Mark as Delivered' },
      { name: 'action_delivery_collect_payment', label: 'Collect Payment' },
      { name: 'action_delivery_view_details', label: 'View Details' },
    ],
    widgets: [
      { name: 'widget_delivery_list', label: 'Delivery List' },
      { name: 'widget_delivery_detail', label: 'Delivery Detail' },
      { name: 'widget_delivery_payment_collection', label: 'Payment Collection' },
    ],
  },
  {
    name: 'recycle_bin',
    label: 'Recycle Bin',
    fields: [
      { name: 'field_recycle_item_name', label: 'Item Name' },
      { name: 'field_recycle_deleted_at', label: 'Deleted At' },
      { name: 'field_recycle_deleted_by', label: 'Deleted By' },
      { name: 'field_recycle_item_type', label: 'Item Type' },
    ],
    actions: [
      { name: 'action_recycle_restore', label: 'Restore' },
      { name: 'action_recycle_permanent_delete', label: 'Permanently Delete' },
    ],
    widgets: [
      { name: 'widget_recycle_list', label: 'Deleted Items List' },
      { name: 'widget_recycle_filter', label: 'Filter by Type' },
    ],
  },
  {
    name: 'competency',
    label: 'Competency',
    fields: [
      { name: 'field_competency_name', label: 'Competency Name' },
      { name: 'field_competency_score', label: 'Score' },
      { name: 'field_competency_category', label: 'Category' },
      { name: 'field_competency_level', label: 'Level' },
    ],
    actions: [
      { name: 'action_competency_take_quiz', label: 'Take Quiz' },
      { name: 'action_competency_view_content', label: 'View Learning Content' },
      { name: 'action_competency_export', label: 'Export' },
    ],
    widgets: [
      { name: 'widget_competency_overview', label: 'Competency Overview' },
      { name: 'widget_competency_quiz', label: 'Quiz' },
      { name: 'widget_competency_content', label: 'Learning Content' },
      { name: 'widget_competency_badges', label: 'Badges' },
    ],
  },
  {
    name: 'homepage',
    label: 'Homepage',
    fields: [
      { name: 'field_homepage_greeting', label: 'Greeting Text' },
      { name: 'field_homepage_attendance_summary', label: 'Attendance Summary' },
      { name: 'field_homepage_sales_summary', label: 'Sales Summary' },
      { name: 'field_homepage_notifications', label: 'Notifications' },
      { name: 'field_homepage_quick_stats', label: 'Quick Stats' },
      { name: 'field_homepage_beat_plan', label: 'Beat Plan' },
      { name: 'field_homepage_target_progress', label: 'Target Progress' },
    ],
    actions: [
      { name: 'action_homepage_check_in', label: 'Check In' },
      { name: 'action_homepage_check_out', label: 'Check Out' },
      { name: 'action_homepage_end_day', label: 'End My Day' },
      { name: 'action_homepage_refresh', label: 'Refresh Dashboard' },
      { name: 'action_homepage_quick_add', label: 'Quick Add' },
      { name: 'action_homepage_quick_nav', label: 'Quick Navigation' },
    ],
    widgets: [
      { name: 'widget_homepage_attendance', label: 'Attendance Widget' },
      { name: 'widget_homepage_sales_summary', label: 'Sales Summary Widget' },
      { name: 'widget_homepage_visit_plan', label: 'Visit Plan Widget' },
      { name: 'widget_homepage_announcements', label: 'Announcements' },
      { name: 'widget_homepage_quick_links', label: 'Quick Links' },
      { name: 'widget_homepage_performance', label: 'Performance Widget' },
      { name: 'widget_homepage_target_achievement', label: 'Target Achievement Widget' },
      { name: 'widget_homepage_day_status', label: 'Day Status Bar' },
    ],
  },
];

// Get all module names (for module-level permissions)
export const getAllModuleNames = (): string[] =>
  HIERARCHICAL_MODULES.map(m => `module_${m.name}`);

// Get all field names across all modules
export const getAllFieldNames = (): string[] =>
  HIERARCHICAL_MODULES.flatMap(m => m.fields.map(f => f.name));

// Get all action names across all modules
export const getAllActionNames = (): string[] =>
  HIERARCHICAL_MODULES.flatMap(m => m.actions.map(a => a.name));

// Get all widget names across all modules
export const getAllWidgetNames = (): string[] =>
  HIERARCHICAL_MODULES.flatMap(m => m.widgets.map(w => w.name));

// Get the parent module name for a given item name
export const getParentModule = (itemName: string): string | undefined => {
  for (const mod of HIERARCHICAL_MODULES) {
    const allItems = [
      ...mod.fields.map(f => f.name),
      ...mod.actions.map(a => a.name),
      ...mod.widgets.map(w => w.name),
      `module_${mod.name}`,
    ];
    if (allItems.includes(itemName)) return mod.name;
  }
  return undefined;
};

// Get permission_type for a given item name
export const getPermissionType = (itemName: string): 'module' | 'field' | 'action' | 'widget' => {
  if (itemName.startsWith('module_')) return 'module';
  if (itemName.startsWith('field_')) return 'field';
  if (itemName.startsWith('action_')) return 'action';
  if (itemName.startsWith('widget_')) return 'widget';
  return 'module';
};
