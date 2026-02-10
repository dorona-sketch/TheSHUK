
import { Listing, ListingType, Condition, User, Language, ProductCategory, GradingCompany, SealedProductType, PokemonType, CardCategory, VariantTag, BreakStatus, PaymentIntent, WalletTransaction, PaymentStatus, TransactionType, Group, Thread, Comment } from './types';

export const MOCK_USER_BUYER: User = {
  id: 'u_buyer_01',
  name: 'Ash Ketchum',
  displayName: 'Ash Ketchum',
  email: 'ash@pallet.town',
  role: 'BUYER',
  walletBalance: 15000,
  joinedAt: new Date('2023-01-15'),
  location: 'Kanto, JP',
  isLocationVerified: true,
  bio: 'Gotta catch em all! Always looking for Pikachu variants.',
  avatarUrl: 'https://ui-avatars.com/api/?name=Ash+Ketchum&background=ef4444&color=fff',
  coverImageUrl: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&q=80&w=2000',
  // Backwards compat
  avatar: 'https://ui-avatars.com/api/?name=Ash+Ketchum&background=ef4444&color=fff',
  coverImage: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&q=80&w=2000',
  socialLinks: {
      instagram: 'ash_ketchum',
      discord: 'pikapi#1234'
  },
  interests: {
      pokemon: ['Pikachu', 'Charizard'],
      sets: ['151', 'Base Set']
  },
  joinedGroupIds: ['g_charizard', 'g_151']
};

export const MOCK_USER_SELLER: User = {
  id: 'u_seller_01',
  name: 'Team Rocket Sales',
  displayName: 'Team Rocket Sales',
  email: 'jessie@rocket.org',
  role: 'SELLER',
  walletBalance: 1200,
  joinedAt: new Date('2022-11-01'),
  location: 'Celadon City',
  isLocationVerified: false,
  bio: 'Prepare for trouble! We sell the rarest sourced cards.',
  avatarUrl: 'https://ui-avatars.com/api/?name=Team+Rocket&background=1e1b4b&color=fff',
  coverImageUrl: 'https://images.unsplash.com/photo-1639803930843-0865a770335e?auto=format&fit=crop&q=80&w=2000',
  avatar: 'https://ui-avatars.com/api/?name=Team+Rocket&background=1e1b4b&color=fff',
  coverImage: 'https://images.unsplash.com/photo-1639803930843-0865a770335e?auto=format&fit=crop&q=80&w=2000',
  isVerifiedSeller: true,
  socialLinks: {
      twitter: 'teamrocket',
      youtube: 'rocket_tv'
  },
  interests: {
      pokemon: ['Meowth', 'Wobbuffet'],
      sets: ['Team Rocket']
  },
  joinedGroupIds: ['g_marketplace']
};

export const SECONDARY_SELLER: User = {
  id: 'u_seller_02',
  name: 'Professor Oak',
  displayName: 'Professor Oak',
  email: 'oak@lab.edu',
  role: 'SELLER',
  walletBalance: 50000,
  joinedAt: new Date('2020-05-20'),
  location: 'Pallet Town',
  isLocationVerified: true,
  bio: 'Pokemon Researcher and collector of vintage artifacts.',
  avatarUrl: 'https://ui-avatars.com/api/?name=Professor+Oak&background=f59e0b&color=fff',
  coverImageUrl: 'https://images.unsplash.com/photo-1605631086687-987777038e85?auto=format&fit=crop&q=80&w=2000',
  avatar: 'https://ui-avatars.com/api/?name=Professor+Oak&background=f59e0b&color=fff',
  coverImage: 'https://images.unsplash.com/photo-1605631086687-987777038e85?auto=format&fit=crop&q=80&w=2000',
  isVerifiedSeller: true,
  socialLinks: {
      discord: 'prof_oak'
  },
  joinedGroupIds: ['g_vintage']
};

export const TAG_DISPLAY_LABELS: Record<VariantTag, string> = {
    [VariantTag.FULL_ART]: 'Full Art',
    [VariantTag.ALT_ART]: 'Alt Art',
    [VariantTag.IR]: 'Illustration Rare',
    [VariantTag.SAR]: 'Special Illustration Rare',
    [VariantTag.TRAINER_GALLERY]: 'TG',
    [VariantTag.VINTAGE]: 'Vintage',
    [VariantTag.PROMO]: 'Promo',
    [VariantTag.SHADOWLESS]: 'Shadowless',
    [VariantTag.FIRST_EDITION]: '1st Ed.',
    [VariantTag.SECRET_RARE]: 'Secret Rare'
};

