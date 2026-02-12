
export enum ListingType {
  DIRECT_SALE = 'DIRECT_SALE',
  AUCTION = 'AUCTION',
  TIMED_BREAK = 'TIMED_BREAK'
}

export enum AppMode {
  MARKETPLACE = 'MARKETPLACE',
  BREAKS = 'BREAKS',
  COMBINED = 'COMBINED'
}

export enum SearchScope {
  ALL = 'ALL',
  TITLE = 'TITLE',
  POKEMON = 'POKEMON',
  SET = 'SET',
  SELLER = 'SELLER',
  BOOSTER = 'BOOSTER'
}

export enum BreakStatus {
  OPEN = 'OPEN',
  FULL_PENDING_SCHEDULE = 'FULL_PENDING_SCHEDULE',
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum BreakEntryStatus {
  AUTHORIZED = 'AUTHORIZED',
  CHARGED = 'CHARGED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum LiveEventType {
  SYSTEM_MSG = 'SYSTEM_MSG',
  WHEEL_SPIN = 'WHEEL_SPIN',
  RANDOMIZE_LIST = 'RANDOMIZE_LIST',
  CARD_REVEAL = 'CARD_REVEAL',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END'
}

export interface LiveEvent {
  id: string;
  breakId: string;
  type: LiveEventType;
  payload: any;
  createdAt: Date;
}

export interface LiveChatMessage {
    id: string;
    listingId: string;
    sender: string;
    text: string;
    isSystem: boolean;
    avatar?: string;
    timestamp: Date;
}

export enum ProductCategory {
  RAW_CARD = 'RAW_CARD',
  GRADED_CARD = 'GRADED_CARD',
  SEALED_PRODUCT = 'SEALED_PRODUCT'
}

export enum GradingCompany {
  PSA = 'PSA',
  BGS = 'BGS',
  CGC = 'CGC',
  ARS = 'ARS',
  ACE = 'ACE'
}

export enum SealedProductType {
  BOOSTER_BOX = 'Booster Box',
  ETB = 'Elite Trainer Box',
  UPC = 'Ultra Premium Collection',
  BOOSTER_BUNDLE = 'Booster Bundle',
  TIN = 'Tin',
  SPECIAL_COLLECTION = 'Special Collection'
}

export enum Condition {
  MINT = 'Mint',
  NEAR_MINT = 'Near Mint',
  EXCELLENT = 'Excellent',
  PLAYED = 'Played',
  DAMAGED = 'Damaged'
}

export enum Language {
  ENGLISH = 'English',
  JAPANESE = 'Japanese',
  CHINESE = 'Chinese',
  FRENCH = 'French',
  GERMAN = 'German',
  SPANISH = 'Spanish',
  ITALIAN = 'Italian',
  KOREAN = 'Korean'
}

export enum SortOption {
  NEWEST = 'NEWEST',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
  MOST_BIDS = 'MOST_BIDS',
  ENDING_SOON = 'ENDING_SOON'
}

// --- Payment Models (Stubs for Stripe) ---

export enum PaymentStatus {
  CREATED = 'CREATED',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND',
  HOLD = 'HOLD',
  RELEASE = 'RELEASE'
}

export interface PaymentIntent {
  id: string;
  userId: string;
  amount: number;
  currency: string; // 'USD'
  status: PaymentStatus;
  provider: 'STRIPE' | 'MOCK';
  providerPaymentId?: string; // Stripe PI ID
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number; // Positive for credit, negative for debit
  type: TransactionType;
  referenceId?: string; // Link to PaymentIntent, Bid, or Listing
  referenceType?: 'PAYMENT_INTENT' | 'BID' | 'LISTING' | 'BREAK_ENTRY';
  balanceAfter: number;
  createdAt: Date;
  description: string;
}

// --- New Data Models ---

export enum PokemonType {
  GRASS = 'Grass',
  FIRE = 'Fire',
  WATER = 'Water',
  LIGHTNING = 'Lightning',
  PSYCHIC = 'Psychic',
  FIGHTING = 'Fighting',
  DARKNESS = 'Darkness',
  METAL = 'Metal',
  FAIRY = 'Fairy',
  DRAGON = 'Dragon',
  COLORLESS = 'Colorless'
}

export enum CardCategory {
  POKEMON = 'Pokemon',
  TRAINER = 'Trainer',
  ENERGY = 'Energy'
}

// New: Detailed Identification Tags
export enum CardTypeTag {
    V = 'V',
    VMAX = 'VMAX',
    VSTAR = 'VSTAR',
    EX = 'EX',
    GX = 'GX',
    RADIANT = 'Radiant',
    TRAINER_GALLERY = 'TG',
    BASIC = 'Basic',
    STAGE1 = 'Stage 1',
    STAGE2 = 'Stage 2',
    LEGEND = 'LEGEND',
    BREAK = 'BREAK',
    PRISM = 'Prism Star'
}

export enum CategoryTag {
    SAR = 'SAR', // Special Art Rare
    AR = 'AR',   // Art Rare
    SR = 'SR',   // Secret Rare
    UR = 'UR',   // Ultra Rare
    IR = 'IR',   // Illustration Rare
    SIR = 'SIR', // Special Illustration Rare
    HR = 'HR',   // Hyper Rare
    RR = 'RR',   // Double Rare
    RRR = 'RRR', // Triple Rare
    CHR = 'CHR', // Character Rare
    CSR = 'CSR'  // Character Super Rare
}

export enum VariantTag {
  FULL_ART = 'Full Art',
  ALT_ART = 'Alt Art', // Previously implied, now explicit
  IR = 'Illustration Rare',
  SAR = 'Special Illustration Rare',
  TRAINER_GALLERY = 'Trainer Gallery',
  VINTAGE = 'Vintage',
  PROMO = 'Promo',
  SHADOWLESS = 'Shadowless',
  FIRST_EDITION = '1st Edition',
  SECRET_RARE = 'Secret Rare'
}

export interface OpenedProduct {
  type: 'ETB' | 'Booster Box' | 'Single Packs' | 'Collection Box' | 'Other';
  setId: string;
  setName: string;
  productName: string;
  quantity: number;
  language: string;
  estimatedValue?: number;
}

export interface BreakPrize {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  howToWin?: string; // e.g. "Random", "Top Bid"
  imageUrl?: string;
  estimatedValue?: number;
  detectedCardId?: string;
  detectedPrice?: number;
  priceOverride?: number;
}

export interface Valuation {
  currency: string;
  totalEstimatedValue: number;
  perSpotValue: number;
  suggestedEntryPrice: number;
  marginMode: 'PERCENT' | 'FIXED';
  marginValue: number;
  priceSource: 'MANUAL' | 'MOCK_API';
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  originalImageUrl?: string; // Store raw upload
  sellerId: string;
  sellerName: string;
  sellerLocation?: string; 
  sellerAvatar?: string;
  sellerVerified?: boolean;
  
