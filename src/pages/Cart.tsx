import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InvoiceTemplateRenderer from "@/components/invoice/InvoiceTemplateRenderer";
import { ArrowLeft, Trash2, Gift, ShoppingCart, Eye, Camera, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { CartItemDetail } from "@/components/CartItemDetail";
import { CameraCapture } from "@/components/CameraCapture";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { usePaymentProofMandatory } from '@/hooks/usePaymentProofMandatory';
import { awardPointsForOrder, updateRetailerSequence } from "@/utils/gamificationPointsAwarder";
import { CreditScoreDisplay } from "@/components/CreditScoreDisplay";
import { submitOrderWithOfflineSupport } from "@/utils/offlineOrderUtils";
import { offlineStorage } from "@/lib/offlineStorage";
import { useConnectivity } from "@/hooks/useConnectivity";
interface CartItem {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  base_unit?: string;
  quantity: number;
  total: number;
  schemeConditionQuantity?: number;
  schemeDiscountPercentage?: number;
  schemes?: Array<{
    is_active: boolean;
    condition_quantity?: number;
    discount_percentage?: number;
  }>;
}
type AnyCartItem = CartItem;

// Unit conversion helper - matches TableOrderForm logic
const normalizeUnit = (u?: string) => (u || "").toLowerCase().replace(/\./g, "").trim();
const getDisplayRate = (item: CartItem) => {
  const baseRate = Number(item.rate) || 0;
  const baseUnit = normalizeUnit(item.base_unit || item.unit);
  const targetUnit = normalizeUnit(item.unit);
  if (!baseUnit || !item.base_unit) return baseRate;

  // KG ↔ Gram conversions
  if (baseUnit === "kg" || baseUnit === "kilogram" || baseUnit === "kilograms") {
    if (["gram", "grams", "g", "gm"].includes(targetUnit)) return baseRate / 1000;
    if (targetUnit === "kg") return baseRate;
  } else if (["g", "gm", "gram", "grams"].includes(baseUnit)) {
    if (targetUnit === "kg") return baseRate * 1000;
    if (["g", "gm", "gram", "grams"].includes(targetUnit)) return baseRate;
  }
  return baseRate;
};

// Currency formatter that truncates to 2 decimals (no rounding)
const formatINRTrunc2 = (value: number) => {
  const num = Number(value) || 0;
  const truncated = Math.floor(num * 100) / 100;
  return truncated.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
export const Cart = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  const retailerName = searchParams.get("retailer") || "Retailer Name";
  const isPhoneOrder = searchParams.get("phoneOrder") === "true";
  const { isPaymentProofMandatory } = usePaymentProofMandatory();
  const connectivityStatus = useConnectivity();


  // Fetch and cache schemes from database
  const [allSchemes, setAllSchemes] = React.useState<any[]>([]);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [loggedInUserName, setLoggedInUserName] = React.useState<string>("User");
  const [visitDate, setVisitDate] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<CartItem | null>(null);
  const [showItemDetail, setShowItemDetail] = React.useState(false);
  const [pendingAmountFromPrevious, setPendingAmountFromPrevious] = React.useState<number>(0);

  // New payment flow state
  const [paymentType, setPaymentType] = React.useState<"" | "full" | "partial" | "credit">("");
  const [paymentMethod, setPaymentMethod] = React.useState<"" | "cash" | "cheque" | "upi" | "neft">("");
  const [partialAmount, setPartialAmount] = React.useState<string>("");
  const [chequePhotoUrl, setChequePhotoUrl] = React.useState<string>("");
  const [upiPhotoUrl, setUpiPhotoUrl] = React.useState<string>("");
  const [upiLastFourCode, setUpiLastFourCode] = React.useState<string>("");
  const [neftPhotoUrl, setNeftPhotoUrl] = React.useState<string>("");
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<"cheque" | "upi" | "neft">("cheque");
  const [showInvoicePreview, setShowInvoicePreview] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [companyData, setCompanyData] = React.useState<any>(null);
  const [retailerData, setRetailerData] = React.useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);
  const [selectedTemplateItems, setSelectedTemplateItems] = React.useState<any[]>([]);

  // Fix retailerId validation - don't use "." as a valid retailerId  
  const validRetailerId = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
  const validVisitId = visitId && visitId.length > 1 ? visitId : null;

  // Use visitId and retailerId from URL params consistently (same as Order Entry)
  const activeStorageKey = validVisitId && validRetailerId ? `order_cart:${validVisitId}:${validRetailerId}` : validRetailerId ? `order_cart:temp:${validRetailerId}` : 'order_cart:fallback';
  console.log('Cart Storage Debug:', {
    visitId,
    retailerId,
    validVisitId,
    validRetailerId,
    activeStorageKey
  });
  React.useEffect(() => {
    const fetchSchemes = async () => {
      const {
        data
      } = await supabase.from('product_schemes').select(`
          *,
          products(name),
          product_variants(variant_name)
        `).eq('is_active', true);
      if (data) {
        setAllSchemes(data);
      }
    };
    fetchSchemes();

    // Fetch pending amount for this retailer
    const fetchPendingAmount = async () => {
      if (!validRetailerId) return;
      const {
        data
      } = await supabase.from('retailers').select('pending_amount').eq('id', validRetailerId).single();
      setPendingAmountFromPrevious(Number(data?.pending_amount ?? 0));
    };
    fetchPendingAmount();
  }, [validRetailerId]);
  const getItemScheme = (item: AnyCartItem) => {
    try {
      // First check if item has pre-calculated scheme data
      const active = item.schemes?.find(s => s.is_active);
      if (active) {
        return {
          condition: active.condition_quantity ? Number(active.condition_quantity) : undefined,
          discountPct: active.discount_percentage ? Number(active.discount_percentage) : undefined
        };
      }

      // Then check from database schemes by matching product name
      const matchingScheme = allSchemes.find(scheme => {
        if (!scheme || !scheme.is_active) return false;
        const productName = scheme.products?.name;
        if (!productName || !item.name) return false;

        // Simple name matching to avoid complex logic
        const nameMatches = item.name.toLowerCase().includes(productName.toLowerCase()) || productName.toLowerCase().includes(item.name.toLowerCase());
        return nameMatches;
      });
      if (matchingScheme) {
        return {
          condition: matchingScheme.condition_quantity ? Number(matchingScheme.condition_quantity) : undefined,
          discountPct: matchingScheme.discount_percentage ? Number(matchingScheme.discount_percentage) : undefined
        };
      }

      // Fallback to item's own scheme data
      return {
        condition: item.schemeConditionQuantity ? Number(item.schemeConditionQuantity) : undefined,
        discountPct: item.schemeDiscountPercentage ? Number(item.schemeDiscountPercentage) : undefined
      };
    } catch (error) {
      console.error('Error in getItemScheme:', error);
      return {
        condition: undefined,
        discountPct: undefined
      };
    }
  };
  const computeItemSubtotal = (item: AnyCartItem) => {
    try {
      if (!item || !item.rate || !item.quantity) return 0;
      const displayRate = getDisplayRate(item);
      return Number(displayRate) * Number(item.quantity);
    } catch (error) {
      console.error('Error computing subtotal:', error);
      return 0;
    }
  };
  const computeItemDiscount = (item: AnyCartItem) => {
    try {
      if (!item || !item.quantity) return 0;
      const {
        condition,
        discountPct
      } = getItemScheme(item);
      if (condition && discountPct && Number(item.quantity) >= condition) {
        const subtotal = computeItemSubtotal(item);
        const discount = subtotal * discountPct / 100;
        return Math.max(0, discount); // Ensure non-negative
      }
      return 0;
    } catch (error) {
      console.error('Error computing discount:', error);
      return 0;
    }
  };
  const computeItemTotal = (item: AnyCartItem) => {
    try {
      if (!item) return 0;
      const subtotal = computeItemSubtotal(item);
      const discount = computeItemDiscount(item);
      return Math.max(0, subtotal - discount); // Ensure non-negative
    } catch (error) {
      console.error('Error computing total:', error);
      return 0;
    }
  };
  React.useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // Fetch user profile to get the name
        const {
          data: profile
        } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
        if (profile) {
          setLoggedInUserName(profile.full_name || profile.username || user.email?.split('@')[0] || "User");
        } else {
          // Fallback to email username if no profile
          setLoggedInUserName(user.email?.split('@')[0] || "User");
        }
      }
    };
    fetchUserData();
  }, []);

  // Fetch visit date if visitId is available
  React.useEffect(() => {
    if (visitId) {
      supabase.from('visits').select('planned_date').eq('id', visitId).single().then(({
        data
      }) => {
        if (data) {
          setVisitDate(data.planned_date);
        }
      });
    }
  }, [visitId]);

  // Fetch company, retailer data, and selected template for invoice preview
  React.useEffect(() => {
    const fetchInvoiceData = async () => {
      // Fetch company data
      const { data: company } = await supabase.from("companies").select("*").limit(1).maybeSingle();
      if (company) setCompanyData(company);

      // Fetch retailer data
      if (validRetailerId) {
        const { data: retailer } = await supabase
          .from("retailers")
          .select("name, address, phone, gst_number")
          .eq("id", validRetailerId)
          .single();
        if (retailer) setRetailerData(retailer);
      }

      // Fetch selected template
      const selectedTemplateId = localStorage.getItem('selected_invoice_template');
      if (selectedTemplateId) {
        const { data: template } = await supabase
          .from("invoices")
          .select(`
            *,
            retailers:customer_id(name, address, phone, gst_number),
            companies(*)
          `)
          .eq("id", selectedTemplateId)
          .single();
        
        if (template) {
          setSelectedTemplate(template);
          
          // Fetch template items
          const { data: items } = await supabase
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", selectedTemplateId);
          
          if (items) setSelectedTemplateItems(items);
        }
      }
    };
    fetchInvoiceData();
  }, [validRetailerId]);

  // Load cart items from localStorage with proper refresh handling
  React.useEffect(() => {
    const loadCartItems = () => {
      console.log('Cart Debug - Loading cart items:', {
        userId,
        retailerId,
        validRetailerId,
        activeStorageKey
      });
      try {
        const rawData = localStorage.getItem(activeStorageKey);
        if (rawData && rawData !== 'undefined' && rawData !== 'null') {
          const parsedItems = JSON.parse(rawData);
          // Validate parsed items are an array
          if (Array.isArray(parsedItems)) {
            console.log('Setting cart items:', parsedItems);
            setCartItems(parsedItems);
          } else {
            console.warn('Cart data is not an array, resetting cart');
            setCartItems([]);
          }
        } else {
          console.log('No cart data found, cart will be empty');
          setCartItems([]);
        }
      } catch (error) {
        console.error('Error loading cart items:', error);
        // Clear corrupted data
        localStorage.removeItem(activeStorageKey);
        setCartItems([]);
      }
    };
    loadCartItems();

    // Also listen for storage changes (when updated from OrderEntry)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === activeStorageKey) {
        loadCartItems();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeStorageKey]);
  React.useEffect(() => {
    localStorage.setItem(activeStorageKey, JSON.stringify(cartItems));
  }, [cartItems, activeStorageKey]);
  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    // Also remove from OrderEntry quantities
    updateOrderEntryQuantities(productId, 0);
    toast({
      title: "Item Removed",
      description: "Item removed from cart"
    });
  };
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      // Also update the quantities storage for OrderEntry sync
      updateOrderEntryQuantities(productId, 0);
      return;
    }
    setCartItems(prev => prev.map(item => {
      if (item.id === productId) {
        const updatedItem = {
          ...item,
          quantity: newQuantity
        };

        // Remove pre-calculated total so schemes are recalculated based on new quantity
        delete updatedItem.total;
        console.log('Updating quantity for:', updatedItem.name, 'New quantity:', newQuantity, 'Schemes will be recalculated');

        // Update OrderEntry quantities storage - make sure to sync correctly
        updateOrderEntryQuantities(productId, newQuantity);
        return updatedItem;
      }
      return item;
    }));
  };

  // Function to update OrderEntry quantities storage
  const updateOrderEntryQuantities = (productId: string, quantity: number) => {
    const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
    const existingQuantities = localStorage.getItem(quantityKey);
    try {
      const quantities = existingQuantities ? JSON.parse(existingQuantities) : {};
      if (quantity > 0) {
        quantities[productId] = quantity;
      } else {
        delete quantities[productId];
      }
      localStorage.setItem(quantityKey, JSON.stringify(quantities));
      console.log('Updated OrderEntry quantities:', {
        productId,
        quantity,
        allQuantities: quantities
      });
    } catch (error) {
      console.error('Error updating OrderEntry quantities:', error);
    }
  };
  const getSubtotal = () => {
    try {
      return cartItems.reduce((sum, item) => {
        if (!item) return sum;
        return sum + computeItemSubtotal(item);
      }, 0);
    } catch (error) {
      console.error('Error computing subtotal:', error);
      return 0;
    }
  };
  const getDiscount = () => {
    try {
      return cartItems.reduce((sum, item) => {
        if (!item) return sum;
        return sum + computeItemDiscount(item);
      }, 0);
    } catch (error) {
      console.error('Error computing discount:', error);
      return 0;
    }
  };
  const getAmountAfterDiscount = () => {
    try {
      const subtotal = getSubtotal();
      const discount = getDiscount();
      return Math.max(0, subtotal - discount);
    } catch (error) {
      console.error('Error computing amount after discount:', error);
      return 0;
    }
  };
  const getCGST = () => {
    const amountAfterDiscount = getAmountAfterDiscount();
    return amountAfterDiscount * 2.5 / 100; // 2.5% CGST
  };
  const getSGST = () => {
    const amountAfterDiscount = getAmountAfterDiscount();
    return amountAfterDiscount * 2.5 / 100; // 2.5% SGST
  };
  const getFinalTotal = () => {
    try {
      const amountAfterDiscount = getAmountAfterDiscount();
      const cgst = getCGST();
      const sgst = getSGST();
      return Math.max(0, amountAfterDiscount + cgst + sgst);
    } catch (error) {
      console.error('Error computing final total:', error);
      return 0;
    }
  };

  // Check if the visit date allows order submission
  const canSubmitOrder = () => {
    if (!visitDate) return true; // Allow if no visit date (backwards compatibility)
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    console.log('Visit date:', visitDate, 'Today:', today, 'Can submit:', visitDate === today);
    return visitDate === today;
  };
  const getSubmitButtonText = () => {
    if (!visitDate) return "Submit Order";
    const today = new Date().toISOString().split('T')[0];
    if (visitDate === today) return "Submit Order";
    return `Order will be placed on ${new Date(visitDate).toLocaleDateString()}`;
  };
  const handleCameraCapture = async (blob: Blob) => {
    try {
      const fileName = `payment-${Date.now()}.jpg`;
      const {
        data,
        error
      } = await supabase.storage.from('expense-bills').upload(fileName, blob);
      if (error) throw error;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('expense-bills').getPublicUrl(fileName);
      if (cameraMode === "cheque") {
        setChequePhotoUrl(publicUrl);
        toast({
          title: "Cheque photo captured successfully"
        });
      } else if (cameraMode === "upi") {
        setUpiPhotoUrl(publicUrl);
        toast({
          title: "Payment confirmation captured successfully"
        });
      } else if (cameraMode === "neft") {
        setNeftPhotoUrl(publicUrl);
        toast({
          title: "NEFT confirmation captured successfully"
        });
      }
      setIsCameraOpen(false);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before submitting",
        variant: "destructive"
      });
      return;
    }

    // Validate payment selections
    if (!paymentType) {
      toast({
        title: "Select Payment Type",
        description: "Please select Full Payment, Partial Payment, or Full Credit",
        variant: "destructive"
      });
      return;
    }
    if ((paymentType === "full" || paymentType === "partial") && !paymentMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }
    if (paymentType === "partial" && (!partialAmount || parseFloat(partialAmount) <= 0)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid partial payment amount",
        variant: "destructive"
      });
      return;
    }
    // Check payment proof only if mandatory
    if (isPaymentProofMandatory) {
      if (paymentMethod === "cheque" && !chequePhotoUrl) {
        toast({
          title: "Cheque Photo Required",
          description: "Please capture cheque photo",
          variant: "destructive"
        });
        return;
      }
      if (paymentMethod === "upi" && !upiPhotoUrl) {
        toast({
          title: "Payment Confirmation Required",
          description: "Please capture payment confirmation photo",
          variant: "destructive"
        });
        return;
      }
      if (paymentMethod === "neft" && !neftPhotoUrl) {
        toast({
          title: "NEFT Confirmation Required",
          description: "Please capture NEFT confirmation photo",
          variant: "destructive"
        });
        return;
      }
    }

    // Check if order can be submitted today - BLOCK submission if not today
    if (!canSubmitOrder()) {
      toast({
        title: "Order Scheduled",
        description: `This order will be submitted on ${new Date(visitDate!).toLocaleDateString()}. Items will remain in your cart until then.`,
        variant: "default"
      });
      return; // This prevents any further execution
    }
    setIsSubmitting(true);
    toast({
      title: "Processing Order",
      description: "Please wait while we submit your order...",
    });

    try {
      // Get user ID - use cache when offline to avoid network dependency
      let user;
      let userIdToUse;
      
      if (connectivityStatus === 'offline') {
        // Offline: Use cached user ID
        const cachedUserId = localStorage.getItem('cached_user_id');
        if (!cachedUserId) {
          toast({
            title: "User Data Missing",
            description: "Please go online once to cache user data",
            variant: "destructive"
          });
          return;
        }
        userIdToUse = cachedUserId;
        console.log('📵 Using cached user ID for offline order:', userIdToUse);
      } else {
        // Online: Fetch from Supabase
        const { data: { user: fetchedUser } } = await supabase.auth.getUser();
        if (!fetchedUser) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to submit orders",
            variant: "destructive"
          });
          return;
        }
        user = fetchedUser;
        userIdToUse = user.id;
        // Cache for offline use
        localStorage.setItem('cached_user_id', user.id);
      }
      const subtotal = getSubtotal();
      const discountAmount = getDiscount();
      const cgstAmount = getCGST();
      const sgstAmount = getSGST();
      const totalAmount = getFinalTotal();
      // Prepare IDs
      const validRetailerId = retailerId && /^[0-9a-fA-F-]{36}$/.test(retailerId) ? retailerId : null;
      const validVisitId = visitId && /^[0-9a-fA-F-]{36}$/.test(visitId) ? visitId : null;

      // Calculate credit amounts based on new payment flow
      const totalDue = pendingAmountFromPrevious + totalAmount;
      let newTotalPending = 0;
      let creditPending = 0;
      let creditPaid = 0;
      let previousPendingCleared = 0;
      let isCreditOrder = false;
      let orderPaymentMethod = "";
      let paymentProofUrl = "";
      if (paymentType === "credit") {
        // Full credit - no payment received
        isCreditOrder = true;
        newTotalPending = totalDue;
        creditPending = totalAmount;
        creditPaid = 0;
        previousPendingCleared = 0;
        orderPaymentMethod = "credit";
      } else if (paymentType === "full") {
        // Full payment - clear all dues
        isCreditOrder = false;
        newTotalPending = 0;
        previousPendingCleared = pendingAmountFromPrevious;
        creditPaid = totalAmount;
        creditPending = 0;
        orderPaymentMethod = paymentMethod;
        paymentProofUrl = paymentMethod === "cheque" ? chequePhotoUrl : paymentMethod === "upi" ? upiPhotoUrl : paymentMethod === "neft" ? neftPhotoUrl : "";
      } else if (paymentType === "partial") {
        // Partial payment
        isCreditOrder = true;
        const paidAmount = parseFloat(partialAmount);
        previousPendingCleared = Math.min(pendingAmountFromPrevious, paidAmount);
        creditPaid = paidAmount;
        newTotalPending = totalDue - paidAmount;
        creditPending = newTotalPending;
        orderPaymentMethod = paymentMethod;
        paymentProofUrl = paymentMethod === "cheque" ? chequePhotoUrl : paymentMethod === "upi" ? upiPhotoUrl : paymentMethod === "neft" ? neftPhotoUrl : "";
      }

      console.time('⚡ Order Submission');

      // For phone orders, create a visit first (only when online)
      let actualVisitId = validVisitId;
      if (isPhoneOrder && !validVisitId && validRetailerId && connectivityStatus !== 'offline') {
        const today = new Date().toISOString().split('T')[0];
        const {
          data: newVisit,
          error: visitError
        } = await supabase.from('visits').insert({
          user_id: userIdToUse,
          retailer_id: validRetailerId,
          planned_date: today,
          status: 'productive',
          skip_check_in_reason: 'phone-order',
          skip_check_in_time: new Date().toISOString()
        }).select().single();
        if (visitError) {
          console.error('Error creating phone order visit:', visitError);
          toast({
            title: "Error",
            description: "Failed to create visit for phone order",
            variant: "destructive"
          });
          return;
        }
        actualVisitId = newVisit.id;
      } else if (isPhoneOrder && !validVisitId && connectivityStatus === 'offline') {
        // Offline phone order: Generate temp visit ID
        actualVisitId = crypto.randomUUID();
        console.log('📵 Generated temp visit ID for offline phone order:', actualVisitId);
      }

      // Prepare order data
      const orderData = {
        user_id: userIdToUse,
        visit_id: actualVisitId,
        retailer_id: validRetailerId,
        retailer_name: retailerName,
        order_date: new Date().toISOString().split('T')[0],
        subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status: 'confirmed',
        is_credit_order: isCreditOrder,
        credit_pending_amount: creditPending,
        credit_paid_amount: creditPaid,
        previous_pending_cleared: previousPendingCleared,
        payment_method: orderPaymentMethod,
        payment_proof_url: paymentProofUrl,
        upi_last_four_code: paymentMethod === 'upi' ? upiLastFourCode : null
      };

      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        // Store rate per selected unit (KG or grams) so invoices match cart
        rate: getDisplayRate(item),
        unit: item.unit,
        quantity: item.quantity,
        total: computeItemTotal(item)
      }));

      // Submit order using offline-capable utility
      console.log('📤 Submitting order with connectivity:', connectivityStatus);
      const result = await submitOrderWithOfflineSupport(orderData, orderItems, {
        connectivityStatus,
        onOffline: () => {
          console.log('📵 OFFLINE MODE: Order queued for sync');
          toast({
            title: "📵 Order Saved Offline",
            description: "Your order and invoice message will be synced automatically when you're back online",
          });
        },
        onOnline: () => {
          console.log('✅ ONLINE MODE: Order submitted immediately');
          toast({
            title: "✅ Order Placed Successfully",
            description: `Order for ${retailerName} has been confirmed`,
          });
        }
      });

      console.timeEnd('⚡ Order Submission');

      console.log('✅ Order submission result:', {
        orderId: result.order?.id,
        offline: result.offline,
        success: result.success,
        retailerId: validRetailerId,
        connectivityStatus
      });
      
      // Check if submission failed
      if (!result.success) {
        console.error('❌ Order submission failed');
        toast({
          title: "Order Submission Failed",
          description: "Failed to save order. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Clear cart immediately - user sees success
      console.log('🗑️ Clearing cart from localStorage');
      localStorage.removeItem('cart');
      setCartItems([]);

      // BACKGROUND WORK - Don't block user navigation for non-critical tasks
      // Gamification, retailer sequences, and invoice DB records run in background
      (async () => {
        try {
          // Only run background tasks if online
          if (!result.offline) {
            const order = result.order;

            // Check if this is the first order
            const { count: previousOrdersCount } = await supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userIdToUse)
              .eq('retailer_id', validRetailerId)
              .neq('id', order.id);

            const isFirstOrder = previousOrdersCount === 0;

            // Award gamification points
            await awardPointsForOrder({
              userId: userIdToUse,
              retailerId: validRetailerId,
              orderValue: totalAmount,
              orderItems: orderItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
              })),
              isFirstOrder
            });

            // Update retailer sequence
            await updateRetailerSequence(userIdToUse, validRetailerId);

            // Create invoice record (for future editing/management)
            const invoiceDate = new Date().toISOString().split('T')[0];
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const { data: companyData } = await supabase
              .from('companies')
              .select('id')
              .limit(1)
              .maybeSingle();

            const { data: invoiceRecord, error: invoiceError } = await supabase
              .from('invoices')
              .insert([{
                company_id: companyData?.id || null,
                customer_id: validRetailerId,
                invoice_date: invoiceDate,
                due_date: dueDate,
                sub_total: subtotal,
                total_tax: cgstAmount + sgstAmount,
                total_amount: totalAmount,
                created_by: userIdToUse,
                status: 'issued',
                place_of_supply: '29-Karnataka',
                order_id: order.id
              }] as any)
              .select()
              .single();

            if (!invoiceError && invoiceRecord) {
              const invoiceItems = cartItems.map(item => {
                const quantity = Number(item.quantity || 0);
                const rate = Number(getDisplayRate(item));
                const taxableAmount = quantity * rate;
                const cgst = (taxableAmount * 2.5) / 100;
                const sgst = (taxableAmount * 2.5) / 100;
                const totalWithTax = taxableAmount + cgst + sgst;
                return {
                  invoice_id: invoiceRecord.id,
                  description: item.name,
                  quantity,
                  unit_price: rate,
                  taxable_amount: taxableAmount,
                  cgst_rate: 2.5,
                  cgst_amount: cgst,
                  sgst_rate: 2.5,
                  sgst_amount: sgst,
                  total_amount: totalWithTax
                };
              });

              await supabase.from('invoice_items').insert(invoiceItems);
            }

            console.log('✅ Background post-order processing completed');
          }
        } catch (error) {
          console.error('Background post-order processing failed:', error);
          // Don't fail the order - it's already saved
        }
      })();

      // IMPORTANT: Send invoice PDF + WhatsApp/SMS
      console.log('📋 Invoice SMS Check:', {
        offline: result.offline,
        hasOrder: !!result.order,
        orderId: result.order?.id,
        validRetailerId,
        willSendSMS: !result.offline && !!result.order && !!validRetailerId
      });

      try {
        if (!result.offline && result.order && validRetailerId) {
          // ONLINE: Send immediately
          console.log('🔄 Starting invoice WhatsApp/SMS process (online)...');

          // Fetch retailer phone
          const { data: retailer, error: retailerError } = await supabase
            .from('retailers')
            .select('phone')
            .eq('id', validRetailerId)
            .single();

          if (retailerError) {
            console.error('❌ Failed to fetch retailer for SMS/WhatsApp:', retailerError);
            throw retailerError;
          }

          console.log('📱 Retailer phone:', retailer?.phone);

          if (retailer?.phone) {
            console.log('📄 Generating invoice PDF (foreground)...');

            const { fetchAndGenerateInvoice } = await import('@/utils/invoiceGenerator');
            const { blob, invoiceNumber } = await fetchAndGenerateInvoice(result.order.id);

            console.log('✅ Invoice generated:', invoiceNumber);

            const fileName = `invoice-${invoiceNumber}.pdf`;

            console.log('☁️ Uploading invoice PDF to storage...');
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('invoices')
              .upload(fileName, blob, {
                contentType: 'application/pdf',
                upsert: true
              });

            if (uploadError) {
              console.error('❌ Storage upload failed (invoice SMS/WhatsApp):', uploadError);
              throw uploadError;
            }

            if (uploadData) {
              console.log('✅ PDF uploaded successfully');

              const { data: { publicUrl } } = await supabase.storage
                .from('invoices')
                .getPublicUrl(uploadData.path);

              console.log('🔗 Public URL for invoice:', publicUrl);

              console.log('📨 Invoking send-invoice-whatsapp edge function (WhatsApp + SMS)...');
              const { data: fnResult, error: fnError } = await supabase.functions.invoke('send-invoice-whatsapp', {
                body: {
                  invoiceId: result.order.id,
                  customerPhone: retailer.phone,
                  pdfUrl: publicUrl,
                  invoiceNumber: invoiceNumber
                }
              });

              if (fnError) {
                console.error('❌ Edge function error (send-invoice-whatsapp):', fnError);
                toast({
                  title: 'Invoice Message Failed',
                  description: fnError.message || 'Could not send invoice link via SMS/WhatsApp. Please contact admin.',
                  variant: 'destructive',
                });
                throw fnError;
              }

              console.log('✅ Edge function response:', fnResult);
              toast({
                title: 'Invoice Link Sent',
                description: 'Invoice link sent via SMS/WhatsApp to retailer.',
              });
            }
          } else {
            console.log('⚠️ No phone number found for retailer; skipping SMS/WhatsApp');
          }
        } else if (result.offline && result.order && validRetailerId) {
          // OFFLINE: Queue message for later
          console.log('📵 Offline mode - queueing invoice SMS/WhatsApp for sync...');
          console.log('📵 Order details for SMS queue:', {
            orderId: result.order.id,
            retailerId: validRetailerId,
            retailerName
          });
          
          // Fetch retailer phone from offline cache
          const cachedRetailers = await offlineStorage.getAll('retailers');
          console.log('📦 Loaded retailers from cache:', cachedRetailers.length);
          
          const retailer = cachedRetailers.find((r: any) => r.id === validRetailerId) as any;
          console.log('📱 Found retailer in cache:', retailer ? `${retailer.name} - ${retailer.phone}` : 'NOT FOUND');
          
          if (retailer?.phone) {
            // Add to sync queue
            await offlineStorage.addToSyncQueue('SEND_INVOICE_SMS', {
              orderId: result.order.id,
              customerPhone: String(retailer.phone),
              retailerName: retailerName,
              queuedAt: new Date().toISOString()
            });
            
            console.log('✅ Invoice SMS queued for sync - Queue item added');
            
            // Verify it was added
            const queue = await offlineStorage.getSyncQueue();
            console.log('📊 Current sync queue count:', queue.length);
            
            toast({
              title: "📤 Message Queued",
              description: "Invoice SMS will be sent when you're back online",
            });
          } else {
            console.log('⚠️ No phone number in offline cache; skipping message queue');
          }
        }
      } catch (notifyError: any) {
        console.error('❌ Failed to send/queue invoice via WhatsApp/SMS:', notifyError);
        toast({
          title: 'SMS Send Failed',
          description: `Could not send invoice SMS: ${notifyError.message || 'Unknown error'}. Order was saved successfully.`,
          variant: 'destructive',
        });
      }

      // Navigate back only after attempting invoice notification
      navigate(-1);
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({
        title: "Error Submitting Order",
        description: error.message || "Failed to submit order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="w-full px-2 sm:px-4 py-2 sm:py-4">
          <Card className="shadow-card bg-gradient-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-2 sm:px-3 py-2 sm:py-3 gap-2">
              {/* Left side - Back button and title */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/order-entry?visitId=${visitId}&retailer=${retailerName}&retailerId=${retailerId}${isPhoneOrder ? '&phoneOrder=true' : ''}`)}
                  className="text-primary-foreground hover:bg-primary-foreground/20 p-1.5 sm:p-2 shrink-0"
                >
                  <ArrowLeft size={18} />
                </Button>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <CardTitle className="text-base sm:text-lg font-semibold leading-tight truncate">Cart</CardTitle>
                  <p className="text-[10px] sm:text-xs text-primary-foreground/80 leading-tight truncate">{retailerName}</p>
                </div>
              </div>
              
              {/* Right side - Preview and Cart info */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInvoicePreview(true)}
                  className="text-primary-foreground hover:bg-primary-foreground/20 p-1.5 sm:p-2 text-[10px] sm:text-xs h-auto"
                >
                  <Eye size={14} className="sm:w-4 sm:h-4 mr-1" />
                  Preview
                </Button>
                <div className="flex items-center gap-1.5">
                  <ShoppingCart size={14} className="sm:w-4 sm:h-4" />
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1.5">{cartItems.length} items</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Scrollable Content with top padding for fixed header */}
      <div className="w-full px-2 sm:px-4 space-y-3 pt-24 sm:pt-28">
        {/* Cart Items */}
        {cartItems.length === 0 ? <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button onClick={() => navigate(`/order-entry?visitId=${visitId}&retailer=${retailerName}&retailerId=${retailerId}`)} className="mt-4">
                Continue Shopping
              </Button>
            </CardContent>
          </Card> : <>
            <div className="space-y-2">
              {cartItems.map(item => {
            const discount = computeItemDiscount(item);
            const finalPrice = computeItemTotal(item);
            const hasDiscount = discount > 0;

            // Extract just the variant name if it contains a dash
            const displayName = item.name.includes(' - ') ? item.name.split(' - ')[1] || item.name : item.name;
            return <Card key={item.id} className="border-border/50">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        {/* Product Info - Compact */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate leading-tight">{displayName}</h3>
                          <p className="text-xs text-muted-foreground">₹{getDisplayRate(item).toFixed(2)}/{item.unit}</p>
                        </div>
                        
                        {/* Quantity Controls - Compact */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            -
                          </Button>
                          <div className="min-w-[40px] text-center">
                            <div className="text-xs font-medium leading-tight">{item.quantity}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight">{item.unit}</div>
                          </div>
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            +
                          </Button>
                        </div>
                        
                        {/* Price - Compact */}
                        <div className="text-right min-w-[60px] shrink-0">
                          <div className="font-bold text-xs">₹{formatINRTrunc2(finalPrice)}</div>
                          {hasDiscount && <div className="text-[10px] text-green-600 font-medium">-₹{formatINRTrunc2(discount)}</div>}
                        </div>
                        
                        {/* Action Buttons - Compact */}
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => {
                      setSelectedItem(item);
                      setShowItemDetail(true);
                    }}>
                            <Eye size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => removeFromCart(item.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>;
          })}
            </div>

            {/* Order Summary */}
            <Card>
              <CardContent className="p-3 space-y-2">
                {validRetailerId && (
                  <div className="pb-2 border-b">
                    <CreditScoreDisplay retailerId={validRetailerId} variant="compact" showCreditLimit={true} />
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">₹{formatINRTrunc2(getSubtotal())}</span>
                </div>

                {getDiscount() > 0 && <div className="p-2 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gift size={12} className="text-success" />
                      <p className="text-xs font-medium text-success">Schemes Applied</p>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Discount:</span>
                      <span className="text-success font-medium">-₹{formatINRTrunc2(getDiscount())}</span>
                    </div>
                  </div>}

                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>CGST (2.5%):</span>
                    <span>₹{formatINRTrunc2(getCGST())}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>SGST (2.5%):</span>
                    <span>₹{formatINRTrunc2(getSGST())}</span>
                  </div>
                </div>

                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{formatINRTrunc2(getFinalTotal())}</span>
                </div>

                {pendingAmountFromPrevious > 0 && <div className="space-y-1.5 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Previous Pending:</span>
                      <span className="font-semibold text-warning">₹{formatINRTrunc2(pendingAmountFromPrevious)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Current Order:</span>
                      <span className="font-semibold">₹{formatINRTrunc2(getFinalTotal())}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5 border-t border-amber-200 dark:border-amber-800">
                      <span className="font-medium">Total Due:</span>
                      <span className="font-bold">₹{formatINRTrunc2(pendingAmountFromPrevious + getFinalTotal())}</span>
                    </div>
                  </div>}

                {/* Payment Type Selection */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium">Select Payment Type:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button onClick={() => {
                  setPaymentType("full");
                  setPaymentMethod("");
                }} variant={paymentType === "full" ? "default" : "outline"} className="h-9 text-xs px-1.5 whitespace-normal leading-tight">
                      Full Payment
                    </Button>
                    <Button onClick={() => {
                  setPaymentType("partial");
                  setPaymentMethod("");
                }} variant={paymentType === "partial" ? "default" : "outline"} className="h-9 text-xs px-1.5 whitespace-normal leading-tight">
                      Partial Payment
                    </Button>
                    <Button onClick={() => {
                  setPaymentType("credit");
                  setPaymentMethod("");
                }} variant={paymentType === "credit" ? "default" : "outline"} className="h-9 text-xs px-1.5 whitespace-normal leading-tight">
                      Full Credit
                    </Button>
                  </div>
                </div>

                {/* Partial Payment Amount Input */}
                {paymentType === "partial" && <div className="space-y-1.5">
                    <Label htmlFor="partial-amount" className="text-xs">Partial Payment Amount</Label>
                    <Input id="partial-amount" type="number" placeholder="Enter amount" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} max={getFinalTotal() + pendingAmountFromPrevious} className="h-8 text-sm border-primary ring-2 ring-primary/20 focus:ring-primary/40" />
                    {partialAmount && parseFloat(partialAmount) > 0 && <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-success">Paying Now:</span>
                          <span className="font-semibold text-success">₹{formatINRTrunc2(parseFloat(partialAmount))}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-amber-200 dark:border-amber-800">
                          <span className="font-medium text-warning">Remaining:</span>
                          <span className="font-bold text-warning">₹{formatINRTrunc2(Math.max(0, getFinalTotal() + pendingAmountFromPrevious - parseFloat(partialAmount)))}</span>
                        </div>
                      </div>}
                  </div>}

                {/* Payment Method Selection */}
                {(paymentType === "full" || paymentType === "partial") && <div className="space-y-2 p-2.5 border rounded-lg bg-muted/50">
                    <p className="text-xs font-medium">Payment Method:</p>
                    <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="flex items-center gap-6">
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="cash" id="cash" className="h-3.5 w-3.5" />
                        <Label htmlFor="cash" className="text-xs">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="cheque" id="cheque" className="h-3.5 w-3.5" />
                        <Label htmlFor="cheque" className="text-xs">Cheque</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="upi" id="upi" className="h-3.5 w-3.5" />
                        <Label htmlFor="upi" className="text-xs">UPI</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="neft" id="neft" className="h-3.5 w-3.5" />
                        <Label htmlFor="neft" className="text-xs">NEFT</Label>
                      </div>
                    </RadioGroup>

                    {/* Cheque Bank Details and Photo Capture */}
                    {paymentMethod === "cheque" && <div className="space-y-1.5">
                        <div className="p-2 bg-background rounded-md border">
                          <p className="text-xs font-medium mb-1.5">Bank Details for Cheque</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p><span className="font-medium">Bank Name:</span> HDFC Bank</p>
                            <p><span className="font-medium">Account Name:</span> Bharath Beverages Pvt Ltd</p>
                            <p><span className="font-medium">Account Number:</span> 1234567890</p>
                            <p><span className="font-medium">IFSC Code:</span> HDFC0001234</p>
                          </div>
                        </div>
                        <Button onClick={() => {
                  setCameraMode("cheque");
                  setIsCameraOpen(true);
                }} variant="outline" className="w-full h-8 text-xs">
                          <Camera className="mr-1.5" size={12} />
                          {chequePhotoUrl ? "Retake Cheque" : "Capture Cheque"}
                        </Button>
                        {chequePhotoUrl && <p className="text-[10px] text-success">✓ Cheque photo captured</p>}
                      </div>}

                    {/* UPI Payment Confirmation */}
                    {paymentMethod === "upi" && <div className="space-y-1.5">
                        <div className="p-2 bg-background rounded-md border">
                          <p className="text-xs text-muted-foreground mb-1.5">Scan QR for Payment</p>
                          <div className="flex items-center justify-center h-32 bg-muted rounded">
                            <p className="text-xs text-muted-foreground">QR Code</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="upiLastFour" className="text-xs">UPI Last-4 Code</Label>
                          <Input
                            id="upiLastFour"
                            type="text"
                            maxLength={4}
                            value={upiLastFourCode}
                            onChange={(e) => setUpiLastFourCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter last 4 digits"
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button onClick={() => {
                  setCameraMode("upi");
                  setIsCameraOpen(true);
                }} variant="outline" className="w-full h-8 text-xs">
                          <Camera className="mr-1.5" size={12} />
                          {upiPhotoUrl ? "Retake Proof" : "Capture Proof"}
                        </Button>
                        {upiPhotoUrl && <p className="text-[10px] text-success">✓ Payment proof captured</p>}
                      </div>}

                    {/* NEFT Bank Details and Photo Capture */}
                    {paymentMethod === "neft" && <div className="space-y-1.5">
                        <div className="p-2 bg-background rounded-md border">
                          <p className="text-xs font-medium mb-1.5">Bank Details for NEFT</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p><span className="font-medium">Bank Name:</span> HDFC Bank</p>
                            <p><span className="font-medium">Account Name:</span> Bharath Beverages Pvt Ltd</p>
                            <p><span className="font-medium">Account Number:</span> 1234567890</p>
                            <p><span className="font-medium">IFSC Code:</span> HDFC0001234</p>
                          </div>
                        </div>
                        <Button onClick={() => {
                  setCameraMode("neft");
                  setIsCameraOpen(true);
                }} variant="outline" className="w-full h-8 text-xs">
                          <Camera className="mr-1.5" size={12} />
                          {neftPhotoUrl ? "Retake NEFT Proof" : "Capture NEFT Proof"}
                        </Button>
                        {neftPhotoUrl && <p className="text-[10px] text-success">✓ NEFT confirmation captured</p>}
                      </div>}
                  </div>}

                {/* Submit Order Button */}
                <Button 
                  onClick={handleSubmitOrder} 
                  className="w-full h-9 text-sm" 
                  variant="default" 
                  disabled={!canSubmitOrder() || !paymentType || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    getSubmitButtonText()
                  )}
                </Button>
              </CardContent>
            </Card>
          </>}
        
        {/* Cart Item Detail Modal */}
        <CartItemDetail isOpen={showItemDetail} onClose={() => setShowItemDetail(false)} item={selectedItem} />

        <CameraCapture isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} title={cameraMode === "cheque" ? "Capture Cheque Photo" : cameraMode === "upi" ? "Capture Payment Confirmation" : "Capture NEFT Confirmation"} />
        
        {/* Invoice Preview Dialog */}
        <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Preview
              </DialogTitle>
            </DialogHeader>
            
            {validRetailerId && cartItems.length > 0 && (
              <InvoiceTemplateRenderer
                orderId={validVisitId || "DRAFT"}
                retailerId={validRetailerId}
                cartItems={cartItems}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Cart;