// --- MOCK COMMUNITY DATA ---

export const INITIAL_GROUPS: Group[] = [
    {
        id: 'g_charizard',
        type: 'POKEMON',
        name: 'Charizard Collectors',
        description: 'For those who worship the flame. Show off your Zards!',
        tags: ['Charizard', 'Fire', 'Vintage'],
        icon: '🔥',
        memberCount: 1240,
        createdAt: new Date('2023-01-01'),
        lastActivityAt: new Date(),
        matchRules: { pokemonNames: ['Charizard', 'Charmander', 'Charmeleon'] }
    },
    {
        id: 'g_151',
        type: 'SET',
        name: 'Scarlet & Violet 151',
        description: 'Trading, discussion, and pulls from the 151 set.',
        tags: ['151', 'Modern', 'Set Completion'],
        icon: '✨',
        memberCount: 850,
        createdAt: new Date('2023-09-01'),
        lastActivityAt: new Date(),
        matchRules: { setNames: ['151', 'Scarlet & Violet 151'] }
    },
    {
        id: 'g_vintage',
        type: 'GENERAL',
        name: 'Vintage WOTC Era',
        description: 'Base Set, Jungle, Fossil, Team Rocket. The classics.',
        tags: ['WOTC', 'Vintage', '90s'],
        icon: '🏺',
        memberCount: 3200,
        createdAt: new Date('2022-05-01'),
        lastActivityAt: new Date(),
        matchRules: { setNames: ['Base Set', 'Jungle', 'Fossil'] }
    },
    {
        id: 'g_nyc',
        type: 'LOCATION',
        name: 'NYC Pokemon Traders',
        description: 'Local meetups and trades in New York City.',
        tags: ['New York', 'NYC', 'Local'],
        icon: '🗽',
        memberCount: 150,
        createdAt: new Date('2023-06-15'),
        lastActivityAt: new Date(),
        matchRules: { locationKeywords: ['New York', 'NYC', 'NY', 'Manhattan', 'Brooklyn'] }
    },
    {
        id: 'g_marketplace',
        type: 'MARKETPLACE',
        name: 'Marketplace Deals',
        description: 'Spotting the best auctions ending soon.',
        tags: ['Deals', 'Snipes', 'Auctions'],
        icon: '💸',
        memberCount: 5000,
        createdAt: new Date('2022-01-01'),
        lastActivityAt: new Date()
    }
];

export const INITIAL_THREADS: Thread[] = [
    {
        id: 't_1',
        groupId: 'g_charizard',
        authorId: MOCK_USER_BUYER.id,
        authorName: MOCK_USER_BUYER.name,
        authorAvatar: MOCK_USER_BUYER.avatar,
        title: 'Finally got my grail!',
        body: 'Just secured a PSA 8 Base Set Zard. It’s not a 10, but it’s mine!',
        createdAt: new Date(Date.now() - 3600000), // 1 hr ago
        updatedAt: new Date(),
        upvotes: 45,
        commentCount: 12,
        isPinned: false
    },
    {
        id: 't_2',
        groupId: 'g_151',
        authorId: MOCK_USER_SELLER.id,
        authorName: MOCK_USER_SELLER.name,
        authorAvatar: MOCK_USER_SELLER.avatar,
        title: 'God Pack Pulled Live!',
        body: 'Check out the break from last night. We hit the demigod pack with the Charmander line.',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(),
        upvotes: 120,
        commentCount: 30,
        linkedEntityId: 'l_break_01',
        linkedEntityType: 'BREAK',
        isPinned: true
    }
];

export const INITIAL_COMMENTS: Comment[] = [
    {
        id: 'c_1',
        threadId: 't_1',
        authorId: MOCK_USER_SELLER.id,
        authorName: MOCK_USER_SELLER.name,
        authorAvatar: MOCK_USER_SELLER.avatar,
        body: 'Congrats! A classic piece of history.',
        createdAt: new Date(Date.now() - 1800000),
        upvotes: 5
    }
];

// ... (Rest of existing constants)

