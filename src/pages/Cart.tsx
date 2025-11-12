import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [neftPhotoUrl, setNeftPhotoUrl] = React.useState<string>("");
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<"cheque" | "upi" | "neft">("cheque");
  const [showInvoicePreview, setShowInvoicePreview] = React.useState(false);
  const [companyData, setCompanyData] = React.useState<any>(null);
  const [retailerData, setRetailerData] = React.useState<any>(null);

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

  // Fetch company and retailer data for invoice preview
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

    // Check if order can be submitted today - BLOCK submission if not today
    if (!canSubmitOrder()) {
      toast({
        title: "Order Scheduled",
        description: `This order will be submitted on ${new Date(visitDate!).toLocaleDateString()}. Items will remain in your cart until then.`,
        variant: "default"
      });
      return; // This prevents any further execution
    }
    try {
      // Get current user
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to submit orders",
          variant: "destructive"
        });
        return;
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

      // For phone orders, create a visit first
      let actualVisitId = validVisitId;
      if (isPhoneOrder && !validVisitId && validRetailerId) {
        const today = new Date().toISOString().split('T')[0];
        const {
          data: newVisit,
          error: visitError
        } = await supabase.from('visits').insert({
          user_id: user.id,
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
      }

      // Create order with payment details
      const {
        data: order,
        error: orderError
      } = await supabase.from('orders').insert({
        user_id: user.id,
        visit_id: actualVisitId,
        retailer_id: validRetailerId,
        retailer_name: retailerName,
        subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status: 'confirmed',
        is_credit_order: isCreditOrder,
        credit_pending_amount: creditPending,
        credit_paid_amount: creditPaid,
        previous_pending_cleared: previousPendingCleared,
        payment_method: orderPaymentMethod,
        payment_proof_url: paymentProofUrl
      }).select().single();
      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        rate: item.rate,
        unit: item.unit,
        quantity: item.quantity,
        total: computeItemTotal(item)
      }));
      const {
        error: itemsError
      } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Update retailer's pending amount based on order type
      if (validRetailerId) {
        await supabase.from('retailers').update({
          pending_amount: newTotalPending
        }).eq('id', validRetailerId);
      }

      // Mark visit as productive if available
      if (actualVisitId) {
        await supabase.from('visits').update({
          status: 'productive'
        }).eq('id', actualVisitId);

        // Dispatch event to notify VisitCard components to refresh
        window.dispatchEvent(new CustomEvent('visitStatusChanged', {
          detail: {
            visitId: actualVisitId,
            status: 'productive',
            retailerId: validRetailerId
          }
        }));
      }

      // Create invoice and send via SMS automatically
      let invoiceSentViaSMS = false;
      try {
        // Get retailer phone number
        const {
          data: retailerData
        } = await supabase.from('retailers').select('phone').eq('id', validRetailerId).single();
        const retailerPhone = retailerData?.phone;

        // Get company settings for invoice (not used currently but kept for future)
        const {
          data: companyData
        } = await supabase.from('companies').select('*').limit(1).maybeSingle();
        if (validRetailerId && retailerPhone) {
          // Generate a temporary invoice number for SMS (will be formalized in database)
          const tempInvoiceNumber = `INV-${Date.now()}`;

          // Create a simple invoice URL (you can enhance this to generate actual PDF)
          const invoiceUrl = `${window.location.origin}/order-detail/${order.id}`;
          console.log('Sending invoice via SMS to:', retailerPhone);

          // Send via Twilio SMS
          const {
            data: smsData,
            error: smsError
          } = await supabase.functions.invoke('send-invoice-whatsapp', {
            body: {
              invoiceId: order.id,
              customerPhone: retailerPhone,
              pdfUrl: invoiceUrl,
              invoiceNumber: tempInvoiceNumber
            }
          });
          if (smsError) {
            console.error('SMS send error:', smsError);
          } else if (smsData?.success) {
            console.log('Invoice sent via SMS successfully');
            invoiceSentViaSMS = true;
          }
        }
      } catch (invoiceError) {
        console.error('Error sending invoice via SMS:', invoiceError);
        // Don't block order submission if SMS fails
      }
      const orderType = isCreditOrder ? "Credit Order" : "Order";
      const smsMsg = invoiceSentViaSMS ? " Invoice link sent via SMS." : "";
      toast({
        title: `${orderType} Submitted`,
        description: isCreditOrder ? `${orderType} for ${retailerName} submitted with ₹${creditPending.toLocaleString()} pending!${smsMsg}` : `Order for ${retailerName} submitted successfully!${smsMsg}`
      });

      // Clear cart and all order entry form data
      localStorage.removeItem(activeStorageKey);
      // Also clear the quantities, variants, and stocks storage for order entry
      const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
      const variantKey = activeStorageKey.replace('order_cart:', 'order_variants:');
      const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
      const tableFormKey = activeStorageKey.replace('order_cart:', 'table_form:');
      localStorage.removeItem(quantityKey);
      localStorage.removeItem(variantKey);
      localStorage.removeItem(stockKey);
      localStorage.removeItem(tableFormKey);
      setCartItems([]);
      navigate(isPhoneOrder ? '/my-retailers' : '/visits/retailers');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen bg-background pb-20">
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
                <Button onClick={handleSubmitOrder} className="w-full h-9 text-sm" variant="default" disabled={!canSubmitOrder() || !paymentType}>
                  {getSubmitButtonText()}
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
            
            <div className="bg-white text-black p-8 rounded-lg space-y-4">
              {/* Title */}
              <div className="text-center">
                <h1 className="text-xl font-bold text-gray-900">Tax Invoice</h1>
              </div>

              {/* Company Header Box */}
              <div className="border-2 border-gray-900 p-4">
                <div className="flex items-start gap-4">
                  {companyData?.logo_url && (
                    <img src={companyData.logo_url} alt="Company Logo" className="w-24 h-16 object-contain" />
                  )}
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900">{companyData?.name || "BHARATH BEVERAGES"}</h2>
                    <div className="text-xs text-gray-700 space-y-0.5 mt-1">
                      {companyData?.address && <p>{companyData.address}</p>}
                      {companyData?.contact_phone && <p>Phone: {companyData.contact_phone}</p>}
                      {companyData?.email && <p>Email: {companyData.email}</p>}
                      {companyData?.gstin && <p>GSTIN: {companyData.gstin}</p>}
                      <p>State: {companyData?.state || "29-Karnataka"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To and Invoice Details */}
              <div className="grid grid-cols-2 gap-0">
                <div className="border-2 border-gray-900 border-r-0 p-3">
                  <h3 className="font-bold text-sm text-gray-900 mb-2">Bill To:</h3>
                  <div className="text-xs text-gray-700 space-y-1">
                    {retailerData?.name && <p className="font-semibold">{retailerData.name}</p>}
                    {retailerData?.address && <p>{retailerData.address}</p>}
                    {retailerData?.phone && <p>Contact: {retailerData.phone}</p>}
                    {retailerData?.gst_number && <p>GSTIN: {retailerData.gst_number}</p>}
                  </div>
                </div>
                <div className="border-2 border-gray-900 p-3">
                  <h3 className="font-bold text-sm text-gray-900 mb-2">Invoice Details:</h3>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>No: <span className="font-semibold">PENDING</span></p>
                    <p>Date: {visitDate ? format(new Date(visitDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}</p>
                    <p>Place Of Supply: Karnataka</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-2 border-gray-900 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white border-b-2 border-gray-900">
                      <th className="text-center p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">#</th>
                      <th className="text-left p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">Item Name</th>
                      <th className="text-center p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">HSN/SAC</th>
                      <th className="text-center p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">Qty</th>
                      <th className="text-center p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">Unit</th>
                      <th className="text-right p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">Rate (Rs)</th>
                      <th className="text-center p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">GST %</th>
                      <th className="text-right p-2 text-[10px] font-bold text-gray-900">Amount (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                     {(() => {
                      // Calculate totals exactly like PDF generator does
                      let previewSubTotal = 0;
                      
                      return cartItems.map((item, index) => {
                        const quantity = Number(item.quantity || 0);
                        const rate = Number(getDisplayRate(item));
                        const taxableAmount = quantity * rate;
                        previewSubTotal += taxableAmount;
                        const gstRate = 18; // Matches PDF
                        const gstAmount = (taxableAmount * gstRate) / 100;
                        const totalAmount = taxableAmount + gstAmount;

                        return (
                          <tr key={item.id} className="border-b border-gray-900">
                            <td className="text-center p-2 text-[10px] text-gray-900 border-r border-gray-900">{index + 1}</td>
                            <td className="text-left p-2 text-[10px] text-gray-900 border-r border-gray-900">{item.name}</td>
                            <td className="text-center p-2 text-[10px] text-gray-900 border-r border-gray-900">090230</td>
                            <td className="text-center p-2 text-[10px] text-gray-900 border-r border-gray-900">{quantity}</td>
                            <td className="text-center p-2 text-[10px] text-gray-900 border-r border-gray-900">{item.unit}</td>
                            <td className="text-right p-2 text-[10px] text-gray-900 border-r border-gray-900">Rs {rate.toFixed(2)}</td>
                            <td className="text-center p-2 text-[10px] text-gray-900 border-r border-gray-900">{gstRate}%</td>
                            <td className="text-right p-2 text-[10px] text-gray-900">Rs {totalAmount.toFixed(2)}</td>
                          </tr>
                        );
                      });
                    })()}
                    {(() => {
                      const totalQty = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                      const subTotal = cartItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(getDisplayRate(item))), 0);
                      const totalGst = (subTotal * 18) / 100;
                      const grandTotal = subTotal + totalGst;

                      return (
                        <tr className="border-b-2 border-gray-900 bg-gray-50">
                          <td className="p-2 border-r border-gray-900"></td>
                          <td className="text-left p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">Total</td>
                          <td className="p-2 border-r border-gray-900"></td>
                          <td className="text-center p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">
                            {totalQty}
                          </td>
                          <td className="p-2 border-r border-gray-900"></td>
                          <td className="p-2 border-r border-gray-900"></td>
                          <td className="text-center p-2 text-[10px] font-bold text-gray-900 border-r border-gray-900">
                            Rs {totalGst.toFixed(2)}
                          </td>
                          <td className="text-right p-2 text-[10px] font-bold text-gray-900">Rs {grandTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Tax Summary */}
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-2">Tax Summary:</h3>
                <div className="border-2 border-gray-900 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white border-b-2 border-gray-900">
                        <th className="text-center p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">HSN/SAC</th>
                        <th className="text-right p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">Taxable Amt (Rs)</th>
                        <th className="text-center p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">CGST Rate %</th>
                        <th className="text-right p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">CGST Amt (Rs)</th>
                        <th className="text-center p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">SGST Rate %</th>
                        <th className="text-right p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">SGST Amt (Rs)</th>
                        <th className="text-right p-2 text-[9px] font-bold text-gray-900">Total Tax (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const subTotal = cartItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(getDisplayRate(item))), 0);
                        const cgst = (subTotal * 9) / 100;
                        const sgst = (subTotal * 9) / 100;
                        const totalGst = (subTotal * 18) / 100;

                        return (
                          <>
                            <tr className="border-b border-gray-900">
                              <td className="text-center p-2 text-[9px] text-gray-900 border-r border-gray-900">090230</td>
                              <td className="text-right p-2 text-[9px] text-gray-900 border-r border-gray-900">{subTotal.toFixed(2)}</td>
                              <td className="text-center p-2 text-[9px] text-gray-900 border-r border-gray-900">9.0</td>
                              <td className="text-right p-2 text-[9px] text-gray-900 border-r border-gray-900">{cgst.toFixed(2)}</td>
                              <td className="text-center p-2 text-[9px] text-gray-900 border-r border-gray-900">9.0</td>
                              <td className="text-right p-2 text-[9px] text-gray-900 border-r border-gray-900">{sgst.toFixed(2)}</td>
                              <td className="text-right p-2 text-[9px] text-gray-900">{totalGst.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b-2 border-gray-900 bg-gray-50">
                              <td className="text-center p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">TOTAL</td>
                              <td className="text-right p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">{subTotal.toFixed(2)}</td>
                              <td className="p-2 border-r border-gray-900"></td>
                              <td className="text-right p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">{cgst.toFixed(2)}</td>
                              <td className="p-2 border-r border-gray-900"></td>
                              <td className="text-right p-2 text-[9px] font-bold text-gray-900 border-r border-gray-900">{sgst.toFixed(2)}</td>
                              <td className="text-right p-2 text-[9px] font-bold text-gray-900">{totalGst.toFixed(2)}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals on Right */}
              {(() => {
                const subTotal = cartItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(getDisplayRate(item))), 0);
                const grandTotal = subTotal + (subTotal * 18) / 100;

                return (
                  <>
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-900">Subtotal:</span>
                          <span className="text-gray-900">Rs {subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t pt-2">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900">Rs {grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount in Words */}
                    <div className="border-t pt-2">
                      <p className="text-xs font-bold text-gray-900">Invoice Amount in Words:</p>
                      <p className="text-xs text-gray-900 mt-1">
                        Rupees {Math.round(grandTotal)} Only
                      </p>
                    </div>
                  </>
                );
              })()}

              {/* Terms & Conditions */}
              <div className="border-2 border-gray-900 p-2">
                <h3 className="font-bold text-xs text-gray-900 mb-1">Terms & Conditions:</h3>
                <p className="text-[9px] text-gray-700">
                  {companyData?.terms_conditions || "Thanks for doing business with us!"}
                </p>
              </div>

              {/* Bank Details and Signature */}
              <div className="grid grid-cols-2 gap-0">
                <div className="border-2 border-gray-900 border-r-0 p-3">
                  <h3 className="font-bold text-xs text-gray-900 mb-2">Bank Details:</h3>
                  <div className="flex gap-3">
                    {companyData?.qr_code_url && (
                      <img src={companyData.qr_code_url} alt="QR Code" className="w-16 h-16 object-contain" />
                    )}
                    <div className="text-[9px] text-gray-700 space-y-1">
                      {companyData?.account_holder_name && <p>Account Name: {companyData.account_holder_name}</p>}
                      {companyData?.bank_name && <p>Bank: {companyData.bank_name}</p>}
                      {companyData?.bank_account && <p>A/C No: {companyData.bank_account}</p>}
                      {companyData?.ifsc && <p>IFSC: {companyData.ifsc}</p>}
                    </div>
                  </div>
                </div>
                <div className="border-2 border-gray-900 p-3 flex flex-col justify-between">
                  <h3 className="font-bold text-xs text-gray-900">For {companyData?.name || "BHARATH BEVERAGES"}:</h3>
                  <div className="mt-auto">
                    <div className="border-t border-gray-900 pt-1">
                      <p className="text-[9px] text-gray-700">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-xs text-gray-600 border-t pt-3">
                <p className="font-semibold">Thank you for your business!</p>
                <p className="text-[10px] mt-1">This is a preview. Final invoice will be generated after order submission.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};