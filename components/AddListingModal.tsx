
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ListingType, Condition, Language, ProductCategory, GradingCompany, SealedProductType, PokemonType, CardCategory, VariantTag, Listing, BreakPrize, OpenedProduct, Valuation, CardCandidate } from '../types';
import { CardRecognitionService } from '../services/cardRecognitionService';
import { estimateOpenedProductValue } from '../services/valuationService';
import { getCardPrice } from '../services/tcgApiService';
import { useStore } from '../context/StoreContext';

interface AddListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (listingData: any) => void;
  initialData?: Listing | null;
}

const PRODUCT_TYPES = ['ETB', 'Booster Box', 'Single Packs', 'Collection Box' ,'Other'] as const;

export const AddListingModal: React.FC<AddListingModalProps> = ({ isOpen, onClose, onAdd, initialData }) => {
  const { availableSets } = useStore();
  
  // Standard Listing State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  
  // AI Identification State
  const [identifying, setIdentifying] = useState(false);
  const [candidates, setCandidates] = useState<CardCandidate[]>([]);

  // --- NEW BREAK STATE ---
  const [openedProduct, setOpenedProduct] = useState<OpenedProduct>({
      type: 'ETB',
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
  const prizeInputRef = useRef<HTMLInputElement>(null);
  
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
    type: ListingType.DIRECT_SALE,
    category: ProductCategory.RAW_CARD,
    pokemonName: '',
    pokemonType: PokemonType.COLORLESS,
    cardCategory: CardCategory.POKEMON,
    variantTags: [] as VariantTag[],
    condition: Condition.NEAR_MINT,
    gradingCompany: GradingCompany.PSA,
    grade: '10',
    sealedProductType: SealedProductType.ETB,
    language: Language.ENGLISH,
    setName: '',
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
                  targetParticipants: initialData.targetParticipants?.toString() || '10',
                  grade: initialData.grade?.toString() || '10',
                  openDurationHours: initialData.openDurationHours || 24,
                  minPrizeDesc: initialData.minPrizeDesc || '',
                  preferredLiveWindow: initialData.preferredLiveWindow || '',
                  maxEntriesPerUser: initialData.maxEntriesPerUser || 1
              });
              setPreviewUrl(initialData.imageUrl);
              if (initialData.openedProduct) {
                  setOpenedProduct(initialData.openedProduct);
                  setIsProductNameManuallyEdited(true);
              }
              if (initialData.additionalPrizes) setPrizes(initialData.additionalPrizes);
              if (initialData.valuation) setValuation(initialData.valuation);
              if (initialData.breakContentImages) setContentImages(initialData.breakContentImages);
          } else {
              setPreviewUrl(null);
              setBase64Image(null);
              setFormData(prev => ({ 
                  ...prev, 
                  type: ListingType.DIRECT_SALE, 
                  price: '', 
                  title: '', 
                  description: '',
                  targetParticipants: '10',
                  openDurationHours: 24,
                  maxEntriesPerUser: 1,
                  minPrizeDesc: '',
                  preferredLiveWindow: ''
              }));
              setPrizes([]);
              setContentImages([]);
              setOpenedProduct({ type: 'ETB', setId: '', setName: '', productName: '', quantity: 1, language: 'English', estimatedValue: 45 });
              setIsProductNameManuallyEdited(false);
          }
      }
  }, [isOpen, initialData]);

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

  const handleStandardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const result = reader.result as string;
              setPreviewUrl(result);
              
              const b64 = result.split(',')[1];
              const mime = result.split(';')[0].split(':')[1];
              setBase64Image(b64);

              if (formData.type !== ListingType.TIMED_BREAK) {
                  setIdentifying(true);
                  try {
                      const res = await CardRecognitionService.identify(b64, mime);
                      if (res.candidates.length > 0) setCandidates(res.candidates);
                  } catch (e) {
                      console.error("AI identification failed", e);
                  } finally {
                      setIdentifying(false);
                  }
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleApplyCandidate = (c: CardCandidate) => {
      setFormData(prev => ({
          ...prev,
          title: c.cardName + (c.variant ? ` (${c.variant})` : ''),
          pokemonName: c.pokemonName,
          setName: c.setName,
          releaseYear: c.releaseYear,
          cardCategory: (c.cardCategory as CardCategory) || CardCategory.POKEMON,
          variantTags: (c.variantTags as VariantTag[]) || [],
          price: c.priceEstimate ? c.priceEstimate.toString() : prev.price
      }));
      setCandidates([]);
  };

  // Prize Logic
  const handlePrizeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setNewPrizeImage(result); 
              setNewPrizeBase64(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleIdentifyPrize = async () => {
      if (!newPrizeBase64) return;
      setPrizeIdentifying(true);
      setPrizeCandidates([]);
      try {
          const res = await CardRecognitionService.identify(newPrizeBase64, 'image/jpeg');
          
          if (res.candidates.length === 0) {
              alert("Could not identify card. Please enter details manually.");
          } else if (res.candidates.length === 1) {
              await selectPrizeCandidate(res.candidates[0]);
          } else {
              setPrizeCandidates(res.candidates);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setPrizeIdentifying(false);
      }
  };

  const selectPrizeCandidate = async (match: CardCandidate) => {
      setPrizeCandidates([]);
      // Use variant-aware pricing retrieval
      const price = match.priceEstimate || (await getCardPrice(match.id || '', match.variant))?.market || 0;
      
      setNewPrize(prev => ({
          ...prev,
          title: match.cardName + (match.variant ? ` (${match.variant})` : ''),
          description: `${match.setName} - ${match.rarity} - ${match.condition}`,
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
      
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) return alert("Please enter a valid price (> 0).");

      const spots = parseInt(formData.targetParticipants);
      if (isNaN(spots) || spots < 2) return alert("Total Spots must be at least 2.");

      // Break Specific Validation
      if (formData.type === ListingType.TIMED_BREAK) {
          if (!openedProduct.type) return alert("Product Type is required.");
          if (!openedProduct.setId) return alert("Set / Expansion is required.");
          if (!openedProduct.productName) return alert("Product Name is required.");
          if ((openedProduct.quantity || 0) < 1) return alert("Quantity must be at least 1.");
          
          if (!formData.minPrizeDesc) return alert("Please specify the 'Guaranteed Prize' (e.g. 1 Pack/Spot).");
          if (!formData.preferredLiveWindow) return alert("Please specify 'Planned Live Window'.");
          if (!formData.openDurationHours) return alert("Please specify 'Break Duration'.");
      }

      const payload: any = {
          ...formData,
          price,
          targetParticipants: spots,
          openDurationHours: parseInt(formData.openDurationHours as any),
          maxEntriesPerUser: Math.max(1, parseInt(formData.maxEntriesPerUser as any)),
          imageUrl: previewUrl || 'https://via.placeholder.com/400',
          openedProduct: formData.type === ListingType.TIMED_BREAK ? openedProduct : undefined,
          additionalPrizes: formData.type === ListingType.TIMED_BREAK ? prizes : undefined,
          valuation: formData.type === ListingType.TIMED_BREAK ? valuation : undefined,
          breakContentImages: contentImages,
          boosterName: openedProduct.productName
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
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold mb-6 text-gray-900">{initialData ? 'Edit Listing' : 'Create New Listing'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {!initialData && (
                    <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                        {[ListingType.DIRECT_SALE, ListingType.AUCTION, ListingType.TIMED_BREAK].map(t => (
                            <button type="button" key={t} onClick={() => setFormData(p => ({...p, type: t}))} 
                                className={`py-2 text-sm font-bold rounded-md transition-all ${formData.type === t ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                {t === ListingType.TIMED_BREAK ? 'Timed Break' : t === ListingType.AUCTION ? 'Auction' : 'Buy Now'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Standard Listing Logic */}
                {formData.type !== ListingType.TIMED_BREAK && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <div className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group" onClick={() => fileInputRef.current?.click()}>
                                {previewUrl ? <img src={previewUrl} className="w-full h-full object-contain rounded-lg" /> : (
                                    <div className="text-center p-4">
                                        <div className="text-4xl mb-2 text-gray-300 group-hover:text-primary-400">+</div>
                                        <span className="text-gray-400 text-sm font-medium">Upload Image</span>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleStandardFileChange} />
                            </div>
                            {identifying && <div className="text-xs text-center animate-pulse text-primary-600 font-medium">✨ Analyzing card...</div>}
                            
                            {/* Candidate List - Updated to show Variants & Rarity */}
                            {candidates.length > 0 && (
                                <div className="bg-white border rounded-lg shadow-sm max-h-60 overflow-y-auto divide-y">
                                    <div className="bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase sticky top-0">Select Match</div>
                                    {candidates.map((c, i) => (
                                        <div key={i} onClick={() => handleApplyCandidate(c)} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex gap-2 items-center">
                                            <img src={c.imageUrl} className="w-8 h-10 object-cover rounded border" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-900 truncate">{c.cardName}</div>
                                                <div className="text-gray-500">
                                                    {c.setName} • <span className="font-medium text-gray-700">{c.rarity}</span> • {c.variant}
                                                </div>
                                                {c.priceEstimate && <div className="text-green-600 font-medium">${c.priceEstimate}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <input className="w-full border-gray-300 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                                    <input className="w-full border-gray-300 border p-2.5 pl-6 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required min="0.01" step="0.01" />
                                </div>
                                <input className="w-full border-gray-300 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none flex-1" placeholder="Set Name" value={formData.setName} onChange={e => setFormData({...formData, setName: e.target.value})} />
                            </div>
                            <textarea className="w-full border-gray-300 border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" rows={4} placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                    </div>
                )}

                {/* BREAK CREATION LOGIC ... (Rest is same) */}
                {formData.type === ListingType.TIMED_BREAK && (
                    <div className="space-y-8">
                        {/* 1. Product Info */}
                        <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                            <h4 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-xs">1</span>
                                What are you opening?
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Cover Image */}
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-purple-800 mb-1">Cover Image <span className="text-red-500">*</span></label>
                                    <div className="aspect-[4/3] bg-white border-2 border-dashed border-purple-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-colors relative overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : (
                                            <>
                                                <span className="text-2xl text-purple-300 mb-1">+</span>
                                                <span className="text-xs text-purple-400 font-medium">Add Photo</span>
                                            </>
                                        )}
                                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleStandardFileChange} required />
                                    </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="block text-xs font-bold text-purple-800 mb-1">Break Duration (Hrs) <span className="text-red-500">*</span></label>
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="1" max="24" className="flex-1 accent-purple-600" value={formData.openDurationHours} onChange={e => setFormData({...formData, openDurationHours: parseInt(e.target.value)})} />
                                            <span className="text-xs font-bold text-purple-900 w-12 text-right">{formData.openDurationHours}h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Content Images */}
                            <div className="mt-4 pt-4 border-t border-purple-100">
                                <label className="block text-xs font-bold text-purple-800 mb-2">Content Previews / Hits (Optional)</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {contentImages.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-purple-200 group">
                                            <img src={src} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setContentImages(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                        </div>
                                    ))}
                                    <div className="aspect-square border-2 border-dashed border-purple-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors" onClick={() => contentInputRef.current?.click()}>
                                        <span className="text-lg text-purple-300">+</span>
                                        <input ref={contentInputRef} type="file" multiple className="hidden" accept="image/*" onChange={handleContentImagesChange} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Rules & Prizes */}
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

                            {/* Prize List */}
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

                                {/* Add Prize Form */}
                                <div className="flex flex-col gap-3 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 border-dashed">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors shrink-0 bg-white overflow-hidden relative" onClick={() => prizeInputRef.current?.click()}>
                                            {newPrizeImage ? <img src={newPrizeImage} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 text-center">+Img</span>}
                                            <input ref={prizeInputRef} type="file" className="hidden" accept="image/*" onChange={handlePrizeFile} />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex gap-2">
                                                <input className="flex-1 border-gray-300 border rounded p-2 text-sm" placeholder="Prize Name (e.g. Charizard Slab)" value={newPrize.title || ''} onChange={e => setNewPrize({...newPrize, title: e.target.value})} />
                                                {newPrizeBase64 && (
                                                    <button type="button" onClick={handleIdentifyPrize} disabled={prizeIdentifying} className="px-3 bg-blue-100 text-blue-700 text-xs font-bold rounded hover:bg-blue-200 transition-colors whitespace-nowrap">
                                                        {prizeIdentifying ? 'Scanning...' : 'Scan Card'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full border-gray-300 border rounded p-2 pl-5 text-sm" 
                                                        placeholder="Value" 
                                                        value={newPrize.estimatedValue || ''} 
                                                        onChange={e => setNewPrize({...newPrize, estimatedValue: parseFloat(e.target.value)})} 
                                                    />
                                                </div>
                                                <select className="border-gray-300 border rounded p-2 text-sm flex-1 bg-white" value={newPrize.howToWin} onChange={e => setNewPrize({...newPrize, howToWin: e.target.value})}>
                                                    <option value="Random">Random Draw</option>
                                                    <option value="Top Bid">Top Bidder</option>
                                                    <option value="Wheel">Wheel Spin</option>
                                                    <option value="Bounty">Bounty</option>
                                                </select>
                                                <input type="number" min="1" className="w-16 border-gray-300 border rounded p-2 text-sm" value={newPrize.quantity} onChange={e => setNewPrize({...newPrize, quantity: parseInt(e.target.value) || 1})} />
                                                <button type="button" onClick={handleAddPrize} className="bg-gray-900 text-white px-4 rounded text-xs font-bold hover:bg-black transition-colors">Add</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Ambiguous Prize Selection */}
                                    {prizeCandidates.length > 0 && (
                                        <div className="mt-2 bg-white border border-gray-200 rounded p-2 max-h-32 overflow-y-auto divide-y">
                                            <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase">Select Match</div>
                                            {prizeCandidates.map((c, i) => (
                                                <div key={i} onClick={() => selectPrizeCandidate(c)} className="flex items-center gap-2 p-1.5 hover:bg-blue-50 cursor-pointer rounded">
                                                    <img src={c.imageUrl} className="w-6 h-8 object-cover rounded border" />
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold truncate">{c.cardName}</div>
                                                        <div className="text-[10px] text-gray-500">{c.setName} • {c.rarity}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Valuation & Price */}
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
                                    <div>
                                        <label className="block text-xs font-bold text-green-800 mb-1 flex justify-between">
                                            <span>Target Profit Margin</span>
                                            <span>{valuation.marginValue}%</span>
                                        </label>
                                        <input type="range" min="0" max="100" step="5" className="w-full accent-green-600" value={valuation.marginValue} onChange={e => setValuation({...valuation, marginValue: parseInt(e.target.value)})} />
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm text-center">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Suggested Entry</p>
                                        <p className="text-3xl font-extrabold text-green-600">${valuation.suggestedEntryPrice.toFixed(2)}</p>
                                        <div className="mt-3 pt-3 border-t border-green-50 text-[10px] text-gray-500 grid grid-cols-2 gap-2 text-left">
                                            <div>
                                                <span className="block font-bold text-gray-400 uppercase">Product Value</span>
                                                <span className="text-gray-900 font-bold">${valuation.totalEstimatedValue.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="block font-bold text-gray-400 uppercase">Per Spot Cost</span>
                                                <span className="text-gray-900 font-bold">${valuation.perSpotValue.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-green-800 mb-1">Final Entry Price <span className="text-red-500">*</span></label>
                                        <input type="number" className="w-full border-green-200 border p-2.5 rounded-lg text-sm font-bold text-green-900 focus:ring-green-500" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required min="0.01" step="0.01" />
                                        <p className="text-[10px] text-green-600 text-right">Potential Revenue: ${((parseFloat(formData.price) || 0) * (parseInt(formData.targetParticipants) || 0)).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-md transition-colors">
                        {initialData ? 'Update Listing' : 'Publish Listing'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