export const MOCK_PAYMENT_INTENTS: PaymentIntent[] = [
    {
        id: 'pi_seed_01',
        userId: MOCK_USER_BUYER.id,
        amount: 500,
        currency: 'USD',
        status: PaymentStatus.CAPTURED,
        provider: 'MOCK',
        createdAt: new Date('2023-10-01T10:00:00Z'),
        updatedAt: new Date('2023-10-01T10:00:05Z')
    },
    {
        id: 'pi_seed_02',
        userId: MOCK_USER_BUYER.id,
        amount: 150,
        currency: 'USD',
        status: PaymentStatus.CAPTURED,
        provider: 'MOCK',
        createdAt: new Date('2023-10-05T14:30:00Z'),
        updatedAt: new Date('2023-10-05T14:30:05Z')
    }
];

export const MOCK_TRANSACTIONS: WalletTransaction[] = [
    {
        id: 'tx_seed_01',
        userId: MOCK_USER_BUYER.id,
        amount: 500,
        type: TransactionType.DEPOSIT,
        description: 'Initial Wallet Deposit',
        balanceAfter: 500,
        createdAt: new Date('2023-10-01T10:00:05Z'),
        referenceId: 'pi_seed_01',
        referenceType: 'PAYMENT_INTENT'
    },
    {
        id: 'tx_seed_02',
        userId: MOCK_USER_BUYER.id,
        amount: -150,
        type: TransactionType.PURCHASE,
        description: 'Purchase: Charizard Base Set (Played)',
        balanceAfter: 350,
        createdAt: new Date('2023-10-05T14:30:05Z'),
        referenceId: 'l_mock_sold_item',
        referenceType: 'LISTING'
    }
];

// Seed data: [SetId, CardNumber, CardName, RarityTier(1-5), ReleaseYear]
const REAL_CARDS_DB: [string, string, string, number, string][] = [
    ['base1', '4', 'Charizard Holo', 5, '1999'],
    ['base1', '2', 'Blastoise Holo', 4, '1999'],
    ['base1', '15', 'Venusaur Holo', 4, '1999'],
    ['base1', '1', 'Alakazam Holo', 3, '1999'],
    ['base1', '58', 'Pikachu (Red Cheeks)', 3, '1999'],
    ['base2', '1', 'Alakazam', 2, '2000'],
    ['neo1', '9', 'Lugia Holo', 5, '2000'],
    ['neo1', '17', 'Typhlosion Holo', 4, '2000'],
    ['neo2', '12', 'Umbreon Holo', 4, '2001'],
    ['neo4', '8', 'Shining Magikarp', 5, '2002'],
    ['neo4', '6', 'Shining Gyarados', 5, '2002'],
    ['ecard1', '128', 'Charizard (Crystal)', 5, '2002'],
    ['ex13', '101', 'Mew (Gold Star)', 5, '2006'],
    ['swsh7', '215', 'Umbreon VMAX Alt Art (Moonbreon)', 5, '2021'],
    ['swsh7', '218', 'Rayquaza VMAX Alt Art', 5, '2021'],
    ['swsh8', '264', 'Mew VMAX Alt Art', 4, '2021'],
    ['swsh12', '186', 'Lugia V Alt Art', 5, '2022'],
    ['swsh12pt5', 'GG69', 'Giratina VSTAR (Gold)', 5, '2023'],
    ['sv1', '223', 'Miriam Full Art', 3, '2023'],
    ['sv2', '269', 'Iono Full Art', 4, '2023'],
    ['sv3a', '151', 'Mew ex (151)', 3, '2023'],
    ['sv3a', '200', 'Blastoise ex Alt Art', 4, '2023'],
    ['sv3a', '201', 'Alakazam ex Alt Art', 3, '2023'],
    ['sv3a', '202', 'Zapdos ex Alt Art', 3, '2023'],
    ['sv4pt5', '234', 'Charizard ex (Shiny)', 5, '2024'],
    ['sv6', '216', 'Greninja ex Alt Art', 4, '2024'],
    ['swsh4', '44', 'Pikachu V', 1, '2020'],
];

const SERIES_MAP: Record<string, string> = {
    'base': 'Base', 'gym': 'Gym Heroes', 'neo': 'Neo', 'ecard': 'E-Card',
    'ex': 'EX Series', 'dp': 'Diamond & Pearl', 'bw': 'Black & White',
    'xy': 'XY', 'g': 'Generations', 'sm': 'Sun & Moon', 'det': 'Detective Pikachu',
    'swsh': 'Sword & Shield', 'sv': 'Scarlet & Violet'
};

const getSeries = (setId: string) => {
    for (const key in SERIES_MAP) {
        if (setId.startsWith(key)) return SERIES_MAP[key];
    }
    return 'Unknown Series';
};

