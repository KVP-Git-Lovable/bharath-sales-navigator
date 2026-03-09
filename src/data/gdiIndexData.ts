export interface GDIDistrictData {
  healthIndex: number;
  educationIndex: number;
  standardOfLivingIndex: number;
  hdi: number;
}

// State -> District -> GDI data (all keys lowercase)
export const gdiIndexData: Record<string, Record<string, GDIDistrictData>> = {
  "andaman and nicobar": {
    "south andaman": { healthIndex: 0.812, educationIndex: 0.825, standardOfLivingIndex: 0.785, hdi: 0.807 },
    "north & middle andaman": { healthIndex: 0.765, educationIndex: 0.74, standardOfLivingIndex: 0.69, hdi: 0.731 },
    "north and middle andaman": { healthIndex: 0.765, educationIndex: 0.74, standardOfLivingIndex: 0.69, hdi: 0.731 },
    "nicobar": { healthIndex: 0.71, educationIndex: 0.685, standardOfLivingIndex: 0.62, hdi: 0.671 },
  },
  "andhra pradesh": {
    "visakhapatnam": { healthIndex: 0.785, educationIndex: 0.77, standardOfLivingIndex: 0.79, hdi: 0.782 },
    "krishna": { healthIndex: 0.795, educationIndex: 0.78, standardOfLivingIndex: 0.745, hdi: 0.773 },
    "guntur": { healthIndex: 0.77, educationIndex: 0.76, standardOfLivingIndex: 0.73, hdi: 0.753 },
    "ntr": { healthIndex: 0.79, educationIndex: 0.805, standardOfLivingIndex: 0.76, hdi: 0.785 },
    "ntr (vijayawada)": { healthIndex: 0.79, educationIndex: 0.805, standardOfLivingIndex: 0.76, hdi: 0.785 },
    "vijayawada": { healthIndex: 0.79, educationIndex: 0.805, standardOfLivingIndex: 0.76, hdi: 0.785 },
    "tirupati": { healthIndex: 0.765, educationIndex: 0.74, standardOfLivingIndex: 0.71, hdi: 0.738 },
    "east godavari": { healthIndex: 0.755, educationIndex: 0.71, standardOfLivingIndex: 0.69, hdi: 0.718 },
    "west godavari": { healthIndex: 0.75, educationIndex: 0.715, standardOfLivingIndex: 0.685, hdi: 0.716 },
    "spsr nellore": { healthIndex: 0.74, educationIndex: 0.705, standardOfLivingIndex: 0.7, hdi: 0.715 },
    "nellore": { healthIndex: 0.74, educationIndex: 0.705, standardOfLivingIndex: 0.7, hdi: 0.715 },
    "kurnool": { healthIndex: 0.69, educationIndex: 0.64, standardOfLivingIndex: 0.62, hdi: 0.649 },
    "anantapur": { healthIndex: 0.685, educationIndex: 0.635, standardOfLivingIndex: 0.615, hdi: 0.644 },
    "anantapuramu": { healthIndex: 0.685, educationIndex: 0.635, standardOfLivingIndex: 0.615, hdi: 0.644 },
    "ysr kadapa": { healthIndex: 0.705, educationIndex: 0.66, standardOfLivingIndex: 0.64, hdi: 0.668 },
    "kadapa": { healthIndex: 0.705, educationIndex: 0.66, standardOfLivingIndex: 0.64, hdi: 0.668 },
    "srikakulam": { healthIndex: 0.675, educationIndex: 0.62, standardOfLivingIndex: 0.59, hdi: 0.628 },
    "vizianagaram": { healthIndex: 0.665, educationIndex: 0.615, standardOfLivingIndex: 0.585, hdi: 0.621 },
    "alluri sitharama raju": { healthIndex: 0.58, educationIndex: 0.54, standardOfLivingIndex: 0.49, hdi: 0.535 },
    "alluri sitarama raju": { healthIndex: 0.58, educationIndex: 0.54, standardOfLivingIndex: 0.49, hdi: 0.535 },
  },
  "arunachal pradesh": {
    "papum pare": { healthIndex: 0.745, educationIndex: 0.76, standardOfLivingIndex: 0.715, hdi: 0.74 },
    "papum pare (itanagar)": { healthIndex: 0.745, educationIndex: 0.76, standardOfLivingIndex: 0.715, hdi: 0.74 },
    "itanagar": { healthIndex: 0.745, educationIndex: 0.76, standardOfLivingIndex: 0.715, hdi: 0.74 },
    "east siang": { healthIndex: 0.71, educationIndex: 0.695, standardOfLivingIndex: 0.66, hdi: 0.688 },
    "lower dibang valley": { healthIndex: 0.725, educationIndex: 0.67, standardOfLivingIndex: 0.65, hdi: 0.681 },
    "tawang": { healthIndex: 0.69, educationIndex: 0.64, standardOfLivingIndex: 0.675, hdi: 0.668 },
    "west kameng": { healthIndex: 0.685, educationIndex: 0.63, standardOfLivingIndex: 0.64, hdi: 0.651 },
    "lohit": { healthIndex: 0.66, educationIndex: 0.61, standardOfLivingIndex: 0.62, hdi: 0.63 },
    "changlang": { healthIndex: 0.645, educationIndex: 0.59, standardOfLivingIndex: 0.58, hdi: 0.604 },
    "upper siang": { healthIndex: 0.655, educationIndex: 0.605, standardOfLivingIndex: 0.575, hdi: 0.611 },
    "tirap": { healthIndex: 0.61, educationIndex: 0.55, standardOfLivingIndex: 0.53, hdi: 0.562 },
    "kurung kumey": { healthIndex: 0.54, educationIndex: 0.49, standardOfLivingIndex: 0.46, hdi: 0.496 },
    "longding": { healthIndex: 0.525, educationIndex: 0.47, standardOfLivingIndex: 0.44, hdi: 0.477 },
  },
  "chandigarh": {
    "chandigarh": { healthIndex: 0.825, educationIndex: 0.84, standardOfLivingIndex: 0.815, hdi: 0.827 },
  },
  "assam": {
    "kamrup metropolitan": { healthIndex: 0.775, educationIndex: 0.79, standardOfLivingIndex: 0.74, hdi: 0.768 },
    "kamrup metropolitan (guwahati)": { healthIndex: 0.775, educationIndex: 0.79, standardOfLivingIndex: 0.74, hdi: 0.768 },
    "kamrup": { healthIndex: 0.775, educationIndex: 0.79, standardOfLivingIndex: 0.74, hdi: 0.768 },
    "guwahati": { healthIndex: 0.775, educationIndex: 0.79, standardOfLivingIndex: 0.74, hdi: 0.768 },
    "jorhat": { healthIndex: 0.74, educationIndex: 0.725, standardOfLivingIndex: 0.695, hdi: 0.72 },
    "dibrugarh": { healthIndex: 0.735, educationIndex: 0.71, standardOfLivingIndex: 0.705, hdi: 0.716 },
    "sivasagar": { healthIndex: 0.745, educationIndex: 0.715, standardOfLivingIndex: 0.68, hdi: 0.713 },
    "sibsagar": { healthIndex: 0.745, educationIndex: 0.715, standardOfLivingIndex: 0.68, hdi: 0.713 },
    "nagaon": { healthIndex: 0.69, educationIndex: 0.64, standardOfLivingIndex: 0.615, hdi: 0.648 },
    "cachar": { healthIndex: 0.705, educationIndex: 0.655, standardOfLivingIndex: 0.62, hdi: 0.659 },
    "cachar (silchar)": { healthIndex: 0.705, educationIndex: 0.655, standardOfLivingIndex: 0.62, hdi: 0.659 },
    "silchar": { healthIndex: 0.705, educationIndex: 0.655, standardOfLivingIndex: 0.62, hdi: 0.659 },
    "karbi anglong": { healthIndex: 0.62, educationIndex: 0.58, standardOfLivingIndex: 0.55, hdi: 0.583 },
    "dhubri": { healthIndex: 0.595, educationIndex: 0.54, standardOfLivingIndex: 0.51, hdi: 0.547 },
    "baksa": { healthIndex: 0.615, educationIndex: 0.57, standardOfLivingIndex: 0.535, hdi: 0.572 },
  },
  "bihar": {
    "patna": { healthIndex: 0.715, educationIndex: 0.69, standardOfLivingIndex: 0.685, hdi: 0.697 },
    "munger": { healthIndex: 0.685, educationIndex: 0.62, standardOfLivingIndex: 0.61, hdi: 0.638 },
    "rohtas": { healthIndex: 0.69, educationIndex: 0.635, standardOfLivingIndex: 0.595, hdi: 0.639 },
    "gaya": { healthIndex: 0.67, educationIndex: 0.59, standardOfLivingIndex: 0.585, hdi: 0.614 },
    "bhagalpur": { healthIndex: 0.675, educationIndex: 0.605, standardOfLivingIndex: 0.59, hdi: 0.622 },
    "muzaffarpur": { healthIndex: 0.665, educationIndex: 0.585, standardOfLivingIndex: 0.57, hdi: 0.606 },
    "darbhanga": { healthIndex: 0.65, educationIndex: 0.57, standardOfLivingIndex: 0.56, hdi: 0.592 },
    "purnia": { healthIndex: 0.61, educationIndex: 0.515, standardOfLivingIndex: 0.495, hdi: 0.538 },
    "purnea": { healthIndex: 0.61, educationIndex: 0.515, standardOfLivingIndex: 0.495, hdi: 0.538 },
    "araria": { healthIndex: 0.595, educationIndex: 0.485, standardOfLivingIndex: 0.47, hdi: 0.514 },
    "kishanganj": { healthIndex: 0.58, educationIndex: 0.47, standardOfLivingIndex: 0.465, hdi: 0.502 },
  },
  "chhattisgarh": {
    "raipur": { healthIndex: 0.76, educationIndex: 0.745, standardOfLivingIndex: 0.72, hdi: 0.741 },
    "durg": { healthIndex: 0.765, educationIndex: 0.75, standardOfLivingIndex: 0.715, hdi: 0.743 },
    "bilaspur": { healthIndex: 0.73, educationIndex: 0.695, standardOfLivingIndex: 0.675, hdi: 0.7 },
    "dhamtari": { healthIndex: 0.74, educationIndex: 0.68, standardOfLivingIndex: 0.65, hdi: 0.689 },
    "korba": { healthIndex: 0.71, educationIndex: 0.645, standardOfLivingIndex: 0.69, hdi: 0.681 },
    "raigarh": { healthIndex: 0.705, educationIndex: 0.635, standardOfLivingIndex: 0.625, hdi: 0.654 },
    "bastar": { healthIndex: 0.61, educationIndex: 0.54, standardOfLivingIndex: 0.515, hdi: 0.554 },
    "bijapur": { healthIndex: 0.55, educationIndex: 0.475, standardOfLivingIndex: 0.43, hdi: 0.482 },
    "sukma": { healthIndex: 0.545, educationIndex: 0.465, standardOfLivingIndex: 0.42, hdi: 0.474 },
  },
};

/**
 * Look up GDI data for a given state and district.
 * State and district from the DB are typically uppercase; this function handles case normalization.
 */
export const getGDIData = (stateName: string, districtName: string): GDIDistrictData | null => {
  const stateKey = stateName.toLowerCase().trim();
  const districtKey = districtName.toLowerCase().trim();
  
  const stateData = gdiIndexData[stateKey];
  if (!stateData) return null;
  
  return stateData[districtKey] || null;
};
