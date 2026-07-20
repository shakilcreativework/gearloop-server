import { ObjectId } from "mongodb";
import { connectToDatabase, getClient } from "../config/db";
import { ListingDoc } from "../types/listing.types";
import { ReviewDoc } from "../types/review.types";
import { UserDoc } from "../types/user.types";

// ---------------------------------------------------------------------------
// Demo account (matches the Demo Login button on the client)
// ---------------------------------------------------------------------------
const DEMO_EMAIL = "demo@gearloop.com";

// ---------------------------------------------------------------------------
// Seed data — realistic outdoor gear, no lorem ipsum
// ---------------------------------------------------------------------------

interface ListingSeed {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: ListingDoc["category"];
  pricePerDay: number;
  location: string;
  images: string[];
  condition: ListingDoc["condition"];
  tags: string[];
}

interface ReviewSeed {
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface ListingWithReviews {
  listing: ListingSeed;
  reviews: ReviewSeed[];
}

const DEMO_USER_ID = "demo-user-gearloop-001";

const listings: ListingSeed[] = [
  // ── CAMPING (4) ──────────────────────────────────────────────
  {
    title: "MSR Hubba Hubba NX 2-Person Tent",
    shortDescription: "Ultra-light backpacking tent, 2-person, freestanding, 3-season.",
    fullDescription:
      "The MSR Hubba Hubba NX is a premium ultralight backpacking tent weighing just 2.5 lbs. Features a two-door, two-vestibule design for maximum livability and gear storage. Rainfly-ready for 3-season use with excellent ventilation. Setup takes under 5 minutes with the unified hub-and-pole system. Includes stuff sack, stakes, and guylines.",
    category: "camping",
    pricePerDay: 35,
    location: "Denver, CO",
    images: [
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
      "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["tent", "backpacking", "ultralight", "2-person"],
  },
  {
    title: "Therm-a-Rest NeoAir XTherm Sleeping Pad",
    shortDescription: "Premium inflatable sleeping pad, R-value 6.9, ultralight.",
    fullDescription:
      "The Therm-a-Rest NeoAir XTherm is one of the warmest inflatable sleeping pads on the market with an R-value of 6.9. Packs down to the size of a water bottle at just 15 oz. Triangular core matrix baffles provide stable support and warmth. Perfect for late-season camping and mountaineering expeditions.",
    category: "camping",
    pricePerDay: 22,
    location: "Boulder, CO",
    images: [
      "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&q=80",
      "https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=800&q=80",
    ],
    condition: "good",
    tags: ["sleeping pad", "inflatable", "warm", "ultralight"],
  },
  {
    title: "Camp Chef Explorer 2X Double Burner Stove",
    shortDescription: "Heavy-duty camp stove with two 30K BTU burners, wind guards included.",
    fullDescription:
      "The Camp Chef Explorer 2X is a camp kitchen powerhouse with two independently controlled 30,000 BTU burners and a 60,000 BTU total output. Includes detachable legs for compact transport, built-in wind guards, and a three-sided windscreen. Supports cast iron cookware up to 14 inches. Ideal for group camping and basecamp cooking.",
    category: "camping",
    pricePerDay: 18,
    location: "Fort Collins, CO",
    images: [
      "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80",
      "https://images.unsplash.com/photo-1532356184132-c2afabb3e5e5?w=800&q=80",
    ],
    condition: "good",
    tags: ["stove", "cooking", "camp kitchen", "double burner"],
  },
  {
    title: "Black Diamond Spot 400 Headlamp",
    shortDescription: "Waterproof headlamp with 400 lumens, red night-vision mode.",
    fullDescription:
      "The Black Diamond Spot 400 delivers 400 lumens of reliable illumination with a fully sealed waterproof body (IPX8). Features red night-vision mode, dimming, strobe, and a lockout mode to prevent accidental activation. Runs on 3 AAA batteries or a rechargeable BD 1500 battery. Weighs just 2.9 oz with batteries.",
    category: "camping",
    pricePerDay: 12,
    location: "Salt Lake City, UT",
    images: [
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80",
      "https://images.unsplash.com/photo-1476842634003-7dcca8f832de?w=800&q=80",
    ],
    condition: "new",
    tags: ["headlamp", "waterproof", "camping", "hiking"],
  },

  // ── WATER SPORTS (4) ─────────────────────────────────────────
  {
    title: "Old Town Sportsman 120 Kayak",
    shortDescription: "Sit-on-top fishing kayak, 12 ft, stable, multiple rod holders.",
    fullDescription:
      "The Old Town Sportsman 120 is a 12-foot sit-on-top fishing kayak built for stability and comfort. Features three flush-mount rod holders, a transducer-ready scupper, adjustable foot braces, and a breathable mesh seat. Dry storage hatch and rear tank well for gear. Paddles smoothly on lakes, rivers, and calm coastal waters.",
    category: "water-sports",
    pricePerDay: 45,
    location: "Portland, OR",
    images: [
      "https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=800&q=80",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    ],
    condition: "good",
    tags: ["kayak", "fishing", "sit-on-top", "12-foot"],
  },
  {
    title: "NRS Hydra 3/2 Wetsuit",
    shortDescription: "Full-body 3/2mm neoprene wetsuit for cool-water paddling.",
    fullDescription:
      "The NRS Hydra 3/2 wetsuit delivers warmth and flexibility for cool-water paddling, kayaking, and paddleboarding. Made with 3mm Yamamoto neoprene on the core and 2mm on the arms for unrestricted paddling motion. Features glued and blind-stitched seams, a chest zipper entry, and a thermal lining for extra insulation. Available in men's medium.",
    category: "water-sports",
    pricePerDay: 25,
    location: "San Diego, CA",
    images: [
      "https://images.unsplash.com/photo-1544551763-779a20e9e28c?w=800&q=80",
      "https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["wetsuit", "neoprene", "cool-water", "paddling"],
  },
  {
    title: "Sea Eagle 370 Pro Inflatable Kayak",
    shortDescription: "2-person inflatable kayak, 12.5 ft, 650 lb capacity.",
    fullDescription:
      "The Sea Eagle 370 Pro is a rugged inflatable kayak that seats two and supports up to 650 lbs. Inflates in 10 minutes with the included high-output pump. Includes two deluxe seats, two paddles, and a carry bag. The 1000 Denier PVC material resists punctures and UV damage. Great for rivers up to class III and calm lakes.",
    category: "water-sports",
    pricePerDay: 38,
    location: "Tucson, AZ",
    images: [
      "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=800&q=80",
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    ],
    condition: "new",
    tags: ["inflatable", "kayak", "2-person", "portable"],
  },
  {
    title: "Cressi Leonardo Dive Computer",
    shortDescription: "Entry-level scuba dive computer, nitrox compatible, easy-to-read display.",
    fullDescription:
      "The Cressi Leonardo is a single-button entry-level dive computer with a large, easy-to-read LCD screen. Supports air and nitrox modes (21-50% O2), with adjustable alarm levels for dive depth, time, and safety stops. Uses a CR2450 battery with 2-3 year lifespan. Includes a nylon/velcro carrying case. Water-resistant to 100m.",
    category: "water-sports",
    pricePerDay: 30,
    location: "Miami, FL",
    images: [
      "https://images.unsplash.com/photo-1559827291-bce2640df936?w=800&q=80",
      "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["dive computer", "scuba", "nitrox", "underwater"],
  },

  // ── CYCLING (4) ──────────────────────────────────────────────
  {
    title: "Trek Domane SL 5 Road Bike",
    shortDescription: "Carbon endurance road bike, Shimano 105, disc brakes.",
    fullDescription:
      "The Trek Domane SL 5 is a carbon endurance road bike with IsoSpeed front and rear decouplers for vibration damping on long rides. Equipped with a Shimano 105 R7000 11-speed drivetrain, hydraulic disc brakes, and Bontrager Aeolus Comp 25 wheels. 38c tire clearance for mixed-surface capability. Size 56cm, fits riders 5'9\" to 6'0\".",
    category: "cycling",
    pricePerDay: 55,
    location: "Austin, TX",
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["road bike", "carbon", "endurance", "disc brakes"],
  },
  {
    title: "Cannondale Trail 5 Mountain Bike",
    shortDescription: "Hardtail 29er, Shimano Deore, 100mm suspension fork.",
    fullDescription:
      "The Cannondale Trail 5 is a capable hardtail mountain bike with a SmartForm C3 alloy frame, Shimano Deore 1x10 drivetrain, and a Suntour XCR 34 air fork with 100mm travel. Shimano hydraulic disc brakes and WTB Trail Boss 29x2.25\" tires provide confident control on technical trails. Size large, fits riders 5'10\" to 6'2\".",
    category: "cycling",
    pricePerDay: 35,
    location: "Boise, ID",
    images: [
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80",
      "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=800&q=80",
    ],
    condition: "good",
    tags: ["mountain bike", "hardtail", "29er", "suspension"],
  },
  {
    title: "Yakima RidgeBack 4 Hitch Bike Rack",
    shortDescription: "4-bike hitch mount rack, tilts for trunk access, 120 lb capacity.",
    fullDescription:
      "The Yakima RidgeBack 4 is a hitch-mounted bike rack carrying up to 4 bikes with zero frame contact. Features the UpperHand lever for easy tilt-down access to your rear cargo area. ZipStrips secure bikes in seconds and are fully padded to protect finishes. Fits 1.25\" and 2\" hitches with an anti-wobble bolt. Weighs 35 lbs and folds flat for storage.",
    category: "cycling",
    pricePerDay: 20,
    location: "Reno, NV",
    images: [
      "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    ],
    condition: "new",
    tags: ["bike rack", "hitch mount", "4-bike", "tilt"],
  },
  {
    title: "Bosch PowerTube 500 eBike Battery",
    shortDescription: "500Wh integrated eBike battery, 36V, compatible with Bosch motors.",
    fullDescription:
      "The Bosch PowerTube 500 is a frame-integrated 500Wh battery for electric mountain and commuter bikes with Bosch drive systems. Delivers 25-70 miles of range depending on assist level and terrain. Locks into the frame with the included key for security. Charges to 80% in approximately 2.5 hours. Includes charger and mounting hardware.",
    category: "cycling",
    pricePerDay: 25,
    location: "Bend, OR",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
      "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800&q=80",
    ],
    condition: "good",
    tags: ["ebike", "battery", "bosch", "500wh"],
  },

  // ── CLIMBING (4) ─────────────────────────────────────────────
  {
    title: "Petzl NAO+ Headlamp for Climbing",
    shortDescription: "Reactive lighting headlamp, 750 lumens, Bluetooth connectivity.",
    fullDescription:
      "The Petzl NAO+ is a high-performance headlamp with Petzl's reactive lighting technology — a sensor automatically adjusts the beam pattern and brightness based on your activity and surroundings. 750 lumens max output, Bluetooth-connected via the MyPetzl Light app for custom profiles. 3 rechargeable modes plus red lighting. Weighs 180g including batteries.",
    category: "climbing",
    pricePerDay: 20,
    location: "Moab, UT",
    images: [
      "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80",
      "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["headlamp", "climbing", "reactive", "bluetooth"],
  },
  {
    title: "Black Diamond Momentum Climbing Harness",
    shortDescription: "All-around climbing harness, pre-threaded buckle, 4 gear loops.",
    fullDescription:
      "The Black Diamond Momentum is a comfortable all-around climbing harness with a pre-threaded Speed buckle for easy adjustment. Four gear loops keep your rack organized, and the dual haul loop in back accommodates a chalk bag or second rope. Bullhorn-shaped waist belt distributes weight evenly. Fits waist 27-32 inches. Rated to 9kN (2,023 lbf).",
    category: "climbing",
    pricePerDay: 18,
    location: "Joshua Tree, CA",
    images: [
      "https://images.unsplash.com/photo-1529245019870-59b249281fd3?w=800&q=80",
      "https://images.unsplash.com/photo-1601223457495-5ce91d0a40a5?w=800&q=80",
    ],
    condition: "good",
    tags: ["harness", "climbing", "belay", "gear loops"],
  },
  {
    title: "Mammut Crag We Care Classic 9.8mm Rope",
    shortDescription: "60m single dynamic climbing rope, UIAA rated, dry-treated.",
    fullDescription:
      "The Mammut Crag We Care Classic 9.8mm is a versatile single dynamic rope ideal for sport, trad, and gym climbing. 60 meters long with a UIAA fall rating of 7 falls. Dry-treated sheath resists moisture absorption and abrasion. Available in 60m length. Rated to 22 kN. Includes rope bag.",
    category: "climbing",
    pricePerDay: 25,
    location: "Lander, WY",
    images: [
      "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800&q=80",
      "https://images.unsplash.com/photo-1516592673884-4a382d1124c1?w=800&q=80",
    ],
    condition: "new",
    tags: ["rope", "dynamic", "60m", "sport climbing"],
  },
  {
    title: "La Sportiva Solution Climbing Shoes",
    shortDescription: "Aggressive downturned shoes, Vibram XS Grip2, for bouldering and sport.",
    fullDescription:
      "The La Sportiva Solution is an aggressive downturned climbing shoe optimized for steep sport climbing and bouldering. Features a Vibram XS Grip2 rubber sole for maximum friction, a P3 platform to maintain downturn over time, and a fast-lacing system with hook-and-loop closure. Leather upper molds to your foot. US Men's size 10.",
    category: "climbing",
    pricePerDay: 22,
    location: "Red Rocks, NV",
    images: [
      "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80",
      "https://images.unsplash.com/photo-1606939290023-c573b65e3b5b?w=800&q=80",
    ],
    condition: "fair",
    tags: ["climbing shoes", "bouldering", "aggressive", "vibram"],
  },

  // ── PHOTOGRAPHY (4) ──────────────────────────────────────────
  {
    title: "Sony A7 IV Mirrorless Camera Body",
    shortDescription: "33MP full-frame mirrorless, 4K 60p, in-body stabilization.",
    fullDescription:
      "The Sony A7 IV is a full-frame mirrorless camera with a 33MP Exmor R sensor, BIONZ XR processor, and 5-axis in-body image stabilization. Shoots 4K video at 60p with S-Cinetone color science, 10fps continuous shooting with AF/AE tracking, and features a real-time eye AF for humans, animals, and birds. Includes body, battery, charger, and strap. Sensor shutter count: 8,200.",
    category: "photography",
    pricePerDay: 65,
    location: "San Francisco, CA",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["camera", "mirrorless", "sony", "full-frame", "4K"],
  },
  {
    title: "DJI Mavic 3 Pro Drone",
    shortDescription: "Triple-camera drone, 4/3 Hasselblad, 4K/120p, 43 min flight.",
    fullDescription:
      "The DJI Mavic 3 Pro features a triple-camera system: a 4/3 Hasselblad main sensor (20MP), a 1/1.3\" medium tele (48MP, 3x), and a 1/2\" telephoto (12MP, 7x). Shoots 5.1K/50p and 4K/120p video, 43 minutes max flight time, omnidirectional obstacle avoidance, and APAS 5.0. Includes drone, 3 batteries, charging hub, ND filters, and carrying case.",
    category: "photography",
    pricePerDay: 95,
    location: "Seattle, WA",
    images: [
      "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=800&q=80",
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&q=80",
    ],
    condition: "new",
    tags: ["drone", "dji", "hasselblad", "4K", "aerial"],
  },
  {
    title: "Manfrotto Befree Advanced Tripod",
    shortDescription: "Carbon fiber travel tripod, 15 kg capacity, ball head included.",
    fullDescription:
      "The Manfrotto Befree Advanced is a carbon fiber travel tripod weighing just 1.5 kg but supporting up to 15 kg of gear. Features a 496BALL ball head with Arca-Swiss compatible quick-release plate, 360° panoramic base, and tension control. Extends to 150 cm, folds to 41 cm for travel. Includes padded carry bag.",
    category: "photography",
    pricePerDay: 18,
    location: "Lake Tahoe, CA",
    images: [
      "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=800&q=80",
      "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["tripod", "carbon fiber", "travel", "ball head"],
  },
  {
    title: "Peak Design Everyday Backpack 20L",
    shortDescription: "Camera backpack, 20L, FlexFold dividers, weatherproof.",
    fullDescription:
      "The Peak Design Everyday Backpack 20L is a weatherproof camera bag with FlexFold dividers that customize around your gear. Access from top, side, or rear. Padded laptop sleeve fits up to 15\" MacBook Pro. External carry straps for a tripod or jacket. MagLatch hardware for silent, one-handed access. Available in Charcoal. Includes rain fly.",
    category: "photography",
    pricePerDay: 15,
    location: "Asheville, NC",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
      "https://images.unsplash.com/photo-1622260614153-03223fb72052?w=800&q=80",
    ],
    condition: "new",
    tags: ["backpack", "camera bag", "weatherproof", "travel"],
  },

  // ── WINTER SPORTS (4) ───────────────────────────────────────
  {
    title: "Burton Custom Flying V Snowboard",
    shortDescription: "All-mountain snowboard, 158cm, Flying V profile.",
    fullDescription:
      "The Burton Custom Flying V is a versatile all-mountain snowboard at 158 cm with a Flying V rocker profile for float in powder and edge control on groomers. Features a Super Fly II core, Sintered WFO base, and 45° Carbon Highlights for pop. Medium-stiff flex (6/10) suits intermediate to advanced riders. Fits boots up to US 11.",
    category: "winter-sports",
    pricePerDay: 40,
    location: "Aspen, CO",
    images: [
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80",
      "https://images.unsplash.com/photo-1486325212027-8a4f8e17f2b7?w=800&q=80",
    ],
    condition: "good",
    tags: ["snowboard", "all-mountain", "158cm", "burton"],
  },
  {
    title: "Salomon S/Pro Alpha 120 Ski Boots",
    shortDescription: "Freeride ski boots, 120 flex, GripWalk soles, heat-moldable liner.",
    fullDescription:
      "The Salomon S/Pro Alpha 120 is a high-performance freeride ski boot with a 120 flex index and a 100mm last width. Custom Heat liner is heat-moldable for a precise fit. GripWalk soles provide traction on hard surfaces. Coreframe construction ensures direct power transfer to the ski. Fits US Men's 10-10.5.",
    category: "winter-sports",
    pricePerDay: 35,
    location: "Park City, UT",
    images: [
      "https://images.unsplash.com/photo-1565992441121-4367c2967103?w=800&q=80",
      "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=800&q=80",
    ],
    condition: "excellent",
    tags: ["ski boots", "freeride", "120 flex", "heat-moldable"],
  },
  {
    title: "Rossignol Experience 82 Ti Skis + Bindings",
    shortDescription: "All-mountain carving skis, 170cm,钛合金, bindings included.",
    fullDescription:
      "The Rossignol Experience 82 Ti is an all-mountain carving ski at 170 cm with a Titanal construction for dampness and edge hold. Line Control Technology provides smooth turn initiation. Includes Look Xpress 11 bindings. 82mm waist width handles groomed runs and light powder. Designed for intermediate to advanced skiers, fits boots 250-320mm sole length.",
    category: "winter-sports",
    pricePerDay: 45,
    location: "Stowe, VT",
    images: [
      "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80",
      "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=800&q=80",
    ],
    condition: "good",
    tags: ["skis", "all-mountain", "170cm", "bindings included"],
  },
  {
    title: "Dakine Poacher 36L Backcountry Backpack",
    shortDescription: "Avalanche safety pack, 36L, shovel + probe compartment, helmet carry.",
    fullDescription:
      "The Dakine Poacher 36L is a backcountry-specific pack with a dedicated avalanche tool compartment for shovel and probe (tools not included). Features a roll-top closure, back panel access to the main compartment, and an A-frame ski carry. Padded hip belt, sternum strap with whistle, and a helmet carry loop. Hydration compatible (reservoir not included).",
    category: "winter-sports",
    pricePerDay: 20,
    location: "Jackson, WY",
    images: [
      "https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=800&q=80",
      "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80",
    ],
    condition: "new",
    tags: ["backpack", "backcountry", "avalanche", "ski touring"],
  },
];

// ---------------------------------------------------------------------------
// Reviews per listing — varied tone, not templated
// ---------------------------------------------------------------------------

const reviewerNames = [
  "Alex K.", "Jamie R.", "Sam T.", "Morgan L.", "Casey W.",
  "Riley P.", "Jordan D.", "Taylor M.", "Quinn S.", "Avery B.",
  "Drew H.", "Blake N.", "Cameron F.", "Dana G.", "Ellis C.",
  "Frankie V.", "Harper J.", "Indigo O.", "Jules A.", "Kendall E.",
  "Lane Q.", "Marlo Z.", "Nico Y.", "Oakley X.",
];

function buildReviews(listingIndex: number): ReviewSeed[] {
  // 2-4 reviews per listing, deterministic from index
  const count = 2 + (listingIndex % 3); // 2, 3, or 4
  const baseDate = new Date("2026-03-01T00:00:00Z");
  const reviews: ReviewSeed[] = [];

  const commentBank: string[][] = [
    [
      "Perfect condition, worked great on my trip. Would rent again.",
      "Exactly as described. Smooth pickup and return process.",
    ],
    [
      "Good gear but a few cosmetic scuffs. Performance was unaffected.",
      "Solid rental experience — would recommend to a friend.",
      "Arrived clean and well-packed. Very happy with the rental.",
    ],
    [
      "This is premium gear at a fair daily rate. Couldn't be happier.",
      "Used it for a weekend trip and it performed flawlessly.",
      "Slightly heavy for backpacking but great for car camping.",
    ],
    [
      "Top-notch equipment. The owner clearly takes care of their gear.",
      "Saved me hundreds vs. buying. Rental was hassle-free.",
      "A couple of minor scratches but nothing that affects use.",
      "Will definitely rent this again for my next outdoor adventure.",
    ],
  ];

  const ratings = [
    [5, 5],
    [4, 5, 5],
    [5, 4, 5],
    [5, 5, 4, 5],
  ];

  for (let i = 0; i < count; i++) {
    const reviewerIndex = (listingIndex * 7 + i * 3) % reviewerNames.length;
    const commentIdx = i % commentBank[count - 2].length;
    reviews.push({
      reviewerId: `reviewer-${reviewerIndex.toString().padStart(3, "0")}`,
      rating: ratings[count - 2][i],
      comment: commentBank[count - 2][commentIdx],
      createdAt: new Date(
        baseDate.getTime() + (listingIndex * 86400000 * 3) + i * 86400000 * 5,
      ),
    });
  }

  return reviews;
}

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Connecting to MongoDB...");
  const db = await connectToDatabase();

  const listingsCol = db.collection<ListingDoc>("listings");
  const reviewsCol = db.collection<ReviewDoc>("reviews");
  const usersCol = db.collection<UserDoc>("users");
  const metaCol = db.collection("_seed_meta");

  // ── Idempotency check ──────────────────────────────────────
  const marker = await metaCol.findOne({ _seed: "seed-v1" });
  if (marker) {
    console.log("Seed data already present (marker found). Dropping seed data and re-seeding...");
    // Clear and re-seed to stay idempotent
  }

  // ── Clear existing seed data ────────────────────────────────
  await listingsCol.deleteMany({});
  await reviewsCol.deleteMany({});
  await usersCol.deleteMany({});
  await metaCol.deleteMany({});
  console.log("Cleared existing seed data.");

  // ── Insert listings ─────────────────────────────────────────
  const listingDocs: ListingDoc[] = listings.map((l, idx) => ({
    _id: new ObjectId(),
    ownerId: idx < 8 ? DEMO_USER_ID : `owner-${(idx % 6).toString().padStart(3, "0")}`,
    title: l.title,
    shortDescription: l.shortDescription,
    fullDescription: l.fullDescription,
    category: l.category,
    pricePerDay: l.pricePerDay,
    currency: "USD",
    location: l.location,
    images: l.images,
    condition: l.condition,
    available: true,
    rating: 0,
    reviewCount: 0,
    tags: l.tags,
    createdAt: new Date(Date.parse("2026-01-15T00:00:00Z") + idx * 3600000),
  }));

  const insertResult = await listingsCol.insertMany(listingDocs);
  const insertedIds = Object.values(insertResult.insertedIds);
  console.log(`Inserted ${insertedIds.length} listings.`);

  // ── Insert reviews + update listing ratings ─────────────────
  let totalReviews = 0;
  for (let i = 0; i < listingDocs.length; i++) {
    const reviewSeeds = buildReviews(i);
    const reviewDocs: ReviewDoc[] = reviewSeeds.map((r) => ({
      _id: new ObjectId(),
      listingId: insertedIds[i],
      reviewerId: r.reviewerId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    await reviewsCol.insertMany(reviewDocs);
    totalReviews += reviewDocs.length;

    // Calculate and update listing rating
    const allRatings = reviewDocs.map((r) => r.rating);
    const avgRating =
      Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10;

    await listingsCol.updateOne(
      { _id: insertedIds[i] },
      { $set: { rating: avgRating, reviewCount: reviewDocs.length } },
    );
  }
  console.log(`Inserted ${totalReviews} reviews with updated ratings.`);

  // ── Insert demo user ────────────────────────────────────────
  // rentalHistory references a subset of seeded listings (indices 0, 3, 7, 12, 18)
  const rentalHistoryIndices = [0, 3, 7, 12, 18];
  const demoUser: UserDoc = {
    _id: new ObjectId(),
    name: "Demo Explorer",
    email: DEMO_EMAIL,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80",
    role: "renter",
    rentalHistory: rentalHistoryIndices.map((idx) => insertedIds[idx]),
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };

  await usersCol.insertOne(demoUser);
  console.log(`Inserted demo user: ${DEMO_EMAIL} with ${rentalHistoryIndices.length} rental history entries.`);

  // ── Insert a few owner accounts so ownerId values are valid ──
  const owners: UserDoc[] = [];
  const ownerNames = ["Jake Rivers", "Priya Sharma", "Leo Chen", "Aisha Patel", "Marcus Johnson", "Freya Hansen"];
  const ownerEmails = ["jake@gearloop.com", "priya@gearloop.com", "leo@gearloop.com", "aisha@gearloop.com", "marcus@gearloop.com", "freya@gearloop.com"];
  for (let i = 0; i < 6; i++) {
    owners.push({
      _id: new ObjectId(),
      name: ownerNames[i],
      email: ownerEmails[i],
      role: "owner",
      rentalHistory: [],
      createdAt: new Date("2026-01-10T00:00:00Z"),
    });
  }
  await usersCol.insertMany(owners);
  console.log(`Inserted ${owners.length} owner accounts.`);

  // ── Write seed marker ───────────────────────────────────────
  await metaCol.insertOne({
    _seed: "seed-v1",
    seededAt: new Date(),
    listingsCount: insertedIds.length,
    reviewsCount: totalReviews,
  });
  console.log("Seed marker written.");

  // ── Verify counts ───────────────────────────────────────────
  const finalListings = await listingsCol.countDocuments();
  const finalReviews = await reviewsCol.countDocuments();
  const finalUsers = await usersCol.countDocuments();

  console.log(`\n=== Seed complete ===`);
  console.log(`Listings: ${finalListings} (expected 24)`);
  console.log(`Reviews:  ${finalReviews} (expected 56–96 range)`);
  console.log(`Users:    ${finalUsers} (1 demo + 6 owners = 7)`);

  if (finalListings !== 24) {
    console.error("ERROR: Expected 24 listings, got " + finalListings);
    process.exit(1);
  }

  await getClient().close();
  console.log("Done. Connection closed.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