// Helper to guess type based on name (mock logic)
const inferPokemonMetadata = (name: string): { type: PokemonType, category: CardCategory, name: string } => {
    const lower = name.toLowerCase();
    
    // Category
    let category = CardCategory.POKEMON;
    if (lower.includes('trainer') || lower.includes('lillie') || lower.includes('miriam') || lower.includes('iono')) category = CardCategory.TRAINER;
    
    // Name (Clean up "Holo", "VMAX", etc)
    const pokeName = name.replace(/ (Holo|VMAX|VSTAR|V|EX|GX|Lv\.X|Full Art|Alt Art|Gold Star|ex|1st Edition).*/i, '').trim();

    // Type
    let type = PokemonType.COLORLESS;
    if (['charizard', 'typhlosion', 'entei', 'magmar', 'moltres', 'blaziken'].some(k => lower.includes(k))) type = PokemonType.FIRE;
    else if (['blastoise', 'gyarados', 'magikarp', 'vaporeon', 'greninja', 'suicune'].some(k => lower.includes(k))) type = PokemonType.WATER;
    else if (['venusaur', 'celebi', 'leafeon', 'butterfree', 'scyther'].some(k => lower.includes(k))) type = PokemonType.GRASS;
    else if (['pikachu', 'raichu', 'zapdos', 'electivire', 'ampharos'].some(k => lower.includes(k))) type = PokemonType.LIGHTNING;
    else if (['mew', 'mewtwo', 'alakazam', 'espeon', 'gengar', 'gardevoir'].some(k => lower.includes(k))) type = PokemonType.PSYCHIC;
    else if (['machamp', 'hitmonchan'].some(k => lower.includes(k))) type = PokemonType.FIGHTING;
    else if (['umbreon', 'darkrai', 'tyranitar'].some(k => lower.includes(k))) type = PokemonType.DARKNESS;
    else if (['dragonite', 'rayquaza', 'giratina'].some(k => lower.includes(k))) type = PokemonType.DRAGON;
    else if (['lugia'].some(k => lower.includes(k))) type = PokemonType.COLORLESS;

    return { type, category, name: pokeName };
};

const inferTags = (name: string, setId: string): VariantTag[] => {
    const tags: VariantTag[] = [];
    const lower = name.toLowerCase();
    
    if (lower.includes('full art')) tags.push(VariantTag.FULL_ART);
    if (lower.includes('alt art') || lower.includes('alternate')) tags.push(VariantTag.ALT_ART);
    if (lower.includes('shiny')) tags.push(VariantTag.IR); // approximation
    if (lower.includes('gold')) tags.push(VariantTag.SAR); // approximation
    if (lower.includes('trainer') || lower.includes('gallery')) tags.push(VariantTag.TRAINER_GALLERY);
    if (setId.startsWith('base') || setId.startsWith('neo') || setId.startsWith('gym')) tags.push(VariantTag.VINTAGE);
    if (lower.includes('1st edition')) tags.push(VariantTag.FIRST_EDITION);

    return tags;
};

const getDescription = (name: string, rarity: number, category: ProductCategory) => {
    const intros = ["A stunning piece for any collection.", "Fresh from the pack.", "Highly playable."];
    let suffix = "";
    if (category === ProductCategory.GRADED_CARD) suffix = " Professionally graded.";
    if (category === ProductCategory.SEALED_PRODUCT) suffix = " Factory sealed.";
    return `${intros[Math.floor(Math.random() * intros.length)]} ${name}.${suffix}`;
};