  price: number; 
  currentBid: number; 
  bidsCount: number; 
  highBidderId?: string; 
  type: ListingType;
  category: ProductCategory;
  
  // Conditional Fields based on Category
  condition?: Condition; 
  gradingCompany?: GradingCompany; 
  grade?: number; 
  sealedProductType?: SealedProductType; 

  language: Language;
  createdAt: Date;
  endsAt?: Date; 
  reservePrice?: number; 
  isSold?: boolean; 
  
  // Metadata for Filters
  setId?: string;
  setName?: string;
  series?: string; 
  releaseDate?: string;

  // Rich Metadata & Catalog Links
  tcgCardId?: string; // NEW: TCG API ID
  collectorNumber?: string; // NEW: "001/165"
  rarity?: string; // NEW: Explicit Rarity String
  cardTypeTag?: CardTypeTag; // NEW
  categoryTag?: CategoryTag; // NEW

  pokemonName?: string; 
  pokemonType?: PokemonType; 
  cardCategory?: CardCategory; 
  variantTags?: VariantTag[];

  // --- Timed Break Specifics ---
  breakStatus?: BreakStatus;
  targetParticipants?: number;
  currentParticipants?: number;
  minPrizeDesc?: string;
  breakContentImages?: string[]; 
  scheduledLiveAt?: Date;
  
  // Advanced Break Setup
  boosterName?: string; 
  openedProduct?: OpenedProduct;
  
  openDurationHours?: number;
  opensAt?: Date;
  closesAt?: Date;
  preferredLiveWindow?: string;
  additionalPrizes?: BreakPrize[];
  valuation?: Valuation;
  maxEntriesPerUser?: number;
  
  liveLink?: string; 
  liveStartedAt?: Date;
  liveEndedAt?: Date;
  
  seedCommitment?: string; 
  seed?: string; 

  resultsMedia?: string[];
  resultsNotes?: string;
  recognizedItemsLog?: any[]; 
}

export interface BreakEntry {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: Date;
  status: BreakEntryStatus;
  authorizedAt?: Date;
  authorizationExpiresAt?: Date;
  chargedAt?: Date;
  paymentIntentId?: string; 
}

export interface WaitlistEntry {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: Date;
}

export interface User {
  id: string;
  name: string; // Login/System Name
  email: string;
  role: 'BUYER' | 'SELLER';
  walletBalance: number;
  
