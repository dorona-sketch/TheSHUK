
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ListingType, Condition, Language, ProductCategory, GradingCompany, SealedProductType, PokemonType, CardCategory, VariantTag, Listing, BreakPrize, OpenedProduct, Valuation, CardCandidate, CardTypeTag, CategoryTag } from '../types';
import { CardRecognitionService } from '../services/cardRecognitionService';
import { estimateOpenedProductValue } from '../services/valuationService';
import { getCardPrice } from '../services/tcgApiService';
import { useStore } from '../context/StoreContext';
import { TAG_DISPLAY_LABELS } from '../constants';
import { autoCropCard, performPerspectiveWarp } from '../utils/imageProcessing';
import { ImageCropper } from './ImageCropper';

interface AddListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (listingData: any) => void;
  initialData?: Listing | null;
}

const PRODUCT_TYPES = Object.values(SealedProductType);

type Step = 'UPLOAD' | 'PROCESSING' | 'REVIEW' | 'EDIT_DETAILS';

export const AddListingModal: React.FC<AddListingModalProps> = ({ isOpen, onClose, onAdd, initialData }) => {
  const { availableSets } = useStore();
  
  // State Machine
  const [currentStep, setCurrentStep] = useState<Step>('UPLOAD');
  const [processingStatus, setProcessingStatus] = useState('');

  // Image Data
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  // TEMP: Only used for Manual Crop logic, never persisted or shown in final form
  const [tempOriginalImage, setTempOriginalImage] = useState<string | null>(null);
  const [isManualCropping, setIsManualCropping] = useState(false);
  
  // The only image we persist
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  
  // AI Identification State
  const [candidates, setCandidates] = useState<CardCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CardCandidate | null>(null);

  // Form Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- NEW BREAK STATE ---
  const [openedProduct, setOpenedProduct] = useState<OpenedProduct>({
      type: SealedProductType.ETB,
      setId: '',
      setName: '',
      productName: '',
      quantity: 1,
      language: 'English',
      estimatedValue: 45
  });
  const [isProductNameManuallyEdited, setIsProductNameManuallyEdited] = useState(false);

  const [prizes, setPrizes] = useState<BreakPrize[]>([]);
  // Prize Entry State
  const [newPrize, setNewPrize] = useState<Partial<BreakPrize>>({ quantity: 1, howToWin: 'Random' });
  const [newPrizeImage, setNewPrizeImage] = useState<string | null>(null);
  const [newPrizeBase64, setNewPrizeBase64] = useState<string | null>(null);
  const [prizeIdentifying, setPrizeIdentifying] = useState(false);
  const [prizeCandidates, setPrizeCandidates] = useState<CardCandidate[]>([]);
  const prizeCameraInputRef = useRef<HTMLInputElement>(null);
  const prizeGalleryInputRef = useRef<HTMLInputElement>(null);
  
  // Break Content Images
  const [contentImages, setContentImages] = useState<string[]>([]);
  const contentInputRef = useRef<HTMLInputElement>(null);

  const [valuation, setValuation] = useState<Valuation>({
      currency: 'USD',
      totalEstimatedValue: 0,
      perSpotValue: 0,
      suggestedEntryPrice: 0,
      marginMode: 'PERCENT',
      marginValue: 20, // 20% margin default
      priceSource: 'MOCK_API'
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    reservePrice: '', // NEW: Reserve Price State
    type: ListingType.DIRECT_SALE,
    category: ProductCategory.RAW_CARD,
    pokemonName: '',
    pokemonType: PokemonType.COLORLESS,
    cardCategory: CardCategory.POKEMON,
    variantTags: [] as VariantTag[],
    
    // Identification Fields
    tcgCardId: '',
    collectorNumber: '',
    rarity: '',
    cardTypeTag: undefined as CardTypeTag | undefined,
    categoryTag: undefined as CategoryTag | undefined,

    condition: undefined as Condition | undefined, // MANDATORY NOW
    gradingCompany: GradingCompany.PSA,
    grade: '10',
    sealedProductType: SealedProductType.ETB,
    language: Language.ENGLISH,
    setName: '',
    setId: '',
    releaseYear: '',
    targetParticipants: '10',
    minPrizeDesc: '', 
    openDurationHours: 24,
    preferredLiveWindow: '',
    maxEntriesPerUser: 1,
  });

  const isLocked = useMemo(() => {
      return initialData && 
             initialData.type === ListingType.TIMED_BREAK && 
             (initialData.currentParticipants || 0) > 0;
  }, [initialData]);

  // Init / Reset logic
  useEffect(() => {
      if (isOpen) {
          if (initialData) {
              setFormData({
                  ...initialData as any,
                  price: initialData.price.toString(),
                  reservePrice: initialData.reservePrice?.toString() || '',
                  targetParticipants: initialData.targetParticipants?.toString() || '10',
                  grade: initialData.grade?.toString() || '10',
                  openDurationHours: initialData.openDurationHours || 24,
                  minPrizeDesc: initialData.minPrizeDesc || '',
                  preferredLiveWindow: initialData.preferredLiveWindow || '',
                  maxEntriesPerUser: initialData.maxEntriesPerUser || 1,
                  variantTags: initialData.variantTags || [],
                  // Ensure Identification fields exist
                  tcgCardId: initialData.tcgCardId || '',
                  collectorNumber: initialData.collectorNumber || '',
                  rarity: initialData.rarity || '',
                  cardTypeTag: initialData.cardTypeTag,
                  categoryTag: initialData.categoryTag,
              });
              setCroppedImage(initialData.imageUrl);
              setTempOriginalImage(null); // No access to original for edited listings
              setCurrentStep('EDIT_DETAILS');

              if (initialData.openedProduct) {
                  setOpenedProduct(initialData.openedProduct);
                  setIsProductNameManuallyEdited(true);
              }
              if (initialData.additionalPrizes) setPrizes(initialData.additionalPrizes);
              if (initialData.valuation) setValuation(initialData.valuation);
              if (initialData.breakContentImages) setContentImages(initialData.breakContentImages);
          } else {
              setCroppedImage(null);
              setTempOriginalImage(null);
              setCurrentStep('UPLOAD');
              setFormData(prev => ({ 
                  ...prev, 
                  type: ListingType.DIRECT_SALE, 
                  price: '', 
                  reservePrice: '',
                  title: '', 
                  description: '',
                  targetParticipants: '10',
                  openDurationHours: 24,
                  maxEntriesPerUser: 1,
                  minPrizeDesc: '',
                  preferredLiveWindow: '',
                  variantTags: [],
                  condition: undefined, // Reset to undefined to force selection
                  tcgCardId: '',
                  collectorNumber: '',
                  rarity: '',
                  cardTypeTag: undefined,
                  categoryTag: undefined
              }));
              setPrizes([]);
              setContentImages([]);
              setOpenedProduct({ type: SealedProductType.ETB, setId: '', setName: '', productName: '', quantity: 1, language: 'English', estimatedValue: 45 });
              setIsProductNameManuallyEdited(false);
              setErrors({});
          }
      }
  }, [isOpen, initialData]);

  // Recommendation Logic for Reserve Price
  const recommendedReserve = useMemo(() => {
      if (formData.type !== ListingType.AUCTION) return null;
      
      // 1. Determine Base Value
      // Use API estimate if available (more accurate), else use current user input price
      const baseValue = selectedCandidate?.priceEstimate || parseFloat(formData.price) || 0;
      
      if (baseValue <= 0) return null;

      // 2. Condition Multiplier
      // Damaged/Played cards generally have lower reserve thresholds relative to market
      let conditionMult = 1.0;
      switch (formData.condition) {
          case Condition.DAMAGED: conditionMult = 0.5; break;
          case Condition.PLAYED: conditionMult = 0.7; break;
          case Condition.EXCELLENT: conditionMult = 0.9; break;
          case Condition.NEAR_MINT: case Condition.MINT: default: conditionMult = 1.0; break;
      }

      // 3. Calculation: 70% of Risk-Adjusted Value
      return (baseValue * 0.7 * conditionMult).toFixed(2);
  }, [formData.type, formData.price, formData.condition, selectedCandidate]);

  const applyRecommendation = () => {
      if (recommendedReserve) {
          setFormData(prev => ({ ...prev, reservePrice: recommendedReserve }));
      }
  };

  // Auto-Update Product Name from Set/Type
  useEffect(() => {
      if (formData.type === ListingType.TIMED_BREAK && !isProductNameManuallyEdited) {
          const setName = availableSets.find(s => s.id === openedProduct.setId)?.name || '';
          if (setName && openedProduct.type) {
              setOpenedProduct(prev => ({ ...prev, productName: `${setName} ${openedProduct.type}`, setName }));
          }
      }
  }, [openedProduct.setId, openedProduct.type, isProductNameManuallyEdited, formData.type, availableSets]);

  // Auto-Valuation Logic
  useEffect(() => {
      if (formData.type !== ListingType.TIMED_BREAK) return;

      const productEst = estimateOpenedProductValue(openedProduct.type, openedProduct.setId, openedProduct.quantity);
      const prizesEst = prizes.reduce((sum, p) => sum + (p.estimatedValue || 0) * (p.quantity || 1), 0);
      const totalVal = productEst + prizesEst;
      const spots = Math.max(1, parseInt(formData.targetParticipants) || 1);
      const perSpot = totalVal / spots;
      const marginMultiplier = 1 + (valuation.marginValue / 100);
      const suggested = perSpot * marginMultiplier;

      setValuation(prev => ({
          ...prev,
          totalEstimatedValue: totalVal,
          perSpotValue: perSpot,
          suggestedEntryPrice: suggested
      }));
      setOpenedProduct(prev => ({ ...prev, estimatedValue: productEst }));

  }, [openedProduct.type, openedProduct.setId, openedProduct.quantity, prizes, formData.targetParticipants, valuation.marginValue, formData.type]);

  // --- HANDLERS ---

  const handleTypeChange = (newType: ListingType) => {
      setFormData(prev => ({ ...prev, type: newType }));
      
      if (newType === ListingType.TIMED_BREAK) {
          setCurrentStep('EDIT_DETAILS');
      } else {
          // If switching back from Break to Sales, show upload screen if we are not already editing a sale
          // For simplicity in this flow, reset to UPLOAD to encourage scanning for singles/slabs
          if (formData.type === ListingType.TIMED_BREAK) {
              setCurrentStep('UPLOAD');
          }
      }
  };

  const shouldAutoApplyCandidate = (results: CardCandidate[]) => {
      if (results.length === 0) return false;
      if (results.length === 1) return true;
      const [first, second] = results;
      const top = first.confidence || 0;
      const gap = top - (second?.confidence || 0);
      return top >= 0.82 || (top >= 0.72 && gap >= 0.08);
  };

  const processUploadedImage = async (file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
          const rawBase64 = (reader.result as string).split(',')[1];
          const mime = (reader.result as string).split(';')[0].split(':')[1];
          const fullDataUrl = reader.result as string;
          
          setTempOriginalImage(fullDataUrl); // Store temporarily for Manual Crop Fallback
          
          if (formData.type !== ListingType.TIMED_BREAK) {
              setCurrentStep('PROCESSING');
              
              try {
                  // 1. Auto Crop
                  setProcessingStatus('Auto-cropping card...');
                  const croppedBase64 = await autoCropCard(rawBase64);
                  
                  if (!croppedBase64) {
                      // Fallback to manual if auto-crop fails
                      console.log("Auto-crop failed, triggering manual crop");
                      setIsManualCropping(true);
                      setProcessingStatus('');
                      return; // Halt pipeline here, waiting for manual crop
                  }

                  const croppedUrl = `data:${mime};base64,${croppedBase64}`;
                  setCroppedImage(croppedUrl);

                  // 2. Identify
                  setProcessingStatus('Identifying card...');
                  // We pass the already cropped base64 to recognition
                  const res = await CardRecognitionService.identify(croppedBase64, mime);
                  
                  if (res.candidates.length > 0) {
                      setCandidates(res.candidates);
                      if (shouldAutoApplyCandidate(res.candidates)) {
                          applyCandidate(res.candidates[0]);
                          setCurrentStep('EDIT_DETAILS');
                      } else {
                          setCurrentStep('REVIEW');
                      }
                  } else {
                      // Fallback to manual entry
                      setCurrentStep('EDIT_DETAILS');
                  }
              } catch (e) {
                  console.error("Pipeline failed", e);
                  setCroppedImage(fullDataUrl); // Fallback to raw if crashes
                  setCurrentStep('EDIT_DETAILS');
              }
          } else {
              setCroppedImage(fullDataUrl);
              setCurrentStep('EDIT_DETAILS');
          }
      };
      reader.readAsDataURL(file);
  };

  const handleManualCropComplete = async (points: {x: number, y: number}[]) => {
      if (!tempOriginalImage) return;
      setIsManualCropping(false);
      setProcessingStatus('Processing Crop...');
      
      try {
          const rawBase64 = tempOriginalImage.split(',')[1];
          const croppedBase64 = await performPerspectiveWarp(rawBase64, points);
          setCroppedImage(`data:image/jpeg;base64,${croppedBase64}`);
          
          // Resume Identification Pipeline
          setProcessingStatus('Identifying card...');
          const res = await CardRecognitionService.identify(croppedBase64, 'image/jpeg');
          
          if (res.candidates.length > 0) {
              setCandidates(res.candidates);
              if (shouldAutoApplyCandidate(res.candidates)) {
                  applyCandidate(res.candidates[0]);
                  setCurrentStep('EDIT_DETAILS');
              } else {
                  setCurrentStep('REVIEW');
              }
          } else {
              setCurrentStep('EDIT_DETAILS');
          }
      } catch (e) {
          console.error("Manual crop pipeline error", e);
          setCurrentStep('EDIT_DETAILS');
      }
  };

  const applyCandidate = (c: CardCandidate) => {
      setFormData(prev => ({
          ...prev,
          title: c.cardName + (c.variant ? ` (${c.variant})` : ''),
          pokemonName: c.pokemonName,
          setName: c.setName,
          setId: c.setId || '',
          collectorNumber: c.number || '',
          rarity: c.rarity,
          cardTypeTag: c.cardTypeTag,
          categoryTag: c.categoryTag,
          releaseYear: c.releaseYear,
          cardCategory: (c.cardCategory as CardCategory) || CardCategory.POKEMON,
          variantTags: (c.variantTags as VariantTag[]) || [],
          price: c.priceEstimate ? c.priceEstimate.toString() : prev.price,
          tcgCardId: c.id || ''
      }));
      setSelectedCandidate(c);
  };

  const handleStandardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processUploadedImage(file);
  };

  // --- Prize Logic ---
  const handlePrizeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setNewPrizeImage(result); 
              setNewPrizeBase64(result.split(',')[1]);
              
              // Auto-trigger recognition if image added
              if (result) {
                  triggerPrizeIdentify(result.split(',')[1]);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerPrizeIdentify = async (base64: string) => {
      setPrizeIdentifying(true);
      setPrizeCandidates([]);
      try {
          // Use auto-crop for prizes too? Yes, usually cards.
          const cropped = await autoCropCard(base64);
          // If auto crop fails for prize, we default to full image (processedBase64 handling in service)
          const target = cropped || base64; 
          
          const res = await CardRecognitionService.identify(target, 'image/jpeg');
          if (res.candidates.length === 0) {
              console.log("No prize match found");
          } else if (res.candidates.length === 1) {
              await selectPrizeCandidate(res.candidates[0]);
          } else {
              setPrizeCandidates(res.candidates);
          }
      } catch (e) { 
          console.error("Prize scan error", e); 
      } finally { 
          setPrizeIdentifying(false); 
      }
  };

  const handleIdentifyPrize = async () => {
      if (!newPrizeBase64) return;
      triggerPrizeIdentify(newPrizeBase64);
  };

  const selectPrizeCandidate = async (match: CardCandidate) => {
      setPrizeCandidates([]);
      const price = match.priceEstimate || (await getCardPrice(match.id || '', match.variant))?.market || 0;
      setNewPrize(prev => ({
          ...prev,
          title: match.cardName + (match.variant ? ` (${match.variant})` : ''),
          description: `${match.setName} - ${match.rarity}`,
          estimatedValue: price,
          detectedCardId: match.id,
          detectedPrice: price
      }));
  };

  const handleAddPrize = () => {
      if (!newPrize.title) return alert("Prize Title required");
      setPrizes([...prizes, {
          id: `p_${Date.now()}`,
          title: newPrize.title!,
          description: newPrize.description,
          quantity: newPrize.quantity || 1,
          howToWin: newPrize.howToWin,
          imageUrl: newPrizeImage || undefined,
          estimatedValue: newPrize.estimatedValue || 0,
          detectedCardId: newPrize.detectedCardId,
          detectedPrice: newPrize.detectedPrice
      }]);
      setNewPrize({ quantity: 1, howToWin: 'Random', title: '', estimatedValue: 0 });
      setNewPrizeImage(null);
      setNewPrizeBase64(null);
      setPrizeCandidates([]);
  };

  const handleContentImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          Array.from(e.target.files).forEach((file: File) => {
              const reader = new FileReader();
              reader.onloadend = () => setContentImages(prev => [...prev, reader.result as string]);
              reader.readAsDataURL(file);
          });
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      const newErrors: Record<string, string> = {};

      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) newErrors.price = "Enter a valid price (> 0)";
      if (formData.type === ListingType.AUCTION && !isNaN(price) && price < 25) newErrors.price = "Opening bid should be at least $25";
      if (formData.type === ListingType.TIMED_BREAK && !isNaN(price) && price < 50) newErrors.price = "Break entry should be at least $50";

      if (formData.type !== ListingType.TIMED_BREAK && !formData.condition && formData.category === ProductCategory.RAW_CARD) {
          newErrors.condition = "Condition is required";
      }

      if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
      }

      const spots = parseInt(formData.targetParticipants);
      if (formData.type === ListingType.TIMED_BREAK && (isNaN(spots) || spots < 2)) return alert("Total Spots must be at least 2.");

      if (formData.type === ListingType.TIMED_BREAK) {
          if (!openedProduct.type) return alert("Product Type is required.");
          if (!openedProduct.setId) return alert("Set / Expansion is required.");
          if (!openedProduct.productName) return alert("Product Name is required.");
          if ((openedProduct.quantity || 0) < 1) return alert("Quantity must be at least 1.");
          if (!formData.minPrizeDesc) return alert("Please specify the 'Guaranteed Prize'.");
          if (!formData.preferredLiveWindow) return alert("Please specify 'Planned Live Window'.");
          if (!formData.openDurationHours) return alert("Please specify 'Break Duration'.");
      }

      const payload: any = {
          ...formData,
          price,
          reservePrice: formData.reservePrice ? parseFloat(formData.reservePrice) : undefined,
          targetParticipants: spots,
          openDurationHours: parseInt(formData.openDurationHours as any),
          maxEntriesPerUser: Math.max(1, parseInt(formData.maxEntriesPerUser as any)),
          imageUrl: croppedImage || 'https://via.placeholder.com/400',
          // NO originalImageUrl here
          openedProduct: formData.type === ListingType.TIMED_BREAK ? openedProduct : undefined,
          additionalPrizes: formData.type === ListingType.TIMED_BREAK ? prizes : undefined,
          valuation: formData.type === ListingType.TIMED_BREAK ? valuation : undefined,
          breakContentImages: contentImages,
          boosterName: openedProduct.productName,
          title: formData.type === ListingType.TIMED_BREAK ? openedProduct.productName : formData.title, // Use product name for breaks if title empty
          description: formData.type === ListingType.TIMED_BREAK ? `Join our ${openedProduct.productName} break! Guaranteed: ${formData.minPrizeDesc}. Live: ${formData.preferredLiveWindow}` : formData.description
      };

      if (formData.type === ListingType.TIMED_BREAK && !initialData) {
          const now = new Date();
          payload.opensAt = now;
          payload.closesAt = new Date(now.getTime() + (payload.openDurationHours || 24) * 3600000);
      }

      onAdd(payload);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    {isManualCropping && tempOriginalImage && (
        <ImageCropper 
            imageSrc={tempOriginalImage} 
            onComplete={handleManualCropComplete} 
            onCancel={() => { setIsManualCropping(false); setCurrentStep('EDIT_DETAILS'); setCroppedImage(tempOriginalImage); }} 
        />
    )}
    
    <div className="fixed inset-0 z-50 overflow-y-auto safe-area-pt safe-area-px" role="dialog">
      <div className="flex items-start justify-center min-h-screen px-4 pt-3 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all mt-2 sm:my-8 sm:max-w-4xl sm:w-full p-6 animate-fade-in-up min-h-[600px] flex flex-col">
            <h3 className="text-xl font-bold mb-6 text-gray-900">{initialData ? 'Edit Listing' : 'Create New Listing'}</h3>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                {!initialData && currentStep !== 'PROCESSING' && (
                    <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg mb-6">
                        {[ListingType.DIRECT_SALE, ListingType.AUCTION, ListingType.TIMED_BREAK].map(t => (
                            <button type="button" key={t} onClick={() => handleTypeChange(t)} 
                                className={`py-2 text-sm font-bold rounded-md transition-all ${formData.type === t ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                {t === ListingType.TIMED_BREAK ? 'Timed Break' : t === ListingType.AUCTION ? 'Auction' : 'Buy Now'}
                            </button>
                        ))}
                    </div>
                )}

                {/* --- STEP 1: UPLOAD (Only for Singles/Auctions) --- */}
                {currentStep === 'UPLOAD' && formData.type !== ListingType.TIMED_BREAK && (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors p-10" onClick={() => cameraInputRef.current?.click()}>
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">Upload Card Photo</h4>
                        <p className="text-sm text-gray-500 mb-4 text-center max-w-xs">We'll automatically crop and perspective-correct your card image.</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }} className="px-5 py-2 bg-gray-900 text-white font-bold rounded-full text-sm">Use Camera</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click(); }} className="px-5 py-2 bg-white border border-gray-300 text-gray-800 font-bold rounded-full text-sm">From Gallery</button>
                        </div>
                        <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleStandardFileChange} />
                        <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleStandardFileChange} />
                    </div>
                )}

                {/* --- STEP 2: PROCESSING --- */}
                {currentStep === 'PROCESSING' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <div className="text-center">
                            <h4 className="font-bold text-gray-900 text-lg">{processingStatus}</h4>
                            <p className="text-sm text-gray-500">Optimizing image & reading text...</p>
                        </div>
                    </div>
                )}

                {/* --- STEP 3: REVIEW CANDIDATES --- */}
                {currentStep === 'REVIEW' && (
                    <div className="flex-1 overflow-y-auto">
                        <h4 className="font-bold text-gray-900 mb-2">Select the correct match</h4>
                        <p className="text-sm text-gray-500 mb-4">We found multiple possibilities. Which one is your card?</p>
                        
                        <div className="grid grid-cols-1 gap-2">
                            {candidates.map((c, i) => (
                                <div key={i} onClick={() => { applyCandidate(c); setCurrentStep('EDIT_DETAILS'); }} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors relative">
                                    {c.isChase && (
                                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 flex items-center gap-1">
                                            <span className="text-xs">🔥</span> CHASE
                                        </div>
                                    )}
                                    <img src={c.imageUrl} className="w-12 h-16 object-contain bg-gray-100 rounded" />
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{c.cardName}</div>
                                        <div className="text-xs text-gray-500">{c.setName} • {c.number} • {c.rarity}</div>
                                        <div className="flex gap-2 mt-1">
                                            {c.variant && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">{c.variant}</span>}
                                            {c.priceEstimate && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">${c.priceEstimate}</span>}
                                        </div>
                                    </div>
                                    <div className="text-blue-600">Select &rarr;</div>
                                </div>
                            ))}
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setCurrentStep('EDIT_DETAILS')} 
                            className="mt-6 w-full py-3 text-sm text-gray-500 font-medium hover:text-gray-900"
                        >
                            None of these match (Enter Manually)
                        </button>
                    </div>
                )}

                {/* --- STEP 4: EDIT FORM --- */}
                {currentStep === 'EDIT_DETAILS' && (
                    <div className="flex-1 overflow-y-auto pr-2">
                        {formData.type !== ListingType.TIMED_BREAK && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Image Column */}
                                <div className="space-y-4">
                                    <div 
                                        className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative border border-gray-200 group cursor-pointer"
                                        onClick={() => cameraInputRef.current?.click()}
                                    >
                                        <img src={croppedImage || ''} className="w-full h-full object-contain" />
                                        
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">Change Image</span>
                                        </div>

                                        {/* Crop Actions (Only if we have original) */}
                                        <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            {tempOriginalImage && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsManualCropping(true)}
                                                    className="bg-black/70 hover:bg-black text-white text-xs px-2 py-1 rounded backdrop-blur-sm"
                                                >
                                                    Adjust Crop
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleStandardFileChange} />
                                    <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleStandardFileChange} />
                                    <div className="flex items-center justify-center gap-2">
                                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="text-xs px-2 py-1 rounded bg-gray-900 text-white">Camera</button>
                                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700">Gallery</button>
                                    </div>
                                    <div className="text-xs text-gray-400 text-center">
                                        Click image to replace.
                                    </div>
                                </div>

                                {/* Fields Column */}
                                <div className="md:col-span-2 space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Card Name</label>
                                            <input className="w-full bg-white border-blue-200 border p-2 rounded text-sm font-bold text-gray-900" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Set</label>
                                            <input className="w-full bg-white border-blue-200 border p-2 rounded text-xs" value={formData.setName} onChange={e => setFormData({...formData, setName: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Number</label>
                                            <input className="w-full bg-white border-blue-200 border p-2 rounded text-xs" value={formData.collectorNumber} onChange={e => setFormData({...formData, collectorNumber: e.target.value})} placeholder="e.g. 058/102" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Rarity</label>
                                            <input className="w-full bg-white border-blue-200 border p-2 rounded text-xs" value={formData.rarity} onChange={e => setFormData({...formData, rarity: e.target.value})} />
                                        </div>
                                        <div className="flex gap-2 items-end">
                                            {formData.cardTypeTag && <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-bold">{formData.cardTypeTag}</span>}
                                            {formData.categoryTag && <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs font-bold">{formData.categoryTag}</span>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                                                {formData.type === ListingType.AUCTION ? 'Start Price' : 'Price'} <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                                                <input className={`w-full border p-2.5 pl-6 rounded-lg text-sm font-bold ${errors.price ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} min="0.01" step="0.01" />
                                            </div>
                                            {errors.price && <span className="text-[10px] text-red-500 font-bold">{errors.price}</span>}
                                        </div>
                                        
                                        {formData.type === ListingType.AUCTION ? (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Reserve Price (Optional)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                                                    <input 
                                                        className="w-full border-gray-300 border p-2.5 pl-6 rounded-lg text-sm font-bold focus:ring-primary-500" 
                                                        type="number" 
                                                        value={formData.reservePrice} 
                                                        onChange={e => setFormData({...formData, reservePrice: e.target.value})} 
                                                        min="0.01" 
                                                        step="0.01" 
                                                        placeholder="No Reserve"
                                                    />
                                                </div>
                                                {recommendedReserve && (
                                                    <div className="mt-1 flex items-center justify-between">
                                                        <span className="text-[10px] text-gray-500">Rec: ${recommendedReserve} (70% Val)</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={applyRecommendation}
                                                            className="text-[10px] text-blue-600 font-bold hover:underline"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Condition <span className="text-red-500">*</span></label>
                                                <select 
                                                    className={`w-full border p-2.5 rounded-lg text-sm ${errors.condition ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'}`}
                                                    value={formData.condition || ''}
                                                    onChange={e => {
                                                        setFormData({...formData, condition: e.target.value as Condition});
                                                        setErrors({...errors, condition: ''});
                                                    }}
                                                >
                                                    <option value="" disabled>Select Condition</option>
                                                    {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                {errors.condition && <span className="text-[10px] text-red-500 font-bold block mt-1">Required for listing</span>}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Auction Condition moved if Auction type selected */}
                                    {formData.type === ListingType.AUCTION && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Condition <span className="text-red-500">*</span></label>
                                            <select 
                                                className={`w-full border p-2.5 rounded-lg text-sm ${errors.condition ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'}`}
                                                value={formData.condition || ''}
                                                onChange={e => {
                                                    setFormData({...formData, condition: e.target.value as Condition});
                                                    setErrors({...errors, condition: ''});
                                                }}
                                            >
                                                <option value="" disabled>Select Condition</option>
                                                {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            {errors.condition && <span className="text-[10px] text-red-500 font-bold block mt-1">Required for listing</span>}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Description</label>
                                        <textarea className="w-full border-gray-300 border p-2.5 rounded-lg text-sm focus:ring-primary-500 outline-none" rows={4} placeholder="Any specific flaws? Swirls? Print lines?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.values(VariantTag).map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => {
                                                        const tags = formData.variantTags.includes(tag)
                                                            ? formData.variantTags.filter(t => t !== tag)
                                                            : [...formData.variantTags, tag];
                                                        setFormData({...formData, variantTags: tags});
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                                        formData.variantTags.includes(tag)
                                                        ? 'bg-primary-100 border-primary-300 text-primary-800'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {TAG_DISPLAY_LABELS[tag] || tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.type === ListingType.TIMED_BREAK && (
                            <div className="space-y-8">
                                <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                                    <h4 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-xs">1</span>
                                        What are you opening?
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-purple-800 mb-1">Cover Image <span className="text-red-500">*</span></label>
                                            <div className="aspect-[4/3] bg-white border-2 border-dashed border-purple-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-colors relative overflow-hidden" onClick={() => cameraInputRef.current?.click()}>
                                                {croppedImage ? <img src={croppedImage} className="w-full h-full object-cover" /> : (
                                                    <>
                                                        <span className="text-2xl text-purple-300 mb-1">+</span>
                                                        <span className="text-xs text-purple-400 font-medium">Add Photo</span>
                                                    </>
                                                )}
                                                <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleStandardFileChange} required />
                                                <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleStandardFileChange} />
                                                <div className="absolute bottom-2 left-2 right-2 flex gap-2 justify-center">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }} className="text-[10px] px-2 py-1 rounded bg-purple-700 text-white">Camera</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click(); }} className="text-[10px] px-2 py-1 rounded bg-white border border-purple-200 text-purple-700">Gallery</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-purple-800 mb-1">Product Type <span className="text-red-500">*</span></label>
                                                <select className="w-full border-purple-200 border p-2.5 rounded-lg text-sm focus:ring-purple-500" value={openedProduct.type} disabled={!!isLocked} onChange={e => setOpenedProduct({...openedProduct, type: e.target.value as any})} required>
                                                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-purple-800 mb-1">Set / Expansion <span className="text-red-500">*</span></label>
                                                <select className="w-full border-purple-200 border p-2.5 rounded-lg text-sm focus:ring-purple-500" value={openedProduct.setId} disabled={!!isLocked} onChange={e => setOpenedProduct({...openedProduct, setId: e.target.value})} required>
                                                    <option value="">Select Set...</option>
                                                    {availableSets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-purple-800 mb-1">Product Name <span className="text-red-500">*</span></label>
                                                <input className="w-full border-purple-200 border p-2.5 rounded-lg text-sm focus:ring-purple-500" placeholder="e.g. 151 Booster Bundle" value={openedProduct.productName} disabled={!!isLocked} onChange={e => { setOpenedProduct({...openedProduct, productName: e.target.value}); setIsProductNameManuallyEdited(true); }} required />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-purple-800 mb-1">Quantity <span className="text-red-500">*</span></label>
                                                <input type="number" min="1" className="w-full border-purple-200 border p-2.5 rounded-lg text-sm focus:ring-purple-500" value={openedProduct.quantity} disabled={!!isLocked} onChange={e => setOpenedProduct({...openedProduct, quantity: Math.max(1, parseInt(e.target.value) || 1)})} required />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <label className="block text-xs font-bold text-purple-800 mb-1">Break Duration <span className="text-red-500">*</span></label>
                                                <div className="rounded-lg border border-purple-200 bg-white px-3 py-2.5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[11px] text-purple-700 font-medium">How long entries stay open</span>
                                                        <span className="text-sm font-extrabold text-purple-900">{formData.openDurationHours}h</span>
                                                    </div>
                                                    <input type="range" min="1" max="24" className="w-full accent-purple-600" value={formData.openDurationHours} onChange={e => setFormData({...formData, openDurationHours: parseInt(e.target.value)})} />
                                                    <div className="mt-2 flex justify-between text-[10px] text-purple-500"><span>1h</span><span>12h</span><span>24h</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center text-xs">2</span>
                                        Rules & Schedule
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Guaranteed Prize (Minimum) <span className="text-red-500">*</span></label>
                                            <input className="w-full border-gray-300 border p-2.5 rounded-lg text-sm" placeholder="e.g. 1 Pack per spot" value={formData.minPrizeDesc} onChange={e => setFormData({...formData, minPrizeDesc: e.target.value})} required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Planned Live Window <span className="text-red-500">*</span></label>
                                            <input className="w-full border-gray-300 border p-2.5 rounded-lg text-sm" placeholder="e.g. Tonight 8PM EST" value={formData.preferredLiveWindow} onChange={e => setFormData({...formData, preferredLiveWindow: e.target.value})} required />
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 pt-4">
                                        <label className="block text-xs font-bold text-gray-700 mb-3">Additional Prizes / Chasers (Optional)</label>
                                        {prizes.map(p => (
                                            <div key={p.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2 relative group items-center">
                                                <div className="w-10 h-10 bg-white rounded border border-gray-200 overflow-hidden shrink-0">
                                                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">?</div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-bold text-gray-900 truncate">{p.title}</span>
                                                        <span className="text-xs text-green-600 font-bold">${p.estimatedValue}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">{p.howToWin} • Qty: {p.quantity}</div>
                                                </div>
                                                <button onClick={() => setPrizes(prizes.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-red-500 p-1">×</button>
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-3 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 border-dashed relative">
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors shrink-0 bg-white overflow-hidden relative" onClick={() => prizeCameraInputRef.current?.click()}>
                                                    {newPrizeImage ? <img src={newPrizeImage} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 text-center">+Img</span>}
                                                    <input ref={prizeCameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handlePrizeFile} />
                                                    <input ref={prizeGalleryInputRef} type="file" className="hidden" accept="image/*" onChange={handlePrizeFile} />
                                                    <div className="absolute bottom-0 left-0 right-0 flex">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); prizeCameraInputRef.current?.click(); }} className="text-[9px] w-1/2 bg-black/60 text-white">Cam</button>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); prizeGalleryInputRef.current?.click(); }} className="text-[9px] w-1/2 bg-white/90 text-gray-700">Gal</button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex gap-2">
                                                        <input className="flex-1 border-gray-300 border rounded p-2 text-sm" placeholder="Prize Name" value={newPrize.title || ''} onChange={e => setNewPrize({...newPrize, title: e.target.value})} />
                                                        {newPrizeBase64 && (
                                                            <button type="button" onClick={handleIdentifyPrize} disabled={prizeIdentifying} className="px-3 bg-blue-100 text-blue-700 text-xs font-bold rounded hover:bg-blue-200 transition-colors whitespace-nowrap">{prizeIdentifying ? 'Scanning...' : 'Scan Card'}</button>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input type="number" className="w-full border-gray-300 border rounded p-2 pl-5 text-sm" placeholder="Value" value={newPrize.estimatedValue || ''} onChange={e => setNewPrize({...newPrize, estimatedValue: parseFloat(e.target.value)})} />
                                                        <button type="button" onClick={handleAddPrize} className="bg-gray-900 text-white px-4 rounded text-xs font-bold hover:bg-black transition-colors">Add</button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Prize Candidate Selection UI */}
                                            {prizeCandidates.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-20 mt-1 max-h-60 overflow-y-auto">
                                                    <div className="p-2 text-xs font-bold text-gray-500 bg-gray-50 sticky top-0 flex justify-between items-center">
                                                        <span>Select Match:</span>
                                                        <button onClick={() => setPrizeCandidates([])} className="text-gray-400 hover:text-gray-600">×</button>
                                                    </div>
                                                    {prizeCandidates.map((c, i) => (
                                                        <div key={i} onClick={() => selectPrizeCandidate(c)} className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors">
                                                            <img src={c.imageUrl} className="w-8 h-10 object-contain bg-gray-100 rounded border border-gray-200" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-xs truncate text-gray-900">{c.cardName}</div>
                                                                <div className="text-[10px] text-gray-500">{c.setName} • {c.number}</div>
                                                            </div>
                                                            {c.priceEstimate && <div className="text-xs font-bold text-green-600">${c.priceEstimate}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                                    <h4 className="text-sm font-bold text-green-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs">3</span>
                                        Value Summary & Profit
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-green-800 mb-1">Total Spots <span className="text-red-500">*</span></label>
                                                <input type="number" min="2" className="w-full border-green-200 border p-2.5 rounded-lg text-sm focus:ring-green-500" value={formData.targetParticipants} disabled={!!isLocked} onChange={e => setFormData({...formData, targetParticipants: e.target.value})} required />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-green-800 mb-1">Max Entries / User</label>
                                                <input type="number" min="1" className="w-full border-green-200 border p-2.5 rounded-lg text-sm focus:ring-green-500" value={formData.maxEntriesPerUser} onChange={e => setFormData({...formData, maxEntriesPerUser: Math.max(1, parseInt(e.target.value) || 1)})} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center gap-4">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-bold text-green-800 mb-1">Final Entry Price <span className="text-red-500">*</span></label>
                                                <input type="number" className="w-full border-green-200 border p-2.5 rounded-lg text-sm font-bold text-green-900 focus:ring-green-500" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required min="50" step="1" />
                                                <p className="text-[10px] text-green-700 mt-1">Recommended floor: $50 per spot for better break value perception.</p>
                                                <div className="mt-2 flex items-center justify-between bg-white/70 border border-green-200 rounded px-2 py-1">
                                                    <span className="text-[10px] text-green-800">Suggested by valuation:</span>
                                                    <button type="button" onClick={() => setFormData({...formData, price: Math.max(50, Math.round(valuation.suggestedEntryPrice || 0)).toString()})} className="text-[10px] font-bold text-green-700 hover:text-green-900">Use ${Math.max(50, Math.round(valuation.suggestedEntryPrice || 0))}</button>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white/60 p-3 rounded-lg border border-green-100 text-xs space-y-1">
                                                <div className="flex justify-between text-green-800">
                                                    <span>Total Est. Value:</span>
                                                    <span className="font-bold">${valuation.totalEstimatedValue.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-green-800">
                                                    <span>Cost per Spot:</span>
                                                    <span>${valuation.perSpotValue.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-green-800 border-t border-green-200 pt-1 mt-1">
                                                    <span className="font-bold">Projected Revenue:</span>
                                                    <span className="font-bold">${(parseFloat(formData.price || '0') * (parseInt(formData.targetParticipants) || 1)).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-gray-100 mt-4">
                    <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    {currentStep === 'EDIT_DETAILS' && (
                        <button 
                            type="submit" 
                            disabled={!formData.price || (formData.type !== ListingType.TIMED_BREAK && !formData.condition)}
                            className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {initialData ? 'Update Listing' : 'Publish Listing'}
                        </button>
                    )}
                </div>
            </form>
        </div>
      </div>
    </div>
    </>
  );
};