// Generate standard listings
export const INITIAL_LISTINGS: Listing[] = REAL_CARDS_DB.map((card, index) => {
    const [setId, number, name, rarityTier, releaseYear] = card;
    
    const rand = Math.random();
    let category = ProductCategory.RAW_CARD;
    if (rand > 0.6) category = ProductCategory.GRADED_CARD;
    else if (rand > 0.9) category = ProductCategory.SEALED_PRODUCT;

    const isAuction = Math.random() > 0.4; 
    let basePrice = Math.pow(rarityTier, 3.5) * (1 + Math.random());
    
    let finalTitle = name;
    let sealedType: SealedProductType | undefined = undefined;
    let gradingCompany: GradingCompany | undefined = undefined;
    let grade: number | undefined = undefined;
    let condition: Condition | undefined = undefined;

    if (category === ProductCategory.SEALED_PRODUCT) {
        const sealTypes = Object.values(SealedProductType);
        sealedType = sealTypes[Math.floor(Math.random() * sealTypes.length)];
        finalTitle = `${card[0].toUpperCase()} ${sealedType}`; 
        basePrice *= 5;
    } else if (category === ProductCategory.GRADED_CARD) {
        const companies = Object.values(GradingCompany);
        gradingCompany = companies[Math.floor(Math.random() * companies.length)];
        grade = Math.random() > 0.4 ? 10 : (Math.random() > 0.5 ? 9 : 8);
        basePrice *= (grade === 10 ? 3 : 1.5);
        // UPDATED: Include grade info in title
        finalTitle = `${gradingCompany} ${grade} - ${name}`;
    } else {
        const conditions = Object.values(Condition);
        condition = conditions[Math.floor(Math.random() * 3)]; 
    }

    let finalPrice = Math.floor(basePrice);
    if (finalPrice < 5) finalPrice = 5;

    const seller = Math.random() > 0.5 ? MOCK_USER_SELLER : SECONDARY_SELLER;
    const endsAt = new Date();
    endsAt.setSeconds(endsAt.getSeconds() + Math.floor(Math.random() * 250000) + 300);

    const meta = inferPokemonMetadata(name);
    const tags = inferTags(name, setId);

    return {
        id: `l_${index + 1000}`,
        title: finalTitle,
        description: getDescription(finalTitle, rarityTier, category),
        imageUrl: category === ProductCategory.SEALED_PRODUCT 
            ? `https://images.pokemontcg.io/${setId}/logo.png` 
            : `https://images.pokemontcg.io/${setId}/${number}_hires.png`,
        sellerId: seller.id,
        sellerName: seller.displayName || seller.name,
        sellerLocation: seller.location,
        sellerAvatar: seller.avatarUrl || `https://ui-avatars.com/api/?name=${seller.name}`,
        sellerVerified: seller.isVerifiedSeller,
        price: isAuction ? Math.floor(finalPrice * 0.4) : finalPrice,
        currentBid: isAuction && Math.random() > 0.3 ? Math.floor(finalPrice * 0.5) : 0,
        bidsCount: isAuction ? Math.floor(Math.random() * 12) : 0,
        type: isAuction ? ListingType.AUCTION : ListingType.DIRECT_SALE,
        category: category,
        condition: condition,
        gradingCompany: gradingCompany,
        grade: grade,
        sealedProductType: sealedType,
        language: Math.random() > 0.85 ? Language.JAPANESE : Language.ENGLISH,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
        endsAt: isAuction ? endsAt : undefined,
        series: getSeries(setId),
        setName: setId.toUpperCase(),
        setId: setId,
        releaseDate: `${releaseYear}/01/01`,
        pokemonName: meta.name,
        pokemonType: meta.type,
        cardCategory: meta.category,
        variantTags: tags
    };
});

// Mock Break Listing
export const MOCK_BREAK_LISTING: Listing = {
    id: 'l_break_01',
    title: 'Scarlet & Violet 151 Booster Box Break (12 Spots)',
    description: 'Join our live break of the hot 151 set! Each spot guarantees at least 3 packs opened live.',
    imageUrl: 'https://images.pokemontcg.io/sv3a/logo.png',
    sellerId: MOCK_USER_SELLER.id,
    sellerName: MOCK_USER_SELLER.displayName || MOCK_USER_SELLER.name,
    sellerLocation: MOCK_USER_SELLER.location,
    sellerAvatar: MOCK_USER_SELLER.avatarUrl,
    sellerVerified: MOCK_USER_SELLER.isVerifiedSeller,
    price: 35, // Entry price
    currentBid: 0,
    bidsCount: 0,
    type: ListingType.TIMED_BREAK,
    category: ProductCategory.SEALED_PRODUCT,
    sealedProductType: SealedProductType.BOOSTER_BOX,
    language: Language.ENGLISH,
    createdAt: new Date(),
    setName: '151',
    setId: 'sv3a',
    releaseDate: '2023/09/22',
    series: 'Scarlet & Violet',
    pokemonType: PokemonType.COLORLESS,
    cardCategory: CardCategory.POKEMON,
    
    // Break Specifics
    breakStatus: BreakStatus.OPEN,
    targetParticipants: 12,
    currentParticipants: 8,
    minPrizeDesc: '3 Booster Packs + Sleeves',
    breakContentImages: [
        'https://images.pokemontcg.io/sv3a/151_hires.png', // Mew
        'https://images.pokemontcg.io/sv3a/200_hires.png', // Blastoise
        'https://images.pokemontcg.io/sv3a/202_hires.png'  // Zapdos
    ]
};

