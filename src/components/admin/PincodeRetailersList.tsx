import React from 'react';
import { Loader2 } from 'lucide-react';
import type { ExternalRetailer } from './PincodeMasterLookup';

interface Props {
  pincode: string;
  retailers: ExternalRetailer[];
  loading: boolean;
}

export const PincodeRetailersList: React.FC<Props> = ({ pincode, retailers, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 ml-4 mr-4 rounded-md bg-accent/30 border border-border">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-xs text-muted-foreground">Loading retailers for {pincode}…</span>
      </div>
    );
  }

  if (retailers.length === 0) {
    return (
      <div className="py-3 ml-4 mr-4 rounded-md bg-accent/30 border border-border text-center">
        <p className="text-xs text-muted-foreground">No retailers found for PIN {pincode}</p>
      </div>
    );
  }

  return (
    <div className="ml-4 mr-4 rounded-md bg-accent/30 border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-accent/50">
        <p className="text-xs font-medium text-foreground">
          {retailers.length} retailer{retailers.length !== 1 ? 's' : ''} found for PIN {pincode}
        </p>
      </div>
      <div className="max-h-60 overflow-y-auto divide-y divide-border">
        {retailers.map((r) => (
          <div key={r.id} className="px-3 py-2 text-xs space-y-0.5">
            <p className="font-medium text-foreground">{r.company_name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
              {r.address && <span>{r.address}</span>}
              <span>{r.city}</span>
              {r.mobile && <span>📞 {r.mobile}</span>}
              {r.category && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {r.category}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
