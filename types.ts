
// --- Enums ---

export enum ListingType {
  DIRECT_SALE = 'DIRECT_SALE',
  AUCTION = 'AUCTION',
  TIMED_BREAK = 'TIMED_BREAK'
}

export enum Condition {
  DAMAGED = 'Damaged',
  PLAYED = 'Played',
  EXCELLENT = 'Excellent',
  NEAR_MINT = 'Near Mint',
  MINT = 'Mint'
}

export enum Language {
  ENGLISH = 'English',
  JAPANESE = 'Japanese'
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
  ACE = 'ACE',
  OTHER = 'Other'
}

export enum SealedProductType {
  BOOSTER_BOX = 'Booster Box',
  ETB = 'ETB',
  BOOSTER_BUNDLE = 'Booster Bundle',
  COLLECTION_BOX = 'Collection Box',
  UPC = 'UPC',
  TIN = 'Tin',
  SINGLE_PACKS = 'Single Packs',
  OTHER = 'Other'
}

export enum PokemonType {
  COLORLESS = 'Colorless',
  FIRE = 'Fire',
  WATER = 'Water',
  GRASS = 'Grass',
  LIGHTNING = 'Lightning',
  PSYCHIC = 'Psychic',
  FIGHTING = 'Fighting',
  DARKNESS = 'Darkness',
  METAL = 'Metal',
  FAIRY = 'Fairy',
  DRAGON = 'Dragon'
}

export enum CardCategory {
  POKEMON = 'Pokemon',
  TRAINER = 'Trainer',
  ENERGY = 'Energy'
}

export enum VariantTag {
  FULL_ART = 'FULL_ART',
  ALT_ART = 'ALT_ART',
  IR = 'IR',
  SAR = 'SAR',
  TRAINER_GALLERY = 'TRAINER_GALLERY',
  VINTAGE = 'VINTAGE',
  PROMO = 'PROMO',
  SHADOWLESS = 'SHADOWLESS',
  FIRST_EDITION = 'FIRST_EDITION',
  SECRET_RARE = 'SECRET_RARE'
}

export enum BreakStatus {
  OPEN = 'OPEN',
  FULL_PENDING_SCHEDULE = 'FULL_PENDING_SCHEDULE',
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  CAPTURED = 'CAPTURED',
  PENDING = 'PENDING'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  PURCHASE = 'PURCHASE',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
  RELEASE = 'RELEASE'
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

export enum SortOption {
  NEWEST = 'NEWEST',
  ENDING_SOON = 'ENDING_SOON',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
  MOST_BIDS = 'MOST_BIDS'
}

export enum BreakEntryStatus {
  AUTHORIZED = 'AUTHORIZED',
  CHARGED = 'CHARGED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum LiveEventType {
  WHEEL_SPIN = 'WHEEL_SPIN',
  CARD_REVEAL = 'CARD_REVEAL',
  RANDOMIZE_LIST = 'RANDOMIZE_LIST',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  SYSTEM_MSG = 'SYSTEM_MSG'
}

export enum CardTypeTag {
  VMAX = 'VMAX',
  VSTAR = 'VSTAR',
  V = 'V',
  EX = 'EX',
  GX = 'GX',
  RADIANT = 'RADIANT',
  STAGE2 = 'STAGE2',
  STAGE1 = 'STAGE1',
  BASIC = 'BASIC',
  LEGEND = 'LEGEND',
  BREAK = 'BREAK',
  PRISM = 'PRISM'
}

export enum CategoryTag {
  SIR = 'SIR',
  IR = 'IR',
  HR = 'HR',
  UR = 'UR',
  SR = 'SR',
  RR = 'RR',
  RRR = 'RRR',
  CHR = 'CHR',
  CSR = 'CSR',
  ACE = 'ACE',
  SHINY = 'SHINY',
  SHINY_ULTRA = 'SHINY_ULTRA',
  RADIANT = 'RADIANT'
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  IMAGE = 'IMAGE'
}

// --- Interfaces ---

export type ISODateString = string;

export interface User {
  id: string;
  name: string; // Primary identifier/username
  email: string;
  role: 'BUYER' | 'SELLER';
  walletBalance: number;
  joinedAt: Date;
  
  // Profile Information
  displayName?: string; // User-facing display name
  bio?: string;
  avatarUrl?: string; // URL for the profile picture
  coverImageUrl?: string; // URL for the profile cover image
  
  // Backwards compatibility for existing components
  avatar?: string; 
  coverImage?: string;

  // Location Data
  location?: string;
  isLocationVerified?: boolean;

  // Verification & Trust
  isVerifiedSeller?: boolean; // Badge for trusted sellers
  isEmailVerified?: boolean;
  isAdmin?: boolean;

  // Seller Specifics
  sellerAbout?: string;

  // Social Media Links
  socialLinks?: {
    instagram?: string;
    discord?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };

  // Moderation Status
  suspensionReason?: string;
  suspensionUntil?: Date;