export const ADDITIONAL_BREAKS: Listing[] = [
    {
        id: 'l_break_02',
        title: 'Crown Zenith Elite Trainer Box Random Hit',
        description: 'Hunting for the gold cards! 10 spots available.',
        imageUrl: 'https://images.pokemontcg.io/swsh12pt5/logo.png',
        sellerId: MOCK_USER_SELLER.id,
        sellerName: MOCK_USER_SELLER.displayName || MOCK_USER_SELLER.name,
        sellerAvatar: MOCK_USER_SELLER.avatarUrl,
        sellerVerified: true,
        price: 15,
        currentBid: 0,
        bidsCount: 0,
        type: ListingType.TIMED_BREAK,
        category: ProductCategory.SEALED_PRODUCT,
        sealedProductType: SealedProductType.ETB,
        language: Language.ENGLISH,
        createdAt: new Date(),
        setName: 'Crown Zenith',
        setId: 'swsh12pt5',
        releaseDate: '2023/01/20',
        series: 'Sword & Shield',
        pokemonType: PokemonType.LIGHTNING,
        cardCategory: CardCategory.POKEMON,
        breakStatus: BreakStatus.OPEN,
        targetParticipants: 10,
        currentParticipants: 6,
        minPrizeDesc: '1 Pack',
        openDurationHours: 24,
        opensAt: new Date(),
        closesAt: new Date(Date.now() + 3600000 * 5), // Closes in 5 hours
        preferredLiveWindow: 'Tonight'
    },
    {
        id: 'l_break_03',
        title: 'Lost Origin Booster Box - Full Case Team Break',
        description: 'Massive opening! Teams assigned randomly.',
        imageUrl: 'https://images.pokemontcg.io/swsh11/logo.png',
        sellerId: SECONDARY_SELLER.id,
        sellerName: SECONDARY_SELLER.displayName || SECONDARY_SELLER.name,
        sellerAvatar: SECONDARY_SELLER.avatarUrl,
        sellerVerified: true,
        price: 45,
        currentBid: 0,
        bidsCount: 0,
        type: ListingType.TIMED_BREAK,
        category: ProductCategory.SEALED_PRODUCT,
        sealedProductType: SealedProductType.BOOSTER_BOX,
        language: Language.ENGLISH,
        createdAt: new Date(),
        setName: 'Lost Origin',
        setId: 'swsh11',
        releaseDate: '2022/09/09',
        series: 'Sword & Shield',
        pokemonType: PokemonType.PSYCHIC,
        cardCategory: CardCategory.POKEMON,
        breakStatus: BreakStatus.SCHEDULED,
        targetParticipants: 30,
        currentParticipants: 30, // Full
        minPrizeDesc: 'Guaranteed V or better',
        openDurationHours: 48,
        scheduledLiveAt: new Date(Date.now() + 3600000 * 2), // Live in 2 hours
        preferredLiveWindow: 'Saturday Night'
    },
    {
        id: 'l_break_04',
        title: 'Vintage Base Set Pack Opening (Heavy!)',
        description: 'Opening one heavy Base Set pack. 3 spots (1 card each).',
        imageUrl: 'https://images.pokemontcg.io/base1/logo.png',
        sellerId: SECONDARY_SELLER.id,
        sellerName: SECONDARY_SELLER.displayName || SECONDARY_SELLER.name,
        sellerAvatar: SECONDARY_SELLER.avatarUrl,
        sellerVerified: true,
        price: 200,
        currentBid: 0,
        bidsCount: 0,
        type: ListingType.TIMED_BREAK,
        category: ProductCategory.SEALED_PRODUCT,
        sealedProductType: SealedProductType.BOOSTER_BUNDLE,
        language: Language.ENGLISH,
        createdAt: new Date(),
        setName: 'Base',
        setId: 'base1',
        releaseDate: '1999/01/09',
        series: 'Base',
        pokemonType: PokemonType.FIRE,
        cardCategory: CardCategory.POKEMON,
        breakStatus: BreakStatus.OPEN,
        targetParticipants: 3,
        currentParticipants: 2,
        minPrizeDesc: '1 Vintage Card',
        openDurationHours: 12,
        closesAt: new Date(Date.now() + 3600000 * 1), // Closes in 1 hour
        preferredLiveWindow: 'ASAP'
    }
];

INITIAL_LISTINGS.unshift(MOCK_BREAK_LISTING, ...ADDITIONAL_BREAKS);