  // Profile Fields
  displayName?: string; // Public Display Name
  avatarUrl?: string; 
  coverImageUrl?: string; 
  bio?: string;
  location?: string;
  isLocationVerified?: boolean;
  
  // Status Fields
  isEmailVerified?: boolean;
  isVerifiedSeller?: boolean; // Trusted Seller Status
  
  // Account Metadata
  joinedAt: Date;
  preferredAppMode?: AppMode;

  // Moderation
  suspensionReason?: string;
  suspensionUntil?: Date;
  
  // Community
  joinedGroupIds?: string[];
  interests?: {
      pokemon?: string[]; 
      sets?: string[];    
      types?: PokemonType[];
  };

  // Social
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    discord?: string;
    youtube?: string;
  };

  // Deprecated / Compat fields (to avoid breaking existing constants/mocks)
  avatar?: string;
  coverImage?: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'SYSTEM' | 'SALE' | 'BID_WON' | 'BREAK_FULL' | 'BREAK_LIVE' | 'BREAK_EXPIRED' | 'BREAK_COMPLETED' | 'BREAK_CANCELLED' | 'WAITLIST_JOINED' | 'WAITLIST_PROMOTED';
    title: string;
    message: string;
    linkTo?: string; 
    isRead: boolean;
    createdAt: Date;
}

// --- Community Types ---

export type GroupType = 'POKEMON' | 'SET' | 'LOCATION' | 'MARKETPLACE' | 'BREAKS' | 'GENERAL';

export interface Group {
  id: string;
  type: GroupType;
  name: string;
  description: string;
  tags: string[]; 
  icon?: string;
  memberCount: number;
  createdAt: Date;
  lastActivityAt: Date;
  matchRules?: {
      pokemonNames?: string[];
      setNames?: string[];
      locationKeywords?: string[];
  };
}

export interface Thread {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  body: string;
  images?: string[];
  linkedEntityId?: string; 
  linkedEntityType?: 'LISTING' | 'BREAK';
  createdAt: Date;
  updatedAt: Date;
  upvotes: number;
  commentCount: number;
  tags?: string[];
  isPinned?: boolean;
}

export interface Comment {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  createdAt: Date;
  upvotes: number;
}

export interface TcgSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  images: {
    symbol: string;
    logo: string;
  }
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  IMAGE = 'IMAGE',
  OFFER = 'OFFER'
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string; 
  readAt?: string;
  status: MessageStatus;
  type: MessageType;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  listingPrice: number;
  buyerId: string;
  sellerId: string;
  participants: {
    [userId: string]: {
      name: string;
      avatar?: string;
    };
  };
  lastMessage: string;
  lastMessageAt: string; 
  unreadCounts: {
    [userId: string]: number;
  };
  isBlocked: boolean;
  blockedBy?: string;
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: Date;
  paymentIntentId?: string; 
}

// --- Identification Types ---

export interface CardCandidate {
  // Core fields
  id?: string; // TCG API ID
  cardName: string;
  pokemonName: string;
  setName: string;
  
  // Explicit IDs for deterministic lookup
  setId?: string;
  number?: string;
  
  releaseYear: string;
  language: string;
  condition: string;
  
  // Scoring
  confidence: number; // 0-1
  visualSimilarity?: number; // 0-1 (pHash/dHash score)
  matchSource?: 'id_lookup' | 'visual_ai' | 'fallback' | 'id_strip_signature';
  distance?: number; // Hamming distance (lower is better)

  // Financials & Meta
  estimatedValue?: number;
  pokemonType?: string;
  cardCategory?: string;
  variantTags?: string[];
  rarity: string; 
  isChase?: boolean; 
  
  // New Auto-Fill Fields
  cardTypeTag?: CardTypeTag;
  categoryTag?: CategoryTag;

  // Variants (Reverse Holo, etc)
  variant?: string;
  priceEstimate?: number;
  
  // Visuals for UI
  imageUrl?: string;
}

export interface IdentificationResult {
  // Stage 1 Output
  collectorIdNormalized?: string;
  collectorIdRaw?: string;
  collectorIdConfidence?: number;
  collectorIdSourceCorner?: 'bottom-left' | 'bottom-right' | 'unknown';
  
  // Stage 2 Output
  candidates: CardCandidate[];
  feedback?: string;
}
