 import React, { useState, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { supabase } from '@/integrations/supabase/client';
 import { Loader2, MapPin } from 'lucide-react';
 
 interface PincodeData {
   pincode: string;
   territory_po: string | null;
 }
 
 export const PincodeMasterLookup: React.FC = () => {
   const [states, setStates] = useState<string[]>([]);
   const [districts, setDistricts] = useState<string[]>([]);
   const [pincodes, setPincodes] = useState<PincodeData[]>([]);
   
   const [selectedState, setSelectedState] = useState<string>('');
   const [selectedDistrict, setSelectedDistrict] = useState<string>('');
   
   const [loadingStates, setLoadingStates] = useState(true);
   const [loadingDistricts, setLoadingDistricts] = useState(false);
   const [loadingPincodes, setLoadingPincodes] = useState(false);
 
   // Fetch all distinct states on mount
   useEffect(() => {
     const fetchStates = async () => {
       setLoadingStates(true);
       const { data, error } = await supabase.rpc('get_distinct_states');
       
       if (!error && data) {
         setStates(data.map((d: { statename: string }) => d.statename));
       }
       setLoadingStates(false);
     };
     
     fetchStates();
   }, []);
 
   // Fetch districts when state changes
   useEffect(() => {
     if (!selectedState) {
       setDistricts([]);
       setSelectedDistrict('');
       setPincodes([]);
       return;
     }
     
     const fetchDistricts = async () => {
       setLoadingDistricts(true);
       setSelectedDistrict('');
       setPincodes([]);
       
       const { data, error } = await supabase.rpc('get_distinct_districts', {
         selected_state: selectedState
       });
       
       if (!error && data) {
         setDistricts(data.map((d: { district: string }) => d.district));
       }
       setLoadingDistricts(false);
     };
     
     fetchDistricts();
   }, [selectedState]);
 
   // Fetch pincodes when district changes
   useEffect(() => {
     if (!selectedState || !selectedDistrict) {
       setPincodes([]);
       return;
     }
     
     const fetchPincodes = async () => {
       setLoadingPincodes(true);
       
       const { data, error } = await supabase
         .from('pincode_master')
         .select('pincode, territory_po')
         .eq('statename', selectedState)
         .eq('district', selectedDistrict)
         .order('pincode');
       
       if (!error && data) {
         setPincodes(data);
       }
       setLoadingPincodes(false);
     };
     
     fetchPincodes();
   }, [selectedState, selectedDistrict]);
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <MapPin className="h-5 w-5" />
           Pincode Lookup
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* State Dropdown */}
         <div className="space-y-2">
           <label className="text-sm font-medium text-foreground">Select State</label>
           <Select value={selectedState} onValueChange={setSelectedState} disabled={loadingStates}>
             <SelectTrigger>
               <SelectValue placeholder={loadingStates ? "Loading states..." : "Select a state"} />
             </SelectTrigger>
             <SelectContent>
               {states.map((state) => (
                 <SelectItem key={state} value={state}>
                   {state}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         {/* District Dropdown */}
         <div className="space-y-2">
           <label className="text-sm font-medium text-foreground">Select District</label>
           <Select 
             value={selectedDistrict} 
             onValueChange={setSelectedDistrict} 
             disabled={!selectedState || loadingDistricts}
           >
             <SelectTrigger>
               <SelectValue placeholder={
                 loadingDistricts ? "Loading districts..." : 
                 !selectedState ? "Select a state first" : 
                 "Select a district"
               } />
             </SelectTrigger>
             <SelectContent>
               {districts.map((district) => (
                 <SelectItem key={district} value={district}>
                   {district}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         {/* Pincodes List */}
         {loadingPincodes && (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
         )}
 
         {!loadingPincodes && pincodes.length > 0 && (
           <div className="space-y-2">
             <div className="flex items-center justify-between text-sm font-medium text-muted-foreground border-b pb-2">
               <span>PIN Code</span>
               <span>Territory Name</span>
             </div>
             <div className="max-h-80 overflow-y-auto space-y-1">
               {pincodes.map((item, index) => (
                 <div 
                   key={`${item.pincode}-${index}`}
                   className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                 >
                   <span className="font-mono text-sm font-medium">{item.pincode}</span>
                   <span className="text-sm text-muted-foreground">{item.territory_po || '-'}</span>
                 </div>
               ))}
             </div>
             <p className="text-xs text-muted-foreground text-center pt-2">
               Showing {pincodes.length} result{pincodes.length !== 1 ? 's' : ''}
             </p>
           </div>
         )}
 
         {!loadingPincodes && selectedDistrict && pincodes.length === 0 && (
           <p className="text-sm text-muted-foreground text-center py-4">
             No pincodes found for this selection.
           </p>
         )}
       </CardContent>
     </Card>
   );
 };