  // App Preferences & Data
  interests?: {
    pokemon?: string[];
    sets?: string[];
  };
  joinedGroupIds?: string[];
  onboarding?: {
    buyer?: { step: number; completedAt?: Date; skipped?: boolean };
    seller?: { step: number; completedAt?: Date; skipped?: boolean };
  };
  preferredAppMode?: AppMode;
}

export interface OpenedProduct {
    type: SealedProductType;
    setId: string;
    setName: string;
    productName: string;
    quantity: number;
    language: string;
    estimatedValue: number;
}

export interface BreakPrize {
    id: string;
    title: string;
    description?: string;
    quantity: number;
    howToWin: string;
    imageUrl?: string;
    estimatedValue?: number;
    detectedCardId?: string;
    detectedPrice?: number;
}

export interface Valuation {
    currency: string;
    totalEstimatedValue: number;
    perSpotValue: number;
    suggestedEntryPrice: number;
    marginMode: 'PERCENT' | 'FIXED';
    marginValue: number;
    priceSource: 'MOCK_API' | 'TCGPLAYER' | 'MANUAL';
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  sellerLocation?: string;
  sellerAvatar?: string;
  sellerVerified?: boolean;
  price: number;
  currentBid?: number;
  bidsCount?: number;
  type: ListingType;
  category: ProductCategory;
  condition?: Condition;
  gradingCompany?: GradingCompany;
  grade?: number | string;
  sealedProductType?: SealedProductType;
  language?: Language;
  createdAt: Date;
  endsAt?: Date;
  isSold?: boolean;
  series?: string;
  setName?: string;
  setId?: string;
  releaseDate?: string;
  releaseYear?: string;
  pokemonName?: string;
  pokemonType?: PokemonType;
  cardCategory?: CardCategory;
  variantTags?: VariantTag[];
  
  // Break specific
  breakStatus?: BreakStatus;
  targetParticipants?: number;
  currentParticipants?: number;
  minPrizeDesc?: string;
  breakContentImages?: string[];
  openDurationHours?: number;
  opensAt?: Date;
  closesAt?: Date;
  scheduledLiveAt?: Date;
  preferredLiveWindow?: string;
  liveLink?: string;
  boosterName?: string;
  maxEntriesPerUser?: number;
  openedProduct?: OpenedProduct;
  additionalPrizes?: BreakPrize[];
  valuation?: Valuation;
  resultsMedia?: string[];
  resultsNotes?: string;
  liveEndedAt?: Date;
  seed?: string;
  
  // Card Identity
  tcgCardId?: string;
  collectorNumber?: string;
  rarity?: string;
  cardTypeTag?: CardTypeTag;
  categoryTag?: CategoryTag;
  reservePrice?: number;
}

export interface BreakEntry {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: BreakEntryStatus;
  joinedAt: Date;
  authExpiresAt?: Date;
}

export interface PaymentIntent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  balanceAfter: number;
  createdAt: Date;
  referenceId?: string;
  referenceType?: string;
}

export interface Group {
  id: string;
  type: 'POKEMON' | 'SET' | 'GENERAL' | 'LOCATION' | 'MARKETPLACE';
  name: string;
  description: string;
  tags: string[];
  icon: string;
  memberCount: number;
  createdAt: Date;
  lastActivityAt: Date;
  matchRules?: {
      pokemonNames?: string[];
      setNames?: string[];
      locationKeywords?: string[];
  }
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
  createdAt: Date;
  updatedAt: Date;
  upvotes: number;
  commentCount: number;
  linkedEntityId?: string;
  linkedEntityType?: 'LISTING' | 'BREAK';
  isPinned: boolean;
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

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedEntityId: string;
  entityType: 'USER' | 'LISTING' | 'THREAD' | 'COMMENT';
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'BID_WON' | 'SALE' | 'BREAK_FULL' | 'BREAK_LIVE';
  isRead: boolean;
  createdAt: Date;
  linkTo?: string;
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: Date;
}

export interface LiveEvent {
  id: string;
  listingId: string;
  type: LiveEventType;
  payload: any;
  timestamp: Date;
}

export interface LiveChatMessage {
  id: string;
  listingId: string;
  sender: string;
  text: string;
  isSystem: boolean;
  timestamp: Date;
  avatar?: string;
}

export interface TcgSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
      symbol: string;
      logo: string;
  };
}

export interface CardCandidate {
    id?: string;
    cardName: string;
    pokemonName: string;
    setName: string;
    setId?: string;
    number?: string;
    rarity?: string;
    imageUrl?: string;
    priceEstimate?: number;
    confidence: number; // 0 to 1
    matchSource: 'ocr' | 'visual_ai' | 'id_lookup' | 'id_strip_signature';
    variant?: string;
    isChase?: boolean;
    language?: string;
    releaseYear?: string;
    condition?: string;
    pokemonType?: string;
    cardCategory?: CardCategory;
    cardTypeTag?: CardTypeTag;
    categoryTag?: CategoryTag;
    variantTags?: VariantTag[];
    
    // Debugging
    distance?: number;
    visualSimilarity?: number;
    _debug?: any;
}

export interface FilterState {
  searchQuery: string;
  searchScope?: SearchScope;
  priceRange: { min: number | null, max: number | null };
  pokemonTypes: PokemonType[];
  cardCategories: CardCategory[];
  variantTags: VariantTag[];
  condition: Condition[];
  gradingCompany: GradingCompany[];
  grades: string[]; // NEW: Added support for specific grade filtering
  sealedProductType: SealedProductType[];
  breakStatus: BreakStatus[];
  pokemonName?: string;
  language?: string;
  series: string[];
  set: string[];
  eras: string[];
  listingTypes: ListingType[];
  boosterName?: string;
  descriptionQuery?: string;
  category?: ProductCategory;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  listingPrice: number;
  buyerId: string;
  sellerId: string;
  participants: Record<string, { name: string; avatar?: string }>;
  lastMessage: string;
  lastMessageAt: ISODateString;
  unreadCounts: Record<string, number>;
  isBlocked: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: ISODateString;
  status: MessageStatus;
  type: MessageType;
}

export interface IdentificationResult {
    collectorIdNormalized?: string;
    collectorIdRaw?: string;
    collectorIdConfidence?: number;
    candidates: CardCandidate[];
    feedback?: string;
}
